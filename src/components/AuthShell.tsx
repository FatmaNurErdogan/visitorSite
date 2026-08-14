// Shared two-panel layout for the public entry pages (/ and /login) — a
// branded hero panel + the actual content, side by side on desktop and
// stacked on narrow viewports. Replaces the old single centered column
// that looked identical to a phone screen even on a wide browser window.
export function AuthShell({
  children,
  tagline,
}: {
  children: React.ReactNode;
  tagline?: string;
}) {
  return (
    <div className="auth-shell">
      <div className="auth-hero" aria-hidden="true">
        <div className="auth-hero-blob auth-hero-blob-1" />
        <div className="auth-hero-blob auth-hero-blob-2" />
        <div className="auth-hero-content">
          <div className="auth-hero-logo">F</div>
          <div className="auth-hero-title">Foyer</div>
          <p className="auth-hero-tagline">{tagline ?? "Ziyaretçi yönetimi, doğru şekilde."}</p>
        </div>
      </div>
      <main className="auth-content">
        <div className="auth-content-inner">{children}</div>
      </main>
    </div>
  );
}
