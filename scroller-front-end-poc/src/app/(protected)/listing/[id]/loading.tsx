export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-zelli-bg pt-[max(1rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      <section
        aria-label="Loading listing"
        className="mx-auto flex w-full max-w-[420px] flex-col gap-5 py-4"
      >
        <div className="animate-pulse rounded-zelli-card border border-zelli-border bg-zelli-surface p-4">
          <div className="aspect-[4/3] w-full rounded-xl bg-zelli-accent-soft" />
          <div className="mt-4 flex flex-col gap-3">
            <div className="h-5 w-3/4 rounded bg-zelli-border/60" />
            <div className="h-4 w-1/2 rounded bg-zelli-border/50" />
            <div className="h-5 w-1/3 rounded bg-zelli-border/60" />
            <div className="h-3 w-2/3 rounded bg-zelli-border/40" />
          </div>
        </div>
      </section>
    </main>
  );
}
