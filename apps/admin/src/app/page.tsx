export default function AdminHomePage() {
  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "2rem" }}>
      <div style={{ maxWidth: "48rem" }}>
        <p style={{ color: "#ffc105", fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          Admin Workspace
        </p>
        <h1 style={{ fontSize: "3rem", lineHeight: 1, margin: "1rem 0", textTransform: "uppercase" }}>
          Standalone Admin Dashboard
        </h1>
        <p style={{ color: "#a1a1aa", lineHeight: 1.7 }}>
          Phase 1 initialized an isolated Next.js application at <code>apps/admin</code>. Order tools, catalog management, and RBAC-aware navigation will be layered on top in later phases.
        </p>
      </div>
    </main>
  );
}
