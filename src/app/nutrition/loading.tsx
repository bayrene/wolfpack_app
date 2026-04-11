export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-36 bg-neutral-800 rounded-lg" />

      {/* Date / range selector */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-20 bg-neutral-800 rounded-lg" />
        ))}
      </div>

      {/* Macro summary row */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Daily chart */}
      <div className="h-48 bg-neutral-800 rounded-xl" />

      {/* Micro-nutrient rows */}
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-neutral-800 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
