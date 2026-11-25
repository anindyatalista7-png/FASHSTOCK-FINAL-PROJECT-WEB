"use client";
import { useActionState, useRef } from "react";

export default function ActionForm({ action, children, confirmMessage, className = "", errorClass = "" }) {
  const [state, formAction] = useActionState(action, null);
  const dialog = useRef(null);
  const form = useRef(null);
  const confirmed = useRef(false);
  const submitter = useRef(null);
  return (
    <form ref={form} action={formAction} className={className} onSubmit={e => {
      if (!confirmMessage || confirmed.current) { confirmed.current = false; return; }
      e.preventDefault();
      submitter.current = e.nativeEvent.submitter;
      dialog.current?.showModal();
    }}>
      {children}
      {confirmMessage && <dialog ref={dialog} className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-brand-300 bg-white p-6 text-ink shadow-xl backdrop:bg-black/40">
        <h2 className="mb-3 text-lg font-bold">Konfirmasi tindakan</h2>
        <p className="mb-6 text-sm text-stone-600">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={() => dialog.current.close()}>Batal</button>
          <button type="button" className="btn btn-primary" onClick={() => { dialog.current.close(); confirmed.current = true; form.current.requestSubmit(submitter.current || undefined); confirmed.current = false; }}>Ya, lanjutkan</button>
        </div>
      </dialog>}
      {state?.error && <p role="alert" className={`mt-2 w-full rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ${errorClass}`}>{state.error}</p>}
    </form>
  );
}
