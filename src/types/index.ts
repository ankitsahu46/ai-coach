// ============================================
// AI CAREER COACH — GLOBAL TYPES
// ============================================

/** Difficulty levels for roadmap topics */
export type Difficulty = "beginner" | "intermediate" | "advanced";

/** A single topic within a roadmap */
export interface Topic {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  estimatedHours: number;
  isCompleted: boolean;
  order: number;
}

/** A complete learning roadmap for a role */
export interface Roadmap {
  id: string;
  roleId: string;
  roleTitle: string;
  topics: Topic[];
  createdAt: string;
  updatedAt: string;
}

/** A career role that users can select */
export interface Role {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  category: RoleCategory;
  difficulty: Difficulty;
  estimatedWeeks: number;
  topicCount: number;
}

/** Categories for grouping roles */
export type RoleCategory =
  | "frontend"
  | "backend"
  | "fullstack"
  | "devops"
  | "data"
  | "mobile"
  | "ai"
  | "cloud";

/** User profile (for future auth integration) */
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  selectedRoleId?: string;
  createdAt: string;
}

/** Progress tracking for a user's roadmap */
export interface Progress {
  userId: string;
  roadmapId: string;
  completedTopicIds: string[];
  totalTopics: number;
  percentage: number;
  lastUpdated: string;
}
