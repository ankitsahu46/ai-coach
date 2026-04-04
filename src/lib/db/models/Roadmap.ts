import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================
// ROADMAP MODEL
// ============================================
// Source of truth for user roadmaps.
// Compound index on { userId, roleId } ensures one roadmap per user+role.
// Topics are embedded (not referenced) for single-query reads.
// Future: paginate or chunk if topics grow large.
// ============================================

/** Embedded topic subdocument interface */
export interface IRoadmapTopic {
  id: string; // UUID generated at normalization time
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  completed: boolean;
}

/** Root roadmap document interface */
export interface IRoadmap extends Document {
  _id: mongoose.Types.ObjectId;
  userId: string;
  roleId: string;
  roleTitle: string; // Refinement #2: standardized naming (was "role")
  version: string;
  isFallback: boolean;
  topics: IRoadmapTopic[];
  createdAt: Date;
  updatedAt: Date;
}

const RoadmapTopicSchema = new Schema<IRoadmapTopic>(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    difficulty: {
      type: String,
      required: true,
      enum: ["Beginner", "Intermediate", "Advanced"],
    },
    estimatedTime: { type: String, required: true },
    completed: { type: Boolean, default: false },
  },
  { _id: false } // No separate _id for subdocuments
);

const RoadmapSchema = new Schema<IRoadmap>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    roleId: {
      type: String,
      required: true,
    },
    roleTitle: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      default: "v1",
    },
    isFallback: {
      type: Boolean,
      default: false,
    },
    topics: {
      type: [RoadmapTopicSchema],
      default: [],
    },
  },
  {
    timestamps: true, // Auto-manages createdAt + updatedAt
  }
);

// Compound unique index: one roadmap per user + role (idempotency guarantee)
RoadmapSchema.index({ userId: 1, roleId: 1 }, { unique: true });

// Prevent model recompilation in dev (HMR)
export const Roadmap: Model<IRoadmap> =
  mongoose.models.Roadmap || mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
