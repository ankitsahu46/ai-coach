import type { NormalizedConsistency } from "../types";

// Helper to get strictly YYYY-MM-DD in UTC
export function getUTCDateString(date: Date = new Date()): string {
  return date.toISOString().split("T")[0];
}

// Compute consistency score with recency-based decay
export function computeConsistencyScore(
  currentStreak: number,
  weeklyActivityCounts: number[],
  lastActiveDate: string | null
): number {
  const sum = weeklyActivityCounts.reduce((acc, count) => acc + count, 0);

  // Decay penalty: inactive users lose score over time
  const daysSinceActive = lastActiveDate
    ? Math.floor((Date.now() - new Date(`${lastActiveDate}T00:00:00Z`).getTime()) / 86_400_000)
    : 30; // Never active = max penalty
  
  const decayPenalty = Math.min(daysSinceActive * 3, 50);
  const rawScore = (currentStreak * 2) + sum - decayPenalty;
  
  return Math.max(1, Math.min(100, Math.floor(rawScore)));
}

/**
 * Pure function to calculate the mathematically exact next state of consistency.
 * Used identically by both Zustand (Optimistic) and Backend (Source of Truth)
 * to prevent UI flicker and state divergence.
 */
export function computeNextConsistencyState(
  currentState: NormalizedConsistency,
  netCompletionsToAdd: number,
  actionDate: Date = new Date()
): NormalizedConsistency {
  // If no net completions, state does not mutate forward.
  if (netCompletionsToAdd <= 0) return currentState;

  const todayStr = getUTCDateString(actionDate);
  let {
    currentStreak,
    longestStreak,
    lastActiveDate,
    freezeCredits,
    weeklyActivity
  } = currentState;

  // 1. Month Reset Logic (Lazy evaluation check)
  if (lastActiveDate) {
    const lastActiveDateObj = new Date(lastActiveDate);
    if (
      lastActiveDateObj.getUTCMonth() !== actionDate.getUTCMonth() || 
      lastActiveDateObj.getUTCFullYear() !== actionDate.getUTCFullYear()
    ) {
      freezeCredits = 2; // Renew on month boundary
    }
  }

  // 2. Streak and Freeze Logic
  if (!lastActiveDate) {
    // First time ever
    currentStreak = 1;
    lastActiveDate = todayStr;
  } else if (todayStr !== lastActiveDate) {
    // We have a gap. Determine difference in days ignoring time.
    const todayDateOnly = new Date(`${todayStr}T00:00:00Z`);
    const lastDateOnly = new Date(`${lastActiveDate}T00:00:00Z`);
    const diffTime = Math.abs(todayDateOnly.getTime() - lastDateOnly.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      currentStreak += 1;
    } else if (diffDays === 2 && freezeCredits > 0) {
      // Exactly 1 missed day — sequence saved by freeze credit
      freezeCredits -= 1;
      currentStreak += 1;
    } else {
      // Gap too large or out of freezes
      currentStreak = 1;
    }
    lastActiveDate = todayStr;
  }

  longestStreak = Math.max(longestStreak, currentStreak);

  // 3. Weekly Activity Map Update
  const newWeeklyActivity = [...weeklyActivity];
  const todayIndex = newWeeklyActivity.findIndex(a => a.date === todayStr);

  if (todayIndex > -1) {
    newWeeklyActivity[todayIndex] = {
      ...newWeeklyActivity[todayIndex],
      count: newWeeklyActivity[todayIndex].count + netCompletionsToAdd
    };
  } else {
    newWeeklyActivity.push({ date: todayStr, count: netCompletionsToAdd });
  }

  // Clean exactly like backend: prune older than 7 days
  const sevenDaysAgo = new Date(actionDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const sevenDaysAgoStr = getUTCDateString(sevenDaysAgo);

  const prunedWeeklyActivity = newWeeklyActivity
    .filter(a => a.date >= sevenDaysAgoStr)
    .sort((a, b) => a.date.localeCompare(b.date));

  // 4. Recalculate exact score
  const counts = prunedWeeklyActivity.map(a => a.count);
  const consistencyScore = computeConsistencyScore(currentStreak, counts, lastActiveDate);

  return {
    currentStreak,
    longestStreak,
    lastActiveDate,
    freezeCredits,
    weeklyActivity: prunedWeeklyActivity,
    consistencyScore
  };
}
