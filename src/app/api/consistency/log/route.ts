import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";
import { logActivity } from "@/features/consistency/services/consistency.service";
import { logger } from "@/features/roadmap/utils/logger";

// ============================================
// POST /api/consistency/log
// ============================================
export async function POST(req: NextRequest) {
  let userId_context = "unauthenticated";
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    userId_context = userId;

    const body = await req.json();

    if (!body || !body.roleId || body.action !== "TOPIC_COMPLETED") {
      logger.warn("POST /api/consistency/log — Invalid body", { userId, body });
      return NextResponse.json(
        { error: "Invalid request body. Requires roleId and action=='TOPIC_COMPLETED'." },
        { status: 400 }
      );
    }

    const { roleId } = body;

    const consistencyData = await logActivity(userId, roleId);

    return NextResponse.json({ data: consistencyData }, { status: 200 });
  } catch (error: any) {
    logger.error("POST /api/consistency/log failed", { userId: userId_context, error: error.message });
    return NextResponse.json(
      { error: "Failed to log consistency activity." },
      { status: 500 }
    );
  }
}
