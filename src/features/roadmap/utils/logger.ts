// ============================================
// STRUCTURED LOGGER
// Environment-aware logging utility
// ============================================

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  info: (message: string, meta?: any) => {
    if (isDev) {
      console.log(`[INFO][${new Date().toISOString()}] ${message}`, meta || "");
    }
  },
  warn: (message: string, meta?: any) => {
    if (isDev) {
      console.warn(`[WARN][${new Date().toISOString()}] ${message}`, meta || "");
    }
  },
  error: (message: string, meta?: any) => {
    // We always want to see errors, even in prod, but could hook to Sentry later
    console.error(`[ERROR][${new Date().toISOString()}] ${message}`, meta || "");
  },
};
