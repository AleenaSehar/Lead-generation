import { ScoringManager } from "@/components/scoring/scoring-manager";
import { requireWorkspace } from "@/lib/auth";

export default async function SettingsPage() {
  const { membership } = await requireWorkspace();
  return <ScoringManager canManage={["OWNER", "ADMIN"].includes(membership.role)} />;
}
