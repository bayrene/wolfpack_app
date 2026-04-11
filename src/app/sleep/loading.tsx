export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-24 bg-neutral-800 rounded-lg" />

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Chart */}
      <div className="h-52 bg-neutral-800 rounded-xl" />

      {/* Recent log entries */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 bg-neutral-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
