import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRestockOrder } from "@/lib/data";
import { advanceRestockOrder, confirmRestockOrder, rateRestockOrder, rejectRestockOrder } from "@/actions/restock";
import { fmtDate, fmtDateTime, num, rupiah } from "@/lib/format";
import { Card, InfoRow, PageHeader, RestockStatusBadge, Stars, TrxStatusBadge } from "@/components/ui";
import ActionForm from "@/components/client/ActionForm";
import ReasonForm from "@/components/client/ReasonForm";
import RatingForm from "@/components/client/RatingForm";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";

export const metadata = { title: "Detail Restock Order" };

const FLOW = ["Pending", "Confirmed", "In Transit", "Received"];
const STEP_LABEL = {
  Pending: "Order dibuat",
  Confirmed: "Dikonfirmasi supplier",
  "In Transit": "Dalam pengiriman",
  Received: "Diterima di gudang",
  Rejected: "Ditolak supplier",
};

function Timeline({ order }) {
  const logByStatus = Object.fromEntries(order.logs.map((l) => [l.status, l]));
  const rejected = order.status === "Rejected";
  const steps = rejected ? ["Pending", "Rejected"] : FLOW;
  const currentIdx = steps.indexOf(order.status);

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const log = logByStatus[s];
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const last = i === steps.length - 1;
        const color = s === "Rejected" ? "bg-red-500 text-white" : done ? (isCurrent && s !== "Received" ? "bg-brand-400 text-ink" : "bg-ink text-brand-400") : "bg-stone-200 text-stone-400";
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
            {!last && <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${i < currentIdx ? "bg-ink" : "bg-stone-200"}`} />}
            <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${color}`}>
              {s === "Rejected" ? "✕" : done && !(isCurrent && s !== "Received") ? "✓" : i + 1}
            </span>
            <div className="pt-1">
              <p className={`text-sm font-bold ${done ? "text-ink" : "text-stone-400"}`}>{s}</p>
              <p className="text-xs text-stone-500">{STEP_LABEL[s]}</p>
              {log && (
                <p className="mt-1 text-xs text-stone-500">
                  {fmtDateTime(log.changed_at)} · {log.changed_by_name}
                  {log.note && s !== "Pending" && <span className="mt-0.5 block italic text-stone-600">“{log.note}”</span>}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default async function RestockDetailPage({ params }) {
  const user = await requireUser(["admin", "manager", "supplier"]);
  const { id } = await params;
  const order = await getRestockOrder(id);
  if (!order) notFound();
  if (user.role === "supplier" && order.supplier_id !== user.id) redirect("/restock");

  const isManager = user.role === "manager";
  const isSupplier = user.role === "supplier";
  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const totalValue = order.items.reduce((s, i) => s + i.quantity * i.purchase_price, 0);
  const activeIncoming = order.incoming.find((t) => t.status !== "Rejected");
  const overdue = ["Pending", "Confirmed", "In Transit"].includes(order.status) && order.expected_date < new Date().toISOString().slice(0, 10);

  return (
    <>
      <PageHeader
        title={<span className="font-mono">{order.po_number}</span>}
        subtitle={<span className="flex flex-wrap items-center gap-2"><RestockStatusBadge status={order.status} /> · {order.supplier_name}</span>}
        back="/restock"
      />

      {/* Panel aksi sesuai role & status */}
      {isSupplier && order.status === "Pending" && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
          <p className="font-bold text-amber-900">Konfirmasi ketersediaan barang</p>
          <p className="mb-3 text-sm text-amber-800">Konfirmasi jika barang tersedia dan siap dikirim sebelum {fmtDate(order.expected_date)}, atau tolak dengan menyertakan alasan.</p>
          <div className="flex flex-wrap items-start gap-2">
            <ActionForm action={confirmRestockOrder.bind(null, order.id)} confirmMessage={`Konfirmasi ${order.po_number}?`}>
              <SubmitButton className="btn btn-success" pendingText="Memproses..."><Icon name="check" className="h-4 w-4" /> Konfirmasi Order</SubmitButton>
            </ActionForm>
            <div className="min-w-0 flex-1 sm:max-w-md">
              <ReasonForm action={rejectRestockOrder.bind(null, order.id)} label="Tolak Order" title="Catatan alasan penolakan" placeholder="cth. Stok barang di gudang kami sedang kosong" />
            </div>
          </div>
        </div>
      )}

      {isManager && ["Confirmed", "In Transit"].includes(order.status) && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="font-bold text-ink">Perbarui status pengiriman</p>
            <p className="text-sm text-stone-500">
              {order.status === "Confirmed" ? "Tandai In Transit saat barang sudah dikirim oleh supplier." : "Tandai Received saat barang tiba di gudang. Stok bertambah setelah Barang Masuk di-approve."}
            </p>
          </div>
          <ActionForm action={advanceRestockOrder.bind(null, order.id)} confirmMessage={`Ubah status menjadi ${order.status === "Confirmed" ? "In Transit" : "Received"}?`}>
            <SubmitButton className="btn btn-primary" pendingText="Memproses...">
              <Icon name="truck" className="h-4 w-4" /> Tandai {order.status === "Confirmed" ? "In Transit" : "Received"}
            </SubmitButton>
          </ActionForm>
        </div>
      )}

      {order.status === "Received" && !isSupplier && (
        <div className={`mb-6 flex gap-3 rounded-2xl border p-4 text-sm ${activeIncoming ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
          {activeIncoming ? (
            <p>
              Barang Masuk sudah dicatat: <Link href={`/transactions/${activeIncoming.id}`} className="sku font-bold underline">{activeIncoming.trx_number}</Link>{" "}
              ({activeIncoming.status}). {activeIncoming.status === "Pending" && "Stok bertambah setelah di-approve Manager."}
            </p>
          ) : (
            <p>Order sudah Received. Staff Gudang perlu membuat <b>Barang Masuk</b> dengan memilih PO ini agar stok bertambah setelah di-approve.</p>
          )}
        </div>
      )}

      {order.status === "Rejected" && (
        <div className="mb-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <p><b>Ditolak supplier.</b> Catatan: {order.status_note}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card title={`Produk (${order.items.length})`} bodyClass="p-0">
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th className="text-right">Qty Order</th>
                    {!isSupplier && <th className="text-right">Stok Gudang</th>}
                    <th className="text-right">Harga Beli</th>
                    <th className="text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        {isSupplier ? <span className="font-semibold text-ink">{i.name}</span> : <Link href={`/products/${i.product_id}`} className="font-semibold text-ink hover:underline">{i.name}</Link>}
                        <p className="sku">{i.sku}</p>
                      </td>
                      <td className="text-right font-bold tabular-nums">{num(i.quantity)} <span className="text-xs font-normal text-stone-500">{i.unit}</span></td>
                      {!isSupplier && <td className="text-right tabular-nums text-stone-600">{num(i.stock)}</td>}
                      <td className="text-right tabular-nums text-stone-600">{rupiah(i.purchase_price)}</td>
                      <td className="text-right font-semibold tabular-nums">{rupiah(i.purchase_price * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-50 font-bold">
                    <td className="px-4 py-3">Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">{num(totalQty)}</td>
                    <td colSpan={isSupplier ? 1 : 2}></td>
                    <td className="px-4 py-3 text-right tabular-nums">{rupiah(totalValue)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          <Card title="Informasi Order">
            <dl>
              <InfoRow label="Nomor PO"><span className="sku">{order.po_number}</span></InfoRow>
              <InfoRow label="Supplier">{order.supplier_name} · {order.supplier_pic} · {order.supplier_phone}</InfoRow>
              <InfoRow label="Tanggal Order">{fmtDate(order.order_date)}</InfoRow>
              <InfoRow label="Expected Delivery">
                {fmtDate(order.expected_date)} {overdue && <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700">Terlambat</span>}
              </InfoRow>
              <InfoRow label="Catatan"><span className="whitespace-pre-line">{order.notes}</span></InfoRow>
              <InfoRow label="Catatan Status">{order.status_note || "-"}</InfoRow>
              <InfoRow label="Dibuat oleh">{order.created_by_name} · {fmtDateTime(order.created_at)}</InfoRow>
            </dl>
          </Card>

          {order.incoming.length > 0 && !isSupplier && (
            <Card title="Transaksi Barang Masuk Terkait" bodyClass="p-0">
              <ul className="divide-y divide-stone-100">
                {order.incoming.map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-5 py-3">
                    <Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link>
                    <span className="flex items-center gap-3 text-xs text-stone-500">{fmtDate(t.trx_date)} <TrxStatusBadge status={t.status} /></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-6">
          <Card title="Timeline Progres"><Timeline order={order} /></Card>

          {order.status === "Received" && (
            <Card title="Rating Supplier">
              {isManager ? (
                <RatingForm action={rateRestockOrder.bind(null, order.id)} initialRating={order.rating ?? 0} initialFeedback={order.feedback ?? ""} />
              ) : order.rating ? (
                <div>
                  <Stars value={order.rating} className="h-6 w-6" />
                  {order.feedback && <p className="mt-2 text-sm italic text-stone-600">“{order.feedback}”</p>}
                  <p className="mt-2 text-xs text-stone-500">Dinilai {fmtDateTime(order.rated_at)}</p>
                </div>
              ) : (
                <p className="text-sm text-stone-500">Belum ada rating dari Warehouse Manager.</p>
              )}
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
