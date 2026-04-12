# 🚀 AI Career Coach: Production System Context & Architecture

This is the definitive architectural handoff document for the AI Career Coach Roadmap System (v2). This document serves as the absolute source of truth for the system's design, logic, data structures, boundaries, and current progress.

---

## 1. 🚀 Project Overview

* **What the system is:** AI Career Coach is a SaaS web application providing adaptive, non-linear, and intelligent learning roadmaps for users advancing in tech careers.
* **Core goals:** Generate structured, hierarchical learning paths (Topics → Subtopics → Tasks) based on career goals using Generative AI. Ensure absolute state consistency between interactive UI, client stores, and server backend.
* **Product direction:** Provide a premium, dynamic user experience with features like dependency-locking, skip-risk assessment, alternative path routing ("Choose A or B"), and intelligent "Next Task" recommendations. The system is designed to degrade gracefully without total failure when AI limits are hit.

---

## 2. ⚙️ Tech Stack

* **Core:** Next.js 16.2.1 (App Router, Turbopack), React, TypeScript (Strict Mode)
* **Styling:** Tailwind CSS, Framer Motion
* **State Management:** Zustand (Global State Machine)
* **Database & ORM:** MongoDB via Mongoose
* **Authentication:** NextAuth (Google OAuth)
* **AI Engine:** `@google/genai` (Gemini API, Models: gemini-3.0-flash / gemini-2.5-flash-lite)
* **Validation & UI:** Zod, Sonner (Toasts)

**Stack Constraints:** 
* Strict separation between stateless UI, orchestration Hooks, and pure global state.
* Shared logic modules must be perfectly agnostic to their runtime environment (Node vs Browser).
* Next.js Server Components and API routes must never leak server logic or secrets.

---

## 3. 🧠 Core Architecture (VERY IMPORTANT)

The architecture is strictly separated across distinct layers with **unidirectional data flow**:

`UI ➔ Hooks ➔ Zustand ➔ API ➔ DB Service ➔ DB (MongoDB)`

1. **UI Layer (`RoadmapPage.tsx`, `TaskRow.tsx`):** Purely declarative. Dumb rendering based solely on `get()` states from the Zustand store. Reacts to user intent.
2. **Orchestration / Hooks (`useRoadmapGeneration.ts`):** Handles all asynchronous workflows (generation, DB fetch, cache lookup, toasts, retries, and dispatching optimistic UI bounds).
3. **State Container (`useRoadmapStore.ts`):** Single Source of Truth (SSOT) on the client. Strictly holds structural data and current progress.
4. **Calculated Pipeline (`roadmapSelectors.ts` + `shared-logic.ts`):** Derived state engine. Transforms static structural data + flat progress mapping into enriched contextual objects (locked/available states, skip risk, total % complete).
5. **API Layer (`/api/roadmap`):** Connects client updates to persistent operations. Re-validates transition logic authoritatively against server-session. Identical structure mapping. Validates inputs via Zod.
6. **DB Services (`services/db.ts`):** Executes atomic operations on the database. Retrieves documents, manages auto-migrations, processes mutations.

**Boundaries & Forbidden Patterns:**
* **UI** MUST NOT contain any computation logic for "is this completed?".
* **Store** MUST NOT contain side-effects, async behavior, or complex derived calculations; only holds base data.
* **Backend Services** MUST NOT duplicate validation logic. They must import and execute the shared algorithms from `shared-logic.ts`.

---

## 4. 🧱 Data Model (FINAL VERSION)

The schema defines a strict, 3-tier hierarchy representing the V2 system.

```typescript
type NormalizedRoadmap = {
  version: "v2";
  roleId: string;
  roleTitle: string;
  isFallback: boolean;
  isMigrated: boolean;
  roadmapVersion: number;
  topics: Topic[];
  progress: UserProgress; // IMPORTANT: Flat mapping
  createdAt: string;
  updatedAt: string;
};

type Topic = {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string;
  order: number;
  isOptional: boolean;
  subtopics: Subtopic[];
};

type Subtopic = {
  id: string;
  topicId: string;
  title: string;
  type: "core" | "optional" | "alternative";
  groupId?: string; // Used for "Choose 1 of N" alternative paths
  order: number;
  tasks: Task[];
};

type Task = {
  id: string;
  subtopicId: string;
  title: string;
  type: "learn" | "practice" | "project";
  estimatedTime: string;
  isOptional: boolean;
  isSkippable: boolean;
  priorityScore: number;
  order: number;
  dependencies: Dependency[];
  groupId?: string;
  generatedBy: "ai" | "fallback" | "human";
};

type Dependency = {
  type: "hard" | "soft";
  taskId?: string;
  groupId?: string; // Dependency against an alternative path group
};

// Flat representation of progression to bypass deeply-nested document updates.
type UserProgress = {
  completedTaskIds: string[];
  skippedTaskIds: string[];
};
```

---

## 5. 🧠 Core System Logic (`shared-logic.ts`)

