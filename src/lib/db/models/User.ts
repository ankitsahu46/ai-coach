import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================
// USER MODEL
// ============================================
// TODO: Replace userId with session-based auth (NextAuth/Clerk)
// Currently userId is passed from client — NOT production-safe.
// This model is the foundation for future auth integration.
// ============================================

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  name: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Prevent model recompilation in dev (HMR)
export const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
