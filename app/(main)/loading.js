export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-2 h-4 w-24 rounded bg-stone-200" />
      <div className="mb-8 h-8 w-64 rounded-lg bg-stone-200" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl bg-stone-200/70" />
        ))}
      </div>
      <div className="mt-6 h-72 rounded-2xl bg-stone-200/60" />
    </div>
  );
}
