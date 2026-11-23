"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import ItemsEditor, { newRow } from "./ItemsEditor";
import SubmitButton from "./SubmitButton";

export default function TransactionForm({
  type,
  action,
  products,
  suppliers = [],
  receivedOrders = [],
  trx = null,
  defaultDate,
  presetProductId = "",
  presetPoId = "",
  cancelHref,
}) {
  const isEdit = Boolean(trx);
  const isIn = type === "IN";
  const [state, formAction] = useActionState(action, null);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};

  const [rows, setRows] = useState(() =>
    trx ? trx.items.map((i) => newRow(i.product_id, i.quantity)) : [newRow(presetProductId, "")]
  );
  const [poId, setPoId] = useState(String(v.restock_order_id ?? presetPoId ?? ""));
  const [supplierId, setSupplierId] = useState(String(v.supplier_id ?? ""));
  const [poLoading, setPoLoading] = useState(false);
  const [poError, setPoError] = useState("");

  // Pilih PO -> ambil detail via Route Handler lalu isi supplier & produk otomatis
  async function onPickPo(id) {
    setPoId(id);
    setPoError("");
    if (!id) return;
    setPoLoading(true);
    try {
      const res = await fetch(`/api/restock/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat Restock Order");
      setSupplierId(String(data.supplier_id));
      setRows(data.items.map((i) => newRow(i.product_id, i.quantity)));
    } catch (err) {
      setPoError(err.message);
    } finally {
      setPoLoading(false);
    }
  }

  // PO dari query string (?po=) langsung dimuat sekali
  useEffect(() => {
    if (presetPoId && !isEdit) onPickPo(String(presetPoId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const err = (k) => fe[k] && <p className="mt-1 text-xs font-medium text-red-600">{fe[k]}</p>;

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-[1fr_340px]" noValidate>
      <div className="space-y-6">
        {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Daftar Produk</h2>
          <ItemsEditor rows={rows} setRows={setRows} products={products} checkStock={!isIn} error={fe.items} />
        </section>

        <section className="card p-5 sm:p-6">
          <label className="label">Catatan {isIn && <span className="text-red-500">*</span>}</label>
          <textarea name="notes" rows={3} defaultValue={v.notes ?? trx?.notes ?? ""} className={`input ${fe.notes ? "input-error" : ""}`}
            placeholder={isIn ? "cth. Penerimaan barang dari supplier, kondisi baik" : "cth. Kirim via ekspedisi, alamat ..."} />
          {err("notes")}
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <h2 className="text-sm font-bold text-ink">{isIn ? "Detail Penerimaan" : "Detail Pengiriman"}</h2>
          <div>
            <label className="label">Nomor Transaksi</label>
            <input className="input font-mono" value={trx?.trx_number ?? "Dibuat otomatis"} disabled readOnly />
          </div>
          <div>
            <label className="label">Tanggal {isIn ? "Penerimaan" : "Pengiriman"} {!isEdit && <span className="text-red-500">*</span>}</label>
            {isEdit ? (
              <input className="input" value={trx.trx_date} disabled readOnly />
            ) : (
              <input name="trx_date" type="date" defaultValue={v.trx_date ?? defaultDate} className={`input ${fe.trx_date ? "input-error" : ""}`} />
            )}
            {err("trx_date")}
          </div>

          {isIn && !isEdit && (
            <>
              <div>
                <label className="label">Nomor PO <span className="normal-case text-stone-400">(opsional)</span></label>
                <select name="restock_order_id" value={poId} onChange={(e) => onPickPo(e.target.value)} className={`input ${fe.restock_order_id ? "input-error" : ""}`}>
                  <option value="">— Tanpa PO —</option>
                  {receivedOrders.map((o) => (
                    <option key={o.id} value={o.id}>{o.po_number} · {o.supplier_name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-stone-500">
                  {poLoading ? "Memuat data PO..." : receivedOrders.length === 0 ? "Tidak ada Restock Order berstatus Received yang tersedia." : "Hanya PO berstatus Received yang belum dipakai."}
                </p>
                {poError && <p className="mt-1 text-xs font-medium text-red-600">{poError}</p>}
                {err("restock_order_id")}
              </div>
              <div>
                <label className="label">Supplier <span className="text-red-500">*</span></label>
                <select
                  name={poId ? undefined : "supplier_id"}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  disabled={Boolean(poId)}
                  className={`input ${fe.supplier_id ? "input-error" : ""}`}
                >
                  <option value="">— Pilih supplier —</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.company_name}</option>
                  ))}
                </select>
                {poId && <input type="hidden" name="supplier_id" value={supplierId} />}
                {poId && <p className="mt-1 text-xs text-stone-500">Terisi otomatis dari PO.</p>}
                {err("supplier_id")}
              </div>
            </>
          )}

          {isIn && isEdit && (
            <div>
              <label className="label">Supplier</label>
              <input className="input" value={`${trx.supplier_name}${trx.po_number ? ` · ${trx.po_number}` : ""}`} disabled readOnly />
            </div>
          )}

          {!isIn && (
            <div>
              <label className="label">Nama Customer / Tujuan {!isEdit && <span className="text-red-500">*</span>}</label>
              {isEdit ? (
                <input className="input" value={trx.customer_name} disabled readOnly />
              ) : (
                <input name="customer_name" defaultValue={v.customer_name ?? ""} className={`input ${fe.customer_name ? "input-error" : ""}`} placeholder="cth. Toko Sinar Jaya" />
              )}
              {err("customer_name")}
            </div>
          )}

          <div className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Transaksi dibuat dengan status <b>Pending</b>. Stok baru {isIn ? "bertambah" : "berkurang"} setelah di-approve Warehouse Manager.
          </div>
        </section>

        <div className="flex gap-2 lg:flex-col">
          <SubmitButton className="btn btn-primary flex-1 py-3" pendingText="Menyimpan...">
            {isEdit ? "Simpan Perubahan" : isIn ? "Simpan Barang Masuk" : "Simpan Barang Keluar"}
          </SubmitButton>
          <Link href={cancelHref} className="btn btn-outline flex-1 py-3">Batal</Link>
        </div>
      </aside>
    </form>
  );
}
