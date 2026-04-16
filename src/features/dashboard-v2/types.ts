import type { Task } from "@/features/roadmap/types";

export interface StreakViewModel {
  days: number;
  nextMilestone: number;
  isActive: boolean;
}

export interface RoleProgressViewModel {
  id: string;
  title: string;
  progressPercentage: number;
  nextTaskTitle: string | null;
  isFocusRole?: boolean;
}

export interface GlobalProgressViewModel {
  percentage: number;
  roles: { title: string; percentage: number }[];
}

export interface BestNextStepViewModel {
  taskTitle: string;
  reasonText: string;
  roleId: string;
  roleTitle: string;
  taskId: string;
}

export interface RadarDataViewModel {
  labels: string[];
  // SVG points already mapped to a 0-100 coordinate space or raw string
  pointsString: string; 
  axisLines: { x1: number; y1: number; x2: number; y2: number }[];
  labelPositions: { text: string; x: number; y: number; align: "start"|"middle"|"end" }[];
}

export interface HeatmapCell {
  date: string;
  intensity: number; // 0 to 4
}

export interface HeatmapDataViewModel {
  cells: HeatmapCell[];
}

export interface SkillBreakdown {
  name: string;
  completedTasks: number;
  totalTasks: number;
  percentage: number;
  isWeakest?: boolean;
}

export interface FocusedNextStep {
  taskId: string;
  taskTitle: string;
  duration: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  reasonText: string;
}

export interface RoleDetailViewModel {
  filterName: string;
  roleTitle: string;
  overallPercentage: number;
  skills: SkillBreakdown[];
  focusedNextStep: FocusedNextStep | null;
}

export interface DashboardV2ViewModel {
  hasRole: boolean;
  isLoading: boolean;
  isEmpty: boolean;
  error: string | null;
  
  // Real or mock mix
  userName: string;
  streak: StreakViewModel;
  globalProgress: GlobalProgressViewModel;
  bestNextStep: BestNextStepViewModel | null;
  
  // Mock exclusively
  radar: RadarDataViewModel;
  heatmap: HeatmapDataViewModel;
  activeRoles: RoleProgressViewModel[];
  otherRoles: RoleProgressViewModel[];
  
  // Conditionally populated for detail view
  activeRoleDetail: RoleDetailViewModel | null;

  // Filtering
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}
