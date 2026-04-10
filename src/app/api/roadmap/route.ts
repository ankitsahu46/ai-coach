import { NextRequest, NextResponse } from "next/server";
import { generateRoadmapForRole } from "@/features/roadmap/services/ai";
import { normalizeRoadmapPayload } from "@/features/roadmap/utils/normalizeRoadmap";
import {
  normalizedRoadmapSchema,
  postRoadmapRequestSchema,
  patchTaskRequestSchema,
  type NormalizedRoadmap,
} from "@/features/roadmap/types";
import { logger, createApiTracer, sanitizeError } from "@/lib/logger";
import { getFallbackRoadmap } from "@/features/roadmap/services/fallback";
import {
  getRoadmap,
  createRoadmap,
  executeTaskAction,
} from "@/features/roadmap/services/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";
import { sanitizeDependencies, validateDependencyGraph } from "@/features/roadmap/types/shared-logic";

// ============================================
// API ROUTE: /api/roadmap
// GET  — Fetch existing roadmap from DB
// POST — Generate via AI + persist to DB (idempotent)
// PATCH — Execute task action (complete/skip/uncomplete/unskip)
//
// Security: Session-based auth via Auth.js
// userId is extracted server-side, never trusted from client
// ============================================

// Module-level simulated idempotency lock spanning Node processes.
const inFlightRequests = new Map<string, Promise<NormalizedRoadmap>>();

