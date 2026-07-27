export function Toast({ open }: { open: boolean }) {
  return (
    <div className={`toast ${open ? "show" : ""}`} role="status" aria-live="polite">
      <span>✓</span>
      <div><strong>Lead added</strong><small>The welcome workflow has started.</small></div>
    </div>
  );
}
