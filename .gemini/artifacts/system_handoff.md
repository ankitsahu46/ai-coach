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
* **Styling:** Tailwind CSS, Motion (v12, formerly Framer Motion)
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

1. **UI Layer (Headless Roadmap UI Module):** Purely declarative. Receives pre-computed ViewModels. All interactions emit via a single `onAction` facade. Located at `src/features/roadmap/components/roadmap-ui/`. **MUST NOT be modified for logic changes — only for pure presentational fixes.**
2. **Container Layer (`RoadmapContainer.tsx`):** Bridges the headless UI module with the orchestrator hook. Handles hydration safety, persistent header (role + navigation), loading/error/empty states, and CSS scope boundary (`.roadmap-ui`). This is the ONLY place to add navigation controls or layout-level UX.
3. **Orchestration / Hooks (`useRoadmapGeneration.ts`):** Handles all asynchronous workflows (generation, DB fetch, cache lookup, toasts, retries, and dispatching optimistic UI bounds). Transforms store data into `RoadmapPageProps` ViewModels via selectors.
4. **Selectors (`roadmapSelectors.ts`):** Memoized derived state. Key hooks:
   - `useRoadmapDerivedState()` → returns `{ allTasks, graphCache, taskStatesMap, nextTaskId }`
   - `useTopicViews(roadmap, derivedState)` → transforms normalized topics into `TopicView[]` ViewModels
   - `useRoadmapStats()`, `useGraphCache()`, `useNextTask()`, `useAllTaskStates()`
5. **State Container (`useRoadmapStore.ts`):** Single Source of Truth (SSOT) on the client. Strictly holds structural data and current progress.
6. **Shared Logic Engine (`shared-logic.ts`):** Pure synchronous computation. Task state resolution, transition validation, dependency graph analysis, skip risk assessment, next-task recommendation algorithm. Used by both frontend selectors and backend API validation.
7. **API Layer (`/api/roadmap`):** Connects client updates to persistent operations. Validates transitions via shared-logic.
8. **DB Services (`services/db.ts`):** Atomic MongoDB operations with `$addToSet`/`$pull`.

**Boundaries & Forbidden Patterns:**
* **UI State Ownership Rule (Critical):** Zustand explicitly owns global interaction states like `selectedTaskId` and `focusTaskId`. This ensures focus mode stacking, overlay management, and future deep-linking stay perfectly synced across the application without local React state spaghetti.
* **UI Module** MUST NOT contain any computation logic. Pure rendering of ViewModels.
* **Container** MUST NOT contain business logic. Only layout, navigation, and state-routing.
* **Store** MUST NOT contain side-effects, async behavior, or derived calculations.
* **Backend Services** MUST NOT duplicate validation logic — they import from `shared-logic.ts`.

---

## 4. 📂 File Map (Key Files)

