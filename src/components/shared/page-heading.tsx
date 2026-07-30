export function PageHeading({
  eyebrow,
  title,
  description,
  action,
  compact = true,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`page-heading ${compact ? "compact" : ""}`}>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
