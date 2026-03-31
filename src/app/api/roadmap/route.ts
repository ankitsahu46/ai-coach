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

// ============================================
// API ROUTE: /api/roadmap
// GET  — Fetch existing roadmap from DB
// POST — Generate via AI + persist to DB (idempotent)
// PATCH — Update topic completion (atomic)
//
// TODO: Replace userId with session-based auth (NextAuth)
// Currently userId comes from client — NOT production-safe.
// In production, extract userId from server-side session.
// ============================================

// Module-level simulated idempotency lock spanning Node processes.
const inFlightRequests = new Map<string, Promise<NormalizedRoadmap>>();

// ============================================
// GET /api/roadmap?roleId=X&userId=Y
// ============================================
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roleId = searchParams.get("roleId");
    // TODO: Replace with session-based auth — userId should NOT come from client
    const userId = searchParams.get("userId");

    if (!roleId || !userId) {
      return NextResponse.json(
        { error: "Missing required query params: 'roleId' and 'userId'." },
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
    logger.error("GET /api/roadmap failed:", error.message);
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
  let requestRoleTitle = "Developer";
  let requestRoleId = "fallback";

  try {
    const body = await req.json();

    // Validate with Zod schema
    const parseResult = postRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid POST body:", parseResult.error.flatten());
      return NextResponse.json(
        { error: "Invalid request body. Ensure roleTitle and roleId are provided." },
        { status: 400 }
      );
    }

    const { roleTitle, roleDescription, roleId, userId } = parseResult.data;
    requestRoleTitle = roleTitle;
    requestRoleId = roleId;

    const desc = roleDescription || "Generate a comprehensive roadmap for this role.";

    // If authenticated user → check DB first (true idempotency via unique index)
    if (userId) {
      const existing = await getRoadmap(userId, roleId);
      if (existing) {
        logger.info(`DB idempotent hit: Roadmap exists for user=${userId}, role=${roleId}`);
        return NextResponse.json({ data: existing }, { status: 200 });
      }
    }

    // Backend in-memory idempotency lock (for concurrent requests)
    const lockKey = userId ? `${userId}:${roleId}` : roleId;
    if (inFlightRequests.has(lockKey)) {
      logger.info(`Idempotency Lock: Awaiting in-flight for key: ${lockKey}`);
      const existingData = await inFlightRequests.get(lockKey);
      return NextResponse.json({ data: existingData }, { status: 200 });
    }

    logger.info(`Starting Roadmap Generation for: ${roleTitle}`);

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

      // Persist to DB if authenticated
      if (userId) {
        const savedDoc = await createRoadmap(userId, valid.data);
        logger.info(`Roadmap persisted to DB for user=${userId}, role=${roleId}`);
        return savedDoc;
      }

      return valid.data;
    })();

    // Expose memory lock
    inFlightRequests.set(lockKey, generationPromise);

    try {
      const validData = await generationPromise;
      logger.info(`Roadmap Successfully Dispatched via API for: ${roleTitle}`);
      return NextResponse.json({ data: validData }, { status: 200 });
    } finally {
      // Clear lock (Memory Leak Guard)
      inFlightRequests.delete(lockKey);
    }
  } catch (error: any) {
    logger.error("Generation failed. Triggering Graceful Degradation.", error);

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
  try {
    const body = await req.json();

    // Validate with Zod schema
    const parseResult = patchRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid PATCH body:", parseResult.error.flatten());
      return NextResponse.json(
        { error: "Invalid request body. Required: userId, roleId, topicId, completed." },
        { status: 400 }
      );
    }

    // TODO: Replace userId with session-based auth — do NOT trust client-provided userId
    const { userId, roleId, topicId, completed } = parseResult.data;

    // Refinement #4: returns null if roadmap or topicId not found
    const updated = await updateTopicCompletion(userId, roleId, topicId, completed);

    if (!updated) {
      return NextResponse.json(
        { error: `Topic '${topicId}' not found for this user and role.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (error: any) {
    logger.error("PATCH /api/roadmap failed:", error.message);
    return NextResponse.json(
      { error: "Failed to update topic completion." },
      { status: 500 }
    );
  }
}
