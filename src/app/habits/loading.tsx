export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-32 bg-neutral-800 rounded-lg" />

      {/* Tab bar */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-9 w-24 bg-neutral-800 rounded-lg" />
        ))}
      </div>

      {/* Section title */}
      <div className="h-5 w-36 bg-neutral-800 rounded" />

      {/* List of habit rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-48 bg-neutral-800 rounded-xl" />
    </div>
  );
}