`shared-logic.ts` is the foundational consistency engine. It is the purest file in the architecture, executing synchronous mathematical operations and serving as the mathematical backbone for both frontend derived state and backend transition validation.

* **Task State Resolver:** Uses Directed Acyclic Graph (DAG) checks. Computes derived status (`"locked" | "available" | "completed" | "skipped"`). A task is `locked` if its hard dependencies are neither `completed` nor `skipped`.
* **State Machine:** Governs strict action permissions. (e.g., `completed` → `uncomplete` is allowed; `locked` → `complete` throws an exception).
* **Dependency System:** Iterates target `taskId` definitions. Hard dependencies physically block access unless fulfilled or skipped. Soft dependencies adjust recommendation priorities.
* **Alternative Paths (`groupId`):** Subtopics acting as OR-gates. If one `groupId` entity is completed, the group itself acts recursively completed.
* **Skip System + Risk Levels:** Evaluates downstream tree destruction if a user skips a task. Returns `safe` (no downstream blocks), `moderate` (optional tasks blocked), or `critical` (core path blocked).
* **Next Best Task Algorithm:** Navigates the active tasks tree evaluating `priorityScore`, chronological iteration, and topic weighting to nominate the absolute best recommendation.
* **Active Window System:** Hides later topics dynamically until progress validates unlocking them, preventing visual and cognitive overload for users.
* **Fallback System (Graceful Degradation):** Intercepts AI failures (e.g., 503 errors, quotas) and issues a statically-defined curriculum, seamlessly saving it to the DB to map progression gracefully.
* **DependencyGraphCache:** A performance-memoization layer allowing downstream logic to infinitely parse the DAG without locking the JS runtime on heavily nested data structures.
* **DAG Validation + Sanitization:** Eliminates any loop traces (circular dependencies) generated artificially by AI output payload corruption.
* **ComputationContext:** Instantiates cached lookups (e.g., converting deep nested arrays into flat `O(1)` Maps) avoiding O(N^2) searches down the tree.
* **DebugMeta:** Lightweight tracing embedded inside Context logs for analytical observability.

---

## 6. 🔄 Migration System (v1 → v2)

* **Why migration exists:** The V1 schema utilized a flat topic map devoid of subtopics/tasks, incapable of supporting progressive tracking algorithms.
* **How it works:** The service layer detects a `version: "v1"` load. The migration pipeline spins up a mapping script, synthesizes dummy Subtopics/Tasks holding V1 metadata, logs `isMigrated: true`, and natively converts the architecture on the fly.
* **When it runs:** Strictly upon initial read (database retrieval).
* **Idempotency strategy:** Generates consistent hashed keys; runs exactly once. Intercepts and immediately commits the conversion directly via `$set` before returning output to the UI.
* **Edge case handling:** Handles interrupted migrations cleanly via `isMigrated` guard, preventing duplicate synthesis generation.

---

## 7. 🔌 API Design

The primary vector for roadmap mutations operates over `PATCH /api/roadmap`. 

* **Endpoints:**
  - `POST /api/roadmap` (Generate / Import Guest)
  - `PATCH /api/roadmap` (State Transition)
  - `GET /api/roadmap` (Fetch active)
* **Request Format:** `{ roleId: string, taskId: string, action: "complete" | "skip" | "uncomplete" | "unskip" }`
* **Response Format:** `{ success: boolean, data: NormalizedRoadmap, meta: { transition, skipRisk } }`
* **Error Handling:**
  - `200 OK` — Success (Returns fully updated atomic configuration)
  - `400 Bad Request` — Zod schema payload mismatch
  - `404 Not Found` — Mongoose instance missing, prevents ghost arrays
  - `409 Conflict` — State Machine rejection (Invalid execution state based on DAG boundaries)
  - `422 Unprocessable` — Task not found

---

## 8. 🧠 Services Layer

* **Responsibilities:** Interfacing securely with Mongoose. Acts as an orchestration guard.
* **Interaction with shared-logic:** Extracts request ➔ Imports purely from `shared-logic.ts` ➔ Resolves contextual trees ➔ Validates requested transition mathematically ➔ Compiles MongoDB operations.
* **Atomic strategy:** Never overwrites objects. Utilizes highly surgical operators: `$addToSet` and `$pull` inside a single command to ensure thread-safety.
* **Idempotency handling:** A prior check instantly returns `HTTP 200` with no MongoDB mutations if the target state precisely matches the calculated runtime state, guarding against client-layer retry cascades.

---

## 9. 🗄️ Database Design (MongoDB)

* **What is stored:** Only static structural generation blueprints, metadata, system states (`isFallback`), and the two critical progress lists: `completedTaskIds` and `skippedTaskIds`.
* **What is NOT stored:** State boolean flags on individual tasks, progress percentages, active recommendations, availability thresholds.
* **Why (Derived State Principle):** Keeping boolean flags off the master objects prevents race conditions, synchronization desyncs, massive recursive query overheads, and guarantees identical mathematical parity dynamically on both browser and server via the `shared-logic` pipelines.

