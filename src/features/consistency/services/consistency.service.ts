import { connectDB } from "@/lib/db/connection";
import { Consistency, type IConsistency } from "@/lib/db/models";
import type { NormalizedConsistency } from "../types";
import { logger, sanitizeError } from "@/lib/logger";

// Helper to get strictly YYYY-MM-DD in UTC
function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// Convert Map to sorted array
function formatWeeklyActivity(map: Map<string, number>): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  map.forEach((count, date) => {
    result.push({ date, count });
  });

  // Sort dates chronologically (Mon -> Tue -> Wed)
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// M-03: Compute consistency score with recency-based decay
function computeConsistencyScore(
  currentStreak: number,
  map: Map<string, number>,
  lastActiveDate: string | null
): number {
  let sum = 0;
  map.forEach((count) => {
    sum += count;
  });

  // Decay penalty: inactive users lose score over time
  const daysSinceActive = lastActiveDate
    ? Math.floor((Date.now() - new Date(`${lastActiveDate}T00:00:00Z`).getTime()) / 86_400_000)
    : 30; // Never active = max penalty
  const decayPenalty = Math.min(daysSinceActive * 3, 50);
  
  const rawScore = (currentStreak * 2) + sum - decayPenalty;
  return Math.max(1, Math.min(100, Math.floor(rawScore)));
}

/**
 * Normalizes consistency data to standard UI shape
 */
function toNormalizedConsistency(doc: IConsistency): NormalizedConsistency {
  return {
    currentStreak: doc.currentStreak,
    longestStreak: doc.longestStreak,
    lastActiveDate: doc.lastActiveDate,
    freezeCredits: doc.freezeCredits,
    consistencyScore: computeConsistencyScore(doc.currentStreak, doc.weeklyActivity as Map<string, number>, doc.lastActiveDate),
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
export async function logActivity(userId: string, roleId: string): Promise<NormalizedConsistency> {
  await connectDB();

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // Load the doc (with version key for optimistic locking)
    let doc = await Consistency.findOne({ userId, roleId });
    if (!doc) {
      // Initialize if absolutely missing
      doc = new Consistency({ userId, roleId });
    }

    const today = new Date();
    const todayStr = getUTCDateString(today);
    const lastActiveStr = doc.lastActiveDate;
    
    // Weekly Map Initialization and Handling
    const weeklyMap = doc.weeklyActivity as Map<string, number>;
    
    // 1. Month Reset Logic (Lazy evaluation)
    if (lastActiveStr) {
      const lastActiveDateObj = new Date(lastActiveStr); // Valid UTC format parsing
      if (lastActiveDateObj.getUTCMonth() !== today.getUTCMonth() || lastActiveDateObj.getUTCFullYear() !== today.getUTCFullYear()) {
        doc.freezeCredits = 2; // Renew
      }
    }

    // 2. Streak and Freeze Logic
    if (!lastActiveStr) {
      // First time ever
      doc.currentStreak = 1;
      doc.lastActiveDate = todayStr;
    } else if (todayStr === lastActiveStr) {
      // Idempotency: the activity is just today, don't double count streak.
      // Count increments will be handled outside this block.
    } else {
      // We have a gap. Determine difference in days ignoring time.
      const todayDateOnly = new Date(`${todayStr}T00:00:00Z`);
      const lastDateOnly = new Date(`${lastActiveStr}T00:00:00Z`);
      const diffTime = Math.abs(todayDateOnly.getTime() - lastDateOnly.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive day — streak continues
        doc.currentStreak += 1;
      } else if (diffDays === 2 && doc.freezeCredits > 0) {
        // Exactly 1 missed day — freeze credit covers it
        doc.freezeCredits -= 1;
        doc.currentStreak += 1;
      } else {
        // Gap too large (3+ days), or no freeze credits — reset streak
        doc.currentStreak = 1;
      }
      doc.lastActiveDate = todayStr;
    }

    // Longest streak
    doc.longestStreak = Math.max(doc.longestStreak, doc.currentStreak);

    // 3. Weekly Activity Map
    const currentCountForToday = weeklyMap.get(todayStr) || 0;
    weeklyMap.set(todayStr, currentCountForToday + 1);

    // Pruning logic - aggressive GC for older than 7 days
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
    const sevenDaysAgoStr = getUTCDateString(sevenDaysAgo);

    for (const key of weeklyMap.keys()) {
      if (key < sevenDaysAgoStr) { // Direct string sort works on YYYY-MM-DD
        weeklyMap.delete(key);
      }
    }

    // Save with optimistic concurrency — __v mismatch throws VersionError
    try {
      doc.increment(); // Explicitly bump __v for optimistic locking
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
