import AutoFilterForm from "@/components/client/AutoFilterForm";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listRestockOrders } from "@/lib/data";
import { RESTOCK_STATUSES } from "@/lib/constants";
import { fmtDate, num } from "@/lib/format";
import { EmptyState, PageHeader, RestockStatusBadge, Stars } from "@/components/ui";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

export const metadata = { title: "Restock Order" };

const STEPS = ["Pending", "Confirmed", "In Transit", "Inspecting", "Received"];

function MiniProgress({ status }) {
  if (["Rejected", "Returned"].includes(status)) return <div className="h-1.5 w-28 rounded-full bg-red-200" />;
  const idx = STEPS.indexOf(status);
  return (
    <div className="flex w-28 gap-1" title={status}>
      {STEPS.map((s, i) => (
        <span key={s} className={`h-1.5 flex-1 rounded-full ${i <= idx ? (status === "Received" ? "bg-emerald-500" : "bg-ink") : "bg-stone-200"}`} />
      ))}
    </div>
  );
}

export default async function RestockPage({ searchParams }) {
  const user = await requireUser(["admin", "manager", "staff", "supplier"]);
  const sp = await searchParams;
  const filters = {
    status: RESTOCK_STATUSES.includes(sp.status) ? sp.status : "",
    q: sp.q?.trim() || "",
    page: sp.page || 1,
    sort: ["newest", "oldest", "supplier", "qty_asc", "qty_desc"].includes(sp.sort) ? sp.sort : "newest",
  };
  const isSupplier = user.role === "supplier";
  const { rows, total, page, totalPages } = await listRestockOrders({
    ...filters,
    supplierId: isSupplier ? user.id : undefined,
  });

  return (
    <>
      <PageHeader
        title={isSupplier ? "Restock Order Saya" : "Restock Management"}
        subtitle={isSupplier ? "Permintaan restock dari Warehouse Manager untuk perusahaan Anda." : "Permintaan restock (Purchase Order) kepada supplier."}
        actions={
          <>
            {!isSupplier && (
              <a href={`/api/export/restock?format=xlsx&status=${filters.status}`} className="btn btn-outline"><Icon name="download" className="h-4 w-4" /> Excel</a>
            )}
            {!isSupplier && <a href={`/api/export/restock?format=csv&status=${filters.status}`} className="btn btn-outline">CSV</a>}
            {user.role === "manager" && (
              <Link href="/restock/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Buat Restock Order</Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {["", ...RESTOCK_STATUSES].map((s) => (
          <Link key={s || "all"} href={`/restock?${new URLSearchParams({ ...(s && { status: s }), ...(filters.q && { q: filters.q }), sort: filters.sort })}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${filters.status === s ? "bg-ink text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-400"}`}>
            {s || "Semua"}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden">
        <AutoFilterForm className="flex flex-wrap gap-2 border-b border-stone-100 p-4">
          {filters.status && <input type="hidden" name="status" value={filters.status} />}
          <div className="relative w-full sm:min-w-56 sm:flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input name="q" defaultValue={filters.q} placeholder={isSupplier ? "Cari nomor PO..." : "Cari nomor PO atau supplier..."} className="input pl-10" />
          </div>
          <select name="sort" defaultValue={filters.sort} className="input sm:w-56">
            <option value="newest">Tanggal terbaru</option>
            <option value="oldest">Tanggal terlama</option>
            {!isSupplier && <option value="supplier">Supplier A–Z</option>}
            <option value="qty_asc">Jumlah barang terendah</option>
            <option value="qty_desc">Jumlah barang tertinggi</option>
          </select>
          <Link href="/restock" className="btn btn-ghost">Reset</Link>
        </AutoFilterForm>

        {rows.length === 0 ? (
          <EmptyState title="Belum ada restock order" />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>No. PO</th>
                    {!isSupplier && <th>Supplier</th>}
                    <th>Tgl Order</th>
                    <th>Expected</th>
                    <th className="text-right">Jenis / Jumlah Barang</th>
                    <th>Progres</th>
                    <th>Status</th>
                    <th>Rating</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/restock/${r.id}`} className="sku font-semibold text-ink hover:underline">{r.po_number}</Link></td>
                      {!isSupplier && <td className="font-medium">{r.supplier_name}</td>}
                      <td className="whitespace-nowrap text-stone-600">{fmtDate(r.order_date)}</td>
                      <td className="whitespace-nowrap text-stone-600">{fmtDate(r.expected_date)}</td>
                      <td className="text-right tabular-nums">{r.item_count} jenis / <b>{num(r.total_qty)}</b></td>
                      <td><MiniProgress status={r.status} /></td>
                      <td><RestockStatusBadge status={r.status} /></td>
                      <td>{r.rating ? <Stars value={r.rating} className="h-3.5 w-3.5" /> : <span className="text-xs text-stone-400">-</span>}</td>
                      <td className="text-right">
                        <Link href={`/restock/${r.id}`} className={`btn btn-sm ${isSupplier && r.status === "Pending" ? "btn-accent" : "btn-ghost"}`}>
                          {isSupplier && r.status === "Pending" ? "Konfirmasi" : "Detail"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-stone-100 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/restock/${r.id}`} className="block space-y-2 p-4 active:bg-stone-50">
                    <div className="flex items-center justify-between">
                      <span className="sku font-semibold text-ink">{r.po_number}</span>
                      <RestockStatusBadge status={r.status} />
                    </div>
                    {!isSupplier && <p className="text-sm font-medium">{r.supplier_name}</p>}
                    <MiniProgress status={r.status} />
                    <p className="text-xs text-stone-500">Order {fmtDate(r.order_date)} · Expected {fmtDate(r.expected_date)} · {r.item_count} item</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} basePath="/restock" params={filters} />
      </div>
    </>
  );
}
