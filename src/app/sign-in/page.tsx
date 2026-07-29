import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignInForm } from "@/components/auth/sign-in-form";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCurrentUser()) redirect("/");
  const configured = isSupabaseConfigured();
  const callbackFailed = (await searchParams).error === "callback";
  return (
    <AuthShell
      eyebrow="WELCOME BACK"
      title="Sign in to LeadFlow"
      description="Continue to your lead-generation workspace."
      footer={<p>New to LeadFlow? <Link href="/sign-up">Create an account</Link></p>}
    >
      {!configured && <div className="form-alert error" role="alert">Supabase is not configured yet. Add your development project credentials to <code>.env</code>.</div>}
      {configured && <SignInForm initialError={callbackFailed ? "That authentication link is invalid or expired. Please try again." : undefined} />}
    </AuthShell>
  );
}
