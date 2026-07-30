import type { Metadata } from "next";
import { AutomationManager } from "@/components/automations/automation-manager";

export const metadata: Metadata = { title: "Automations" };

export default function AutomationsPage() {
  return <AutomationManager />;
}
