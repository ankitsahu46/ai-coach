import type {
  Task,
  TaskState,
  TaskAction,
  TaskDependency,
  NormalizedRoadmap,
  UserProgress,
  TransitionResult,
  SkipRiskAssessment,
  SkipRiskLevel,
  ActiveWindowResult,
  NoTasksFallback,
  FallbackSuggestion,
  ProgressStats,
  TopicProgressStats,
  GraphValidationResult,
  ReferenceValidationResult,
  GroupValidationResult,
  Topic,
  DebugMeta,
} from "./index";

// ============================================
// SHARED LOGIC — THE CORE BRAIN
// ============================================
// Pure, isomorphic functions. Zero dependencies on React,
// Next.js, or Mongoose. Used by BOTH:
//   - Frontend: Zustand selectors
//   - Backend: Service layer
//
// If this file is wrong → everything breaks.
// If this file is correct → everything works.
// ============================================

// ============================================
// 0. INVARIANTS, LOGGING & DEBUG FLAGS
// ============================================

/** When false, debug-only computations (DebugMeta) are skipped for perf. */
const ENABLE_DEBUG_META = process.env.NODE_ENV !== "production";

/**
 * Runtime invariant assertion. Throws on violation.
 * Prevents silent logical corruption across the system.
 */
export function invariant(condition: boolean, message: string): asserts condition {
  if (!condition) {
    log.error("invariant_violation", { message });
    throw new Error(`[Invariant Failed] ${message}`);
  }
}

/**
 * Structured logging interface with level-based filtering.
 * Consumers override via `setLogger()` to route to their backend.
 */
export interface LogFn {
  (event: string, data?: Record<string, unknown>): void;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug: LogFn;
  info: LogFn;
  warn: LogFn;
  error: LogFn;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Build a level-filtered logger. Messages below `minLevel` are no-ops. */
function createFilteredLogger(minLevel: LogLevel): Logger {
  const minPriority = LOG_LEVEL_PRIORITY[minLevel];
  const noop: LogFn = () => {};

  return Object.freeze({
    debug: minPriority <= 0 ? (event: string, data?: Record<string, unknown>) => console.debug(`[roadmap:debug] ${event}`, data ?? "") : noop,
    info:  minPriority <= 1 ? (event: string, data?: Record<string, unknown>) => console.info(`[roadmap:info] ${event}`, data ?? "")  : noop,
    warn:  minPriority <= 2 ? (event: string, data?: Record<string, unknown>) => console.warn(`[roadmap:warn] ${event}`, data ?? "")  : noop,
    error: (event: string, data?: Record<string, unknown>) => console.error(`[roadmap:error] ${event}`, data ?? ""),
  });
}

let log: Logger = createFilteredLogger(
  process.env.NODE_ENV === "production" ? "warn" : "debug"
);

/**
 * Override the default logger. Frozen to prevent accidental mutation.
 * Call once at app init.
 */
export function setLogger(custom: Logger): void {
  log = Object.freeze({ ...custom });
}

// ============================================
// 1. DEPENDENCY TYPE GUARDS
// ============================================
// Strict runtime narrowing for the discriminated union.
// Prevents subtle bugs when accessing dep.taskId/dep.groupId.

/** Narrows to a direct task dependency (taskId is set). */
export function isDirectDependency(
  dep: TaskDependency
): dep is TaskDependency & { taskId: string } {
  return typeof dep.taskId === "string" && dep.taskId.length > 0;
}

/** Narrows to a group dependency (groupId is set). */
export function isGroupDependency(
  dep: TaskDependency
): dep is TaskDependency & { groupId: string } {
  return typeof dep.groupId === "string" && dep.groupId.length > 0;
}

// ============================================
// 2. TASK MAP & COMPUTATION CONTEXT
// ============================================
// Build once per operation. Pass the context everywhere.
// Eliminates redundant Map/Set construction in hot paths.

export type TaskMap = Map<string, Task>;

/**
 * Pre-built context passed to all internal hot-path functions.
 * Construct once per user action, reuse across all derived computations.
 */
export interface ComputationContext {
  readonly taskMap: TaskMap;
  readonly completedSet: Set<string>;
  readonly skippedSet: Set<string>;
  readonly graphCache?: DependencyGraphCache;
}

/** Build the computation context from a roadmap + progress. */
export function buildContext(
  allTasks: Task[],
  progress: UserProgress,
  graphCache?: DependencyGraphCache
): ComputationContext {
  return {
    taskMap: buildTaskMap(allTasks),
    completedSet: new Set(progress.completedTaskIds),
    skippedSet: new Set(progress.skippedTaskIds),
    graphCache,
  };
}

/** Build a Map<taskId, Task> for O(1) lookups. Build once, use everywhere. */
export function buildTaskMap(allTasks: Task[]): TaskMap {
  const map = new Map<string, Task>();
  for (const task of allTasks) {
    invariant(!map.has(task.id), `Duplicate task ID detected: ${task.id}`);
    map.set(task.id, task);
  }
  return map;
}

/** Safely get a task. Returns null if not found. Use in user-facing flows. */
export function getTaskOrNull(taskMap: TaskMap, taskId: string): Task | null {
  return taskMap.get(taskId) ?? null;
}

/** Get a task or throw. Use ONLY in internal invariant-protected paths. */
export function getTaskOrThrow(taskMap: TaskMap, taskId: string): Task {
  const task = taskMap.get(taskId);
  invariant(task != null, `Task not found: ${taskId}`);
  return task;
}

// ============================================
// 3. UTILITY — Flatten Tasks
// ============================================

/** Extract all tasks from the roadmap hierarchy into a flat array. */
export function getAllTasks(roadmap: NormalizedRoadmap | null): Task[] {
  if (!roadmap) return [];
  const tasks: Task[] = [];
  for (const topic of roadmap.topics) {
    for (const subtopic of topic.subtopics) {
      for (const task of subtopic.tasks) {
        tasks.push(task);
      }
    }
  }
  return tasks;
}

/** Find a single task by ID across the entire roadmap. O(n) — prefer TaskMap for hot paths. */
export function findTask(roadmap: NormalizedRoadmap | null, taskId: string): Task | null {
  if (!roadmap) return null;
  for (const topic of roadmap.topics) {
    for (const subtopic of topic.subtopics) {
      for (const task of subtopic.tasks) {
        if (task.id === taskId) return task;
      }
    }
  }
  return null;
}

// ============================================
// 4. DEPENDENCY GRAPH CACHE
// ============================================
// Pre-computes the full transitive closure on construction.
// All queries are O(1) map lookups after construction.
//
// Invariant: Cache depends on roadmap STRUCTURE only.
//   Progress changes (complete/skip) do NOT invalidate it.

export class DependencyGraphCache {
  private readonly adjacency: Map<string, string[]>;
  private readonly reverseAdj: Map<string, string[]>;
  private readonly _transitiveDependents: Map<string, Set<string>>;
  private readonly _transitiveDependencies: Map<string, Set<string>>;
  private readonly _taskMap: TaskMap;

