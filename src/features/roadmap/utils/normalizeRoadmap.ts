import type { RoadmapResponseInput, NormalizedRoadmap, Difficulty, Topic, Subtopic, Task } from "../types";

// ============================================
// ROADMAP NORMALIZATION UTILITY (v2)
// ============================================
// Transforms AI structured payload → NormalizedRoadmap (client+DB shape).
// Assigns stable UUIDs, enforces difficulty validation, and builds
// the full Topic → Subtopic → Task hierarchy with proper cross-refs.
// ============================================

const VALID_DIFFICULTIES: Difficulty[] = ["Beginner", "Intermediate", "Advanced"];

export function normalizeRoadmapPayload(
  rawPayload: RoadmapResponseInput,
  roleId: string,
  user?: { id?: string } | null,
  isFallback: boolean = false
): NormalizedRoadmap {
  const now = new Date().toISOString();

  const topics: Topic[] = rawPayload.topics.map((rawTopic, topicIdx) => {
    const topicId = crypto.randomUUID();

    const safeDifficulty = VALID_DIFFICULTIES.includes(rawTopic.difficulty as Difficulty)
      ? (rawTopic.difficulty as Difficulty)
      : "Beginner";

    const subtopics: Subtopic[] = (rawTopic.subtopics ?? []).map((rawSub, subIdx) => {
      const subtopicId = crypto.randomUUID();

      const tasks: Task[] = (rawSub.tasks ?? []).map((rawTask, taskIdx) => {
        const taskId = crypto.randomUUID();
        return {
          id: taskId,
          subtopicId,
          title: rawTask.title,
          type: rawTask.type ?? "learn",
          estimatedTime: rawTask.estimatedTime ?? "1 hour",
          isOptional: rawTask.isOptional ?? false,
          isSkippable: rawTask.isSkippable ?? true,
          priorityScore: rawTask.priorityScore ?? 50,
          order: taskIdx,
          dependencies: (rawTask.dependencyRefs ?? []).map((ref) => ({
            type: rawTask.dependencyType ?? "soft",
            taskId: ref,
          })),
          groupId: rawTask.groupId,
          generatedBy: "ai" as const,
        };
      });

      return {
        id: subtopicId,
        topicId,
        title: rawSub.title,
        type: rawSub.type ?? "core",
        groupId: rawSub.groupId,
        tasks,
        order: subIdx,
      };
    });

    // If no subtopics from AI, wrap all as a single "Core Concepts" subtopic
    // This handles backward-compatible AI prompts
    if (subtopics.length === 0) {
      const subtopicId = crypto.randomUUID();
      subtopics.push({
        id: subtopicId,
        topicId,
        title: "Core Concepts",
        type: "core",
        tasks: [],
        order: 0,
      });
    }

    return {
      id: topicId,
      title: rawTopic.title,
      description: rawTopic.description,
      order: topicIdx,
      isOptional: rawTopic.isOptional ?? false,
      difficulty: safeDifficulty,
      estimatedTime: rawTopic.estimatedTime,
      subtopics,
    };
  });

  return {
    version: "v2",
    role: rawPayload.role,
    roleTitle: rawPayload.role,
    roleId,
    userId: user?.id,
    isFallback,
    isMigrated: false,
    roadmapVersion: 1,
    topics,
    progress: {
      completedTaskIds: [],
      skippedTaskIds: [],
    },
    createdAt: now,
    updatedAt: now,
  };
}
