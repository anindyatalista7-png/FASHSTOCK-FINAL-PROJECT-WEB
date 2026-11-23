import Link from "next/link";
import Icon from "./Icon";

/** Pagination berbasis query string (?page=N), mempertahankan filter yang aktif. */
export default function Pagination({ page, totalPages, total, basePath, params = {} }) {
  if (totalPages <= 1) {
    return total > 0 ? <p className="px-5 py-4 text-xs text-stone-500">{total} data</p> : null;
  }
  const href = (p) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && k !== "page") sp.set(k, v);
    });
    sp.set("page", p);
    return `${basePath}?${sp.toString()}`;
  };
  const pages = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  const base = "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition";
  return (
    <nav className="flex flex-col items-center justify-between gap-3 px-5 py-4 sm:flex-row" aria-label="Pagination">
      <p className="text-xs text-stone-500">
        Halaman <b className="text-stone-700">{page}</b> dari {totalPages} · {total} data
      </p>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link href={href(page - 1)} className={`${base} hover:bg-stone-100`} aria-label="Sebelumnya"><Icon name="chevronLeft" className="h-4 w-4" /></Link>
        ) : (
          <span className={`${base} text-stone-300`}><Icon name="chevronLeft" className="h-4 w-4" /></span>
        )}
        {pages.map((p) => (
          <Link key={p} href={href(p)} className={`${base} ${p === page ? "bg-ink text-white" : "hover:bg-stone-100"}`}>{p}</Link>
        ))}
        {page < totalPages ? (
          <Link href={href(page + 1)} className={`${base} hover:bg-stone-100`} aria-label="Berikutnya"><Icon name="chevronRight" className="h-4 w-4" /></Link>
        ) : (
          <span className={`${base} text-stone-300`}><Icon name="chevronRight" className="h-4 w-4" /></span>
        )}
      </div>
    </nav>
  );
}
