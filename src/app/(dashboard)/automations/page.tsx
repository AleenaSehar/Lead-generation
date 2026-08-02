import type { Metadata } from "next";
import { AutomationManager } from "@/components/automations/automation-manager";
import { requireWorkspace } from "@/lib/auth";

export const metadata: Metadata = { title: "Automations" };

export default async function AutomationsPage() {
  const { membership } = await requireWorkspace();
  return <AutomationManager canManage={membership.role === "OWNER" || membership.role === "ADMIN"} />;
}