```
src/
├── app/
│   ├── layout.tsx                    # Root layout, imports roadmap-ui CSS
│   ├── page.tsx                      # Home / Role selection
│   ├── roadmap/page.tsx              # Renders AppShell > RoadmapContainer
│   ├── dashboard/page.tsx            # Dashboard v1 page
│   ├── dashboard-v2/page.tsx         # Dashboard v2 page (WIP)
│   └── api/
│       ├── roadmap/route.ts          # API: GET/POST/PATCH
│       ├── auth/                     # NextAuth routes
│       ├── consistency/              # Consistency engine API
│       └── gamification/             # Gamification API
│
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx              # Shared wrapper (ThemeToggle, AuthMenu at z-50)
│   │   └── AuthMenu.tsx              # Auth controls
│   ├── atoms/                        # Shared atomic UI primitives
│   ├── molecules/                    # Shared composite UI components
│   └── icons/                        # Shared icon components
│
├── features/
│   ├── roadmap/
│   │   ├── components/
│   │   │   ├── RoadmapContainer.tsx      # ⭐ Data connector + persistent header
│   │   │   └── roadmap-ui/              # ⭐ Headless UI module (DO NOT add logic here)
│   │   │       ├── types.ts              # ViewModels, RoadmapAction, RoadmapPageProps
│   │   │       ├── index.css             # Scoped styles (.roadmap-ui)
│   │   │       └── components/
│   │   │           ├── RoadmapPage.tsx    # Composition root
│   │   │           ├── RoadmapHeader.tsx  # Dynamic title + progress (accepts title prop)
│   │   │           ├── TopicAccordion.tsx # Topic card (accepts recommendedTaskId)
│   │   │           ├── SubtopicSection.tsx
│   │   │           ├── TaskRow.tsx        # Task row with "START HERE" badge
│   │   │           ├── TaskDetailPanel.tsx # Slide-over panel (z-[60])
│   │   │           ├── FocusMode.tsx      # Full-screen focus (z-50)
│   │   │           ├── Confetti.tsx       # Celebration overlay (z-50)
│   │   │           ├── ContinueLearningBar.tsx
│   │   │           ├── DailyPlanBar.tsx
│   │   │           ├── MomentumBanner.tsx
│   │   │           ├── StreakWidget.tsx
│   │   │           ├── WeeklySummary.tsx
│   │   │           └── ProgressRing.tsx, Icons.tsx
│   │   ├── hooks/
│   │   │   └── useRoadmapGeneration.ts   # ⭐ Orchestrator hook
│   │   ├── store/
│   │   │   ├── useRoadmapStore.ts        # Zustand state container
│   │   │   └── roadmapSelectors.ts       # ⭐ Memoized selectors (derived state)
│   │   ├── types/
│   │   │   ├── index.ts                  # Core types (NormalizedRoadmap, Task, etc.)
│   │   │   └── shared-logic.ts           # ⭐ Pure computation engine (1300+ lines)
│   │   ├── services/
│   │   │   ├── ai.ts                     # AI orchestrator (Gemini API, 60s timeout)
│   │   │   ├── db.ts                     # MongoDB atomic operations
│   │   │   ├── fallback.ts               # Fallback roadmap generator
│   │   │   └── migration.ts              # v1→v2 migration
│   │   └── utils/
│   │       ├── logger.ts
│   │       ├── normalizeRoadmap.ts        # Roadmap data normalization
│   │       └── testHelpers.ts
│   │
│   ├── dashboard/                        # Dashboard v1 (reads shared Zustand store)
│   │   ├── index.ts
│   │   ├── hooks/useDashboard.ts
│   │   └── components/
│   │       ├── DashboardContainer.tsx
│   │       ├── ContinueLearningCard.tsx
│   │       ├── EmptyState.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── RoadmapCard.tsx
│   │       └── StatsGrid.tsx
│   │
│   ├── dashboard-v2/                     # ⭐ Dashboard v2 (WIP — modular, headless)
│   │   ├── types.ts                      # DashboardV2ViewModel, card-level types
│   │   ├── __mocks__/dashboard.mock.ts   # Mock data for preview/dev
│   │   ├── hooks/
│   │   │   └── useDashboardV2ViewModel.ts # ViewModel hook (mock-backed for now)
│   │   └── components/
│   │       ├── container/DashboardV2Container.tsx  # Layout + orchestration
│   │       └── ui/                       # Headless card components
│   │           ├── DashboardHeader.tsx
│   │           ├── RoleDetailHeader.tsx
│   │           ├── RoleFilterSelector.tsx
│   │           ├── GlobalProgressCard.tsx
│   │           ├── ActiveRoadmapCard.tsx
│   │           ├── CompactRoadmapCard.tsx
│   │           ├── BestNextStepCard.tsx
│   │           ├── FocusedNextStepCard.tsx
│   │           ├── SkillBreakdownCard.tsx
│   │           ├── SkillRadarCard.tsx
│   │           ├── ConsistencyHeatmapCard.tsx
│   │           ├── StreakCard.tsx
│   │           └── LearningOverview.tsx
│   │
│   ├── role-selection/
│   │   ├── index.ts
│   │   ├── context/RoleContext.tsx        # React Context + localStorage hybrid
│   │   ├── hooks/useRole.ts              # { selectedRole, selectRole, clearRole }
│   │   ├── components/                   # Role selection UI
│   │   └── data/                         # Role definitions
│   │
│   ├── consistency/                      # Habit tracking engine
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── gamification/                     # Gamification system
│   │   ├── services/
│   │   ├── store/
│   │   └── types/
│   │
│   └── auth/                             # Auth feature module
│       └── ...
```

