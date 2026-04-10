import type { RoadmapResponseInput } from "../types";

// ============================================
// FALLBACK ROADMAP (v2)
// ============================================
// Used when AI generation fails — graceful degradation.
// Shape must match the v2 AI response contract:
//   Topic → Subtopic[] → Task[]
// ============================================

export function getFallbackRoadmap(roleTitle: string): RoadmapResponseInput {
  return {
    role: roleTitle,
    topics: [
      {
        title: "Internet & Web Basics",
        description: "Understand how the internet works, HTTP protocols, DNS, and baseline networking.",
        difficulty: "Beginner",
        estimatedTime: "1 week",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn HTTP & DNS", type: "learn", estimatedTime: "2 hours" },
              { title: "Practice: Inspect network requests", type: "practice", estimatedTime: "1 hour" },
            ],
          },
        ],
      },
      {
        title: "HTML / CSS Fundamentals",
        description: "Learn Semantic HTML elements, modern CSS layouts (Flexbox/Grid), and responsive design.",
        difficulty: "Beginner",
        estimatedTime: "2 weeks",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn semantic HTML", type: "learn", estimatedTime: "3 hours" },
              { title: "Learn Flexbox & Grid", type: "learn", estimatedTime: "4 hours" },
              { title: "Build a responsive page", type: "project", estimatedTime: "6 hours" },
            ],
          },
        ],
      },
      {
        title: "JavaScript Essentials",
        description: "Master ES6+ syntax, let/const, arrow functions, DOM manipulation, promises, and basic async logic.",
        difficulty: "Intermediate",
        estimatedTime: "3 weeks",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn ES6+ fundamentals", type: "learn", estimatedTime: "5 hours" },
              { title: "Practice DOM manipulation", type: "practice", estimatedTime: "3 hours" },
              { title: "Learn async/await & Promises", type: "learn", estimatedTime: "4 hours" },
            ],
          },
        ],
      },
      {
        title: "Git & Version Control",
        description: "Understand branching strategies, merging, cloning, and managing repositories safely.",
        difficulty: "Beginner",
        estimatedTime: "1 week",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn Git basics", type: "learn", estimatedTime: "2 hours" },
              { title: "Practice branching & merging", type: "practice", estimatedTime: "2 hours" },
            ],
          },
        ],
      },
      {
        title: "Frontend Frameworks (React)",
        description: "Component lifecycle, Hooks (useState, useEffect), and JSX templating logic.",
        difficulty: "Intermediate",
        estimatedTime: "4 weeks",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn React fundamentals", type: "learn", estimatedTime: "6 hours" },
              { title: "Learn Hooks: useState, useEffect", type: "learn", estimatedTime: "4 hours" },
              { title: "Build a React CRUD app", type: "project", estimatedTime: "8 hours" },
            ],
          },
        ],
      },
      {
        title: "Backend Basics (Node.js/Express)",
        description: "Set up simple HTTP servers, handle REST verbs, parse JSON, and run middleware.",
        difficulty: "Intermediate",
        estimatedTime: "3 weeks",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn Node.js fundamentals", type: "learn", estimatedTime: "4 hours" },
              { title: "Build a REST API with Express", type: "project", estimatedTime: "6 hours" },
            ],
          },
        ],
      },
      {
        title: "Database Fundamentals",
        description: "Differences between SQL and NoSQL. Basic CRUD operations and querying strategies.",
        difficulty: "Intermediate",
        estimatedTime: "2 weeks",
        isOptional: false,
        subtopics: [
          {
            title: "Core Concepts",
            type: "core",
            tasks: [
              { title: "Learn SQL vs NoSQL", type: "learn", estimatedTime: "3 hours" },
              { title: "Practice CRUD operations", type: "practice", estimatedTime: "3 hours" },
            ],
          },
        ],
      },
    ],
  };
}
