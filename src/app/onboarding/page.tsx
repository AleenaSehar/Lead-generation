import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { WorkspaceForm } from "@/components/auth/workspace-form";
import { getCurrentWorkspace, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  await requireUser();
  if (await getCurrentWorkspace()) redirect("/");

  return (
    <AuthShell
      eyebrow="ONE LAST STEP"
      title="Create your workspace"
      description="Your workspace keeps leads, campaigns, workflows, and team access separate."
    >
      <WorkspaceForm />
    </AuthShell>
  );
}