---

## 5. 🧱 Data Model (FINAL VERSION)

```typescript
type NormalizedRoadmap = {
  version: "v2";
  roleId: string;
  role: string;         // Role slug
  roleTitle: string;    // Human-readable role name
  isFallback: boolean;
  isMigrated: boolean;
  roadmapVersion: number;
  topics: Topic[];
  progress: UserProgress; // Flat mapping
  createdAt: string;
  updatedAt: string;
};

type Topic = {
  id: string; title: string; description: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  estimatedTime: string; order: number; isOptional: boolean;
  subtopics: Subtopic[];
};

type Subtopic = {
  id: string; topicId: string; title: string;
  type: "core" | "optional" | "alternative";
  groupId?: string;  // "Choose 1 of N" alternative paths
  order: number; tasks: Task[];
};

type Task = {
  id: string; subtopicId: string; title: string;
  type: "learn" | "practice" | "project";
  estimatedTime: string; isOptional: boolean; isSkippable: boolean;
  priorityScore: number; order: number;
  dependencies: Dependency[]; groupId?: string;
  generatedBy: "ai" | "fallback" | "human";
};

type Dependency = { type: "hard" | "soft"; taskId?: string; groupId?: string; };

type UserProgress = {
  completedTaskIds: string[];
  skippedTaskIds: string[];
};
```

---

## 6. 🧠 Core System Logic (`shared-logic.ts`)

`shared-logic.ts` (~1300 lines) is the foundational consistency engine. Pure synchronous functions, no side effects.

**Key systems:**
* **Task State Resolver:** DAG-based. Returns `"locked" | "available" | "completed" | "skipped"`. A task is `locked` if hard dependencies are unmet.
* **State Machine:** Governs valid transitions. `available→complete`, `completed→uncomplete`, `available→skip`, `skipped→unskip`.
* **Dependency System:** Hard deps block access. Soft deps influence recommendation priority.
* **Alternative Paths (`groupId`):** OR-gates. If one alternative in a group is completed, the group is satisfied.
* **Skip Risk Assessment:** Returns `low | medium | high` with affected task counts and remediation hints.
* **Next Best Task Algorithm:** Hierarchy-aware scoring:
  ```
  subtopicProximity(35%) + orderScore(30%) + criticalPath(15%) + priority(10%) + type(10%)
  ```
  - **Subtopic completion proximity** (dominant): Tasks in nearly-complete subtopics score highest — "finish what you started"
  - **Sequential order**: Earlier roadmap position = higher score
  - **Critical path**: More transitive dependents = higher score
  - Pre-computes subtopic completion % per available task before scoring
* **DependencyGraphCache:** Memoized DAG traversal for O(1) dependent lookups.
* **ComputationContext (`buildContext`):** Pre-builds `completedSet`, `skippedSet`, `taskMap` for O(1) lookups.

---

## 7. 🖼️ UI Module Architecture (Headless)

The roadmap UI is a **headless, framework-agnostic component library**. It receives ViewModels and emits actions — no internal state management.

### ViewModel Flow
```
NormalizedRoadmap (store)
  → useRoadmapDerivedState() → { taskStatesMap, nextTaskId, graphCache, allTasks }
    → useTopicViews(roadmap, derivedState) → TopicView[]
      → RoadmapPage receives: { title, topics, progress, recommendedTaskId, selectedTask, focusTask, ... }
```

