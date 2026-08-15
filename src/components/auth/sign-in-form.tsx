"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, type AuthActionState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/auth/password-field";

const initialState: AuthActionState = {};

export function SignInForm({ initialError, initialMessage }: { initialError?: string; initialMessage?: string }) {
  const [state, action] = useActionState(signIn, initialError ? { error: initialError } : initialState);
  return (
    <form className="auth-form" action={action}>
      {state.error && <div className="form-alert error" role="alert">{state.error}</div>}
      {initialMessage && !state.error && <div className="form-alert success" role="status">{initialMessage}</div>}
      <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
      <label>
        <span>Password <Link href="/forgot-password">Forgot password?</Link></span>
        <PasswordField name="password" autoComplete="current-password" placeholder="Enter your password" />
      </label>
      <SubmitButton pendingLabel="Signing in…">Sign in <span>→</span></SubmitButton>
    </form>
  );
}
