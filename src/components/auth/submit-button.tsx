"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({ children, pendingLabel }: { children: React.ReactNode; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="primary-button auth-submit" type="submit" disabled={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