### Action Contract (The Facade)
All UI interactions flow through a single typed `onAction` facade. **This is a core concept:** the UI module never directly calls the store or API. `onAction` acts as the explicit, single interaction gateway between the dumb UI and the smart orchestrator hook.
```typescript
type RoadmapAction =
  | { type: "complete" | "uncomplete" | "skip" | "unskip" | "bookmark"; taskId: string }
  | { type: "open" | "focus"; taskId: string }
  | { type: "close-panel" | "exit-focus" | "focus-next" | "resume" | "scroll-to-recommended" };
```

### Panel/Focus Mutual Exclusion
- `"focus"` action → clears `selectedTaskId` (panel closes) → sets `focusTaskId`
- `"open"` action → clears `focusTaskId` (focus exits) → sets `selectedTaskId`
- Prevents stacking overlays

### Z-Index Stack
| Layer | Z-Index | Component |
|-------|---------|-----------|
| AppShell controls | `z-50` | ThemeToggle, AuthMenu, DashboardLink |
| Focus Mode | `z-50` | FocusMode.tsx |
| Confetti | `z-50` | Confetti.tsx |
| Task Detail Panel | `z-[60]` | TaskDetailPanel.tsx (above AppShell) |

### Key Props Added
- `RoadmapPageProps.title: string` — dynamic role-based title
- `RoadmapHeader` accepts `title` prop (no more hardcoded "MERN Stack Developer")
- `TopicAccordion` accepts `recommendedTaskId` — "CURRENT" badge only on the topic containing the recommended task

### CSS Isolation
All UI styles scoped under `.roadmap-ui`. Container wraps everything in `<div className="roadmap-ui">`.

---

## 8. 🧩 Container Architecture (`RoadmapContainer.tsx`)

The container is the bridge between the app and the headless UI module. **~570 lines** including rich loading UX.

### Layout Structure
```
RoadmapContainer
 ├── PersistentHeader (ALWAYS visible — loading, error, empty, success)
 │    ├── Role icon + role name (from useRole or data.title)
 │    └── "Change Role" button (clearRole + router.push("/"))
 └── Content (state-dependent)
      ├── Loading  → ContentSkeleton (animated, rotating messages, topic/subtopic/task structure)
      ├── Error    → ErrorState (icon + message)
      ├── Empty    → EmptyState ("Select a Role" CTA)
      └── Success  → <RoadmapPage {...data} onAction={onAction} />
```

### Loading UX Features
- Rotating contextual messages ("Analyzing your role…", "Building learning path…")
- Animated orbit spinner with icon transitions
- Structured skeletons mirroring real layout (TopicCard → SubtopicSection → TaskRow)
- Shimmer animations with staggered delays

---

## 9. 📊 Dashboard ↔ Roadmap Synchronization

### Dashboard v1
**Both views share the SAME Zustand store and selectors.** No duplicate logic.

| Computation | Dashboard (`useDashboard`) | Roadmap (`useRoadmapGeneration`) |
|---|---|---|
| Progress | `useRoadmapStats(roadmap)` | `useRoadmapStats(roadmap)` via selectors |
| Next task | `useNextTask(roadmap, graphCache)` | `useNextTask()` via `useRoadmapDerivedState` |
| Graph cache | `useGraphCache(roadmap)` | `useGraphCache()` via `useRoadmapDerivedState` |
| State source | `useRoadmapStore` | `useRoadmapStore` |

Dashboard has **M-01 hydration**: if store is empty on direct navigation, fetches from DB API and caches.

### Dashboard v2 (WIP)
A redesigned dashboard using a modular, headless component architecture. Currently **mock-data backed** — not yet wired to the live Zustand store.
- **Container:** `DashboardV2Container.tsx` — layout orchestration + grid system
- **ViewModel:** `useDashboardV2ViewModel.ts` — currently returns mock data, will wire to real selectors
- **UI Cards:** 13 headless card components (progress, skills, streaks, heatmaps, next-step, etc.)
- **Status:** UI scaffolding complete, needs real data wiring to shared Zustand store

