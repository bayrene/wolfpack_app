export default function Loading() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      {/* Header */}
      <div className="h-8 w-40 bg-neutral-800 rounded-lg" />

      {/* Top stat row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Main card grid */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 bg-neutral-800 rounded-xl" />
        ))}
      </div>

      {/* Wide bottom card */}
      <div className="h-48 bg-neutral-800 rounded-xl" />
    </div>
  );
}
