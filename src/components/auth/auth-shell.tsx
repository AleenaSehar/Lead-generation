import Link from "next/link";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Link className="brand auth-brand" href="/">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>LeadFlow</span>
        </Link>
        <div>
          <p className="eyebrow">AUTOMATED LEAD GENERATION</p>
          <h1>Turn the right prospects into real conversations.</h1>
          <p>Capture, qualify, and engage leads from one focused workspace.</p>
        </div>
        <small>Built for relevant, transparent, permission-aware outreach.</small>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          <p className="auth-description">{description}</p>
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </section>
    </main>
  );
}
