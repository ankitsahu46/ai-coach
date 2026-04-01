import { NextRequest, NextResponse } from "next/server";
import { generateRoadmapForRole } from "@/features/roadmap/services/ai";
import { normalizeRoadmapPayload } from "@/features/roadmap/utils/normalizeRoadmap";
import {
  normalizedRoadmapSchema,
  postRoadmapRequestSchema,
  patchRoadmapRequestSchema,
  type NormalizedRoadmap,
} from "@/features/roadmap/types";
import { logger } from "@/features/roadmap/utils/logger";
import { getFallbackRoadmap } from "@/features/roadmap/services/fallback";
import {
  getRoadmap,
  createRoadmap,
  updateTopicCompletion,
} from "@/features/roadmap/services/db";
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth/server-utils";

// ============================================
// API ROUTE: /api/roadmap
// GET  — Fetch existing roadmap from DB
// POST — Generate via AI + persist to DB (idempotent)
// PATCH — Update topic completion (atomic)
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
      logger.warn("GET /api/roadmap — Missing roleId", { userId });
      return NextResponse.json(
        { error: "Missing required query param: 'roleId'." },
        { status: 400 }
      );
    }

    const roadmap = await getRoadmap(userId, roleId);

    if (!roadmap) {
      return NextResponse.json(
        { error: "No roadmap found for this user and role." },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: roadmap }, { status: 200 });
  } catch (error: any) {
    logger.error("GET /api/roadmap failed", { userId: userId_context, error: error.message });
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
      logger.warn("Invalid POST body", { userId, error: parseResult.error.flatten() });
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
      const existingData = await inFlightRequests.get(lockKey);
      return NextResponse.json({ data: existingData }, { status: 200 });
    }

    logger.info(`Starting Roadmap Generation`, { roleTitle, userId });

    // Create the execution Promise boundary
    const generationPromise = (async () => {
      const rawData = await generateRoadmapForRole(roleTitle, desc);

      // Normalize data securely across boundaries
      const normalizedData = normalizeRoadmapPayload(rawData, roleId, null, false);

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
      error: error.message 
    });

    // Graceful Degradation: provide static fallback payload
    const rawFallback = getFallbackRoadmap(requestRoleTitle);
    const cleanFallback = normalizeRoadmapPayload(rawFallback, requestRoleId, null, true);

    const validFallback = normalizedRoadmapSchema.safeParse(cleanFallback);
    if (!validFallback.success) {
      return NextResponse.json({ error: "System fault." }, { status: 500 });
    }

    return NextResponse.json(
      { data: validFallback.data },
      { status: 200 } // Success because fallback is still usable
    );
  }
}

// ============================================
// PATCH /api/roadmap
// ============================================
export async function PATCH(req: Request) {
  let userId_context = "unauthenticated";
  try {
    const authResult = await getAuthenticatedUser();
    if (authResult.errorResponse) {
      return unauthorizedResponse(authResult.errorResponse, authResult.status);
    }
    const userId = authResult.user.userId;
    userId_context = userId;

    const body = await req.json();

    // Validate with Zod schema (userId removed from schema)
    const parseResult = patchRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid PATCH body", { userId, error: parseResult.error.flatten() });
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { roleId, topicId, completed } = parseResult.data;

    // Secure database update — scoped tightly by userId
    const updated = await updateTopicCompletion(userId, roleId, topicId, completed);

    if (!updated) {
       logger.warn("PATCH failed: Topic not found or unauthorized", { userId, roleId, topicId });
      return NextResponse.json(
        { error: `Topic '${topicId}' not found for this user and role.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    logger.error("PATCH /api/roadmap failed", { userId: userId_context, error: error.message });
    return NextResponse.json(
      { error: "Failed to update topic completion." },
      { status: 500 }
    );
  }
}
