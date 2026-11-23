"use client";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import SubmitButton from "./SubmitButton";
import { StockBadge } from "../ui";
import { UNITS } from "@/lib/constants";

function computeStatus(stock, min, low) {
  const s = parseInt(stock, 10);
  const m = parseInt(min, 10);
  const l = parseInt(low, 10);
  if ([s, m, l].some(Number.isNaN)) return null;
  if (s === 0) return "Out of Stock";
  if (s <= m) return "Severe";
  if (s <= l) return "Low";
  return "Normal";
}

export default function ProductForm({ action, product, categories, cancelHref }) {
  const isEdit = Boolean(product);
  const [state, formAction] = useActionState(action, null);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};
  const init = (k) => v[k] ?? (product?.[k] ?? "");

  const [stock, setStock] = useState(String(init("stock")));
  const [min, setMin] = useState(String(init("min_stock")));
  const [low, setLow] = useState(String(init("low_stock")));
  const [preview, setPreview] = useState(isEdit && product.has_image ? `/api/images/products/${product.id}` : null);
  const status = computeStatus(stock, min, low);

  // File input ikut ter-reset setelah validasi gagal, jadi pratinjau dikembalikan juga
  useEffect(() => {
    if (state && !state.ok) setPreview(isEdit && product.has_image ? `/api/images/products/${product.id}` : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.ts]);

  const err = (k) => fe[k] && <p className="mt-1 text-xs font-medium text-red-600">{fe[k]}</p>;
  const cls = (k) => `input ${fe[k] ? "input-error" : ""}`;

  return (
    <form action={formAction} key={state?.ts} className="grid gap-6 lg:grid-cols-[1fr_320px]" noValidate>
      <div className="space-y-6">
        {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Informasi Produk</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">SKU {!isEdit && <span className="text-red-500">*</span>}</label>
              {isEdit ? (
                <input className="input font-mono" value={product.sku} disabled readOnly />
              ) : (
                <input name="sku" defaultValue={init("sku")} className={`${cls("sku")} font-mono uppercase`} placeholder="cth. ELK-005" />
              )}
              {isEdit ? <p className="mt-1 text-xs text-stone-500">SKU tidak dapat diubah.</p> : err("sku")}
            </div>
            <div>
              <label className="label">Nama Produk <span className="text-red-500">*</span></label>
              <input name="name" defaultValue={init("name")} className={cls("name")} placeholder="Nama produk" />
              {err("name")}
            </div>
            <div>
              <label className="label">Kategori <span className="text-red-500">*</span></label>
              <select name="category_id" defaultValue={String(init("category_id"))} className={cls("category_id")}>
                <option value="">— Pilih kategori —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {err("category_id")}
            </div>
            <div>
              <label className="label">Unit <span className="text-red-500">*</span></label>
              <select name="unit" defaultValue={init("unit")} className={cls("unit")}>
                <option value="">— Pilih unit —</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {err("unit")}
            </div>
            <div className="sm:col-span-2">
              <label className="label">Deskripsi <span className="text-red-500">*</span></label>
              <textarea name="description" rows={3} defaultValue={init("description")} className={cls("description")} placeholder="Spesifikasi singkat produk" />
              {err("description")}
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold text-ink">Harga & Lokasi</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Harga Beli (Rp) <span className="text-red-500">*</span></label>
              <input name="purchase_price" type="number" min="0" step="1" defaultValue={init("purchase_price")} className={cls("purchase_price")} />
              {err("purchase_price")}
            </div>
            <div>
              <label className="label">Harga Jual (Rp) <span className="text-red-500">*</span></label>
              <input name="selling_price" type="number" min="0" step="1" defaultValue={init("selling_price")} className={cls("selling_price")} />
              {err("selling_price")}
            </div>
            <div>
              <label className="label">Lokasi Rak <span className="text-red-500">*</span></label>
              <input name="rack_location" defaultValue={init("rack_location")} className={`${cls("rack_location")} font-mono uppercase`} placeholder="A-01-01" />
              {err("rack_location")}
            </div>
          </div>
        </section>

        <section className="card p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-ink">Stok</h2>
            <div className="flex items-center gap-2 text-xs text-stone-500">
              Status otomatis: {status ? <StockBadge status={status} /> : <span>-</span>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Jumlah Stok Saat Ini <span className="text-red-500">*</span></label>
              <input name="stock" type="number" min="0" step="1" value={stock} onChange={(e) => setStock(e.target.value)} className={cls("stock")} />
              {err("stock")}
            </div>
            <div>
              <label className="label">Stok Minimum (Severe) <span className="text-red-500">*</span></label>
              <input name="min_stock" type="number" min="0" step="1" value={min} onChange={(e) => setMin(e.target.value)} className={cls("min_stock")} />
              {err("min_stock")}
            </div>
            <div>
              <label className="label">Stok Low <span className="text-red-500">*</span></label>
              <input name="low_stock" type="number" min="0" step="1" value={low} onChange={(e) => setLow(e.target.value)} className={cls("low_stock")} />
              {err("low_stock")}
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-stone-500">
            Out of Stock jika stok = 0 · Severe jika stok ≤ stok minimum · Low jika stok ≤ stok Low · selain itu Normal.
            Stok Low harus lebih besar dari stok minimum.
          </p>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-bold text-ink">Gambar Produk {!isEdit && <span className="text-red-500">*</span>}</h2>
          <div className="mb-4 grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Pratinjau" className="h-full w-full object-cover" />
            ) : (
              <span className="px-6 text-center text-xs text-stone-400">Belum ada gambar</span>
            )}
          </div>
          <input
            name="image"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : isEdit && product.has_image ? `/api/images/products/${product.id}` : null);
            }}
            className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-stone-700"
          />
          <p className="mt-2 text-xs text-stone-500">JPG/PNG/WEBP/GIF, maks. 2 MB.{isEdit && " Kosongkan jika tidak ingin mengganti."}</p>
          {err("image")}
        </section>

        <div className="flex gap-2 lg:flex-col">
          <SubmitButton className="btn btn-primary flex-1 py-3" pendingText="Menyimpan...">
            {isEdit ? "Simpan Perubahan" : "Tambah Produk"}
          </SubmitButton>
          <Link href={cancelHref} className="btn btn-outline flex-1 py-3">Batal</Link>
        </div>
      </aside>
    </form>
  );
}
