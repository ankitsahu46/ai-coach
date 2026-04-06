import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";
import { logActivity } from "@/features/consistency/services/consistency.service";
import { logger, createApiTracer, sanitizeError } from "@/lib/logger";

// ============================================
// POST /api/consistency/log
// ============================================
export async function POST(req: NextRequest) {
  const trace = createApiTracer("POST /api/consistency/log");
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    trace.userId = userId;

    const body = await req.json();
    const { roleId, action, count } = body;

    if (!roleId || action !== "TOPIC_COMPLETED") {
      trace.fail(400, "Invalid body", { action });
      return NextResponse.json(
        { error: "Invalid request body. Requires roleId and action=='TOPIC_COMPLETED'." },
        { status: 400 }
      );
    }

    const netCount = typeof count === "number" ? count : 1;

    // Backend Safety Verification (M-05: Prevent malicious or accidentally huge counts)
    if (netCount <= 0 || netCount > 50) {
      logger.warn("SUSPICIOUS_CONSISTENCY_COUNT", { userId, netCount });
      return NextResponse.json(
        { error: "Invalid activity count." },
        { status: 400 }
      );
    }

    const consistencyData = await logActivity(userId, roleId, netCount);

    trace.success({ roleId });

    // #5: Guarded analytics — never breaks core flow
    logger.analytics("STREAK_UPDATE", {
      userId,
      roleId,
      action: "activity_logged",
      requestId: trace.requestId,
    } as any);

    return NextResponse.json({ data: consistencyData }, { status: 200 });
  } catch (error: any) {
    trace.fail(500, sanitizeError(error));
    return NextResponse.json(
      { error: "Failed to log consistency activity." },
      { status: 500 }
    );
  }
}
