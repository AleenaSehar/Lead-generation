import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ForgotPasswordPage() {
  const configured = isSupabaseConfigured();
  return (
    <AuthShell
      eyebrow="ACCOUNT RECOVERY"
      title="Reset your password"
      description="Enter your account email and we’ll send a secure reset link."
      footer={<p>Remembered it? <Link href="/sign-in">Return to sign in</Link></p>}
    >
      {!configured && <div className="form-alert error" role="alert">Supabase is not configured yet. Add your development project credentials to <code>.env</code>.</div>}
      {configured && <ForgotPasswordForm />}
    </AuthShell>
  );
}
