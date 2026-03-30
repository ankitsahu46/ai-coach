import { z } from "zod";

// ============================================
// AI API RESPONSE CONTRACT STRUCTURES
// ============================================

export const topicDifficultySchema = z.enum(["Beginner", "Intermediate", "Advanced"]);

/**
 * Zod schema matching the AI generation strict output.
 */
export const roadmapTopicSchema = z.object({
  title: z.string().describe("The name of the topic to learn"),
  description: z.string().describe("A brief description of what this topic covers"),
  difficulty: topicDifficultySchema.describe("Difficulty level of the topic"),
  estimatedTime: z.string().describe("Estimated time to learn, e.g., '2 weeks' or '40 hours'"),
});

export const roadmapResponseSchema = z.object({
  role: z.string().describe("The selected career role (e.g. Frontend Developer)"),
  topics: z.array(roadmapTopicSchema).describe("The ordered list of topics to learn"),
});

// Infer types from schemas
export type Difficulty = z.infer<typeof topicDifficultySchema>;
export type RoadmapTopicOutput = z.infer<typeof roadmapTopicSchema>;
export type RoadmapResponseOutput = z.infer<typeof roadmapResponseSchema>;

// ============================================
// NORMALIZED CLIENT-SIDE STRUCTURES
// ============================================

/**
 * Normalized topic structure including client-generated metadata
 * like unique IDs and completion states.
 */
export const normalizedTopicSchema = roadmapTopicSchema.extend({
  id: z.string().uuid(),
  completed: z.boolean(),
});

export type NormalizedTopic = z.infer<typeof normalizedTopicSchema>;

/**
 * Normalized roadmap structure containing normalized topics, API versions,
 * graceful fallback markers, and timestamp boundaries.
 */
export const normalizedRoadmapSchema = z.object({
  version: z.literal("v1").describe("Schema contract versioning"),
  role: z.string(),
  roleId: z.string(),
  userId: z.string().optional().describe("For future authentication mapping"),
  isFallback: z.boolean().optional().describe("Flagged true if generated via Graceful Degradation"),
  topics: z.array(normalizedTopicSchema),
  createdAt: z.string(),
});

export type NormalizedRoadmap = z.infer<typeof normalizedRoadmapSchema>;
