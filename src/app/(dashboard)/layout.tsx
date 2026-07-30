import { AppShell } from "@/components/layout/app-shell";
import { LeadProvider } from "@/components/leads/lead-provider";
import { requireWorkspace } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, workspace, membership } = await requireWorkspace();

  return (
    <LeadProvider role={membership.role}>
      <AppShell
        viewer={{
          name: user.name ?? user.email,
          email: user.email,
          imageUrl: user.imageUrl,
          workspaceName: workspace.name,
          role: membership.role,
        }}
      >
        {children}
      </AppShell>
    </LeadProvider>
  );
}
