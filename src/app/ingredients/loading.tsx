export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header + add button */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-neutral-800 rounded-lg" />
        <div className="h-9 w-28 bg-neutral-800 rounded-lg" />
      </div>

      {/* Search bar */}
      <div className="h-10 bg-neutral-800 rounded-lg" />

      {/* Category filter pills */}
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-20 bg-neutral-800 rounded-full" />
        ))}
      </div>

      {/* Ingredient rows */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-14 bg-neutral-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
