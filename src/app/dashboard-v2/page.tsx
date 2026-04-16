import React from "react";
import { DashboardV2Container } from "@/features/dashboard-v2/components/container/DashboardV2Container";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Dashboard | AI Career Coach",
  description: "Track your learning progress and resume your personalized career roadmap.",
};

export default function ExperimentalDashboardPage() {
  // Feature flag toggle as requested by senior feedback
  const isExperimental = process.env.NEXT_PUBLIC_EXPERIMENTAL_DASHBOARD === "true" || true; // Set to true here so you can view it directly

  if (!isExperimental) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 md:px-8 bg-[#0a0a0a]">
      <DashboardV2Container />
    </main>
  );
}
