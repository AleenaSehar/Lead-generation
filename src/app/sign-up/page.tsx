import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function SignUpPage() {
  if (await getCurrentUser()) redirect("/");
  const configured = isSupabaseConfigured();
  return (
    <AuthShell
      eyebrow="START BUILDING"
      title="Create your account"
      description="Set up your identity, then create your first workspace."
      footer={<p>Already have an account? <Link href="/sign-in">Sign in</Link></p>}
    >
      {!configured && <div className="form-alert error" role="alert">Supabase is not configured yet. Add your development project credentials to <code>.env</code>.</div>}
      {configured && <SignUpForm />}
    </AuthShell>
  );
}
