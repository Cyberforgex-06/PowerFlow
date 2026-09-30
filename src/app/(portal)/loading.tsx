export default function Loading() {
  return (
    <div className="page-loading" role="status">
      <div className="skeleton" />
      <div className="stats-grid">
        {[1, 2, 3].map((i) => (
          <div className="skeleton" key={i} />
        ))}
      </div>
      <p>Loading your account…</p>
    </div>
  );
}
