import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";
import { getConsistency } from "@/features/consistency/services/consistency.service";
import { createApiTracer, sanitizeError } from "@/lib/logger";

// ============================================
// GET /api/consistency?roleId=X
// ============================================
export async function GET(req: NextRequest) {
  const trace = createApiTracer("GET /api/consistency");
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    trace.userId = userId;

    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");

    if (!roleId) {
      trace.fail(400, "Missing roleId");
      return NextResponse.json(
        { error: "Missing required query param: 'roleId'." },
        { status: 400 }
      );
    }

    const consistencyData = await getConsistency(userId, roleId);

    trace.success({ roleId });
    return NextResponse.json({ data: consistencyData }, { status: 200 });
  } catch (error: any) {
    trace.fail(500, sanitizeError(error));
    return NextResponse.json(
      { error: "Failed to fetch consistency data." },
      { status: 500 }
    );
  }
}
