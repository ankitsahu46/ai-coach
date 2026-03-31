import { connectDB } from "@/lib/db/connection";
import { Roadmap, type IRoadmap } from "@/lib/db/models";
import type { NormalizedRoadmap, NormalizedTopic } from "../types";
import { logger } from "../utils/logger";

// ============================================
// DATABASE SERVICE LAYER
// ============================================
// All DB logic lives HERE — never in API routes.
// Functions return NormalizedRoadmap (frontend-ready shape).
// TODO: Replace userId with session-based auth (NextAuth)
// ============================================

/**
 * Converts a Mongoose Roadmap document → NormalizedRoadmap
 * Ensures consistent shape across DB → API → Frontend boundary.
 */
function toNormalizedRoadmap(doc: IRoadmap): NormalizedRoadmap {
  return {
    version: (doc.version as "v1") || "v1",
    role: doc.roleTitle, // Backward compat: 'role' = human-readable title
    roleId: doc.roleId,
    roleTitle: doc.roleTitle,
    userId: doc.userId.toString(),
    isFallback: doc.isFallback ?? false,
    topics: doc.topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      difficulty: t.difficulty,
      estimatedTime: t.estimatedTime,
      completed: t.completed,
    })) as NormalizedTopic[],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// ============================================
// SERVICE FUNCTIONS
// ============================================

/**
 * Fetch a roadmap by userId + roleId.
 * Returns null if not found.
 */
export async function getRoadmap(
  userId: string,
  roleId: string
): Promise<NormalizedRoadmap | null> {
  await connectDB();

  const doc = await Roadmap.findOne({ userId, roleId }).lean<IRoadmap>();

  if (!doc) {
    logger.info(`No roadmap found in DB for user=${userId}, role=${roleId}`);
    return null;
  }

  logger.info(`Roadmap fetched from DB for user=${userId}, role=${roleId}`);
  // lean() returns a plain object, so we manually construct dates
  return {
    version: (doc.version as "v1") || "v1",
    role: doc.roleTitle,
    roleId: doc.roleId,
    roleTitle: doc.roleTitle,
    userId: doc.userId.toString(),
    isFallback: doc.isFallback ?? false,
    topics: doc.topics.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      difficulty: t.difficulty,
      estimatedTime: t.estimatedTime,
      completed: t.completed,
    })) as NormalizedTopic[],
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * Create a roadmap in DB. Idempotent via upsert:
 * if (userId + roleId) already exists → returns existing document.
 * if not exists → creates atomically.
 */
export async function createRoadmap(
  userId: string,
  data: NormalizedRoadmap
): Promise<NormalizedRoadmap> {
  await connectDB();

  const doc = await Roadmap.findOneAndUpdate(
    { userId, roleId: data.roleId },
    {
      $setOnInsert: {
        userId,
        roleId: data.roleId,
        roleTitle: data.roleTitle || data.role, // Map from normalized 'role' → DB 'roleTitle'
        version: data.version || "v1",
        isFallback: data.isFallback ?? false,
        topics: data.topics.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          difficulty: t.difficulty,
          estimatedTime: t.estimatedTime,
          completed: t.completed,
        })),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  logger.info(`Roadmap upsert executed in DB for user=${userId}, role=${data.roleId}`);
  return toNormalizedRoadmap(doc);
}

/**
 * Atomically update a single topic's completion status.
 * Uses MongoDB positional operator ($) for surgical update — no full-doc overwrite.
 *
 * Refinement #4: Returns null if topicId not found (caller handles 404).
 */
export async function updateTopicCompletion(
  userId: string,
  roleId: string,
  topicId: string,
  completed: boolean
): Promise<NormalizedRoadmap | null> {
  await connectDB();

  // Atomic positional update: only touches the matched topic
  const result = await Roadmap.findOneAndUpdate(
    {
      userId,
      roleId,
      "topics.id": topicId, // Match the specific topic within the array
    },
    {
      $set: { "topics.$.completed": completed },
      // updatedAt is auto-managed by Mongoose timestamps
    },
    { new: true } // Return the updated document
  );

  // Refinement #4: topicId not found → return null for 404 handling
  if (!result) {
    logger.warn(
      `Topic update failed: no match for user=${userId}, role=${roleId}, topic=${topicId}`
    );
    return null;
  }

  logger.info(`Topic ${topicId} marked completed=${completed} for user=${userId}`);
  return toNormalizedRoadmap(result);
}