  constructor(allTasks: Task[]) {
    invariant(Array.isArray(allTasks), "DependencyGraphCache requires an array of tasks.");

    this._taskMap = buildTaskMap(allTasks);
    this.adjacency = new Map();
    this.reverseAdj = new Map();

    // Initialize every task in the maps
    for (const task of allTasks) {
      this.adjacency.set(task.id, []);
      this.reverseAdj.set(task.id, []);
    }

    // Build adjacency list from dependencies
    for (const task of allTasks) {
      for (const dep of task.dependencies) {
        if (isDirectDependency(dep)) {
          // Direct dep: dep.taskId → task.id
          if (!this._taskMap.has(dep.taskId)) {
            log.warn("dangling_dep_in_graph", { taskId: task.id, depTaskId: dep.taskId });
            continue;
          }
          this.adjacency.get(dep.taskId)!.push(task.id);
          this.reverseAdj.get(task.id)!.push(dep.taskId);
        }
        if (isGroupDependency(dep)) {
          // Group dep: every task with matching groupId → task.id
          for (const [memberId, member] of this._taskMap) {
            if (member.groupId === dep.groupId && memberId !== task.id) {
              this.adjacency.get(memberId)!.push(task.id);
              this.reverseAdj.get(task.id)!.push(memberId);
            }
          }
        }
      }
    }

    // Pre-compute transitive closures
    this._transitiveDependents = new Map();
    this._transitiveDependencies = new Map();

    for (const task of allTasks) {
      this._transitiveDependents.set(task.id, this.bfs(task.id, this.adjacency));
      this._transitiveDependencies.set(task.id, this.bfs(task.id, this.reverseAdj));
    }

    log.debug("graph_cache_built", {
      taskCount: allTasks.length,
      edgeCount: Array.from(this.adjacency.values()).reduce((s, v) => s + v.length, 0),
    });
  }

  private bfs(startId: string, adjList: Map<string, string[]>): Set<string> {
    const visited = new Set<string>();
    const neighbors = adjList.get(startId) ?? [];
    const queue = [...neighbors];
    let i = 0;
    while (i < queue.length) {
      const current = queue[i++];
      if (visited.has(current)) continue;
      visited.add(current);
      for (const next of adjList.get(current) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    return visited;
  }

  /** The task map built during construction. Reuse for O(1) lookups. */
  get taskMap(): TaskMap {
    return this._taskMap;
  }

  /** How many tasks are transitively unblocked by completing this task. */
  getTransitiveDependentCount(taskId: string): number {
    return this._transitiveDependents.get(taskId)?.size ?? 0;
  }

  /** All task IDs transitively downstream. */
  getTransitiveDependents(taskId: string): ReadonlySet<string> {
    return this._transitiveDependents.get(taskId) ?? new Set();
  }

  /** All task IDs transitively upstream (this task depends on). */
  getTransitiveDependencies(taskId: string): ReadonlySet<string> {
    return this._transitiveDependencies.get(taskId) ?? new Set();
  }

  /** Direct dependents only. */
  getDirectDependents(taskId: string): readonly string[] {
    return this.adjacency.get(taskId) ?? [];
  }

  /** Is ancestorId an upstream dependency of descendantId? */
  isAncestor(ancestorId: string, descendantId: string): boolean {
    return this._transitiveDependents.get(ancestorId)?.has(descendantId) ?? false;
  }
}

// ============================================
// 5. GRAPH VALIDATION (DAG Enforcement)
// ============================================
// Kahn's algorithm topological sort. If the sort cannot
// complete, a cycle exists. Self-heals by stripping edges.

/** Validate the dependency graph is a DAG (no cycles). */
export function validateDependencyGraph(roadmap: NormalizedRoadmap): GraphValidationResult {
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return { valid: true, cycles: [] };

  const taskMap = buildTaskMap(allTasks);

  // Build adjacency + in-degree
  const adj = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const t of allTasks) {
    adj.set(t.id, []);
    inDegree.set(t.id, 0);
  }

  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      const sources: string[] = [];
      if (isDirectDependency(dep) && taskMap.has(dep.taskId)) {
        sources.push(dep.taskId);
      }
      if (isGroupDependency(dep)) {
        for (const member of allTasks) {
          if (member.groupId === dep.groupId && member.id !== task.id) {
            sources.push(member.id);
          }
        }
      }
      for (const src of sources) {
        adj.get(src)!.push(task.id);
        inDegree.set(task.id, (inDegree.get(task.id) ?? 0) + 1);
      }
    }
  }

