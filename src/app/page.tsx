import { AppShell } from "@/components/layout/AppShell";
import { RoleSelectionPage } from "@/features/role-selection/components/RoleSelectionPage";
import { AuthDebug } from "@/features/auth/components/AuthDebug";

export default function Home() {
  return (
    <AppShell>
      <RoleSelectionPage />
      <AuthDebug />
    </AppShell>
  );
}
