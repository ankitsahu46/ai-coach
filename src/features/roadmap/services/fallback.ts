import type { RoadmapResponseOutput } from "../types";

export function getFallbackRoadmap(roleTitle: string): RoadmapResponseOutput {
  return {
    role: roleTitle,
    topics: [
      {
        title: "Internet & Web Basics",
        description: "Understand how the internet works, HTTP protocols, DNS, and baseline networking.",
        difficulty: "Beginner",
        estimatedTime: "1 week",
      },
      {
        title: "HTML / CSS Fundamentals",
        description: "Learn Semantic HTML elements, modern CSS layouts (Flexbox/Grid), and responsive design.",
        difficulty: "Beginner",
        estimatedTime: "2 weeks",
      },
      {
        title: "JavaScript Essentials",
        description: "Master ES6+ syntax, let/const, arrow functions, DOM manipulation, promises, and basic async logic.",
        difficulty: "Intermediate",
        estimatedTime: "3 weeks",
      },
      {
        title: "Git & Version Control",
        description: "Understand branching strategies, merging, cloning, and managing repositories safely on GitHub/GitLab.",
        difficulty: "Beginner",
        estimatedTime: "1 week",
      },
      {
        title: "Frontend Frameworks (React)",
        description: "Component lifecycle, Hooks (useState, useEffect), and JSX templating logic.",
        difficulty: "Intermediate",
        estimatedTime: "4 weeks",
      },
      {
        title: "Backend Basics (Node.js/Express)",
        description: "Set up simple HTTP servers, handle REST verbs, parse JSON, and run middleware.",
        difficulty: "Intermediate",
        estimatedTime: "3 weeks",
      },
      {
        title: "Database Fundamentals",
        description: "Differences between SQL and NoSQL. Basic CRUD operations and querying strategies.",
        difficulty: "Intermediate",
        estimatedTime: "2 weeks",
      },
    ]
  };
}
