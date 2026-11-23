"use client";
import { useActionState, useState } from "react";
import SubmitButton from "./SubmitButton";
import Icon from "../Icon";

/** Tombol "Tolak" yang membuka kolom alasan (wajib diisi) sebelum dikirim. */
export default function ReasonForm({ action, label = "Tolak", title = "Alasan penolakan", placeholder = "Tuliskan alasan...", hidden = {}, small = false }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`btn btn-outline text-red-600 hover:border-red-300 hover:bg-red-50 ${small ? "btn-sm" : ""}`}>
        <Icon name="x" className="h-4 w-4" /> {label}
      </button>
    );
  }
  return (
    <form action={formAction} className="w-full rounded-2xl border border-red-200 bg-red-50/60 p-3">
      {Object.entries(hidden).map(([k, val]) => (
        <input key={k} type="hidden" name={k} value={val} />
      ))}
      <label className="label text-red-800">{title} <span className="text-red-500">*</span></label>
      <textarea name="reason" rows={2} required minLength={5} autoFocus defaultValue={state?.values?.reason ?? ""} placeholder={placeholder}
        className={`input ${state?.error ? "input-error" : ""}`} />
      {state?.error && <p className="mt-1 text-xs font-medium text-red-600">{state.error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost btn-sm">Batal</button>
        <SubmitButton className="btn btn-danger btn-sm" pendingText="Mengirim...">Konfirmasi {label}</SubmitButton>
      </div>
    </form>
  );
}
