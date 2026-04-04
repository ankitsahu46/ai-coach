import mongoose, { Document, Model, Schema } from "mongoose";

// ============================================
// CONSISTENCY TRACKING MODEL
// ============================================

export interface IConsistency extends Document {
  userId: string;
  roleId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null; // ISO Date YYYY-MM-DD
  freezeCredits: number;
  weeklyActivity: Map<string, number>; // e.g., { "2026-04-03": 2 }
  createdAt: Date;
  updatedAt: Date;
}

const ConsistencySchema = new Schema<IConsistency>(
  {
    userId: { type: String, required: true },
    roleId: { type: String, required: true },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastActiveDate: { type: String, default: null }, // format: "YYYY-MM-DD"
    freezeCredits: { type: Number, default: 2 },
    weeklyActivity: { 
      type: Map, 
      of: Number, 
      default: {}
    },
  },
  { timestamps: true }
);

// Compound index for extremely fast lookups using userId+roleId
ConsistencySchema.index({ userId: 1, roleId: 1 }, { unique: true });

// Prevent model overwrite upon HMR
export const Consistency: Model<IConsistency> =
  mongoose.models.Consistency ||
  mongoose.model<IConsistency>("Consistency", ConsistencySchema);
