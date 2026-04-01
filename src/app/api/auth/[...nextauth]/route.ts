import { handlers } from "@/lib/auth/auth.config";

// ============================================
// NEXTAUTH API ROUTE — App Router Handler
// ============================================
// Exposes GET and POST for /api/auth/[...nextauth]
// All config lives in auth.config.ts — this file
// is just a thin passthrough.
// ============================================

export const { GET, POST } = handlers;
