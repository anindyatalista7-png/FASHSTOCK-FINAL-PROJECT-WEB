import AutoFilterForm from "@/components/client/AutoFilterForm";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTransactions } from "@/lib/data";
import { can } from "@/lib/permissions";
import { TRX_STATUSES } from "@/lib/constants";
import { fmtDate, num } from "@/lib/format";
import { EmptyState, PageHeader, TrxStatusBadge } from "@/components/ui";
import Pagination from "@/components/Pagination";
import Icon from "@/components/Icon";

export const metadata = { title: "Transaksi" };

export default async function TransactionsPage({ searchParams }) {
  const user = await requireUser(["admin", "manager", "staff"]);
  const sp = await searchParams;
  const type = sp.type === "OUT" ? "OUT" : "IN";
  const statuses = type === "IN" ? TRX_STATUSES.filter((s) => s !== "Shipped") : TRX_STATUSES;
  const filters = {
    type,
    status: statuses.includes(sp.status) ? sp.status : "",
    from: "",
    to: "",
    party: sp.party?.trim() || "",
    q: sp.q?.trim() || "",
    sort: ["newest", "oldest", "number", "status"].includes(sp.sort) ? sp.sort : "newest",
    mine: sp.mine === "1" ? "1" : "",
    page: sp.page || 1,
  };
  const { rows, total, page, totalPages } = await listTransactions({
    ...filters,
    sort: ["newest", "oldest"].includes(filters.sort) ? "date" : filters.sort,
    dir: filters.sort === "newest" ? "desc" : "asc",
    createdBy: filters.mine ? user.id : undefined,
  });
  const exportQs = new URLSearchParams({ type, status: filters.status, from: filters.from, to: filters.to }).toString();

  const tab = (t, label, icon) => (
    <Link href={`/transactions?type=${t}`}
      className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${type === t ? "bg-white text-ink shadow-sm" : "text-stone-500 hover:text-ink"}`}>
      <Icon name={icon} className="h-4 w-4" /> {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Transaksi"
        subtitle={user.role === "admin" ? "Monitoring seluruh transaksi barang masuk & keluar." : "Catat dan pantau barang masuk & keluar gudang."}
        actions={
          <>
            <a href={`/api/export/transactions?format=xlsx&${exportQs}`} className="btn btn-outline"><Icon name="download" className="h-4 w-4" /> Excel</a>
            <a href={`/api/export/transactions?format=csv&${exportQs}`} className="btn btn-outline">CSV</a>
            {can.createTransactions(user) && (
              <Link href={`/transactions/new?type=${type}`} className="btn btn-primary">
                <Icon name="plus" className="h-4 w-4" /> {type === "IN" ? "Barang Masuk" : "Barang Keluar"}
              </Link>
            )}
          </>
        }
      />

      <div className="mb-4 flex w-full gap-1 rounded-2xl bg-stone-200/70 p-1 sm:w-fit">
        {tab("IN", "Barang Masuk", "arrowIn")}
        {tab("OUT", "Barang Keluar", "arrowOut")}
      </div>

      <div className="card overflow-hidden">
        <AutoFilterForm className="grid gap-3 border-b border-stone-100 p-4 sm:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="type" value={type} />
          <input name="q" defaultValue={filters.q} placeholder="No. transaksi" className="input" />
          <input name="party" defaultValue={filters.party} placeholder={type === "IN" ? "Nama supplier" : "Nama customer"} className="input" />
          <select name="status" defaultValue={filters.status} className="input">
            <option value="">Semua status</option>
            {statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
          <input type="hidden" name="from" value="" />
          <input type="hidden" name="to" value="" />
          <select name="sort" defaultValue={`${filters.sort}`} className="input">
            <option value="newest">Tanggal terbaru</option>
            <option value="oldest">Tanggal terlama</option>
            <option value="number">Nomor transaksi A–Z</option>
            <option value="status">Status A–Z</option>
          </select>
          <div className="flex gap-2">
            <Link href={`/transactions?type=${type}`} className="btn btn-ghost">Reset</Link>
          </div>
          {user.role === "staff" && (
            <label className="flex items-center gap-2 text-xs font-semibold text-stone-600 sm:col-span-2">
              <input type="checkbox" name="mine" value="1" defaultChecked={filters.mine === "1"} className="h-4 w-4 accent-stone-900" />
              Hanya transaksi yang saya buat
            </label>
          )}
        </AutoFilterForm>

        {rows.length === 0 ? (
          <EmptyState title="Belum ada transaksi" message="Tidak ada transaksi yang cocok dengan filter." />
        ) : (
          <>
            <div className="table-wrap hidden md:block">
              <table className="table">
                <thead>
                  <tr>
                    <th>No. Transaksi</th>
                    <th>Tanggal</th>
                    <th>{type === "IN" ? "Supplier" : "Customer / Tujuan"}</th>
                    {type === "IN" && <th>No. PO</th>}
                    <th className="text-right">Item</th>
                    <th className="text-right">Total Qty</th>
                    <th>Dibuat oleh</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => (
                    <tr key={t.id}>
                      <td><Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link></td>
                      <td className="whitespace-nowrap text-stone-600">{fmtDate(t.trx_date)}</td>
                      <td className="font-medium text-stone-800">{type === "IN" ? t.supplier_name : t.customer_name}</td>
                      {type === "IN" && <td>{t.po_number ? <span className="sku">{t.po_number}</span> : <span className="text-stone-400">-</span>}</td>}
                      <td className="text-right tabular-nums">{t.item_count}</td>
                      <td className="text-right font-bold tabular-nums">{num(t.total_qty)}</td>
                      <td className="text-stone-600">{t.created_by_name}</td>
                      <td><TrxStatusBadge status={t.status} /></td>
                      <td className="text-right">
                        <Link href={`/transactions/${t.id}`} className="btn btn-ghost btn-sm"><Icon name="eye" className="h-4 w-4" /> Detail</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-stone-100 md:hidden">
              {rows.map((t) => (
                <li key={t.id}>
                  <Link href={`/transactions/${t.id}`} className="block p-4 active:bg-stone-50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="sku font-semibold text-ink">{t.trx_number}</span>
                      <TrxStatusBadge status={t.status} />
                    </div>
                    <p className="mt-1 text-sm font-medium text-stone-800">{type === "IN" ? t.supplier_name : t.customer_name}</p>
                    <p className="mt-0.5 text-xs text-stone-500">{fmtDate(t.trx_date)} · {t.item_count} item · qty {num(t.total_qty)} · {t.created_by_name}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} basePath="/transactions" params={filters} />
      </div>
    </>
  );
}
