"use client";

import { useState } from "react";

export function PasswordField({
  name,
  autoComplete,
  placeholder,
}: {
  name: string;
  autoComplete: "current-password" | "new-password";
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="password-field">
      <input
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required
        minLength={8}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
          <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
          <circle cx="12" cy="12" r="2.75" />
          {visible && <path className="visibility-slash" d="m4 4 16 16" />}
        </svg>
      </button>
    </span>
  );
}
