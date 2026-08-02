import { SettingsManager } from "@/components/settings/settings-manager";
import { requireWorkspace } from "@/lib/auth";

export default async function SettingsPage() {
  const { membership } = await requireWorkspace();
  return <SettingsManager canManage={["OWNER", "ADMIN"].includes(membership.role)} />;
}