---

## 10. 🧠 Key Engineering Principles

* **No logic in UI:** React Components possess no autonomy over validation operations. They map visual aesthetics exclusively to their properties.
* **No derived state in DB:** System architecture enforces runtime calculation exclusively.
* **Unidirectional data flow:** Flow goes specifically UI ➔ Hooks ➔ Store ➔ API ➔ DB.
* **Shared logic as single source of truth:** `shared-logic.ts` acts as the exclusive arbitrator of all transition rights and state properties globally.
* **Memory-Safe design:** Unidirectional execution avoids circular reference leaks and prevents concurrent write destruction.

---

## 11. ⚠️ Edge Cases Handled

* **Circular dependencies:** DAG Sanitization naturally strips cycle loops.
* **Skip-related dependency issues:** Evaluated natively through skip impact scoring. Downstream dependencies automatically assume inherited availability when priors are skipped.
* **No available tasks:** Next algorithm handles exhaustive empty returns cleanly.
* **Double clicks:** Ref bindings (`inFlightTasksRef`) statically guard execution queues on the browser to completely block dispatch spam.
* **Race conditions:** Database enforces `$addToSet` / `$pull` concurrency isolation routines securely matching real-time state.
* **AI invalid output:** Graceful fallback injection overrides syntax mismatch, generation timeout, quota blocks, outputting a synthetic static baseline path purely matching schemas.

---

## 12. 📍 Current System State

* **What is already implemented:** Core Consistency Engine, Global Zustand Store, V2 Hierarchical UI Rendering, Intelligent Action Routing, Nested Animations, Graceful Degradation AI Fallbacks, Client-to-DB exact synchronization tracking, LocalStorage-to-DB migration flows.
* **What parts of the system exist:** Complete Front-end Architecture, Node.js Backend API Handlers, Mongoose Migration & DB Services, Complex Graph Traversal caching system.
* **Current completeness level:** Fully Production-hardened Vertical Slice. System operates accurately and degrades intelligently on quotas failures flawlessly.

---

## 13. 🧠 Important Design Decisions

* **Flat progress model:** Reduces database interactions from complex `$elemMatch` nesting queries to simple linear slice queries. Solves MongoDB arbitrary depth limitations and natively empowers `O(1)` subset calculations.
* **Derived state approach:** Ensures Boolean flags off the master DB Object naturally abolishes locking conditions, preventing massive out-of-sync API cascading calls for simple derived properties (like a single task locking 35 upstream dependencies dynamically).
* **Graph cache usage:** Utilizing memoization structures drastically offloads UI loop stutter, eliminating complex DFS lookup trees per re-render.
* **Action-based API:** Clients dispatch strictly explicit action intents (`"complete"`), shifting algorithmic validation entirely onto the server, securing the persistence layer directly against invalid state rewrites.
* **Optimistic updates:** UI directly renders completion success based on local checks securely, with precise Snapshot Restorations undoing the view instantaneously if a server `404` or `500` executes out of band, delivering unparalleled UX responsiveness.

---

## 14. 🔒 System Constraints (Non-Negotiable)

* **Where logic can exist:** Pure algorithmic parsing strictly remains isolated inside `shared-logic.ts`. Backend API routing cannot independently calculate dependencies.
* **What must remain derived:** Progression ratios, states (`"available"`, `"locked"`), lock checks, and priority markers must constantly calculate dynamically at initialization/state modification; they CANNOT BE STORED in the database.
* **What must remain atomic:** All task-level persistences directly compile `$addToSet` accompanied instantaneously by `$pull` to strictly maintain concurrency invariants without document replacement.
* **Architectural boundaries:** UI must not perform dependency calculations, nor initiate database interactions directly.

---

## 15. 🔄 Example Data Flow

**Task completion flow from UI to DB and back:**

1. **User Action:** User focuses a `TaskRow` visually available in the UI and clicks "Complete".
2. **Hook Interception:** The orchestration hook receives the event, creating a temporal baseline snapshot of `progress`.
3. **Local Validation:** The hook asks `shared-logic.ts` to execute mathematical viability (validating task properties and confirming no locks exist).
4. **Optimistic UI Dispatch:** The operation is registered against Zustand, broadcasting instant visual modifications to the tree (checkbox animations, scaled pops).
5. **API Orchestration:** The client invokes `PATCH /api/roadmap { taskId: "xy-1", action: "complete" }`.
6. **Server Pipeline Verification:** The Mongoose service pulls the active baseline, natively imports `shared-logic.ts`, perfectly replicating the verification step matching `available` bounds securely.
7. **Atomic MongoDB Mutation:** Service fires a MongoDB query replacing boolean array components atomically globally inside memory cache using the exclusive operator array: `$addToSet: { "progress.completedTaskIds": taskId }`.
8. **Final Unification:** Server responds successfully `200 OK`. The client commits the exact baseline cleanly against its internal Store without rollbacks, resolving the loop natively gracefully.
