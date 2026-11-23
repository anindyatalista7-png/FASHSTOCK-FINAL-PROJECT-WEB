import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listTransactions } from "@/lib/data";
import { fmtDate, num } from "@/lib/format";
import { EmptyState, PageHeader, TrxStatusBadge } from "@/components/ui";
import Pagination from "@/components/Pagination";

export const metadata = { title: "Riwayat Transaksi" };

export default async function SupplierHistoryPage({ searchParams }) {
  const user = await requireUser(["supplier"]);
  const sp = await searchParams;
  const { rows, total, page, totalPages } = await listTransactions({ type: "IN", supplierId: user.id, page: sp.page || 1 });

  return (
    <>
      <PageHeader title="Riwayat Transaksi" subtitle="Penerimaan barang dari perusahaan Anda yang dicatat oleh gudang." />
      <div className="card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="Belum ada transaksi" message="Transaksi akan muncul setelah gudang mencatat penerimaan barang dari Anda." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>No. Transaksi</th><th>Tanggal Terima</th><th>No. PO</th><th className="text-right">Item</th><th className="text-right">Total Qty</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td><Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link></td>
                    <td className="whitespace-nowrap">{fmtDate(t.trx_date)}</td>
                    <td>{t.po_number ? <span className="sku">{t.po_number}</span> : "-"}</td>
                    <td className="text-right">{t.item_count}</td>
                    <td className="text-right font-bold tabular-nums">{num(t.total_qty)}</td>
                    <td><TrxStatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} totalPages={totalPages} total={total} basePath="/history" params={{}} />
      </div>
    </>
  );
}
