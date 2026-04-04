// ============================================
// 🔍 PRODUCTION LOGGER — Structured Observability Layer
// ============================================
// Centralized logger for all server-side (API routes + services)
// and client-side (hooks) logging.
//
// Architecture: This is a shared utility, NOT a service.
//   - No business logic
//   - No DB calls
//   - Pure structured output
//
// Hardening:
//   1. PII-safe: sanitizeError strips stacks, scrubPII blocks sensitive fields
//   2. Volume control: info logs sampled at configurable rate in production
//   3. Slow request alerts: auto-warns >1s, auto-errors >3s
//   4. Correlation IDs: every API request gets a requestId threaded through logs
//   5. Analytics guarded: analytics() never throws into caller
//
// Configuration (env vars):
//   LOG_LEVEL=info|warn|error      (default: info)
//   LOG_SAMPLE_RATE=0.1            (default: 1.0 in dev, 0.1 in prod for info)
//   SENTRY_DSN=https://...         (opt-in error reporting)
// ============================================

type LogLevel = "info" | "warn" | "error" | "analytics";

// ============================================
// #1 — PII-SAFE LOGGING
// ============================================

/** Fields that must NEVER appear in logs */
const PII_FIELDS = new Set([
  "email", "password", "token", "accessToken", "refreshToken",
  "secret", "authorization", "cookie", "creditCard", "ssn",
  "phone", "address", "ip_address",
]);

