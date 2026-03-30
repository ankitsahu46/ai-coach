import type { Role } from "@/types";

// ============================================
// ROLE SELECTION — STATIC DATA
// ============================================

export const roles: Role[] = [
  {
    id: "frontend-developer",
    slug: "frontend-developer",
    title: "Frontend Developer",
    description:
      "Master React, CSS, and modern web UIs. Build responsive, accessible, and performant user interfaces.",
    icon: "🎨",
    category: "frontend",
    difficulty: "beginner",
    estimatedWeeks: 16,
    topicCount: 24,
  },
  {
    id: "backend-developer",
    slug: "backend-developer",
    title: "Backend Developer",
    description:
      "Build robust APIs, work with databases, and architect server-side logic that scales to millions of users.",
    icon: "⚙️",
    category: "backend",
    difficulty: "intermediate",
    estimatedWeeks: 20,
    topicCount: 28,
  },
  {
    id: "fullstack-developer",
    slug: "fullstack-developer",
    title: "Full-Stack Developer",
    description:
      "End-to-end web development mastery. From pixel-perfect UIs to scalable backend architectures.",
    icon: "🚀",
    category: "fullstack",
    difficulty: "intermediate",
    estimatedWeeks: 28,
    topicCount: 36,
  },
  {
    id: "devops-engineer",
    slug: "devops-engineer",
    title: "DevOps Engineer",
    description:
      "Master CI/CD pipelines, cloud infrastructure, containerization, and production monitoring.",
    icon: "🔧",
    category: "devops",
    difficulty: "intermediate",
    estimatedWeeks: 18,
    topicCount: 22,
  },
  {
    id: "data-scientist",
    slug: "data-scientist",
    title: "Data Scientist",
    description:
      "Unlock insights from data using ML, statistics, and visualization. Turn raw data into strategic decisions.",
    icon: "📊",
    category: "data",
    difficulty: "advanced",
    estimatedWeeks: 24,
    topicCount: 30,
  },
  {
    id: "mobile-developer",
    slug: "mobile-developer",
    title: "Mobile Developer",
    description:
      "Build native and cross-platform apps for iOS and Android with React Native or Flutter.",
    icon: "📱",
    category: "mobile",
    difficulty: "intermediate",
    estimatedWeeks: 20,
    topicCount: 26,
  },
  {
    id: "ai-ml-engineer",
    slug: "ai-ml-engineer",
    title: "AI / ML Engineer",
    description:
      "Design and deploy deep learning models, NLP systems, and intelligent AI-powered applications.",
    icon: "🤖",
    category: "ai",
    difficulty: "advanced",
    estimatedWeeks: 30,
    topicCount: 32,
  },
  {
    id: "cloud-architect",
    slug: "cloud-architect",
    title: "Cloud Architect",
    description:
      "Design scalable, secure cloud infrastructure on AWS, GCP, or Azure. Lead cloud transformation.",
    icon: "☁️",
    category: "cloud",
    difficulty: "advanced",
    estimatedWeeks: 22,
    topicCount: 25,
  },
];
