"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/** Menampilkan notifikasi dari query string ?msg= (sukses) atau ?err= (gagal). */
export default function Flash() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const msg = params.get("msg");
  const err = params.get("err");
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!msg && !err) return;
    setToast(err ? { type: "err", text: err } : { type: "ok", text: msg });
    const sp = new URLSearchParams(params.toString());
    sp.delete("msg");
    sp.delete("err");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg, err]);

  if (!toast) return null;
  const ok = toast.type === "ok";
  return (
    <div className="no-print fixed inset-x-4 top-4 z-[60] flex justify-center sm:inset-x-auto sm:right-6 sm:top-6">
      <div
        role="status"
        className={`flex max-w-md items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-xl ring-1 ${
          ok ? "bg-ink text-white ring-stone-700" : "bg-red-600 text-white ring-red-500"
        }`}
      >
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-black ${ok ? "bg-brand-400 text-ink" : "bg-white text-red-600"}`}>
          {ok ? "✓" : "!"}
        </span>
        <span className="flex-1">{toast.text}</span>
        <button onClick={() => setToast(null)} className="opacity-60 hover:opacity-100" aria-label="Tutup">✕</button>
      </div>
    </div>
  );
}
