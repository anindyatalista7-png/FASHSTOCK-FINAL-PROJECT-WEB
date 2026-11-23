"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import ItemsEditor, { newRow } from "./ItemsEditor";
import SubmitButton from "./SubmitButton";

export default function RestockForm({ action, products, suppliers, defaultDate, presetProductId = "" }) {
  const [state, formAction] = useActionState(action, null);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};
  const [rows, setRows] = useState(() => {
    if (!presetProductId) return [newRow()];
    const p = products.find((x) => String(x.id) === String(presetProductId));
    // Saran quantity: isi kembali sampai 2x batas Low
    const suggest = p ? Math.max(p.low_stock * 2 - p.stock, 1) : "";
    return [newRow(presetProductId, suggest)];
  });
  const err = (k) => fe[k] && <p className="mt-1 text-xs font-medium text-red-600">{fe[k]}</p>;
  const lowProducts = products.filter((p) => p.stock_status !== "Normal");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
      <div className="space-y-6">
        {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink">Produk yang Perlu Direstock</h2>
            {lowProducts.length > 0 && (
              <button
                type="button"
                className="btn btn-ghost btn-sm text-amber-700"
                onClick={() =>
                  setRows(lowProducts.map((p) => newRow(p.id, Math.max(p.low_stock * 2 - p.stock, 1))))
                }
              >
                Isi otomatis {lowProducts.length} produk stok rendah
              </button>
            )}
          </div>
          <ItemsEditor rows={rows} setRows={setRows} products={products} error={fe.items} />
        </section>
        <section className="card p-5 sm:p-6">
          <label className="label">Catatan <span className="text-red-500">*</span></label>
          <textarea name="notes" rows={3} defaultValue={v.notes ?? ""} className={`input ${fe.notes ? "input-error" : ""}`} placeholder="cth. Mohon dikirim sebelum akhir bulan" />
          {err("notes")}
        </section>
      </div>
      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-bold text-ink">Detail Purchase Order</h2>
          <div>
            <label className="label">Nomor PO</label>
            <input className="input font-mono" value="Dibuat otomatis" disabled readOnly />
          </div>
          <div>
            <label className="label">Supplier <span className="text-red-500">*</span></label>
            <select name="supplier_id" defaultValue={v.supplier_id ?? ""} className={`input ${fe.supplier_id ? "input-error" : ""}`}>
              <option value="">— Pilih supplier —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
            </select>
            {err("supplier_id")}
          </div>
          <div>
            <label className="label">Tanggal Order <span className="text-red-500">*</span></label>
            <input type="date" name="order_date" defaultValue={v.order_date ?? defaultDate} className={`input ${fe.order_date ? "input-error" : ""}`} />
            {err("order_date")}
          </div>
          <div>
            <label className="label">Expected Delivery Date <span className="text-red-500">*</span></label>
            <input type="date" name="expected_date" defaultValue={v.expected_date ?? ""} className={`input ${fe.expected_date ? "input-error" : ""}`} />
            {err("expected_date")}
          </div>
        </section>
        <div className="flex gap-2 lg:flex-col">
          <SubmitButton className="btn btn-primary flex-1 py-3" pendingText="Mengirim...">Buat Restock Order</SubmitButton>
          <Link href="/restock" className="btn btn-outline flex-1 py-3">Batal</Link>
        </div>
      </aside>
    </form>
  );
}
