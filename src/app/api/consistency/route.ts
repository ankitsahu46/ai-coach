import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";
import { getConsistency } from "@/features/consistency/services/consistency.service";
import { logger } from "@/features/roadmap/utils/logger";

// ============================================
// GET /api/consistency?roleId=X
// ============================================
export async function GET(req: NextRequest) {
  let userId_context = "unauthenticated";
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    userId_context = userId;

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      logger.warn("GET /api/consistency — Missing roleId", { userId });
      return NextResponse.json(
        { error: "Missing required query param: 'roleId'." },
        { status: 400 }
      );
    }

    const consistencyData = await getConsistency(userId, roleId);

    return NextResponse.json({ data: consistencyData }, { status: 200 });
  } catch (error: any) {
    logger.error("GET /api/consistency failed", { userId: userId_context, error: error.message });
    return NextResponse.json(
      { error: "Failed to fetch consistency data." },
      { status: 500 }
    );
  }
}
