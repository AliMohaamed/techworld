export default function AdminHomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-[28px] border border-white/5 bg-[radial-gradient(circle_at_top,#222,transparent_45%),#24201a] px-8 py-10">
        <p className="text-[11px] uppercase tracking-[0.35em] text-[#ffc105]">
          Foundational Phase
        </p>
        <h1 className="mt-3 text-4xl font-semibold uppercase tracking-tight text-white">
          Standalone Admin Dashboard
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
          Convex Better Auth, the shared backend package, and the centralized UI package are now wired into the admin workspace. Order queues and catalog management screens can build on top of this shell in the next phase.
        </p>
      </section>
      <section className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {[
          "Order verification workspace",
          "Catalog and category operations",
          "Permission-aware admin navigation",
        ].map((item) => (
          <div
            key={item}
            className="rounded-[24px] border border-white/5 bg-[#24201a] p-6 text-sm text-zinc-300"
          >
            {item}
          </div>
        ))}
      </section>
    </main>
  );
}