  // Kahn's BFS
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  let i = 0;
  while (i < queue.length) {
    const current = queue[i++];
    sorted.push(current);
    for (const neighbor of adj.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (sorted.length === allTasks.length) {
    return { valid: true, cycles: [] };
  }

  // Cycle detected — identify trapped nodes
  const sortedSet = new Set(sorted);
  const cycleNodes = allTasks.filter((t) => !sortedSet.has(t.id)).map((t) => t.id);

  log.warn("cycle_detected", { cycleNodes });

  return { valid: false, cycles: [cycleNodes] };
}

/** Validate all taskId references in dependencies point to existing tasks. */
export function validateTaskReferences(roadmap: NormalizedRoadmap): ReferenceValidationResult {
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return { valid: true, danglingRefs: [] };

  const taskMap = buildTaskMap(allTasks);
  const danglingRefs: string[] = [];

  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      if (isDirectDependency(dep) && !taskMap.has(dep.taskId)) {
        danglingRefs.push(dep.taskId);
      }
    }
  }

  if (danglingRefs.length > 0) {
    log.warn("dangling_task_refs", { refs: danglingRefs });
  }

  return { valid: danglingRefs.length === 0, danglingRefs };
}

/** Validate all groupId references in dependencies match existing task groups. */
export function validateGroupReferences(roadmap: NormalizedRoadmap): GroupValidationResult {
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return { valid: true, invalidGroups: [] };

  const existingGroups = new Set(allTasks.filter((t) => t.groupId).map((t) => t.groupId!));
  const invalidGroups: string[] = [];

  for (const task of allTasks) {
    for (const dep of task.dependencies) {
      if (isGroupDependency(dep) && !existingGroups.has(dep.groupId)) {
        invalidGroups.push(dep.groupId);
      }
    }
  }

  if (invalidGroups.length > 0) {
    log.warn("invalid_group_refs", { groups: invalidGroups });
  }

  return { valid: invalidGroups.length === 0, invalidGroups };
}

/** Strip invalid dependency references and break cycles. Returns a clean roadmap. */
export function sanitizeDependencies(roadmap: NormalizedRoadmap): NormalizedRoadmap {
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return roadmap;

  const taskMap = buildTaskMap(allTasks);
  const existingGroups = new Set(allTasks.filter((t) => t.groupId).map((t) => t.groupId!));
  let strippedCount = 0;

  // Pass 1: Strip dangling refs and invalid groups
  const cleanTopics = roadmap.topics.map((topic) => ({
    ...topic,
    subtopics: topic.subtopics.map((sub) => ({
      ...sub,
      tasks: sub.tasks.map((task) => {
        const cleanDeps = task.dependencies.filter((dep: TaskDependency) => {
          // Self-dependency guard
          if (isDirectDependency(dep) && dep.taskId === task.id) {
            strippedCount++;
            return false;
          }
          if (isDirectDependency(dep) && !taskMap.has(dep.taskId)) {
            strippedCount++;
            return false;
          }
          if (isGroupDependency(dep) && !existingGroups.has(dep.groupId)) {
            strippedCount++;
            return false;
          }
          return true;
        });
        return { ...task, dependencies: cleanDeps };
      }),
    })),
  }));

  let cleaned: NormalizedRoadmap = { ...roadmap, topics: cleanTopics };

  // Pass 2: Break cycles by removing edges from cycle members
  const graphResult = validateDependencyGraph(cleaned);
  if (!graphResult.valid && graphResult.cycles.length > 0) {
    const cycleSet = new Set(graphResult.cycles.flat());

    cleaned = {
      ...cleaned,
      topics: cleaned.topics.map((topic) => ({
        ...topic,
        subtopics: topic.subtopics.map((sub) => ({
          ...sub,
          tasks: sub.tasks.map((task) => {
            if (!cycleSet.has(task.id)) return task;
            strippedCount += task.dependencies.length;
            return { ...task, dependencies: [] };
          }),
        })),
      })),
    };
  }

  if (strippedCount > 0) {
    log.warn("dependencies_sanitized", { strippedCount });
  }

  return cleaned;
}

// ============================================
// 6. TASK STATE RESOLVER
// ============================================
// The ONLY function that determines a task's state.
// State is ALWAYS derived from progress arrays — never stored.

