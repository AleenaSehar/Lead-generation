"use client";

import { useActionState, useState } from "react";
import { createWorkspace, type WorkspaceActionState } from "@/app/onboarding/actions";
import { SubmitButton } from "@/components/auth/submit-button";

const initialState: WorkspaceActionState = {};

function makeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function WorkspaceForm() {
  const [state, action] = useActionState(createWorkspace, initialState);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);

  return (
    <form className="auth-form" action={action}>
      {state.error && <div className="form-alert error" role="alert">{state.error}</div>}
      <label>
        Workspace name
        <input
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (!slugEdited) setSlug(makeSlug(event.target.value));
          }}
          required
          placeholder="e.g. Acme Growth"
        />
      </label>
      <label>
        Workspace URL
        <div className="slug-input"><span>leadflow.app/</span><input name="slug" value={slug} onChange={(event) => { setSlugEdited(true); setSlug(makeSlug(event.target.value)); }} required minLength={3} placeholder="acme-growth" /></div>
      </label>
      <SubmitButton pendingLabel="Creating workspace…">Create workspace <span>→</span></SubmitButton>
    </form>
  );
}
