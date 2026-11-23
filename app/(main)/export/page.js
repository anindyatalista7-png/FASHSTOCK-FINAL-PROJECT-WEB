import { requireUser } from "@/lib/auth";
import { EXPORTABLE } from "@/lib/permissions";
import { PageHeader } from "@/components/ui";
import Icon from "@/components/Icon";

export const metadata = { title: "Ekspor Data" };

const MODULES = {
  products: { label: "Produk", icon: "box", desc: "Seluruh produk beserta harga, stok, status, dan lokasi rak." },
  transactions: { label: "Transaksi", icon: "swap", desc: "Barang masuk & keluar, lengkap dengan sheet detail item." },
  restock: { label: "Restock Order", icon: "truck", desc: "Purchase order ke supplier, status, rating, dan detail item." },
  categories: { label: "Kategori", icon: "tag", desc: "Daftar kategori beserta jumlah produk dan total stok." },
  suppliers: { label: "Supplier", icon: "users", desc: "Data supplier, status verifikasi, dan rating rata-rata." },
};

export default async function ExportPage() {
  const user = await requireUser(["admin", "manager", "staff"]);
  const allowed = EXPORTABLE[user.role];
  return (
    <>
      <PageHeader
        title="Ekspor Data"
        subtitle={user.role === "staff" ? "Sebagai Staff Gudang, Anda dapat mengekspor transaksi yang Anda buat sendiri." : "Unduh data modul utama dalam format Excel (.xlsx) atau CSV."}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {allowed.map((m) => (
          <article key={m} className="card flex flex-col p-5">
            <span className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-ink text-brand-400">
              <Icon name={MODULES[m].icon} className="h-5 w-5" />
            </span>
            <h2 className="font-bold text-ink">{MODULES[m].label}</h2>
            <p className="mt-1 flex-1 text-sm text-stone-500">{MODULES[m].desc}</p>
            <div className="mt-5 flex gap-2">
              <a href={`/api/export/${m}?format=xlsx`} className="btn btn-primary flex-1"><Icon name="download" className="h-4 w-4" /> Excel</a>
              <a href={`/api/export/${m}?format=csv`} className="btn btn-outline flex-1">CSV</a>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 text-xs text-stone-500">Tips: filter yang sedang aktif di halaman Produk/Transaksi/Restock ikut diterapkan saat mengekspor dari halaman tersebut.</p>
    </>
  );
}
