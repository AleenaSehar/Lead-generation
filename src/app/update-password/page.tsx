import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { UpdatePasswordForm } from "@/components/auth/password-forms";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function UpdatePasswordPage() {
  await requireUser();
  return (
    <AuthShell
      eyebrow="SECURE ACCOUNT"
      title="Choose a new password"
      description="Use a unique password with at least eight characters."
      footer={<p><Link href="/">Return to dashboard</Link></p>}
    >
      <UpdatePasswordForm />
    </AuthShell>
  );
}
