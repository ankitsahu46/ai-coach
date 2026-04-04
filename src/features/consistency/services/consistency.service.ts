import { connectDB } from "@/lib/db/connection";
import { Consistency, type IConsistency } from "@/lib/db/models";
import type { NormalizedConsistency } from "../types";
import { logger } from "@/features/roadmap/utils/logger";

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

// Compute the consistency score bounded to 1-100 logic
function computeConsistencyScore(currentStreak: number, map: Map<string, number>): number {
  let sum = 0;
  map.forEach((count) => {
    sum += count;
  });
  
  const rawScore = (currentStreak * 2) + sum;
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
    consistencyScore: computeConsistencyScore(doc.currentStreak, doc.weeklyActivity as Map<string, number>),
    weeklyActivity: formatWeeklyActivity(doc.weeklyActivity as Map<string, number>),
  };
}

/**
 * Fetches consistency data, initializing if not present.
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

  return toNormalizedConsistency(doc);
}

/**
 * Handle topic completion payload to increment streaks, apply freezes, and log maps idempotently.
 */
export async function logActivity(userId: string, roleId: string): Promise<NormalizedConsistency> {
  await connectDB();

  // Load the doc
  let doc = await Consistency.findOne({ userId, roleId });
  if (!doc) {
    // initialize if absolutely missing
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
      // Continuation
      doc.currentStreak += 1;
    } else {
      // Missing exactly 1+ days -> check freezes
      if (doc.freezeCredits > 0) {
        doc.freezeCredits -= 1;
        doc.currentStreak += 1; // It extends despite gap
      } else {
        // Reset
        doc.currentStreak = 1;
      }
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

  // Save the modified doc
  await doc.save();
  logger.info(`Activity logged for user=${userId}, roleId=${roleId}, streak=${doc.currentStreak}`);

  return toNormalizedConsistency(doc);
}
