import { Suspense } from "react";
import Flash from "@/components/client/Flash";
import Image from "next/image";

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <Suspense>
        <Flash />
      </Suspense>
      
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="relative flex items-center gap-3">
          <Image src="/logo.svg" alt="Logo FashStock" width={48} height={48} className="rounded-xl" />
          <span className="text-xl font-extrabold tracking-tight">FashStock</span>
        </div>

        <div className="relative max-w-lg">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-brand-300">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-400" /> Sistem Manajemen Gudang
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl">
            Setiap barang tercatat.
            <br />
            <span className="text-brand-400">Setiap rak terkendali.</span>
          </h1>
          <p className="mt-5 text-base leading-relaxed text-[#E6C9D0]">
            Pantau stok secara real-time, kelola barang masuk & keluar, dan koordinasikan restock dengan supplier dalam satu
            tempat.
          </p>
        </div>

        <div className="relative grid grid-cols-4 gap-3 text-xs">
          {[
            ["bg-emerald-400", "Normal"],
            ["bg-yellow-400", "Low"],
            ["bg-red-500", "Severe"],
            ["bg-stone-500", "Out of Stock"],
          ].map(([c, l]) => (
            <div key={l} className="rounded-xl border border-white/10 p-3">
              <span className={`mb-2 block h-1.5 w-8 rounded-full ${c}`} />
              <span className="font-semibold text-stone-300">{l}</span>
            </div>
          ))}
        </div>
      </aside>

      
      <main className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
