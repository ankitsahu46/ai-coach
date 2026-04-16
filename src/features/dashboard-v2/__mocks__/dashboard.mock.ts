import type {
  HeatmapDataViewModel,
  RadarDataViewModel,
  RoleProgressViewModel,
} from "../types";

export const mockConsistencyHeatmap: HeatmapDataViewModel = {
  cells: Array.from({ length: 4 * 7 * 4 }).map((_, i) => {
    // Generate dates going back ~16 weeks (112 days)
    const date = new Date();
    date.setDate(date.getDate() - (111 - i));
    
    // Some random intensities that cluster to look like activity
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    let intensity = 0;
    if (Math.random() > 0.4) {
      intensity = Math.floor(Math.random() * 4) + 1; // 1-4
    }
    if (isWeekend && Math.random() > 0.8) intensity = 0;
    
    return {
      date: date.toISOString().split("T")[0],
      intensity,
    };
  }),
};

// A predetermined polygon string representing a 6-axis skill radar chart
// centered in a 100x100 SVG viewbox.
export const mockRadarData: RadarDataViewModel = {
  labels: ["Frontend", "Backend", "DevOps", "System Design", "Testing", "Soft Skills"],
  pointsString: "50,18 78,35 72,75 28,75 22,35 50,25", // Hardcoded raw polygon
  axisLines: [
    { x1: 50, y1: 50, x2: 50, y2: 0 },
    { x1: 50, y1: 50, x2: 93, y2: 25 },
    { x1: 50, y1: 50, x2: 93, y2: 75 },
    { x1: 50, y1: 50, x2: 50, y2: 100 },
    { x1: 50, y1: 50, x2: 7, y2: 75 },
    { x1: 50, y1: 50, x2: 7, y2: 25 },
  ],
  labelPositions: [
    { text: "Frontend", x: 50, y: -5, align: "middle" },
    { text: "Backend", x: 98, y: 25, align: "start" },
    { text: "DevOps", x: 98, y: 75, align: "start" },
    { text: "System Design", x: 50, y: 105, align: "middle" },
    { text: "Testing", x: 2, y: 75, align: "end" },
    { text: "Soft Skills", x: 2, y: 25, align: "end" },
  ]
};

export const mockMultiRoleProgress: RoleProgressViewModel[] = [
  {
    id: "role-frontend",
    title: "Frontend Developer",
    progressPercentage: 65,
    nextTaskTitle: "Mastering Advanced React Patterns",
    isFocusRole: true,
  },
  {
    id: "role-backend",
    title: "Backend Engineer",
    progressPercentage: 28,
    nextTaskTitle: "Implementing Distributed Caching with Redis",
    isFocusRole: false,
  },
  {
    id: "role-devops",
    title: "DevOps Specialist",
    progressPercentage: 12,
    nextTaskTitle: "Setting up Multi-stage Docker Builds",
    isFocusRole: false,
  },
];

export const mockOtherRoles: RoleProgressViewModel[] = [
  {
    id: "role-frontend",
    title: "Frontend Developer",
    progressPercentage: 65,
    nextTaskTitle: null,
  },
  {
    id: "role-backend",
    title: "Backend Engineer",
    progressPercentage: 28,
    nextTaskTitle: null,
  },
  {
    id: "role-devops",
    title: "DevOps Specialist",
    progressPercentage: 12,
    nextTaskTitle: null,
  },
];

// Helper to derive the RoleDetailViewModel securely mapped to the mock progress
export function getMockRoleDetail(filterTarget: string): import("../types").RoleDetailViewModel | null {
  const normalized = filterTarget.toLowerCase();
  const baseRole = mockMultiRoleProgress.find(r => r.title.toLowerCase().includes(normalized));
  
  if (!baseRole) return null;

  // Mock derived task completion aggregation for the requested role
  const rawSkills = [
    { name: normalized === "frontend" ? "React" : "Core Concepts", completedTasks: 18, totalTasks: 20 },
    { name: "TypeScript", completedTasks: 8, totalTasks: 10 },
    { name: normalized === "frontend" ? "CSS/Tailwind" : "Databases", completedTasks: 19, totalTasks: 20 },
    { name: "State Mgmt", completedTasks: 7, totalTasks: 10 }, // We'll make this the weakest by percentage
    { name: "Architecture", completedTasks: 5, totalTasks: 10 },
  ];

  const processedSkills = rawSkills.map(s => ({
    ...s,
    percentage: Math.round((s.completedTasks / s.totalTasks) * 100),
    isWeakest: false,
  })).sort((a, b) => b.percentage - a.percentage); // Sort highest to lowest

  // Identify weakest skill (lowest percentage)
  const weakestSkill = processedSkills[processedSkills.length - 1];
  if (weakestSkill) {
    weakestSkill.isWeakest = true;
  }

  return {
    filterName: filterTarget,
    roleTitle: baseRole.title,
    overallPercentage: baseRole.progressPercentage,
    skills: processedSkills.slice(0, 4), // Just show top 4 for the 2-column grid in UI
    focusedNextStep: {
      taskId: "mock-task-123",
      taskTitle: baseRole.nextTaskTitle || "Continuing Learning Path",
      duration: "45 mins",
      difficulty: "Advanced",
      reasonText: `Because your ${weakestSkill?.name || 'core'} skill is only ${weakestSkill?.percentage || 0}%, this is the highest impact task for your progression.`,
    }
  };
}
