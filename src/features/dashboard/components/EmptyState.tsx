import Link from "next/link";
import { PlusCircle, Search } from "lucide-react";

interface EmptyStateProps {
  type: "no-role" | "no-roadmap";
  roleTitle?: string;
}

export function EmptyState({ type, roleTitle }: EmptyStateProps) {
  const isNoRole = type === "no-role";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-white/[0.02] backdrop-blur-md">
      <div className="w-16 h-16 mb-6 rounded-full bg-white/5 flex items-center justify-center text-white/40">
        {isNoRole ? <Search size={32} /> : <PlusCircle size={32} />}
      </div>
      
      <h3 className="text-xl font-medium text-white mb-2">
        {isNoRole ? "No Role Selected" : "No Roadmap Found"}
      </h3>
      
      <p className="text-white/60 mb-8 max-w-md">
        {isNoRole 
          ? "Select a career role to start your learning journey and generate a personalized roadmap."
          : `You haven't generated a roadmap for ${roleTitle ? `the ${roleTitle}` : "your selected"} role yet. Generate one to start tracking your progress.`}
      </p>

      <Link
        href="/"
        className="px-6 py-3 rounded-full bg-white text-black font-medium hover:bg-white/90 transition-colors"
      >
        {isNoRole ? "Select a Role" : `Generate Roadmap${roleTitle ? ` for ${roleTitle}` : ""}`}
      </Link>
    </div>
  );
}
