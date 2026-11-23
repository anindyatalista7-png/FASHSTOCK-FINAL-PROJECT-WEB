"use client";
import Icon from "../Icon";

let keySeq = 0;
export const newRow = (product_id = "", quantity = "") => ({ key: `r${++keySeq}`, product_id: String(product_id), quantity: String(quantity) });

/**
 * Editor daftar produk + quantity (controlled). Menghasilkan input berulang
 * `product_id` dan `quantity` yang dibaca oleh Server Action.
 * - checkStock: tampilkan peringatan jika quantity > stok (barang keluar)
 */
export default function ItemsEditor({ rows, setRows, products, checkStock = false, error, readOnlyProducts = false }) {
  const byId = new Map(products.map((p) => [String(p.id), p]));
  const update = (key, patch) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key) => setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.key !== key) : rs));
  const chosen = new Set(rows.map((r) => r.product_id).filter(Boolean));
  const totalQty = rows.reduce((s, r) => s + (parseInt(r.quantity, 10) || 0), 0);

  return (
    <div>
      <div className="space-y-3">
        {rows.map((r, idx) => {
          const p = byId.get(r.product_id);
          const qty = parseInt(r.quantity, 10) || 0;
          const over = checkStock && p && qty > p.stock;
          return (
            <div key={r.key} className={`rounded-2xl border p-3 sm:p-4 ${over ? "border-red-200 bg-red-50/50" : "border-stone-200 bg-stone-50/50"}`}>
              <div className="grid gap-3 sm:grid-cols-[28px_1fr_140px_40px] sm:items-start">
                <span className="hidden h-10 items-center justify-center text-xs font-bold text-stone-400 sm:flex">{idx + 1}</span>
                <div>
                  <select
                    name="product_id"
                    value={r.product_id}
                    onChange={(e) => update(r.key, { product_id: e.target.value })}
                    className="input"
                    aria-label={`Produk baris ${idx + 1}`}
                  >
                    <option value="">— Pilih produk —</option>
                    {products.map((opt) => (
                      <option key={opt.id} value={opt.id} disabled={(chosen.has(String(opt.id)) && String(opt.id) !== r.product_id) || (readOnlyProducts && String(opt.id) !== r.product_id)}>
                        {opt.sku} — {opt.name} (stok {opt.stock} {opt.unit})
                      </option>
                    ))}
                  </select>
                  {p && (
                    <p className={`mt-1 text-xs ${over ? "font-semibold text-red-600" : "text-stone-500"}`}>
                      Stok tersedia: {p.stock} {p.unit}
                      {over && ` — quantity melebihi stok!`}
                      {!checkStock && qty > 0 && ` → setelah approve: ${p.stock + qty} ${p.unit}`}
                      {checkStock && !over && qty > 0 && ` → setelah approve: ${p.stock - qty} ${p.unit}`}
                    </p>
                  )}
                </div>
                <div>
                  <input
                    name="quantity"
                    type="number"
                    min="1"
                    step="1"
                    max={checkStock && p ? p.stock : undefined}
                    value={r.quantity}
                    onChange={(e) => update(r.key, { quantity: e.target.value })}
                    placeholder="Qty"
                    className={`input text-right tabular-nums ${over ? "input-error" : ""}`}
                    aria-label={`Quantity baris ${idx + 1}`}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(r.key)}
                  disabled={rows.length === 1}
                  className="grid h-10 w-full place-items-center rounded-xl text-stone-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-30 sm:w-10"
                  aria-label="Hapus baris"
                >
                  <Icon name="trash" className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => setRows((rs) => [...rs, newRow()])} className="btn btn-outline btn-sm" disabled={rows.length >= products.length}>
          <Icon name="plus" className="h-4 w-4" /> Tambah produk
        </button>
        <p className="text-xs text-stone-500">{rows.filter((r) => r.product_id).length} produk · total qty <b className="text-stone-700">{totalQty}</b></p>
      </div>
      {error && <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}
    </div>
  );
}
