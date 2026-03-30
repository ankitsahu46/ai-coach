import type { RoadmapResponseOutput, NormalizedTopic, NormalizedRoadmap, Difficulty } from "../types";

// ============================================
// ROADMAP NORMALIZATION UTILITY
// Transforms AI structured payload into client-schema with DB requirements
// ============================================

const VALID_DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export function normalizeRoadmapPayload(
  rawPayload: RoadmapResponseOutput,
  roleId: string,
  user?: any, // Future-proofing for full User object injection
  isFallback: boolean = false
): NormalizedRoadmap {
  const normalizedTopics: NormalizedTopic[] = rawPayload.topics.map((topic) => {
    // 7. Strict Data Normalization: Avoid Regex, use valid array checks
    const safeDifficulty = VALID_DIFFICULTIES.includes(topic.difficulty as Difficulty)
      ? (topic.difficulty as Difficulty)
      : "Beginner";

    return {
      ...topic,
      difficulty: safeDifficulty,
      id: crypto.randomUUID(), // Always generate
      completed: false, // Default uncompleted state
    };
  });

  return {
    version: "v1", // Explicitly bind API contract version to all successful normalizer sweeps
    role: rawPayload.role,
    roleId,
    userId: user?.id, // Structure reserved for full DB hydration mapping
    isFallback,
    createdAt: new Date().toISOString(),
    topics: normalizedTopics,
  };
}
