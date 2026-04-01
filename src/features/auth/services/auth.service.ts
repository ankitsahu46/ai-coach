import { connectDB } from "@/lib/db/connection";
import { User } from "@/lib/db/models";
import { logger } from "@/features/roadmap/utils/logger";

// ============================================
// AUTH SERVICE — Database Sync Layer
// ============================================
// Handles the business logic of syncing authenticated
// users with MongoDB. Called from auth.config.ts callbacks.
//
// Identity strategy: email is the unique key.
// Uses findOneAndUpdate + upsert for idempotency.
// ============================================

interface SyncUserResult {
  userId: string;
}

/**
 * Syncs an authenticated user with MongoDB.
 *
 * - Ensures DB connection before any query (critical for serverless cold starts)
 * - Uses email as the unique identifier (works across providers)
 * - Idempotent: safe to call on every sign-in (findOneAndUpdate + upsert)
 * - Returns the MongoDB _id as a string for JWT token storage
 *
 * @throws Error if DB connection or upsert fails
 */
export async function syncUserWithDb(
  email: string,
  name: string
): Promise<SyncUserResult> {
  // CRITICAL: Ensure DB connection before any Mongoose operations.
  // Without this, serverless cold starts will cause random failures.
  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: email.toLowerCase().trim() },
    {
      $setOnInsert: { email: email.toLowerCase().trim() },
      $set: { name: name.trim() },
    },
    {
      upsert: true, // Create if doesn't exist
      returnDocument: "after", // Return the updated document (replaces deprecated `new: true`)
      runValidators: true, // Enforce schema validation
    }
  );

  logger.info("AUTH_SERVICE: User synced with DB", {
    userId: user._id.toString(),
    email: user.email,
    isNew: !user.createdAt, // createdAt only exists after first insert
  });

  return { userId: user._id.toString() };
}