/** Check if a single dependency is satisfied. Uses TaskMap for O(1) lookups. */
function isDependencySatisfied(
  dep: TaskDependency,
  taskMap: TaskMap,
  completedSet: Set<string>,
  skippedSet: Set<string>
): boolean {
  if (isDirectDependency(dep)) {
    if (dep.type === "hard") {
      return completedSet.has(dep.taskId);
    }
    // soft: completed OR skipped satisfies
    return completedSet.has(dep.taskId) || skippedSet.has(dep.taskId);
  }

  if (isGroupDependency(dep)) {
    // Group dep: at least one member must satisfy
    for (const [, member] of taskMap) {
      if (member.groupId !== dep.groupId) continue;
      if (dep.type === "hard") {
        if (completedSet.has(member.id)) return true;
      } else {
        if (completedSet.has(member.id) || skippedSet.has(member.id)) return true;
      }
    }
    return false;
  }

  // No target — invalid dep, treat as satisfied (defensive)
  log.warn("invalid_dependency_shape", { dep });
  return true;
}

/** Check if all dependencies for a task are satisfied. Public API — builds maps internally. */
export function isTaskUnlocked(
  task: Task,
  allTasks: Task[],
  progress: UserProgress
): boolean {
  if (task.dependencies.length === 0) return true;
  const ctx = buildContext(allTasks, progress);
  return task.dependencies.every((dep) =>
    isDependencySatisfied(dep, ctx.taskMap, ctx.completedSet, ctx.skippedSet)
  );
}

/**
 * Internal fast-path: isTaskUnlocked using ComputationContext.
 * Avoids rebuilding maps inside hot loops.
 */
function isTaskUnlockedCtx(task: Task, ctx: ComputationContext): boolean {
  if (task.dependencies.length === 0) return true;
  return task.dependencies.every((dep) =>
    isDependencySatisfied(dep, ctx.taskMap, ctx.completedSet, ctx.skippedSet)
  );
}

/** Determine the current state of a task. Public API — builds maps internally. */
export function getTaskState(
  task: Task,
  allTasks: Task[],
  progress: UserProgress
): TaskState {
  const ctx = buildContext(allTasks, progress);
  return getTaskStateCtx(task, ctx);
}

/**
 * Internal fast-path: getTaskState using ComputationContext.
 * Used inside hot loops that iterate over all tasks.
 */
function getTaskStateCtx(task: Task, ctx: ComputationContext): TaskState {
  if (ctx.completedSet.has(task.id)) return "completed";
  if (ctx.skippedSet.has(task.id)) return "skipped";
  if (!isTaskUnlockedCtx(task, ctx)) return "locked";
  return "available";
}

/**
 * Get task state with structured debug metadata explaining WHY.
 * In production, the state is computed but metadata is empty (perf).
 */
export function getTaskStateWithMeta(
  task: Task,
  allTasks: Task[],
  progress: UserProgress
): { state: TaskState; debugMeta: DebugMeta } {
  const ctx = buildContext(allTasks, progress);
  const state = getTaskStateCtx(task, ctx);

  // In production, skip debug meta computation
  if (!ENABLE_DEBUG_META) {
    return { state, debugMeta: {} };
  }

  if (state === "completed") {
    return { state, debugMeta: { unlockReason: "Task is in completedTaskIds." } };
  }
  if (state === "skipped") {
    return { state, debugMeta: { unlockReason: "Task was skipped by user." } };
  }

  // Check each dependency to find the blocking one
  if (state === "locked") {
    for (const dep of task.dependencies) {
      if (!isDependencySatisfied(dep, ctx.taskMap, ctx.completedSet, ctx.skippedSet)) {
        const blockerTitle = isDirectDependency(dep)
          ? ctx.taskMap.get(dep.taskId)?.title ?? dep.taskId
          : `group "${isGroupDependency(dep) ? dep.groupId : "unknown"}"`;

        log.debug("task_state_locked", { taskId: task.id, depType: dep.type });

        return {
          state,
          debugMeta: {
            lockReason: `Blocked by unsatisfied ${dep.type} dependency on ${blockerTitle}.`,
          },
        };
      }
    }
  }

  const reason = task.dependencies.length === 0
    ? "No dependencies — always available."
    : "All dependencies satisfied.";

  return { state, debugMeta: { unlockReason: reason } };
}

// ============================================
// 7. STATE TRANSITION GUARDS
// ============================================
// Formal state machine. Guards run pre-flight (hooks)
// and authoritatively (API). Prevents invalid transitions.

const TRANSITION_TABLE: Record<TaskState, TaskAction[]> = {
  available: ["complete", "skip"],
  completed: ["uncomplete"],
  skipped:   ["unskip"],
  locked:    [], // No user-initiated transitions
};

const TRANSITION_ERROR_MESSAGES: Record<string, string> = {
  "locked→complete":    "This task is locked. Complete its dependencies first.",
  "locked→uncomplete":  "This task is locked and cannot be uncompleted.",
  "locked→skip":        "This task is locked. It must be available before you can skip it.",
  "locked→unskip":      "This task is locked and not skipped.",
  "completed→skip":     "This task is already completed. Uncomplete it first to skip.",
  "completed→complete": "This task is already completed.",
  "skipped→complete":   "This task is skipped. Unskip it first, then complete.",
  "skipped→skip":       "This task is already skipped.",
  "available→uncomplete": "This task is not completed.",
  "available→unskip":   "This task is not skipped.",
  "available→available": "No action needed.",
};

