import React from "react";
import { DashboardContainer } from "@/features/dashboard";

export const metadata = {
  title: "Dashboard | AI Career Coach",
  description: "Track your learning progress and resume your personalized career roadmap.",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-[#0a0a0a]">
      <DashboardContainer />
    </main>
  );
}
