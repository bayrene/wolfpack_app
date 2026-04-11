export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header + week nav */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-28 bg-neutral-800 rounded-lg" />
        <div className="flex gap-2">
          <div className="h-9 w-9 bg-neutral-800 rounded-lg" />
          <div className="h-9 w-24 bg-neutral-800 rounded-lg" />
          <div className="h-9 w-9 bg-neutral-800 rounded-lg" />
        </div>
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-64 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Nutrition summary */}
      <div className="h-40 bg-neutral-800 rounded-xl" />
    </div>
  );
}
