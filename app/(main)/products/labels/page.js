import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { rupiah } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import PrintButton from "@/components/client/PrintButton";

export const metadata = { title: "Cetak Label Barcode" };

export default async function LabelsPage({ searchParams }) {
  await requireUser(["admin", "manager", "staff"]);
  const sp = await searchParams;
  const raw = Array.isArray(sp.ids) ? sp.ids.join(",") : sp.ids || "";
  const ids = raw.split(",").map((x) => parseInt(x, 10)).filter(Boolean);
  const copies = Math.min(Math.max(parseInt(sp.copies, 10) || 1, 1), 20);
  const kind = sp.kind === "barcode" ? "barcode" : "qr";

  const { rows: all } = await query(
    "SELECT id, sku, name, rack_location, selling_price, unit FROM products WHERE deleted_at IS NULL ORDER BY name"
  );
  const selected = ids.length ? all.filter((p) => ids.includes(p.id)) : [];
  const labels = selected.flatMap((p) => Array.from({ length: copies }, (_, i) => ({ ...p, key: `${p.id}-${i}` })));

  return (
    <>
      <div className="no-print">
        <PageHeader
          title="Cetak Label Barcode"
          subtitle="Pilih produk, jenis label (QR / barcode Code 128), dan jumlah salinan, lalu cetak."
          back="/products"
          actions={labels.length > 0 && <PrintButton label={`Cetak ${labels.length} label`} />}
        />
        <form method="GET" className="card mb-6 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink">Pilih produk</p>
            <div className="flex flex-wrap items-center gap-2">
              <select name="kind" defaultValue={kind} className="input w-auto py-1.5">
                <option value="qr">QR Code</option>
                <option value="barcode">Barcode (Code 128)</option>
              </select>
              <label className="text-xs font-semibold text-stone-500">Salinan / produk</label>
              <input type="number" name="copies" min="1" max="20" defaultValue={copies} className="input w-20 py-1.5" />
              <button className="btn btn-primary btn-sm">Tampilkan</button>
            </div>
          </div>
          <div className="grid max-h-64 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {all.map((p) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                <input type="checkbox" name="ids" value={p.id} defaultChecked={ids.includes(p.id)} className="h-4 w-4 accent-stone-900" />
                <span className="sku">{p.sku}</span>
                <span className="truncate">{p.name}</span>
              </label>
            ))}
          </div>
        </form>
      </div>

      {labels.length === 0 ? (
        <p className="no-print text-center text-sm text-stone-500">Belum ada produk dipilih.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 print:grid-cols-3 print:gap-2">
          {labels.map((p) =>
            kind === "barcode" ? (
              <div key={p.key} className="break-inside-avoid rounded-xl border-2 border-dashed border-stone-300 bg-white p-3 text-center print:rounded-none print:border-solid print:border-stone-400">
                <p className="truncate text-xs font-bold text-ink">{p.name}</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/barcode/${encodeURIComponent(p.sku)}`} alt={p.sku} className="mx-auto my-1 h-16 w-full object-contain" />
                <p className="text-[10px] text-stone-500">Rak {p.rack_location} · {rupiah(p.selling_price)}/{p.unit}</p>
              </div>
            ) : (
              <div key={p.key} className="flex break-inside-avoid items-center gap-3 rounded-xl border-2 border-dashed border-stone-300 bg-white p-3 print:rounded-none print:border-solid print:border-stone-400">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/qr/${encodeURIComponent(p.sku)}`} alt={p.sku} className="h-20 w-20 shrink-0" />
                <div className="min-w-0">
                  <p className="font-mono text-sm font-bold text-ink">{p.sku}</p>
                  <p className="line-clamp-2 text-xs font-semibold leading-tight text-stone-700">{p.name}</p>
                  <p className="mt-1 text-[10px] text-stone-500">Rak {p.rack_location} · {rupiah(p.selling_price)}/{p.unit}</p>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </>
  );
}
