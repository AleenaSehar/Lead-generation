"use client";

import { useActionState } from "react";
import { signUp, type AuthActionState } from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/auth/password-field";

const initialState: AuthActionState = {};

export function SignUpForm() {
  const [state, action] = useActionState(signUp, initialState);
  return (
    <form className="auth-form" action={action}>
      {state.error && <div className="form-alert error" role="alert">{state.error}</div>}
      {state.message && <div className="form-alert success" role="status">{state.message}</div>}
      <label>Full name<input name="name" autoComplete="name" required placeholder="Your full name" /></label>
      <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
      <label>Password<PasswordField name="password" autoComplete="new-password" placeholder="At least 8 characters" /></label>
      <SubmitButton pendingLabel="Creating account…">Create account <span>→</span></SubmitButton>
    </form>
  );
}
