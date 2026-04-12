import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/providers/AppProviders";
import "./globals.css";
import "@/features/roadmap/components/roadmap-ui/index.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Career Coach — Your Personalized Learning Roadmap",
  description:
    "Select a career role and let AI generate a structured learning roadmap. Track your progress, stay consistent, and accelerate your career growth.",
  keywords: [
    "career coach",
    "AI roadmap",
    "learning path",
    "developer roadmap",
    "skill tracking",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
