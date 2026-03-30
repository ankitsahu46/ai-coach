import { AppShell } from "@/components/layout/AppShell";
import { RoleSelectionPage } from "@/features/role-selection/components/RoleSelectionPage";

export default function Home() {
  return (
    <AppShell>
      <RoleSelectionPage />
    </AppShell>
  );
}