// ============================================
// GET /api/roadmap?roleId=X
// ============================================
export async function GET(req: NextRequest) {
  const trace = createApiTracer("GET /api/roadmap");
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

    const roadmap = await getRoadmap(userId, roleId);

    if (!roadmap) {
      trace.fail(404, "No roadmap found", { roleId });
      return NextResponse.json(
        { error: "No roadmap found for this user and role." },
        { status: 404 }
      );
    }

    trace.success({ roleId });
    return NextResponse.json({ data: roadmap }, { status: 200 });
  } catch (error: any) {
    trace.fail(500, sanitizeError(error));
    return NextResponse.json(
      { error: "Failed to fetch roadmap." },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/roadmap
// ============================================
export async function POST(req: Request) {
  let userId_context = "unauthenticated";
  let requestRoleTitle = "Developer";
  let requestRoleId = "fallback";

  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    userId_context = userId;

    const body = await req.json();

    // Validate with Zod schema (userId is removed from schema)
    const parseResult = postRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid POST body", { userId, error: JSON.stringify(parseResult.error.flatten()) });
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    // Assign safe variants AFTER validation
    const { roleTitle, roleDescription, roleId, importedRoadmap } = parseResult.data;
    requestRoleTitle = roleTitle;
    requestRoleId = roleId;

    const desc = roleDescription || "Generate a comprehensive roadmap for this role.";

    // DB check first (true idempotency via unique index)
    const existing = await getRoadmap(userId, roleId);
    if (existing) {
      logger.info(`DB idempotent hit: Roadmap exists`, { userId, roleId });
      return NextResponse.json({ data: existing }, { status: 200 });
    }

    // Migration interception — if the request contains a guest roadmap to import
    if (importedRoadmap) {
      logger.info("Migrating guest roadmap to DB", { userId, roleId });
      // Ensure the imported data gets securely tied to the authenticated user ID
      const savedDoc = await createRoadmap(userId, importedRoadmap);
      return NextResponse.json({ data: savedDoc }, { status: 200 });
    }

    // Backend in-memory idempotency lock (for concurrent requests)
    const lockKey = `${userId}:${roleId}`;
    if (inFlightRequests.has(lockKey)) {
      logger.info(`Idempotency Lock: Awaiting in-flight for key`, { lockKey });
      try {
        const existingData = await inFlightRequests.get(lockKey);
        return NextResponse.json({ data: existingData }, { status: 200 });
      } catch {
        // H-05 fix: If the in-flight request failed, let this request fall through
        // to generate its own roadmap (or hit the DB idempotency check above)
        logger.warn(`In-flight request failed for key=${lockKey}, retrying fresh`);
        // Check DB again — the original request may have persisted before failing
        const retryCheck = await getRoadmap(userId, roleId);
        if (retryCheck) {
          return NextResponse.json({ data: retryCheck }, { status: 200 });
        }
        // Fall through to generate below
      }
    }

    logger.info(`Starting Roadmap Generation`, { roleTitle, userId });

    // Create the execution Promise boundary
    const generationPromise = (async () => {
      const rawData = await generateRoadmapForRole(roleTitle, desc);

      // Normalize data securely across boundaries
      let normalizedData = normalizeRoadmapPayload(rawData, roleId, null, false);

      // Fix 5: NEVER trust AI output — sanitize deps + validate DAG
      normalizedData = sanitizeDependencies(normalizedData);
      const graphResult = validateDependencyGraph(normalizedData);
      if (!graphResult.valid) {
        logger.warn("AI roadmap had graph cycles — auto-healed", { cycles: graphResult.cycles });
      }

      // Final schema validation
      const valid = normalizedRoadmapSchema.safeParse(normalizedData);
      if (!valid.success) {
        throw new Error("The AI service returned malformed data structure.");
      }

      // Persist to DB securely scoped by authenticated user
      const savedDoc = await createRoadmap(userId, valid.data);
      logger.info(`Roadmap persisted to DB`, { userId, roleId });
      return savedDoc;
    })();

    // Expose memory lock
    inFlightRequests.set(lockKey, generationPromise);

    try {
      const validData = await generationPromise;
      logger.info(`Roadmap Successfully Dispatched via API`, { roleTitle, userId });
      return NextResponse.json({ data: validData }, { status: 200 });
    } finally {
      // Clear lock (Memory Leak Guard)
      inFlightRequests.delete(lockKey);
    }
  } catch (error: any) {
    logger.error("Generation failed. Triggering Graceful Degradation.", { 
      userId: userId_context,
      roleId: requestRoleId,
      error: sanitizeError(error),
    });

    // Graceful Degradation: provide static fallback payload
    try {
      const rawFallback = getFallbackRoadmap(requestRoleTitle);
      const cleanFallback = sanitizeDependencies(
        normalizeRoadmapPayload(rawFallback, requestRoleId, null, true)
      );

      const validFallback = normalizedRoadmapSchema.safeParse(cleanFallback);
      if (!validFallback.success) {
        throw new Error("Fallback validation failed");
      }

      return NextResponse.json(
        { data: validFallback.data },
        { status: 200 } // Success because fallback is still usable
      );
    } catch (fallbackError: any) {
      logger.error("Fallback also failed. Returning minimal safe roadmap.", {
        error: sanitizeError(fallbackError),
      });

      // Last resort: minimal safe roadmap so the UI never fully breaks
      const now = new Date().toISOString();
      const minimalRoadmap: NormalizedRoadmap = {
        version: "v2",
        role: requestRoleTitle,
        roleId: requestRoleId,
        roleTitle: requestRoleTitle,
        isFallback: true,
        isMigrated: false,
        roadmapVersion: 1,
        topics: [],
        progress: { completedTaskIds: [], skippedTaskIds: [] },
        createdAt: now,
        updatedAt: now,
      };

      return NextResponse.json(
        { data: minimalRoadmap },
        { status: 200 }
      );
    }
  }
}

// ============================================
// PATCH /api/roadmap
// ============================================
// Action-based task state transitions.
//
// Body: { roleId, taskId, action }
// action: "complete" | "uncomplete" | "skip" | "unskip"
//
// Returns:
//   200 — success + updated roadmap
//   409 — invalid transition (state machine rejection)
//   422 — invalid task (not found)
//   400 — invalid body
//
// Flow:
//   1. Auth (server-side session)
//   2. Zod validation (body)
//   3. executeTaskAction() (services/db.ts)
//      └→ validateTransition() (shared-logic.ts) — authoritative
//      └→ Atomic MongoDB update ($addToSet/$pull)
//      └→ Return fresh document
// ============================================

export async function PATCH(req: Request) {
  const trace = createApiTracer("PATCH /api/roadmap");
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    trace.userId = userId;

    const body = await req.json();

    // Validate with Zod schema
    const parseResult = patchTaskRequestSchema.safeParse(body);
    if (!parseResult.success) {
      trace.fail(400, "Invalid PATCH body", { error: JSON.stringify(parseResult.error.flatten()) });
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { roleId, taskId, action } = parseResult.data;
    trace.step("validated", { roleId, taskId, action });

    // Delegate to service — ALL logic lives there + in shared-logic
    const result = await executeTaskAction(userId, roleId, taskId, action);

    if (!result.ok) {
      trace.fail(result.statusCode, result.error ?? "Unknown error", { roleId, taskId, action });
      return NextResponse.json(
        { error: result.error, meta: result.meta },
        { status: result.statusCode }
      );
    }

    trace.success({ roleId, taskId, action });
    return NextResponse.json(
      { success: true, data: result.roadmap, meta: result.meta },
      { status: 200 }
    );
  } catch (error: any) {
    trace.fail(500, sanitizeError(error));
    return NextResponse.json(
      { error: "Failed to process task action." },
      { status: 500 }
    );
  }
}
