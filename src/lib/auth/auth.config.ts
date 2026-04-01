import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { syncUserWithDb } from "@/features/auth/services/auth.service";
import { logger } from "@/features/roadmap/utils/logger";

// ============================================
// NEXTAUTH CONFIGURATION
// ============================================
// Pure configuration file — acts as an ORCHESTRATOR.
// All heavy business logic lives in auth.service.ts.
//
// Strategy: JWT (stateless, no DB session table)
// Identity: email (unique, works across providers)
// Token payload: userId, email, name (minimal — no bloat)
// ============================================

export const { handlers, signIn, signOut, auth } = NextAuth({
  // -----------------------------------------
  // PROVIDERS
  // -----------------------------------------
  // Extensible: add GitHub, Discord, etc. by
  // simply appending to this array.
  // -----------------------------------------
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  // -----------------------------------------
  // SESSION STRATEGY
  // -----------------------------------------
  session: {
    strategy: "jwt",
  },

  // -----------------------------------------
  // CALLBACKS
  // -----------------------------------------
  // These are orchestrators — they delegate to
  // auth.service.ts for DB operations and keep
  // the token/session payloads minimal.
  // -----------------------------------------
  callbacks: {
    /**
     * signIn — Gate & DB sync
     *
     * Runs after provider authentication succeeds.
     * 1. Validates that the provider returned an email (minimal check)
     * 2. Syncs user with MongoDB (idempotent upsert)
     * 3. Attaches dbUserId to the user object for downstream callbacks
     *
     * Failure strategy:
     * - Missing email → block login (return false)
     * - DB failure → allow login anyway (auth > db)
     *   User enters the app; DB sync retries on next login.
     */
    async signIn({ user, profile }) {
      const email = user.email || profile?.email;

      // Guard: Block login if provider didn't return email
      if (!email || typeof email !== "string") {
        logger.error(
          "AUTH_ERROR: Provider did not return a valid email. Sign-in blocked.",
          { profile }
        );
        return false;
      }

      const name =
        user.name || profile?.name || email.split("@")[0] || "User";

      try {
        const { userId } = await syncUserWithDb(email, name as string);

        // Attach MongoDB _id to the user object so the jwt callback can read it.
        // This is the bridge between signIn and jwt callbacks.
        user.id = userId;
      } catch (error) {
        // PRO MOVE: Auth > DB.
        // If DB sync fails, still allow login.
        // The user enters the app; DB sync will retry on next login.
        logger.error("AUTH_ERROR: Failed to sync user with DB.", {
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      return true;
    },

    /**
     * jwt — Token construction
     *
     * Runs when a JWT is created or updated.
     * Maps ONLY minimal fields from user → token.
     *
     * ❌ Never store: full user object, roles, roadmap data
     * ✅ Only store: userId, email, name
     */
    async jwt({ token, user }) {
      // user is only available on initial sign-in, not on subsequent requests
      if (user) {
        token.userId = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    /**
     * session — Strict mapping
     *
     * Maps token fields → session.user with explicit shape.
     * Never does `session.user = token` (prevents token bloat leaking).
     */
    async session({ session, token }) {
      session.user = {
        ...session.user,
        id: (token.userId as string) || "",
        email: token.email || "",
        name: token.name || "",
        image: token.picture || null,
      };
      return session;
    },
  },

  // -----------------------------------------
  // PAGES (Optional overrides — future use)
  // -----------------------------------------
  // pages: {
  //   signIn: "/auth/signin",
  //   error: "/auth/error",
  // },
});