---

## 10. ⚡ Performance Strategy

The roadmap inherently processes deeply nested graphs with 50+ tasks. Performance is protected at scale by:
* **Memoized Selectors:** `useTopicViews` prevents recalculating the 3-tier presentation hierarchy on every React render cycle.
* **Graph Cache:** `DependencyGraphCache` converts expensive O(N) tree traversals into O(1) lookups for unblocking dependencies and calculating fan-out impacts.
* **Flat Progress Data:** The DB stores progress as flat string arrays (`completedTaskIds`), avoiding expensive Mongoose deep document population and enabling instant set-mathematics.

---

## 11. 🔄 Migration System (v1 → v2)

* Detects `version: "v1"` on DB retrieval. Synthesizes subtopics/tasks from V1 metadata.
* `isMigrated: true` guard prevents duplicate runs. Idempotent with consistent hashed keys.
* Commits conversion via `$set` before returning to UI.

---

## 12. 🔌 API Design

* **Endpoints:**
  - `POST /api/roadmap` — Generate / Import Guest
  - `PATCH /api/roadmap` — State Transition (complete/skip/uncomplete/unskip)
  - `GET /api/roadmap` — Fetch active roadmap
* **Request:** `{ roleId, taskId, action: "complete" | "skip" | "uncomplete" | "unskip" }`
* **Response:** `{ success, data: NormalizedRoadmap, meta: { transition, skipRisk } }`
* **Error codes:** 400 (validation), 404 (not found), 409 (invalid transition), 422 (task not found)

---

## 13. ⚠️ Edge Cases Handled

* **Circular dependencies:** DAG sanitization strips cycles.
* **Skip-related deps:** Downstream tasks auto-unlock when blocker is skipped.
* **No available tasks:** `getNextRecommendedTask` returns null → no "START HERE" badge.
* **Double clicks:** `inFlightTasksRef` guards against duplicate dispatches.
* **Race conditions:** `$addToSet`/`$pull` atomic operations.
* **AI invalid output:** Fallback roadmap injection with `isFallback: true`.
* **Panel/Focus stacking:** Mutual exclusion via `setSelectedTaskId(null)` / `setFocusTaskId(null)`.
* **Hydration mismatch:** `mounted` state guard in container.

---

## 14. 🧠 Key Engineering Principles

* **No logic in UI:** Components render ViewModels exclusively.
* **No derived state in DB:** Progress %, states, recommendations all computed at runtime.
* **Unidirectional data flow:** UI → Hooks → Store → API → DB.
* **Shared logic as SSOT:** Both frontend and backend validate via `shared-logic.ts`.
* **Headless UI isolation:** UI module has no knowledge of Zustand, API, or Next.js.
* **Hierarchy-aware recommendations:** Subtopic completion proximity is the dominant scoring factor.

---

## 15. 🔒 System Constraints (Non-Negotiable)

* **Logic location:** All algorithms in `shared-logic.ts`. No inline logic in UI, store, or API.
* **Derived state:** Task states, progress %, lock checks, recommendations — ALL computed dynamically. NEVER stored in DB.
* **Atomic persistence:** `$addToSet` + `$pull` only. No document replacement.
* **UI boundary:** UI module receives ViewModels. Container handles navigation + state routing. Logic stays in hooks/selectors.
* **`isRecommended` single source:** `task.id === nextTaskId` in `useTopicViews`. No duplicate computation.

---

## 16. 📍 Current System State & Recent Changes

