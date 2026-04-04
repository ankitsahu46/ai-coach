// ============================================
// LOGGER — Re-export from centralized location
// ============================================
// All imports of `@/features/roadmap/utils/logger` now resolve
// to the production-grade logger at `@/lib/logger`.
// This file exists only for backward compatibility.
// New code should import directly from `@/lib/logger`.
// ============================================

export {
  logger,
  createApiTracer,
  sanitizeError,
  generateRequestId,
  type ApiTracer,
} from "@/lib/logger";
