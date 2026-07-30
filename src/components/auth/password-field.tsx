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
      >
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}
