import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listProducts, categoryOptions } from "@/lib/data";
import { can } from "@/lib/permissions";
import { STOCK_STATUSES } from "@/lib/constants";
import { fmtDate, num } from "@/lib/format";
import { PageHeader, EmptyState, StockBadge, ProductThumb } from "@/components/ui";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

export const metadata = { title: "Produk" };

export default async function ProductsPage({ searchParams }) {
  const user = await requireUser(["admin", "manager", "staff"]);
  const sp = await searchParams;
  const filters = {
    q: sp.q?.trim() || "",
    category: sp.category || "",
    status: STOCK_STATUSES.includes(sp.status) ? sp.status : "",
    sort: ["name", "stock", "created"].includes(sp.sort) ? sp.sort : "name",
    dir: sp.dir === "desc" ? "desc" : "asc",
    page: sp.page || 1,
  };
  const [{ rows, total, page, totalPages }, categories] = await Promise.all([listProducts(filters), categoryOptions()]);
  const manage = can.manageProducts(user);
  const exportQs = new URLSearchParams({ q: filters.q, category: filters.category, status: filters.status }).toString();

  return (
    <>
      <PageHeader
        title="Produk"
        subtitle="Seluruh produk di gudang beserta stok terkini."
        actions={
          <>
            {manage && (
              <a href={`/api/export/products?format=xlsx&${exportQs}`} className="btn btn-outline">
                <Icon name="download" className="h-4 w-4" /> Excel
              </a>
            )}
            {manage && <a href={`/api/export/products?format=csv&${exportQs}`} className="btn btn-outline">CSV</a>}
            <Link href="/products/labels" className="btn btn-outline">
              <Icon name="printer" className="h-4 w-4" /> Label
            </Link>
            {manage && (
              <Link href="/products/new" className="btn btn-primary">
                <Icon name="plus" className="h-4 w-4" /> Tambah Produk
              </Link>
            )}
          </>
        }
      />

      {/* Ringkasan status (klik untuk filter) */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...STOCK_STATUSES].map((s) => {
          const qs = new URLSearchParams({ ...(filters.q && { q: filters.q }), ...(filters.category && { category: filters.category }), ...(s && { status: s }), sort: filters.sort, dir: filters.dir });
          const active = filters.status === s;
          return (
            <Link key={s || "all"} href={`/products?${qs}`}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-400"}`}>
              {s || "Semua"}
            </Link>
          );
        })}
      </div>

      <div className="card overflow-hidden">
        <form className="grid gap-3 border-b border-stone-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_180px_160px_150px_120px_auto]" method="GET">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={filters.q} placeholder="Cari nama atau SKU..." className="input pl-10" />
          </div>
          <select name="category" defaultValue={filters.category} className="input">
            <option value="">Semua kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select name="status" defaultValue={filters.status} className="input">
            <option value="">Semua status</option>
            {STOCK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select name="sort" defaultValue={filters.sort} className="input">
            <option value="name">Urut: Nama</option>
            <option value="stock">Urut: Stok</option>
            <option value="created">Urut: Tanggal ditambahkan</option>
          </select>
          <select name="dir" defaultValue={filters.dir} className="input">
            <option value="asc">Naik ↑</option>
            <option value="desc">Turun ↓</option>
          </select>
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1"><Icon name="filter" className="h-4 w-4" /> Terapkan</button>
            <Link href="/products" className="btn btn-ghost">Reset</Link>
          </div>
        </form>

        {rows.length === 0 ? (
          <EmptyState title="Produk tidak ditemukan" message="Coba ubah kata kunci atau filter." />
        ) : (
          <>
            {/* Tabel (tablet & desktop) */}
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Kategori</th>
                    <th className="text-right">Stok</th>
                    <th>Status</th>
                    <th>Lokasi Rak</th>
                    <th>Ditambahkan</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                          <ProductThumb id={p.id} hasImage={p.has_image} name={p.name} />
                          <span className="font-semibold text-ink hover:underline">{p.name}</span>
                        </Link>
                      </td>
                      <td><span className="sku">{p.sku}</span></td>
                      <td className="text-stone-600">{p.category_name ?? "-"}</td>
                      <td className="text-right font-bold tabular-nums text-ink">
                        {num(p.stock)} <span className="text-xs font-normal text-stone-500">{p.unit}</span>
                      </td>
                      <td><StockBadge status={p.stock_status} /></td>
                      <td><span className="sku">{p.rack_location}</span></td>
                      <td className="whitespace-nowrap text-stone-500">{fmtDate(p.created_at)}</td>
                      <td className="text-right">
                        <div className="flex justify-end gap-1">
                          <Link href={`/products/${p.id}`} className="btn btn-ghost btn-sm" title="Detail"><Icon name="eye" className="h-4 w-4" /></Link>
                          {manage && (
                            <Link href={`/products/${p.id}/edit`} className="btn btn-ghost btn-sm" title="Edit"><Icon name="edit" className="h-4 w-4" /></Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Kartu (mobile) */}
            <ul className="divide-y divide-stone-100 md:hidden">
              {rows.map((p) => (
                <li key={p.id}>
                  <Link href={`/products/${p.id}`} className="flex items-center gap-3 p-4 active:bg-stone-50">
                    <ProductThumb id={p.id} hasImage={p.has_image} name={p.name} size="h-12 w-12" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">{p.name}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-stone-500">
                        <span className="sku">{p.sku}</span> · {p.category_name}
                      </p>
                      <p className="text-xs text-stone-500">
                        Rak <span className="sku">{p.rack_location}</span>
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="font-bold tabular-nums text-ink">{num(p.stock)} <span className="text-xs font-normal text-stone-500">{p.unit}</span></span>
                      <StockBadge status={p.stock_status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} basePath="/products" params={filters} />
      </div>
    </>
  );
}
