import { NextResponse } from "next/server";
import { generateRoadmapForRole } from "@/features/roadmap/services/ai";
import { normalizeRoadmapPayload } from "@/features/roadmap/utils/normalizeRoadmap";
import {
  normalizedRoadmapSchema,
  postRoadmapRequestSchema,
  type NormalizedRoadmap,
} from "@/features/roadmap/types";
import { logger } from "@/features/roadmap/utils/logger";
import { getFallbackRoadmap } from "@/features/roadmap/services/fallback";

// ============================================
// API ROUTE: /api/roadmap/guest
// POST — Generate via AI for unauthenticated users
//
// Security: Open. No DB persistence. Returns generated JSON only.
// Client handles mapping to localStorage.
// ============================================

// Module-level simulated idempotency lock spanning Node processes.
const inFlightRequests = new Map<string, Promise<NormalizedRoadmap>>();

export async function POST(req: Request) {
  let requestRoleTitle = "Developer";
  let requestRoleId = "fallback";

  try {
    const body = await req.json();

    // Validate with Zod schema 
    const parseResult = postRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid POST body (Guest)", { error: parseResult.error.flatten() });
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    // Assign safe variants AFTER validation
    const { roleTitle, roleDescription, roleId } = parseResult.data;
    requestRoleTitle = roleTitle;
    requestRoleId = roleId;

    const desc = roleDescription || "Generate a comprehensive roadmap for this role.";

    // Backend in-memory idempotency lock (for concurrent requests)
    const lockKey = `guest:${roleId}`;
    if (inFlightRequests.has(lockKey)) {
      logger.info(`Idempotency Lock (Guest): Awaiting in-flight for key`, { lockKey });
      const existingData = await inFlightRequests.get(lockKey);
      return NextResponse.json({ data: existingData }, { status: 200 });
    }

    logger.info(`Starting Roadmap Generation (Guest)`, { roleTitle });

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

      // Guest flow: skip createRoadmap(userId) and return payload directly.
      logger.info(`Roadmap generated for Guest`, { roleId });
      return valid.data;
    })();

    // Expose memory lock
    inFlightRequests.set(lockKey, generationPromise);

    try {
      const validData = await generationPromise;
      logger.info(`Roadmap Successfully Dispatched via Guest API`, { roleTitle });
      return NextResponse.json({ data: validData }, { status: 200 });
    } finally {
      // Clear lock (Memory Leak Guard)
      inFlightRequests.delete(lockKey);
    }
  } catch (error: any) {
    logger.error("Guest Generation failed. Triggering Graceful Degradation.", { 
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
