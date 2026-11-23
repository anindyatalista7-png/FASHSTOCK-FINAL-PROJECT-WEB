"use client";
import { useActionState, useState } from "react";
import SubmitButton from "./SubmitButton";
import Icon from "../Icon";

function QuickForm({ type, action, products, suppliers, today }) {
  const [state, formAction] = useActionState(action, null);
  const [pid, setPid] = useState("");
  const [qty, setQty] = useState("");
  const fe = state?.fieldErrors ?? {};
  const v = state?.values ?? {};
  const p = products.find((x) => String(x.id) === pid);
  const over = type === "OUT" && p && (parseInt(qty, 10) || 0) > p.stock;
  const firstError = state?.error && (fe.items || fe.supplier_id || fe.customer_name || fe.notes || fe.trx_date || state.error);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2" noValidate>
      <input type="hidden" name="redirect_to" value="dashboard" />
      <div className="sm:col-span-2">
        <label className="label">Produk</label>
        <select name="product_id" value={pid} onChange={(e) => setPid(e.target.value)} className="input">
          <option value="">— Pilih produk —</option>
          {products.map((o) => <option key={o.id} value={o.id}>{o.sku} — {o.name} (stok {o.stock})</option>)}
        </select>
      </div>
      <div>
        <label className="label">Quantity</label>
        <input name="quantity" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`input ${over ? "input-error" : ""}`} placeholder="0" />
        {p && <p className={`mt-1 text-xs ${over ? "font-semibold text-red-600" : "text-stone-500"}`}>Stok: {p.stock} {p.unit}</p>}
      </div>
      <div>
        <label className="label">Tanggal</label>
        <input name="trx_date" type="date" defaultValue={v.trx_date ?? today} className="input" />
      </div>
      {type === "IN" ? (
        <div className="sm:col-span-2">
          <label className="label">Supplier</label>
          <select name="supplier_id" defaultValue={v.supplier_id ?? ""} className="input">
            <option value="">— Pilih supplier —</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company_name}</option>)}
          </select>
        </div>
      ) : (
        <div className="sm:col-span-2">
          <label className="label">Customer / Tujuan</label>
          <input name="customer_name" defaultValue={v.customer_name ?? ""} className="input" placeholder="Nama customer" />
        </div>
      )}
      <div className="sm:col-span-2">
        <label className="label">Catatan</label>
        <input name="notes" defaultValue={v.notes ?? ""} className="input" placeholder={type === "IN" ? "Wajib untuk barang masuk" : "Opsional"} />
      </div>
      {firstError && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 sm:col-span-2">{firstError}</p>}
      <SubmitButton className={`btn sm:col-span-2 ${type === "IN" ? "btn-success" : "btn-accent"}`} pendingText="Menyimpan...">
        <Icon name={type === "IN" ? "arrowIn" : "arrowOut"} className="h-4 w-4" /> Simpan {type === "IN" ? "Barang Masuk" : "Barang Keluar"}
      </SubmitButton>
    </form>
  );
}

export default function QuickEntryForm({ actionIn, actionOut, products, suppliers, today }) {
  const [type, setType] = useState("IN");
  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-stone-100 p-1">
        {[["IN", "Barang Masuk"], ["OUT", "Barang Keluar"]].map(([t, l]) => (
          <button key={t} type="button" onClick={() => setType(t)}
            className={`rounded-lg py-2 text-sm font-bold transition ${type === t ? "bg-white text-ink shadow-sm" : "text-stone-500"}`}>
            {l}
          </button>
        ))}
      </div>
      <QuickForm key={type} type={type} action={type === "IN" ? actionIn : actionOut} products={products} suppliers={suppliers} today={today} />
      <p className="mt-3 text-[11px] text-stone-500">Untuk banyak produk sekaligus atau berdasarkan PO, gunakan form lengkap di menu Transaksi.</p>
    </div>
  );
}
