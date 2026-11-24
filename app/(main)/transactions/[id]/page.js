import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTransaction } from "@/lib/data";
import { approveTransaction, deleteTransaction, markShipped, rejectTransaction } from "@/actions/transactions";
import { fmtDate, fmtDateTime, num, rupiah } from "@/lib/format";
import { Card, InfoRow, PageHeader, TrxStatusBadge, TypeBadge } from "@/components/ui";
import ActionForm from "@/components/client/ActionForm";
import ReasonForm from "@/components/client/ReasonForm";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";

export const metadata = { title: "Detail Transaksi" };

function Step({ done, active, label, time, last }) {
  return (
    <li className="relative flex gap-3 pb-6 last:pb-0">
      {!last && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${done ? "bg-ink" : "bg-stone-200"}`} />}
      <span className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${done ? "bg-ink text-brand-400" : active ? "bg-brand-400 text-ink" : "bg-stone-200 text-stone-400"}`}>
        {done ? "✓" : "•"}
      </span>
      <div>
        <p className={`text-sm font-semibold ${done || active ? "text-ink" : "text-stone-400"}`}>{label}</p>
        {time && <p className="text-xs text-stone-500">{time}</p>}
      </div>
    </li>
  );
}

export default async function TransactionDetailPage({ params }) {
  const user = await requireUser();
  const { id } = await params;
  const trx = await getTransaction(id);
  if (!trx) notFound();
  // Supplier hanya boleh melihat transaksi miliknya
  if (user.role === "supplier" && trx.supplier_id !== user.id) redirect("/history");

  const isIn = trx.type === "IN";
  const pending = trx.status === "Pending";
  const isOwner = trx.created_by === user.id;
  const canEdit = pending && (user.role === "manager" || (user.role === "staff" && isOwner));
  const canReview = pending && user.role === "manager";
  const canShip = !isIn && trx.status === "Approved" && user.role === "staff";
  const totalQty = trx.items.reduce((s, i) => s + i.quantity, 0);
  const totalValue = trx.items.reduce((s, i) => s + i.quantity * (isIn ? i.purchase_price : i.selling_price), 0);
  const insufficient = !isIn && pending && trx.items.some((i) => i.quantity > i.stock);

  const steps = [
    { label: "Dibuat", done: true, time: `${fmtDateTime(trx.created_at)} · ${trx.created_by_name}` },
    trx.status === "Rejected"
      ? { label: "Ditolak", done: true, time: `${fmtDateTime(trx.reviewed_at)} · ${trx.reviewed_by_name}` }
      : { label: "Approved", done: ["Approved", "Shipped"].includes(trx.status), active: pending, time: trx.reviewed_at && `${fmtDateTime(trx.reviewed_at)} · ${trx.reviewed_by_name}` },
  ];
  if (!isIn && trx.status !== "Rejected") {
    steps.push({ label: "Shipped", done: trx.status === "Shipped", active: trx.status === "Approved", time: trx.shipped_at && fmtDateTime(trx.shipped_at) });
  }

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{trx.trx_number}</span>}
        subtitle={<span className="flex flex-wrap items-center gap-2"><TypeBadge type={trx.type} /> <TrxStatusBadge status={trx.status} /> · {fmtDate(trx.trx_date)}</span>}
        back={user.role === "supplier" ? "/history" : `/transactions?type=${trx.type}`}
        actions={
          <>
            {canEdit && (
              <Link href={`/transactions/${trx.id}/edit`} className="btn btn-outline"><Icon name="edit" className="h-4 w-4" /> Edit</Link>
            )}
            {canEdit && (
              <ActionForm action={deleteTransaction.bind(null, trx.id)} className="contents" confirmMessage={`Hapus transaksi ${trx.trx_number}?`}>
                <SubmitButton className="btn btn-outline text-red-600 hover:bg-red-50" pendingText="Menghapus..."><Icon name="trash" className="h-4 w-4" /> Hapus</SubmitButton>
              </ActionForm>
            )}
            {canShip && (
              <ActionForm action={markShipped.bind(null, trx.id)} className="contents" confirmMessage="Tandai barang sudah dikirim (Shipped)?">
                <SubmitButton className="btn btn-primary" pendingText="Memproses..."><Icon name="truck" className="h-4 w-4" /> Tandai Shipped</SubmitButton>
              </ActionForm>
            )}
          </>
        }
      />

      {canReview && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex gap-3">
              <Icon name="clock" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="font-bold text-amber-900">Menunggu persetujuan Anda</p>
                <p className="text-sm text-amber-800">
                  {isIn ? `Approve akan menambah stok ${trx.items.length} produk (total ${num(totalQty)} unit).` : `Approve menyetujui transaksi ${trx.items.length} produk (total ${num(totalQty)} unit). Stok berkurang saat Staff menandai Shipped.`}
                </p>
                {insufficient && <p className="mt-1 text-sm font-semibold text-red-700">Perhatian: ada produk yang stoknya kini tidak mencukupi.</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-start gap-2 lg:max-w-md lg:justify-end">
              <ActionForm action={approveTransaction.bind(null, trx.id)} confirmMessage={`Approve ${trx.trx_number}? ${isIn ? "Stok barang masuk akan bertambah." : "Stok barang keluar baru berkurang saat Staff menandai Shipped."}`}>
                <SubmitButton className="btn btn-success" pendingText="Memproses..."><Icon name="check" className="h-4 w-4" /> Approve</SubmitButton>
              </ActionForm>
              <ReasonForm action={rejectTransaction.bind(null, trx.id)} label="Reject" placeholder="cth. Quantity tidak sesuai dokumen" />
            </div>
          </div>
        </div>
      )}

      {trx.status === "Rejected" && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">Transaksi ditolak — stok tidak berubah</p>
            <p className="mt-0.5">Alasan: {trx.reject_reason}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card title={`Daftar Produk (${trx.items.length})`} bodyClass="p-0">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th className="text-right">Quantity</th>
                    <th className="text-right">Stok Saat Ini</th>
                    <th className="text-right">{isIn ? "Harga Beli" : "Harga Jual"}</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {trx.items.map((i) => {
                    const price = isIn ? i.purchase_price : i.selling_price;
                    const short = !isIn && pending && i.quantity > i.stock;
                    return (
                      <tr key={i.id}>
                        <td>
                          {i.product_deleted ? (
                            <span className="font-semibold text-stone-500">{i.name} <span className="text-xs">(dihapus)</span></span>
                          ) : (
                            <Link href={`/products/${i.product_id}`} className="font-semibold text-ink hover:underline">{i.name}</Link>
                          )}
                          <p className="sku">{i.sku}</p>
                        </td>
                        <td className={`text-right font-bold tabular-nums ${isIn ? "text-emerald-600" : "text-orange-600"}`}>
                          {isIn ? "+" : "−"}{num(i.quantity)} <span className="text-xs font-normal text-stone-500">{i.unit}</span>
                        </td>
                        <td className={`text-right tabular-nums ${short ? "font-bold text-red-600" : "text-stone-600"}`}>{num(i.stock)}</td>
                        <td className="text-right tabular-nums text-stone-600">{rupiah(price)}</td>
                        <td className="text-right font-semibold tabular-nums">{rupiah(price * i.quantity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{num(totalQty)}</td>
                    <td colSpan={2}></td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card title="Informasi Transaksi">
            <dl>
              <InfoRow label="Nomor">{<span className="sku">{trx.trx_number}</span>}</InfoRow>
              <InfoRow label="Tipe">{isIn ? "Barang Masuk (penerimaan dari supplier)" : "Barang Keluar (pengiriman ke customer)"}</InfoRow>
              <InfoRow label={isIn ? "Tanggal Penerimaan" : "Tanggal Pengiriman"}>{fmtDate(trx.trx_date)}</InfoRow>
              {isIn ? (
                <>
                  <InfoRow label="Supplier">{trx.supplier_name} <span className="text-stone-500">({trx.supplier_pic})</span></InfoRow>
                  <InfoRow label="Nomor PO">
                    {trx.po_number ? (
                      <Link href={`/restock/${trx.restock_order_id}`} className="sku font-semibold text-ink underline">{trx.po_number}</Link>
                    ) : "-"}
                  </InfoRow>
                </>
              ) : (
                <InfoRow label="Customer / Tujuan">{trx.customer_name}</InfoRow>
              )}
              <InfoRow label="Catatan"><span className="whitespace-pre-line">{trx.notes || "-"}</span></InfoRow>
              <InfoRow label="Dibuat oleh">{trx.created_by_name} · {fmtDateTime(trx.created_at)}</InfoRow>
              {trx.reviewed_by_name && <InfoRow label={trx.status === "Rejected" ? "Ditolak oleh" : "Disetujui oleh"}>{trx.reviewed_by_name} · {fmtDateTime(trx.reviewed_at)}</InfoRow>}
            </dl>
          </Card>
        </div>

        <aside>
          <Card title="Progres">
            <ol>
              {steps.map((s, i) => (
                <Step key={s.label} {...s} last={i === steps.length - 1} />
              ))}
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}