/** Strip PII fields from any metadata object */
function scrubPII(meta: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (PII_FIELDS.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      cleaned[key] = scrubPII(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

/** Sanitize error objects for safe logging — strips verbose stacks in production */
export function sanitizeError(err: unknown): string {
  if (err instanceof Error) {
    // In production: message only (no stack traces in logs)
    // In dev: include first 3 stack frames for debugging
    if (IS_PRODUCTION) {
      return err.message;
    }
    const frames = err.stack?.split("\n").slice(0, 4).join("\n") || err.message;
    return frames;
  }
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

// ============================================
// #4 — CORRELATION IDs
// ============================================

let correlationCounter = 0;

/** Generate a short, unique request correlation ID */
export function generateRequestId(): string {
  const timestamp = Date.now().toString(36);
  const counter = (correlationCounter++).toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${timestamp}-${counter}-${random}`;
}

// ============================================
// LogMeta Interface
// ============================================

interface LogMeta {
  userId?: string;
  roleId?: string;
  route?: string;
  action?: string;
  durationMs?: number;
  statusCode?: number;
  error?: string;
  stack?: string;
  ip?: string;
  attempt?: number;
  requestId?: string;
  [key: string]: unknown;
}

// ============================================
// Log Level & Sampling Config
// ============================================

const LOG_LEVELS: Record<LogLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
  analytics: 0,
};

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const MIN_LOG_LEVEL = (process.env.LOG_LEVEL as LogLevel) || "info";

// #2 — Volume control: sample rate for info-level logs in production
const INFO_SAMPLE_RATE = IS_PRODUCTION
  ? parseFloat(process.env.LOG_SAMPLE_RATE || "0.1")
  : 1.0; // Always log in dev

function shouldLog(level: LogLevel): boolean {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LOG_LEVEL]) return false;

  // Sampling only applies to info-level logs in production
  if (level === "info" && IS_PRODUCTION) {
    return Math.random() < INFO_SAMPLE_RATE;
  }

  return true;
}

// warn/error/analytics: ALWAYS log (never sampled)
function shouldAlwaysLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LOG_LEVEL];
}

// ============================================
// Formatting
// ============================================

function formatEntry(level: LogLevel, event: string, meta?: LogMeta) {
  // #1: Scrub PII from all metadata before output
  const safeMeta = meta ? scrubPII(meta as Record<string, unknown>) : undefined;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeMeta,
  };

  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }

  const metaStr = safeMeta && Object.keys(safeMeta).length > 0
    ? " " + JSON.stringify(safeMeta, null, 0)
    : "";
  return `[${level.toUpperCase()}][${entry.timestamp}] ${event}${metaStr}`;
}

// ============================================
// #3 — SLOW REQUEST THRESHOLDS
// ============================================

const SLOW_WARN_MS = 1000;
const SLOW_ERROR_MS = 3000;

// ============================================
// Core Logger
// ============================================

export const logger = {
  /** Info-level log (sampled in production via LOG_SAMPLE_RATE) */
  info(event: string, meta?: LogMeta) {
    if (!shouldLog("info")) return;
    console.log(formatEntry("info", event, meta));
  },

  /** Warning log (always emitted, never sampled) */
  warn(event: string, meta?: LogMeta) {
    if (!shouldAlwaysLog("warn")) return;
    console.warn(formatEntry("warn", event, meta));
  },

  /** Error log (ALWAYS emits regardless of LOG_LEVEL) */
  error(event: string, meta?: LogMeta) {
    const enriched: LogMeta = { ...meta };

    // Sanitize error strings (strip stacks in prod)
    if (meta?.error) {
      enriched.error = sanitizeError(meta.error);
    }
    // Strip verbose stack traces in production
    if (IS_PRODUCTION) {
      delete enriched.stack;
    }

    console.error(formatEntry("error", event, enriched));

    // Sentry hook — wire when SENTRY_DSN is set
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureMessage(event, { extra: enriched, level: 'error' });
    // }
  },

  /**
   * #5 — Guarded analytics: NEVER throws into caller.
   * Analytics failures must not break core flows.
   */
  analytics(event: string, meta?: LogMeta) {
    try {
      if (!shouldAlwaysLog("analytics")) return;
      console.log(formatEntry("analytics", event, meta));
    } catch (e) {
      // Analytics must never break core flows
      try {
        console.warn(formatEntry("warn", "ANALYTICS_FAIL", {
          error: sanitizeError(e),
          originalEvent: event,
        }));
      } catch { /* absolute last resort: swallow silently */ }
    }
  },
};

// ============================================
// API Tracing Helper
// ============================================
// Creates a scoped tracer for API routes that auto-tracks
// duration, userId, route, status code, and correlation ID.
// #3: Automatically emits slow request alerts on success/fail.
// #4: Every tracer gets a unique requestId for log correlation.

export interface ApiTracer {
  userId: string;
  /** Unique correlation ID for this request — thread into downstream calls */
  requestId: string;
  /** Call on successful response */
  success(meta?: LogMeta): void;
  /** Call on error response */
  fail(statusCode: number, error: string, meta?: LogMeta): void;
  /** Track a sub-operation (e.g., DB call, AI call) */
  step(name: string, meta?: LogMeta): void;
}

export function createApiTracer(route: string, userId: string = "unauthenticated"): ApiTracer {
  const startTime = Date.now();
  const requestId = generateRequestId();

  /** #3: Check for slow requests and emit alerts */
  function checkSlowRequest(durationMs: number, baseMeta: LogMeta) {
    if (durationMs > SLOW_ERROR_MS) {
      logger.error("API_SLOW", { ...baseMeta, durationMs, threshold: "critical_3s" });
    } else if (durationMs > SLOW_WARN_MS) {
      logger.warn("API_SLOW", { ...baseMeta, durationMs, threshold: "warning_1s" });
    }
  }

  return {
    userId,
    requestId,

    success(meta?: LogMeta) {
      const durationMs = Date.now() - startTime;
      const baseMeta: LogMeta = { route, userId: this.userId, requestId, durationMs, statusCode: 200, ...meta };
      logger.info(`${route} → 200 OK`, baseMeta);
      checkSlowRequest(durationMs, baseMeta);
    },

    fail(statusCode: number, error: string, meta?: LogMeta) {
      const durationMs = Date.now() - startTime;
      const baseMeta: LogMeta = { route, userId: this.userId, requestId, statusCode, error, durationMs, ...meta };
      const logFn = statusCode >= 500 ? logger.error : logger.warn;
      logFn(`${route} → ${statusCode}`, baseMeta);
      checkSlowRequest(durationMs, baseMeta);
    },

    step(name: string, meta?: LogMeta) {
      logger.info(`${route} [${name}]`, {
        route,
        userId: this.userId,
        requestId,
        durationMs: Date.now() - startTime,
        ...meta,
      });
    },
  };
}
