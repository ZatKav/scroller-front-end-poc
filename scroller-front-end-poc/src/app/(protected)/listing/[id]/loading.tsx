export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-gradient-to-br from-blue-50 to-indigo-100 pt-[max(1rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))]">
      <section
        aria-label="Loading listing detail"
        className="mx-auto flex min-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col gap-6 py-4"
      >
        <div>
          <div className="h-4 w-28 rounded bg-indigo-200" />
          <div className="mt-3 h-9 w-48 rounded bg-gray-200" />
          <div className="mt-3 h-4 w-72 max-w-full rounded bg-gray-200" />
        </div>
        <div className="flex h-[min(58vh,34rem)] min-h-80 items-center justify-center rounded-lg border border-white/70 bg-white/70 shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-indigo-600" />
            <p className="mt-4 text-gray-600">Loading listing...</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-lg border border-white/70 bg-white/75" />
          <div className="h-24 rounded-lg border border-white/70 bg-white/75" />
          <div className="h-24 rounded-lg border border-white/70 bg-white/75" />
        </div>
      </section>
    </main>
  );
}
