export function MetricCard({
  icon,
  tone,
  label,
  value,
  change,
  detail,
}: {
  icon: string;
  tone: string;
  label: string;
  value: string;
  change: string;
  detail: string;
}) {
  return (
    <article>
      <div className="metric-top">
        <span className={`metric-icon ${tone}`}>{icon}</span>
        <em className="positive">↗ {change}</em>
      </div>
      <p>{label}</p>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}