/** Validate whether a state transition is allowed. */
export function validateTransition(
  task: Task,
  action: TaskAction,
  allTasks: Task[],
  progress: UserProgress
): TransitionResult {
  const currentState = getTaskState(task, allTasks, progress);
  const allowed = TRANSITION_TABLE[currentState];

  if (!allowed.includes(action)) {
    const key = `${currentState}→${action}`;
    const reason = TRANSITION_ERROR_MESSAGES[key] ?? `Cannot ${action} a ${currentState} task.`;

    log.debug("transition_rejected", { taskId: task.id, currentState, action, reason });

    return {
      ok: false,
      reason,
      currentState,
      attemptedAction: action,
    };
  }

  // Additional guard: skip requires isSkippable
  if (action === "skip" && !task.isSkippable) {
    log.debug("transition_rejected", { taskId: task.id, reason: "isSkippable is false" });
    return {
      ok: false,
      reason: "This task cannot be skipped (isSkippable is false).",
      currentState,
      attemptedAction: action,
    };
  }

  log.debug("transition_allowed", { taskId: task.id, action, currentState });
  return { ok: true };
}

// ============================================
// 8. ALTERNATIVE PATH ENGINE
// ============================================

/** Check if a group is satisfied (at least one member completed). */
export function isGroupSatisfied(
  groupId: string,
  allTasks: Task[],
  progress: UserProgress,
  requireCompleted: boolean = true
): boolean {
  const ctx = buildContext(allTasks, progress);

  for (const task of allTasks) {
    if (task.groupId !== groupId) continue;
    if (requireCompleted) {
      if (ctx.completedSet.has(task.id)) return true;
    } else {
      if (ctx.completedSet.has(task.id) || ctx.skippedSet.has(task.id)) return true;
    }
  }

  return false;
}

// ============================================
// 9. SKIP SYSTEM
// ============================================

/** Check if a task can be skipped + collect warnings. */
export function canSkipTask(
  task: Task,
  allTasks: Task[],
  progress: UserProgress
): { canSkip: boolean; warnings: string[] } {
  if (!task.isSkippable) {
    return { canSkip: false, warnings: ["This task cannot be skipped."] };
  }

  const state = getTaskState(task, allTasks, progress);
  if (state === "locked") {
    return { canSkip: false, warnings: ["Cannot skip a locked task."] };
  }
  if (state === "completed") {
    return { canSkip: false, warnings: ["Cannot skip a completed task. Uncomplete it first."] };
  }
  if (state === "skipped") {
    return { canSkip: false, warnings: ["Already skipped. Use unskip to revert."] };
  }

  // Cascade check: downstream hard deps that would be orphaned
  const warnings: string[] = [];
  const directHardDeps = allTasks.filter((t) =>
    t.dependencies.some((d) => d.type === "hard" && isDirectDependency(d) && d.taskId === task.id)
  );

  for (const dep of directHardDeps) {
    if (!dep.isOptional) {
      warnings.push(`Skipping may permanently lock "${dep.title}" (hard dependency).`);
    }
  }

  return { canSkip: true, warnings };
}

/** Assess skip risk level with full downstream analysis. */
export function assessSkipRisk(
  task: Task,
  allTasks: Task[],
  progress: UserProgress,
  graphCache: DependencyGraphCache
): SkipRiskAssessment {
  const ctx = buildContext(allTasks, progress, graphCache);

  // Direct hard dependents on THIS task specifically
  const directHardDependents = allTasks.filter((t) =>
    t.dependencies.some((d) => d.type === "hard" && isDirectDependency(d) && d.taskId === task.id)
  );

  // Group hard dependents (if task is in a group)
  const groupHardDependents = task.groupId
    ? allTasks.filter((t) =>
        t.dependencies.some(
          (d) => d.type === "hard" && isGroupDependency(d) && d.groupId === task.groupId
        )
      )
    : [];

  // Does the group have another available/completed member?
  const groupHasAlternative = task.groupId
    ? allTasks.some(
        (t) =>
          t.groupId === task.groupId &&
          t.id !== task.id &&
          (ctx.completedSet.has(t.id) ||
            getTaskStateCtx(t, ctx) === "available")
      )
    : false;

  // If group has alternative, group deps are safe — only direct deps matter
  const effectiveDeps = groupHasAlternative
    ? directHardDependents
    : [...directHardDependents, ...groupHardDependents];

  // Filter to tasks that are SOLELY gated by this task
  const orphaned = effectiveDeps.filter((dep) => {
    const otherHardDeps = dep.dependencies.filter(
      (d) =>
        d.type === "hard" &&
        !(isDirectDependency(d) && d.taskId === task.id) &&
        !(isGroupDependency(d) && d.groupId === task.groupId)
    );
    return otherHardDeps.every((d) => isDependencySatisfied(d, ctx.taskMap, ctx.completedSet, ctx.skippedSet));
  });

  const transitiveCount = graphCache.getTransitiveDependentCount(task.id);

  // Determine risk
  let risk: SkipRiskLevel;
  let remediationHint: string;
  let riskReason: string;

  if (orphaned.length === 0 && transitiveCount <= 1) {
    risk = "low";
    remediationHint = "Safe to skip — no downstream tasks will be blocked.";
    riskReason = "No downstream hard dependents and ≤1 transitive dependent.";
  } else if (orphaned.length > 0) {
    risk = "high";
    remediationHint = `Skipping will permanently lock ${transitiveCount} downstream task(s). Consider completing this task instead.`;
    riskReason = `${orphaned.length} task(s) solely gated by this task. ${transitiveCount} total transitive dependents.`;
  } else {
    risk = "medium";
    remediationHint = "Some downstream tasks may be affected, but alternative paths exist.";
    riskReason = `${effectiveDeps.length} hard dependents but all have alternative paths. ${transitiveCount} transitive dependents.`;
  }

  log.debug("skip_risk_assessed", { taskId: task.id, risk, orphanedCount: orphaned.length, transitiveCount });

  return {
    risk,
    affectedTaskCount: transitiveCount,
    affectedTaskTitles: (orphaned.length > 0 ? orphaned : effectiveDeps)
      .slice(0, 3)
      .map((t) => t.title),
    criticalPathImpact: transitiveCount > allTasks.length * 0.2,
    remediationHint,
  };
}

