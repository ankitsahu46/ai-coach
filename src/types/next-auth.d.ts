import "next-auth";
import "next-auth/jwt";

// ============================================
// NEXTAUTH TYPE EXTENSIONS
// ============================================
// Extends the default NextAuth types to include
// the MongoDB userId on session.user and JWT token.
//
// Without this, TypeScript will error when accessing
// session.user.id anywhere in the app.
// ============================================

declare module "next-auth" {
  interface Session {
    user: {
      /** MongoDB _id, used across all API routes and hooks */
      id: string;
      email: string;
      name: string;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    /** MongoDB _id, mapped from signIn → jwt → session */
    userId?: string;
  }
}
