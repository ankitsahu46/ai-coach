import { NextResponse } from "next/server";
import { generateRoadmapForRole } from "@/features/roadmap/services/ai";
import { normalizeRoadmapPayload } from "@/features/roadmap/utils/normalizeRoadmap";
import { normalizedRoadmapSchema, NormalizedRoadmap } from "@/features/roadmap/types";
import { logger } from "@/features/roadmap/utils/logger";
import { getFallbackRoadmap } from "@/features/roadmap/services/fallback";

// Module-level simulated idempotency lock spanning Node processes.
const inFlightRequests = new Map<string, Promise<NormalizedRoadmap>>();

export async function POST(req: Request) {
  let requestRoleTitle = "Developer";
  let requestRoleId = "fallback";

  try {
    const body = await req.json();
    const { roleTitle, roleDescription, roleId } = body;

    // Persist identifiers into scope for safe fallback generation
    requestRoleTitle = roleTitle;
    requestRoleId = roleId;

    // Validate inputs
    if (!roleTitle || typeof roleTitle !== "string" || !roleId) {
      logger.warn("Invalid Input in API Route POST", { roleTitle, roleId });
      return NextResponse.json(
        { error: "Invalid or missing 'roleTitle' or 'roleId'. Ensure role is selected." },
        { status: 400 }
      );
    }
    
    const desc = roleDescription || "Generate a comprehensive roadmap for this role.";

    // 1. Backend Idempotency Simulator Guard
    if (inFlightRequests.has(roleId)) {
      logger.info(`Idempotency Lock: Awaiting executing request for role: ${roleId}`);
      const existingData = await inFlightRequests.get(roleId);
      return NextResponse.json({ data: existingData }, { status: 200 });
    }

    logger.info(`Starting Roadmap Generation for: ${roleTitle}`);

    // Create the execution Promise boundary
    const generationPromise = (async () => {
      const rawData = await generateRoadmapForRole(roleTitle, desc);
      
      // Normalize Data securely across boundaries
      const normalizedData = normalizeRoadmapPayload(rawData, roleId, null, false);

      // Final Check
      const valid = normalizedRoadmapSchema.safeParse(normalizedData);
      
      if (!valid.success) {
        throw new Error("The AI service returned malformed data structure.");
      }
      
      return valid.data;
    })();

    // Expose memory lock
    inFlightRequests.set(roleId, generationPromise);

    try {
      // Standard resolution path
      const validData = await generationPromise;
      logger.info(`Roadmap Successfully Dispatched via API for: ${roleTitle}`);
      return NextResponse.json({ data: validData }, { status: 200 });
    } finally {
      // 1b. Clear Lock Exceptionally (Memory Leak Guard)
      inFlightRequests.delete(roleId);
    }

  } catch (error: any) {
    logger.error("Generation failed over AI Pipeline. Triggering Graceful Degradation block.", error);
    
    // 6. Graceful Degradation mapping implementation. Provide static payload to UX block.
    const rawFallback = getFallbackRoadmap(requestRoleTitle);
    
    // Enforce isFallback flag and normalized schema constraints
    const cleanFallback = normalizeRoadmapPayload(rawFallback, requestRoleId, null, true);
    
    const validFallback = normalizedRoadmapSchema.safeParse(cleanFallback);
    if (!validFallback.success) {
      // Absolute catastrophe base line. Should never be reached.
      return NextResponse.json({ error: "System fault." }, { status: 500 });
    }

    return NextResponse.json(
      { data: validFallback.data },
      { status: 200 } // Technically success because of fallback mapping!
    );
  }
}
