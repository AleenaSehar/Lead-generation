"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function Topbar({
  onMenu,
  onAddLead,
  canAddLead,
}: {
  onMenu: () => void;
  onAddLead: () => void;
  canAddLead: boolean;
}) {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    document.addEventListener("keydown", focusSearch);
    return () => document.removeEventListener("keydown", focusSearch);
  }, []);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    router.push(query.trim() ? `/leads?q=${encodeURIComponent(query.trim())}` : "/leads");
  }

  return (
    <header className="topbar">
      <button className="mobile-menu" type="button" onClick={onMenu} aria-label="Open menu">☰</button>
      <form className="search" onSubmit={submitSearch}>
        <span aria-hidden="true">⌕</span>
        <label className="screen-reader-only" htmlFor="global-search">Search leads and campaigns</label>
        <input
          ref={searchRef}
          id="global-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search leads, campaigns..."
        />
        <kbd>⌘ K</kbd>
      </form>
      <div className="top-actions">
        <button className="icon-button" type="button" aria-label="Notifications">♢<i /></button>
        {canAddLead && <button className="primary-button" type="button" onClick={onAddLead}><span>＋</span>Add lead</button>}
      </div>
    </header>
  );
}
