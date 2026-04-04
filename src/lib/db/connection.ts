import mongoose from "mongoose";
import { logger } from "@/lib/logger";

// ============================================
// MONGODB CONNECTION — Singleton Pattern
// ============================================
// Uses globalThis caching to survive Next.js HMR in dev
// and avoid multiple connections per serverless invocation.
// ============================================

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not defined. Add it to your .env.local file.\n" +
      'Example: MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/career-coach"'
  );
}

/**
 * Global cache type for mongoose connection promise.
 * Prevents multiple connections during HMR in development.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Attach to globalThis so it persists across HMR reloads in dev
const globalWithMongoose = globalThis as typeof globalThis & {
  _mongooseCache?: MongooseCache;
};

if (!globalWithMongoose._mongooseCache) {
  globalWithMongoose._mongooseCache = { conn: null, promise: null };
}

const cached = globalWithMongoose._mongooseCache;

/**
 * Returns a cached mongoose connection. Creates one if none exists.
 * Safe to call from any API route — will never open duplicate connections.
 */
export async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection immediately
  if (cached.conn) {
    return cached.conn;
  }

  // Reuse in-flight connection promise (prevents race conditions)
  if (!cached.promise) {
    logger.info("Initializing new MongoDB connection...");

    cached.promise = mongoose
      .connect(MONGODB_URI!, {
        bufferCommands: false, // Fail fast if not connected
        // Future: paginate or chunk if topics grow large —
        // consider maxPoolSize tuning for high-traffic scenarios
      })
      .then((mongooseInstance) => {
        logger.info("MongoDB connected successfully.");
        return mongooseInstance;
      })
      .catch((err) => {
        // Clear the cached promise so next call retries
        cached.promise = null;
        logger.error("MongoDB connection failed:", err.message);
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
