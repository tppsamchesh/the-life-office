// Instant loading skeleton for every page in the dashboard route group,
// shaped like the shared header (serif title + count line) over list rows.
export default function DashboardLoading() {
  return (
    <div aria-busy="true" className="animate-pulse">
      <div className="h-8 w-44 rounded-md bg-inset" />
      <div className="mt-2 h-4 w-28 rounded-md bg-inset" />
      <div className="mt-6 space-y-3">
        <div className="h-16 rounded-xl bg-inset" />
        <div className="h-16 rounded-xl bg-inset" />
        <div className="h-16 rounded-xl bg-inset" />
      </div>
    </div>
  );
}
