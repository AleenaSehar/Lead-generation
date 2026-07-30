"use client";

import { useActionState } from "react";
import {
  requestPasswordReset,
  updatePassword,
  type AuthActionState,
} from "@/app/auth/actions";
import { SubmitButton } from "@/components/auth/submit-button";
import { PasswordField } from "@/components/auth/password-field";

const initialState: AuthActionState = {};

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialState);
  return (
    <form className="auth-form" action={action}>
      {state.error && <div className="form-alert error" role="alert">{state.error}</div>}
      {state.message && <div className="form-alert success" role="status">{state.message}</div>}
      <label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@company.com" /></label>
      <SubmitButton pendingLabel="Sending link…">Send reset link <span>→</span></SubmitButton>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, initialState);
  return (
    <form className="auth-form" action={action}>
      {state.error && <div className="form-alert error" role="alert">{state.error}</div>}
      {state.message && <div className="form-alert success" role="status">{state.message}</div>}
      <label>New password<PasswordField name="password" autoComplete="new-password" placeholder="At least 8 characters" /></label>
      <label>Confirm password<PasswordField name="confirmation" autoComplete="new-password" placeholder="Repeat your password" /></label>
      <SubmitButton pendingLabel="Updating…">Update password <span>→</span></SubmitButton>
    </form>
  );
}
