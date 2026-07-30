export function PlaceholderPage({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <section className="page empty-page">
      <span aria-hidden="true">{icon}</span>
      <h1>{title}</h1>
      <p>{description}</p>
    </section>
  );
}
