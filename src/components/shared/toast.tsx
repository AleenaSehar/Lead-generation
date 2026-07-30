export function Toast({ open }: { open: boolean }) {
  return (
    <div className={`toast ${open ? "show" : ""}`} role="status" aria-live="polite">
      <span>✓</span>
      <div><strong>Lead added</strong><small>The lead is saved to your workspace.</small></div>
    </div>
  );
}
