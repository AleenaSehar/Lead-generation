import { CrmManager } from "@/components/integrations/crm-manager";
import { requireWorkspace } from "@/lib/auth";

export default async function IntegrationsPage() {
  const { membership } = await requireWorkspace();
  return <CrmManager canManage={["OWNER", "ADMIN"].includes(membership.role)} />;
}