### What's Fully Implemented
- ✅ Core Consistency Engine (shared-logic.ts)
- ✅ Global Zustand Store + memoized selectors
- ✅ V2 Hierarchical UI (headless module, 15 components)
- ✅ Intelligent action routing with optimistic updates + rollback
- ✅ Graceful AI degradation with fallback roadmaps
- ✅ Client ↔ DB exact synchronization
- ✅ v1 → v2 migration system
- ✅ Dashboard v1 ↔ Roadmap sync via shared store + selectors
- ✅ Navigation: "Change Role" button (container-level)
- ✅ Dynamic title (no hardcoded "MERN Stack Developer")
- ✅ CURRENT badge: only on topic containing recommended task
- ✅ START HERE badge: strictly from `nextTaskId` via shared-logic
- ✅ Panel ↔ Focus mutual exclusion
- ✅ TaskDetailPanel z-[60] (above AppShell z-50 controls)
- ✅ `uncomplete` action in RoadmapAction type
- ✅ Rich loading skeleton with rotating messages and structured topic/task layout
- ✅ Persistent header (role + nav) visible during all states
- ✅ Hierarchy-aware recommendation scoring (subtopic proximity dominant)
- ✅ AI timeout hardened to 60s for large DAG generation
- ✅ Unskippable task UI lockout (greyed skip button + tooltip)
- ✅ Dead code pruned (9 legacy files removed, `swr` uninstalled)

### Work In Progress
- 🚧 **Dashboard v2**: UI scaffolding complete (13 modular card components, container, ViewModel hook). Currently **mock-data backed only** — not yet wired to the live Zustand store/selectors.

### Known Remaining Items / Future Work
- Wire dashboard-v2 ViewModel hook to real Zustand store data (replace mock data)
- Toast integration for `ActionResult` failures (currently returns `{ success: false, error }` but no UI toast wiring)
- Weekly summary, daily plan, momentum banner, streak widget ViewModels are passed as `null` — future feature implementation
- SEO metadata for roadmap page

---

## 17. 🔄 Example Data Flow

**Task completion flow from UI to DB and back:**

1. **User Action:** User clicks "Mark as Complete" in `TaskDetailPanel`.
2. **Action Emission:** `onAction({ type: "complete", taskId: "xy-1" })` flows to `useRoadmapGeneration`.
3. **Local Validation:** Hook calls `validateTransition()` from shared-logic. Checks task is `available`.
4. **Optimistic UI:** Hook updates Zustand store's `progress.completedTaskIds` immediately. UI re-renders with task as `completed`.
5. **API Call:** `PATCH /api/roadmap { taskId: "xy-1", action: "complete" }`.
6. **Server Validation:** API pulls roadmap from DB, imports shared-logic, replicates validation.
7. **Atomic Mutation:** `$addToSet: { "progress.completedTaskIds": taskId }`.
8. **Response:** Server returns updated `NormalizedRoadmap`. Store syncs. Selectors recompute. Next task recommendation updates. "START HERE" badge moves.

**Error Handling & Rollback Flow:**
1. **Failure Intercepted:** If the API returns `{ success: false, error: "Network Error" }`.
2. **Snapshot Rollback:** The orchestrator hook (`useRoadmapGeneration.ts`) intercepts the failure and triggers a rollback against Zustand, instantly reverting the optimistic UI (e.g., untoggling the checkbox).
3. **Toast System:** The hook extracts the error message and pushes it to the `sonner` toast system, providing immediate, non-blocking feedback to the user.

---

## 18. 🏗️ How to Resume Work

When starting a new session:

1. **Read this file first** — it's the complete system context.
2. **Key files to review if needed:**
   - `shared-logic.ts` — the computation engine (~1300 lines)
   - `useRoadmapGeneration.ts` — the orchestrator hook (~637 lines)
   - `roadmapSelectors.ts` — memoized derived state (~280 lines)
   - `RoadmapContainer.tsx` — container + loading UX (~570 lines)
   - `roadmap-ui/types.ts` — ViewModel contracts (~195 lines)
3. **Architecture rule:** If a change involves logic → shared-logic.ts. If UX/layout → container. If presentation → UI module (rare). Never mix layers.
4. **The store** (`useRoadmapStore`) is intentionally thin. All intelligence lives in selectors and shared-logic.
5. **Dashboard and Roadmap are synced** via the same Zustand store and selectors. Changes to one automatically reflect in the other.
