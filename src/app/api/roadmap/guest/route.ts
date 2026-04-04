import { NextRequest, NextResponse } from "next/server";
import { generateRoadmapForRole } from "@/features/roadmap/services/ai";
import { normalizeRoadmapPayload } from "@/features/roadmap/utils/normalizeRoadmap";
import {
  normalizedRoadmapSchema,
  postRoadmapRequestSchema,
  type NormalizedRoadmap,
} from "@/features/roadmap/types";
import { logger, createApiTracer, sanitizeError } from "@/lib/logger";
import { getFallbackRoadmap } from "@/features/roadmap/services/fallback";

// ============================================
// API ROUTE: /api/roadmap/guest
// POST — Generate via AI for unauthenticated users
//
// Security: Open but rate-limited. No DB persistence.
// Client handles mapping to localStorage.
// ============================================

// H-02: IP-based rate limiting to prevent Gemini API cost attacks
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const ipBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = ipBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }
  return false;
}

// Periodic cleanup of expired IP buckets (prevents memory leak)
setInterval(() => {
  const now = Date.now();
  for (const [ip, bucket] of ipBuckets) {
    if (now > bucket.resetAt) ipBuckets.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS * 2);

// Module-level simulated idempotency lock spanning Node processes.
const inFlightRequests = new Map<string, Promise<NormalizedRoadmap>>();

export async function POST(req: NextRequest) {
  // H-02: Rate limit check
  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(clientIp)) {
    logger.warn("Guest API rate limited", { ip: clientIp });
    return NextResponse.json(
      { error: "Too many requests. Please wait before generating another roadmap." },
      { status: 429 }
    );
  }

  let requestRoleTitle = "Developer";
  let requestRoleId = "fallback";

  try {
    const body = await req.json();

    // Validate with Zod schema 
    const parseResult = postRoadmapRequestSchema.safeParse(body);
    if (!parseResult.success) {
      logger.warn("Invalid POST body (Guest)", { error: JSON.stringify(parseResult.error.flatten()) });
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
      error: sanitizeError(error),
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