// ============================================
// 10. DERIVED SELECTORS
// ============================================

/** Get all tasks in "available" state. */
export function getAvailableTasks(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined
): Task[] {
  if (!roadmap || !progress) return [];
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return [];

  const ctx = buildContext(allTasks, progress);
  return allTasks.filter((t) => getTaskStateCtx(t, ctx) === "available");
}

/** Get all tasks in "locked" state. */
export function getLockedTasks(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined
): Task[] {
  if (!roadmap || !progress) return [];
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return [];

  const ctx = buildContext(allTasks, progress);
  return allTasks.filter((t) => getTaskStateCtx(t, ctx) === "locked");
}

/** Get overall progress stats (derived, never stored). */
export function getProgress(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined
): ProgressStats {
  const zero: ProgressStats = { total: 0, completed: 0, skipped: 0, available: 0, locked: 0, percentage: 0 };
  if (!roadmap || !progress) return zero;

  const allTasks = getAllTasks(roadmap);
  const total = allTasks.length;
  if (total === 0) return zero;

  const ctx = buildContext(allTasks, progress);

  let completed = 0;
  let skipped = 0;
  let available = 0;
  let locked = 0;

  for (const task of allTasks) {
    const state = getTaskStateCtx(task, ctx);
    switch (state) {
      case "completed": completed++; break;
      case "skipped":   skipped++;   break;
      case "available": available++; break;
      case "locked":    locked++;    break;
    }
  }

  return {
    total,
    completed,
    skipped,
    available,
    locked,
    percentage: Math.round((completed / total) * 100),
  };
}

