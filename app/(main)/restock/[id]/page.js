import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getRestockOrder } from "@/lib/data";
import { advanceRestockOrder, confirmRestockOrder, rateRestockOrder, rejectRestockOrder, submitArrivalPhoto, submitInspection, returnRestockOrder } from "@/actions/restock";
import { fmtDate, fmtDateTime, num, rupiah } from "@/lib/format";
import { Card, InfoRow, PageHeader, RestockStatusBadge, Stars, TrxStatusBadge } from "@/components/ui";
import ActionForm from "@/components/client/ActionForm";
import ReasonForm from "@/components/client/ReasonForm";
import RatingForm from "@/components/client/RatingForm";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";

export const metadata = { title: "Detail Restock Order" };

const FLOW = ["Pending", "Confirmed", "In Transit", "Inspecting", "Received"];
const STEP_LABEL = {
  Pending: "Order dibuat",
  Confirmed: "Dikonfirmasi supplier",
  "In Transit": "Dalam pengiriman",
  Inspecting: "Pemeriksaan fisik barang",
  Received: "Penerimaan disetujui Manager",
  Returned: "Barang dikembalikan dan refund diajukan",
  Rejected: "Ditolak supplier",
};

function Timeline({ order }) {
  const logByStatus = Object.fromEntries(order.logs.map((l) => [l.status, l]));
  const rejected = order.status === "Rejected";
  const returned = order.status === "Returned";
  const steps = rejected ? ["Pending", "Rejected"] : returned ? ["Pending", "Confirmed", "In Transit", "Inspecting", "Returned"] : FLOW;
  const currentIdx = steps.indexOf(order.status);

  return (
    <ol className="relative">
      {steps.map((s, i) => {
        const log = logByStatus[s];
        const done = i <= currentIdx;
        const isCurrent = i === currentIdx;
        const last = i === steps.length - 1;
        const color = ["Rejected", "Returned"].includes(s) ? "bg-red-500 text-white" : done ? (isCurrent && s !== "Received" ? "bg-brand-400 text-ink" : "bg-ink text-brand-400") : "bg-stone-200 text-stone-400";
        return (
          <li key={s} className="relative flex gap-4 pb-7 last:pb-0">
            {!last && <span className={`absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-0.5 ${i < currentIdx ? "bg-ink" : "bg-stone-200"}`} />}
            <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-black ${color}`}>
              {["Rejected", "Returned"].includes(s) ? "✕" : done && !(isCurrent && s !== "Received") ? "✓" : i + 1}
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
  const user = await requireUser(["admin", "manager", "staff", "supplier"]);
  const { id } = await params;
  const order = await getRestockOrder(id);
  if (!order) notFound();
  if (user.role === "supplier" && order.supplier_id !== user.id) redirect("/restock");

  const isManager = user.role === "manager";
  const isStaff = user.role === "staff";
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

      {((isSupplier && order.status === "Confirmed") || (isManager && order.status === "In Transit")) && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <p className="font-bold text-ink">Perbarui status pengiriman</p>
            <p className="text-sm text-stone-500">
              {isSupplier ? "Tandai In Transit setelah barang dikirim ke gudang." : "Tandai Inspecting saat barang tiba. Staff akan memeriksa kondisi dan jumlah barang."}
            </p>
          </div>
          <ActionForm action={advanceRestockOrder.bind(null, order.id)} confirmMessage={`Ubah status menjadi ${isSupplier ? "In Transit" : "Inspecting"}?`}>
            <SubmitButton className="btn btn-primary" pendingText="Memproses...">
              <Icon name="truck" className="h-4 w-4" /> Tandai {isSupplier ? "In Transit" : "Inspecting"}
            </SubmitButton>
          </ActionForm>
        </div>
      )}

      {isSupplier && ["In Transit", "Inspecting"].includes(order.status) && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="font-bold text-ink">Foto dokumentasi kedatangan barang</p>
          <p className="mt-1 text-sm text-stone-500">Unggah bukti foto JPG, PNG, atau WEBP maksimal 4 MB untuk Manager.</p>
          <ActionForm action={submitArrivalPhoto.bind(null, order.id)}>
            <input name="arrival_photo" type="file" accept="image/jpeg,image/png,image/webp" required className="input mt-3" />
            <SubmitButton className="btn btn-primary mt-3" pendingText="Mengunggah...">Simpan Foto Dokumentasi</SubmitButton>
          </ActionForm>
        </div>
      )}

      {order.arrival_photo_mime && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="mb-2 font-bold text-ink">Bukti Foto Kedatangan</p>
          <a href={`/api/restock/${order.id}/arrival-photo`} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-brand-600 underline">Lihat dokumentasi foto barang</a>
        </div>
      )}

      {isStaff && order.status === "Inspecting" && !order.inspection_result && (
        <div className="mb-6 rounded-2xl border border-orange-200 bg-orange-50 p-5">
          <p className="font-bold text-ink">Laporan Pemeriksaan Fisik Barang</p>
          <p className="mt-1 text-sm text-stone-600">Periksa jumlah dan kondisi produk sesuai PO sebelum melaporkan hasilnya.</p>
          <ActionForm action={submitInspection.bind(null, order.id)}>
            <label className="label mt-3">Hasil Pemeriksaan</label>
            <select name="inspection_result" required className="input">
              <option value="">Pilih hasil</option>
              <option value="Passed">Sesuai — jumlah dan kondisi baik</option>
              <option value="Failed">Tidak sesuai / rusak</option>
            </select>
            <label className="label mt-3">Laporan jumlah dan kondisi barang</label>
            <textarea name="inspection_note" required minLength={10} maxLength={2000} rows={4} className="input" placeholder="Jelaskan jumlah yang diperiksa, kondisi fisik, dan ketidaksesuaian jika ada." />
            <SubmitButton className="btn btn-primary mt-3" pendingText="Mengirim...">Kirim Laporan Pemeriksaan</SubmitButton>
          </ActionForm>
        </div>
      )}

      {order.status === "Inspecting" && order.inspection_result && (
        <div className="mb-6 rounded-2xl border border-stone-200 bg-white p-5">
          <p className="font-bold text-ink">Laporan Pemeriksaan: {order.inspection_result === "Passed" ? "Sesuai" : "Tidak Sesuai"}</p>
          <p className="mt-2 whitespace-pre-line text-sm text-stone-700">{order.inspection_note}</p>
          {order.inspected_at && <p className="mt-2 text-xs text-stone-500">Diperiksa {fmtDateTime(order.inspected_at)}</p>}
          {isStaff && order.inspection_result === "Passed" && !activeIncoming && (
            <Link href={`/transactions/new?type=IN&po=${order.id}`} className="btn btn-primary mt-3">Buat Transaksi Barang Masuk</Link>
          )}
          {isManager && order.inspection_result === "Failed" && (
            <div className="mt-4">
              <ReasonForm action={returnRestockOrder.bind(null, order.id)} label="Tolak Penerimaan & Ajukan Refund" title="Alasan barang dikembalikan" placeholder="Jelaskan kondisi barang dan alasan refund" />
            </div>
          )}
        </div>
      )}

      {order.status === "Returned" && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-900">
          <p className="font-bold">Barang Dikembalikan — Refund {order.refund_status === "Requested" ? "Diajukan" : ""}</p>
          <p className="mt-1">Alasan: {order.refund_reason || order.status_note}</p>
          <p className="mt-2">Stok tidak bertambah. Manager dapat membuat PO baru jika stok masih dibutuhkan.</p>
        </div>
      )}

      {(order.status === "Received" || (order.status === "Inspecting" && order.inspection_result === "Passed")) && !isSupplier && (
        <div className={`mb-6 flex gap-3 rounded-2xl border p-4 text-sm ${activeIncoming ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-sky-200 bg-sky-50 text-sky-900"}`}>
          <Icon name="info" className="mt-0.5 h-5 w-5 shrink-0" />
          {activeIncoming ? (
            <p>
              Barang Masuk sudah dicatat: <Link href={`/transactions/${activeIncoming.id}`} className="sku font-bold underline">{activeIncoming.trx_number}</Link>{" "}
              ({activeIncoming.status}). {activeIncoming.status === "Pending" && "Stok bertambah setelah di-approve Manager."}
            </p>
          ) : (
            <p>Order telah lolos pemeriksaan atau diterima. Staff Gudang perlu membuat <b>Barang Masuk</b> dengan memilih PO ini agar stok bertambah setelah di-approve.</p>
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
