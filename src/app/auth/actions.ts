"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error?: string;
  message?: string;
}

const emailSchema = z.email("Enter a valid email address.");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters.");
const signUpSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80, "Name is too long."),
  email: emailSchema,
  password: passwordSchema,
});
const signInSchema = z.object({ email: emailSchema, password: passwordSchema });

function firstIssue(error: z.ZodError) {
  return error.issues[0]?.message ?? "Check the information and try again.";
}

async function getOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) return origin;
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function signIn(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Email or password is incorrect." };

  redirect("/");
}

export async function signUp(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: `${await getOrigin()}/auth/callback?next=/onboarding`,
    },
  });
  if (error) return { error: error.message };
  if (data.session) redirect("/onboarding");

  return { message: "Check your email to confirm your account, then return to sign in." };
}

export async function requestPasswordReset(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${await getOrigin()}/auth/callback?next=/update-password`,
  });

  return { message: "If an account exists for that email, a password-reset link is on its way." };
}

export async function updatePassword(
  _: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const password = formData.get("password");
  const confirmation = formData.get("confirmation");
  const parsed = passwordSchema.safeParse(password);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (password !== confirmation) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: error.message };

  return { message: "Your password has been updated. You can return to the dashboard." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
