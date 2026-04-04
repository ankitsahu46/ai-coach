import mongoose, { Schema, Document, Model } from "mongoose";

// ============================================
// USER MODEL
// ============================================
// Core identity model. Authentication is handled via NextAuth (Google OAuth).
// Email is the unique identifier across providers.
// syncUserWithDb (auth.service.ts) upserts on every sign-in.
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
