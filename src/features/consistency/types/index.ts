export interface NormalizedConsistency {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezeCredits: number;
  consistencyScore: number;
  weeklyActivity: { date: string; count: number }[]; // Array of chartable points D3/Recharts style
}

export interface ConsistencyLogPayload {
  roleId: string;
  action: "TOPIC_COMPLETED"; // Explicitly required string literal
  topicId?: string; // Optional context for analytics
}
