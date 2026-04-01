import { auth } from "@/lib/auth/auth.config";
import { NextResponse } from "next/server";

// ============================================
// AUTH SERVER UTILITIES
// ============================================
// Shared helpers for App Router API routes to
// validate sessions and extract trusted user data.
// ============================================

export interface AuthContext {
  userId: string;
}

export interface AuthErrorResponse {
  error: string;
  code: string;
}

/**
 * Validates the NextAuth session and returns the trusted userId.
 * Intentionally kept thin: NOT a service, just a guard layer.
 *
 * @returns { userId } if authenticated, OR { errorResponse, status } if missing.
 */
export async function getAuthenticatedUser(): Promise<
  | { user: AuthContext; errorResponse?: never; status?: never }
  | { user?: never; errorResponse: AuthErrorResponse; status: number }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      errorResponse: { error: "Unauthorized", code: "AUTH_REQUIRED" },
      status: 401,
    };
  }

  return {
    user: { userId: session.user.id },
  };
}

/**
 * Standardized 401 response helper for API routes.
 */
export function unauthorizedResponse(errorResponse: AuthErrorResponse, status: number) {
  return NextResponse.json(errorResponse, { status });
}
