import { GoogleGenAI } from "@google/genai";
import { roadmapResponseSchema, RoadmapResponseOutput } from "../types";
import { logger } from "../utils/logger";
import { injectAIFailureMock } from "../utils/testHelpers";

const AI_TIMEOUT_MS = 15000;

/**
 * Helper to enforce a strict timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`AI service timeout after ${ms}ms`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

/**
 * Wrapper for the AI call with 1 smart retry.
 * Retries on network timeouts or JSON syntax errors.
 */
async function generateWithRetry(callAi: (attempt: number) => Promise<RoadmapResponseOutput>): Promise<RoadmapResponseOutput> {
  const maxAttempts = 2; // 1 initial + 1 retry

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        logger.warn(`Retrying AI generation (attempt ${attempt})`);
      }
      
      // Inject test-driven resilience failures exclusively in Development mode
      injectAIFailureMock(attempt);

      return await callAi(attempt);
    } catch (error: any) {
      const isSyntaxOrTimeout =
        error instanceof SyntaxError ||
        error.message.includes("timeout") ||
        error.name === "ZodError";

      // If it's the last attempt or a non-retryable error, throw it upward
      if (attempt === maxAttempts || !isSyntaxOrTimeout) {
        logger.error(`AI execution failed permanently on attempt ${attempt}.`, error.message);
        throw error;
      }
      // Otherwise loop around and try again
      logger.warn("AI generation failed. Waiting 1000ms before retrying...");
      await new Promise((res) => setTimeout(res, 1000));
    }
  }
  throw new Error("Unreachable");
}

/**
 * Generates an AI roadmap for a specific career role.
 * Ensures the output strictly conforms to the JSON schema.
 */
export async function generateRoadmapForRole(
  roleTitle: string,
  roleDescription: string
): Promise<RoadmapResponseOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server. Please ensure it's in your .env.local file and RESTART the Next.js dev server.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
You are an expert Senior Full-Stack Architect and Career Coach. 
Your task is to generate a comprehensive, structured learning roadmap for a person who wants to become a "${roleTitle}".
Context about the role: ${roleDescription}

You MUST return the output EXACTLY matching this JSON structure:
{
  "role": "${roleTitle}",
  "topics": [
    {
      "title": "Topic Name",
      "description": "Brief description of the concept and why it's important",
      "difficulty": "Beginner|Intermediate|Advanced",
      "estimatedTime": "e.g., 2 weeks or 40 hours"
    }
  ]
}

Rules:
1. Provide at least 10 core topics arranged in a logical learning progression (foundational to advanced).
2. ONLY RETURN VALID JSON. Do not include markdown formatting. Do not include any explanations before or after.
3. The difficulty must strictly be one of: "Beginner", "Intermediate", or "Advanced".
`;

  return generateWithRetry(async () => {
    const aiCall = ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 0.3, // Low temperature for consistent structural output
      },
    });

    const response = await withTimeout(aiCall, AI_TIMEOUT_MS);
    const text = response.text || "";

    logger.info("Raw AI Response fetched successfully.", { length: text.length });

    // Clean any rogue markdown framing
    const cleanJson = text.replace(/```json\n?/g, "").replace(/```/g, "").trim();

    // Let JSON.parse catch fundamental corruption
    const parsedData = JSON.parse(cleanJson);
    
    // Validate structural schema safety
    return roadmapResponseSchema.parse(parsedData);
  });
}
