import { connectDB } from "@/lib/db/connection";
import { Consistency, type IConsistency } from "@/lib/db/models";
import type { NormalizedConsistency } from "../types";
import { logger, sanitizeError } from "@/lib/logger";

import { computeNextConsistencyState, computeConsistencyScore } from "../utils/consistencyMath";

// Convert Map to sorted array
function formatWeeklyActivity(map: Map<string, number>): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  map.forEach((count, date) => {
    result.push({ date, count });
  });

  // Sort dates chronologically (Mon -> Tue -> Wed)
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// Convert Array back to Map form for Mongoose
function buildWeeklyMap(arr: { date: string; count: number }[]): Map<string, number> {
  const map = new Map<string, number>();
  arr.forEach(item => map.set(item.date, item.count));
  return map;
}

/**
 * Normalizes consistency data to standard UI shape
 */
function toNormalizedConsistency(doc: IConsistency): NormalizedConsistency {
  const weeklyCounts = formatWeeklyActivity(doc.weeklyActivity as Map<string, number>).map(a => a.count);
  return {
    currentStreak: doc.currentStreak,
    longestStreak: doc.longestStreak,
    lastActiveDate: doc.lastActiveDate,
    freezeCredits: doc.freezeCredits,
    consistencyScore: computeConsistencyScore(doc.currentStreak, weeklyCounts, doc.lastActiveDate),
    weeklyActivity: formatWeeklyActivity(doc.weeklyActivity as Map<string, number>),
  };
}

/**
 * Fetches consistency data, initializing if not present.
 * M-04: Also performs lazy month-boundary freeze reset on read,
 * so the Dashboard shows correct freeze counts even without activity.
 */
export async function getConsistency(userId: string, roleId: string): Promise<NormalizedConsistency> {
  await connectDB();
  
  const doc = await Consistency.findOneAndUpdate(
    { userId, roleId },
    {
      $setOnInsert: { userId, roleId },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );

  // M-04: Lazy month-boundary freeze reset on read
  if (doc.lastActiveDate) {
    const now = new Date();
    const lastActive = new Date(doc.lastActiveDate);
    if (lastActive.getUTCMonth() !== now.getUTCMonth() || lastActive.getUTCFullYear() !== now.getUTCFullYear()) {
      if (doc.freezeCredits !== 2) {
        doc.freezeCredits = 2;
        try {
          await doc.save();
          logger.info("CONSISTENCY_FREEZE_RESET", { userId, roleId, action: "month_boundary_reset" });
        } catch (saveErr: any) {
          logger.error("CONSISTENCY_ERROR", { userId, roleId, error: sanitizeError(saveErr), action: "freeze_reset_save" });
        }
      }
    }
  }

  return toNormalizedConsistency(doc);
}

/**
 * Handle topic completion payload to increment streaks, apply freezes, and log maps idempotently.
 *
 * Concurrency Safety (H-03 fix):
 * Uses optimistic concurrency control — Mongoose's __v field detects if another
 * concurrent write modified the document between our read and save. On conflict,
 * we retry with fresh data (max 3 attempts).
 */
export async function logActivity(userId: string, roleId: string, netCount: number = 1): Promise<NormalizedConsistency> {
  await connectDB();

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    let doc = await Consistency.findOne({ userId, roleId });
    if (!doc) {
      doc = new Consistency({ userId, roleId });
    }

    const weeklyArr = formatWeeklyActivity(doc.weeklyActivity as Map<string, number>);
    const currentState = {
      currentStreak: doc.currentStreak,
      longestStreak: doc.longestStreak,
      lastActiveDate: doc.lastActiveDate || null,
      freezeCredits: doc.freezeCredits,
      consistencyScore: computeConsistencyScore(doc.currentStreak, weeklyArr.map(a => a.count), doc.lastActiveDate || null),
      weeklyActivity: weeklyArr
    };

    const nextState = computeNextConsistencyState(currentState, netCount);

    doc.currentStreak = nextState.currentStreak;
    doc.longestStreak = nextState.longestStreak;
    doc.lastActiveDate = nextState.lastActiveDate;
    doc.freezeCredits = nextState.freezeCredits;
    doc.weeklyActivity = buildWeeklyMap(nextState.weeklyActivity);

    try {
      doc.increment();
      await doc.save();
      logger.info("CONSISTENCY_ACTIVITY_LOGGED", {
        userId, roleId,
        streak: doc.currentStreak,
        longestStreak: doc.longestStreak,
        freezeCredits: doc.freezeCredits,
      } as any);
      return toNormalizedConsistency(doc);
    } catch (err: any) {
      if (err.name === "VersionError" && attempt < MAX_RETRIES) {
        logger.warn("CONSISTENCY_CONCURRENCY_RETRY", { userId, roleId, attempt, error: sanitizeError(err) });
        continue; // Retry with fresh data
      }
      logger.error("CONSISTENCY_ERROR", { userId, roleId, error: sanitizeError(err), action: "logActivity_save", attempt });
      throw err; // Non-retryable error or max retries exceeded
    }
  }

  // Fallback: should never reach here, but TypeScript needs a return
  throw new Error("logActivity exceeded maximum retry attempts");
}