/** Get progress for a single topic. */
export function getTopicProgress(
  topic: Topic,
  progress: UserProgress | undefined
): TopicProgressStats {
  if (!progress) return { total: 0, completed: 0, percentage: 0 };

  const completedSet = new Set(progress.completedTaskIds);
  let total = 0;
  let completed = 0;

  for (const sub of topic.subtopics) {
    for (const task of sub.tasks) {
      total++;
      if (completedSet.has(task.id)) completed++;
    }
  }

  return {
    total,
    completed,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

// ============================================
// 11. NEXT BEST TASK ALGORITHM
// ============================================

/**
 * Compute composite score for task ranking.
 *
 * Scoring philosophy for a LEARNING ROADMAP:
 *   The roadmap's hierarchical order is the PEDAGOGY.
 *   Completing a nearly-done subtopic is always better than starting a new one.
 *   Within the same priority tier, earlier tasks in the roadmap win.
 *
 * Dimensions (ordered by dominance):
 *   1. Subtopic completion proximity (0-100): finish what you started
 *   2. Roadmap sequential order      (0-100): author's intended sequence
 *   3. Critical path                 (0-100): unblock downstream tasks
 *   4. Priority score                (0-100): AI-assigned importance
 *   5. Type bonus                    (0-100): learn → practice → project
 */
export function computeCompositeScore(
  task: Task,
  allTasks: Task[],
  _progress: UserProgress,
  graphCache: DependencyGraphCache,
  subtopicCompletionPct?: number
): number {
  const totalTasks = allTasks.length;
  if (totalTasks === 0) return 0;

  // ── 1. Subtopic completion proximity ──
  // If the subtopic is partially complete, strongly prefer finishing it.
  // 75% done → 75 points. 0% (new subtopic) → 0 points.
  const subtopicProximity = subtopicCompletionPct ?? 0;

  // ── 2. Sequential order (earlier in roadmap = higher) ──
  const globalIndex = allTasks.findIndex((t) => t.id === task.id);
  const orderScore = globalIndex === -1 ? 50 : 100 - (globalIndex / totalTasks) * 100;

  // ── 3. Critical path (how many tasks this unblocks) ──
  const criticalPathBonus =
    (graphCache.getTransitiveDependentCount(task.id) / totalTasks) * 100;

  // ── 4. Type bonus (learn → practice → project for tiebreaking) ──
  const typeBonusMap: Record<string, number> = { learn: 100, practice: 60, project: 30 };
  const typeBonus = typeBonusMap[task.type] ?? 50;

  return (
    subtopicProximity * 0.35 +
    orderScore * 0.30 +
    criticalPathBonus * 0.15 +
    task.priorityScore * 0.10 +
    typeBonus * 0.10
  );
}

/** Get the single best next task to recommend. */
export function getNextRecommendedTask(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined,
  graphCache: DependencyGraphCache | null
): Task | null {
  if (!roadmap || !progress || !graphCache) return null;

  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return null;

  const ctx = buildContext(allTasks, progress, graphCache);
  const completedSet = ctx.completedSet;

  let available = allTasks.filter(
    (t) => getTaskStateCtx(t, ctx) === "available"
  );

  if (available.length === 0) return null;

  // Prefer non-optional tasks unless ALL are optional
  const nonOptional = available.filter((t) => !t.isOptional);
  if (nonOptional.length > 0) available = nonOptional;

  // Pre-compute subtopic completion % for each available task
  const taskSubtopicPct = new Map<string, number>();
  for (const topic of roadmap.topics) {
    for (const sub of topic.subtopics) {
      const subTotal = sub.tasks.length;
      if (subTotal === 0) continue;
      let subCompleted = 0;
      for (const t of sub.tasks) {
        if (completedSet.has(t.id)) subCompleted++;
      }
      const pct = Math.round((subCompleted / subTotal) * 100);
      for (const t of sub.tasks) {
        if (available.some(a => a.id === t.id)) {
          taskSubtopicPct.set(t.id, pct);
        }
      }
    }
  }

  // Score with subtopic completion context
  const scored = available.map((task) => ({
    task,
    score: computeCompositeScore(
      task, allTasks, progress, graphCache,
      taskSubtopicPct.get(task.id) ?? 0
    ),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored[0]?.task ?? null;
}

/**
 * Get the recommended task with structured debug metadata.
 */
export function getNextRecommendedTaskWithMeta(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined,
  graphCache: DependencyGraphCache | null
): { task: Task | null; debugMeta: DebugMeta } {
  if (!roadmap || !progress || !graphCache) {
    return { task: null, debugMeta: { recommendationReason: "No roadmap/progress data." } };
  }

  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) {
    return { task: null, debugMeta: { recommendationReason: "Roadmap has no tasks." } };
  }

  const ctx = buildContext(allTasks, progress, graphCache);
  const completedSet = ctx.completedSet;

  let available = allTasks.filter(
    (t) => getTaskStateCtx(t, ctx) === "available"
  );

  if (available.length === 0) {
    return { task: null, debugMeta: { recommendationReason: "No available tasks." } };
  }

  const nonOptional = available.filter((t) => !t.isOptional);
  const usedOptionalFallback = nonOptional.length === 0;
  if (nonOptional.length > 0) available = nonOptional;

  // Pre-compute subtopic completion % (same logic as getNextRecommendedTask)
  const taskSubtopicPct = new Map<string, number>();
  for (const topic of roadmap.topics) {
    for (const sub of topic.subtopics) {
      const subTotal = sub.tasks.length;
      if (subTotal === 0) continue;
      let subCompleted = 0;
      for (const t of sub.tasks) {
        if (completedSet.has(t.id)) subCompleted++;
      }
      const pct = Math.round((subCompleted / subTotal) * 100);
      for (const t of sub.tasks) {
        if (available.some(a => a.id === t.id)) {
          taskSubtopicPct.set(t.id, pct);
        }
      }
    }
  }

  const scored = available.map((task) => ({
    task,
    score: computeCompositeScore(
      task, allTasks, progress, graphCache,
      taskSubtopicPct.get(task.id) ?? 0
    ),
    fanOut: graphCache.getTransitiveDependentCount(task.id),
  }));

  scored.sort((a, b) => b.score - a.score);

  const winner = scored[0];
  if (!winner) {
    return { task: null, debugMeta: { recommendationReason: "Scoring produced no result." } };
  }

  const reason = [
    `Score: ${winner.score.toFixed(1)}`,
    `Priority: ${winner.task.priorityScore}`,
    `Unlocks: ${winner.fanOut} downstream task(s)`,
    `Type: ${winner.task.type}`,
    usedOptionalFallback ? "(all remaining tasks are optional)" : "",
  ]
    .filter(Boolean)
    .join(" | ");

  log.debug("next_task_recommended", { taskId: winner.task.id, score: winner.score, reason });

  return {
    task: winner.task,
    debugMeta: { recommendationReason: reason },
  };
}

// ============================================
// 12. ACTIVE TASKS WINDOW
// ============================================

/** Get the "no tasks available" fallback with resolution suggestions. */
export function getNoTasksFallback(
  roadmap: NormalizedRoadmap,
  progress: UserProgress,
  _graphCache: DependencyGraphCache
): NoTasksFallback | null {
  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return null;

  const ctx = buildContext(allTasks, progress);

  const available = allTasks.filter(
    (t) => getTaskStateCtx(t, ctx) === "available"
  );
  const locked = allTasks.filter(
    (t) => getTaskStateCtx(t, ctx) === "locked"
  );
  const total = allTasks.length;
  const done = progress.completedTaskIds.length + progress.skippedTaskIds.length;

  // No fallback needed
  if (available.length > 0) return null;
  if (done >= total) return null;

  // Tier 1: optional tasks are available
  const optionalAvailable = allTasks.filter(
    (t) =>
      t.isOptional &&
      !ctx.completedSet.has(t.id) &&
      !ctx.skippedSet.has(t.id) &&
      isTaskUnlockedCtx(t, ctx)
  );

  if (optionalAvailable.length > 0) {
    log.info("fallback_tier1", { optionalCount: optionalAvailable.length });
    return {
      tier: 1,
      reason: "All required tasks are completed or locked. Optional tasks are available.",
      suggestions: optionalAvailable.slice(0, 3).map((t) => ({
        type: "show_optional" as const,
        taskId: t.id,
        taskTitle: t.title,
        description: `Try optional task: "${t.title}"`,
      })),
    };
  }

  // Tier 2: unskip suggestions
  const suggestions: FallbackSuggestion[] = [];

  for (const lockedTask of locked.slice(0, 5)) {
    for (const dep of lockedTask.dependencies) {
      if (isDirectDependency(dep) && ctx.skippedSet.has(dep.taskId)) {
        const skippedTask = ctx.taskMap.get(dep.taskId);
        if (skippedTask) {
          suggestions.push({
            type: "unskip",
            taskId: dep.taskId,
            taskTitle: skippedTask.title,
            description: `Unskip "${skippedTask.title}" to unlock "${lockedTask.title}"`,
          });
        }
      }
      if (isGroupDependency(dep)) {
        for (const [, member] of ctx.taskMap) {
          if (member.groupId === dep.groupId && ctx.skippedSet.has(member.id)) {
            suggestions.push({
              type: "unskip",
              taskId: member.id,
              taskTitle: member.title,
              description: `Unskip "${member.title}" (or complete any alternative) to unlock "${lockedTask.title}"`,
            });
            break; // One per group is enough
          }
        }
      }
    }
  }

  // Deduplicate by taskId
  const seen = new Set<string>();
  const uniqueSuggestions = suggestions.filter((s) => {
    if (!s.taskId || seen.has(s.taskId)) return false;
    seen.add(s.taskId);
    return true;
  });

  if (uniqueSuggestions.length > 0) {
    log.info("fallback_tier2", { suggestionCount: uniqueSuggestions.length });
    return {
      tier: 2,
      reason: "All available tasks are locked. Here's how to unblock progress:",
      suggestions: uniqueSuggestions.slice(0, 5),
    };
  }

  // Tier 3: stuck
  log.warn("fallback_tier3_stuck", { totalTasks: total, done, lockedCount: locked.length });
  return {
    tier: 3,
    reason: "Progress appears stuck. Some tasks may need to be reset.",
    suggestions: [
      {
        type: "reset_progress",
        description: "Reset skipped tasks to make them available again.",
      },
    ],
  };
}

/**
 * Get the active tasks window — a focused slice of the most relevant tasks.
 * Always includes the recommended task. Returns fallback when no tasks available.
 */
export function getActiveWindow(
  roadmap: NormalizedRoadmap | null,
  progress: UserProgress | undefined,
  graphCache: DependencyGraphCache | null,
  windowSize: number = 5
): ActiveWindowResult {
  const empty: ActiveWindowResult = {
    tasks: [],
    totalAvailable: 0,
    recommended: null,
    hasMore: false,
    fallback: null,
  };

  if (!roadmap || !progress || !graphCache) return empty;

  const allTasks = getAllTasks(roadmap);
  if (allTasks.length === 0) return empty;

  const ctx = buildContext(allTasks, progress, graphCache);

  const available = allTasks.filter(
    (t) => getTaskStateCtx(t, ctx) === "available"
  );

  // No tasks available — compute fallback
  if (available.length === 0) {
    return {
      ...empty,
      fallback: getNoTasksFallback(roadmap, progress, graphCache),
    };
  }

  const recommended = getNextRecommendedTask(roadmap, progress, graphCache);

  // Score and sort available tasks
  const scored = available
    .map((task) => ({
      task,
      score: computeCompositeScore(task, allTasks, progress, graphCache),
    }))
    .sort((a, b) => b.score - a.score);

  // Take top N
  const window = scored.slice(0, windowSize).map((s) => s.task);

  // Ensure recommended is in window
  if (recommended && !window.some((t) => t.id === recommended.id)) {
    if (window.length >= windowSize) {
      window[window.length - 1] = recommended;
    } else {
      window.push(recommended);
    }
  }

  return {
    tasks: window,
    totalAvailable: available.length,
    recommended,
    hasMore: available.length > windowSize,
    fallback: null,
  };
}

// ============================================
// 13. TIME SCHEDULING — FUTURE STUBS
// ============================================
// Defined to reserve the API surface. Returns defaults.
// Implementations follow when scheduling feature ships.

/** FUTURE: Estimated completion date based on velocity. */
export function getEstimatedCompletionDate(
  _roadmap: NormalizedRoadmap,
  _progress: UserProgress
): string | null {
  return null;
}

/** FUTURE: Tasks scheduled for a specific date. */
export function getTasksForDate(
  _roadmap: NormalizedRoadmap,
  _progress: UserProgress,
  _date: string
): Task[] {
  return [];
}

/** FUTURE: Rolling average learning velocity. */
export function calculateVelocity(
  _completionHistory: Array<{ taskId: string; completedAt: string }>
): number {
  return 0;
}

/** FUTURE: Is user on track for a deadline? */
export function isOnTrackForDeadline(
  _roadmap: NormalizedRoadmap,
  _progress: UserProgress,
  _deadline: string
): { onTrack: boolean; tasksPerDayNeeded: number } {
  return { onTrack: true, tasksPerDayNeeded: 0 };
}
