/**
 * Safely sweeps localStorage for data tied exclusively to the provided user ID.
 * Leaves guest data completely untouched.
 * 
 * @param userId - The MongoDB ID string of the authenticated user
 */
export function clearAuthCache(userId?: string | null) {
  if (!userId || typeof window === "undefined") return;

  try {
    const keysToRemove: string[] = [];
    const roadmapPrefix = `roadmap:user_${userId}:`;
    const migrationPrefix = `migration_done_${userId}_`;

    // 1. Identify targeted keys safely based on rigorous string prefixing
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      if (key && (key.startsWith(roadmapPrefix) || key.startsWith(migrationPrefix))) {
        keysToRemove.push(key);
      }
    }

    // 2. Perform destruction
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
    });

    // Logging purely for dev environments
    if (process.env.NODE_ENV === "development") {
      console.log(`[Cache Manager] Swept ${keysToRemove.length} auth-scoped keys for user ${userId}.`);
    }

  } catch (error) {
    console.warn("Failed to securely clear scoped cache on logout:", error);
  }
}
