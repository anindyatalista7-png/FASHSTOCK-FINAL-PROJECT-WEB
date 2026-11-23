"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import SubmitButton from "./SubmitButton";

export default function CategoryForm({ action, category }) {
  const isEdit = Boolean(category);
  const [state, formAction] = useActionState(action, null);
  const v = state?.values ?? {};
  const fe = state?.fieldErrors ?? {};
  const [preview, setPreview] = useState(isEdit && category.has_image ? `/api/images/categories/${category.id}` : null);

  return (
    <form action={formAction} key={state?.ts} className="card grid max-w-3xl gap-6 p-5 sm:grid-cols-[1fr_220px] sm:p-6" noValidate>
      <div className="space-y-4">
        {state?.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{state.error}</p>}
        <div>
          <label className="label">Nama Kategori <span className="text-red-500">*</span></label>
          <input name="name" defaultValue={v.name ?? category?.name ?? ""} className={`input ${fe.name ? "input-error" : ""}`} placeholder="cth. Elektronik" />
          {fe.name && <p className="mt-1 text-xs font-medium text-red-600">{fe.name}</p>}
        </div>
        <div>
          <label className="label">Deskripsi <span className="text-red-500">*</span></label>
          <textarea name="description" rows={4} defaultValue={v.description ?? category?.description ?? ""} className={`input ${fe.description ? "input-error" : ""}`} />
          {fe.description && <p className="mt-1 text-xs font-medium text-red-600">{fe.description}</p>}
        </div>
        <div className="flex gap-2 pt-2">
          <SubmitButton pendingText="Menyimpan...">{isEdit ? "Simpan Perubahan" : "Tambah Kategori"}</SubmitButton>
          <Link href="/categories" className="btn btn-outline">Batal</Link>
        </div>
      </div>
      <div>
        <label className="label">Gambar Kategori {!isEdit && <span className="text-red-500">*</span>}</label>
        <div className="mb-3 grid aspect-square place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Pratinjau" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-stone-400">Belum ada gambar</span>
          )}
        </div>
        <input name="image" type="file" accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setPreview(URL.createObjectURL(f)); }}
          className="block w-full text-xs text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white" />
        <p className="mt-1 text-xs text-stone-500">Maks. 2 MB.{isEdit && " Kosongkan jika tidak diganti."}</p>
        {fe.image && <p className="mt-1 text-xs font-medium text-red-600">{fe.image}</p>}
      </div>
    </form>
  );
}
