import Sidebar from "../components/Sidebar";

// Data berikut masih berupa contoh tampilan (dummy), belum berasal dari PostgreSQL.
const stats = [
  { label: "Kategori Produk", value: "7", note: "Kelompok produk fashion", icon: "▦" },
  { label: "Total Varian", value: "128", note: "SKU ukuran dan warna", icon: "◈" },
  { label: "Total Stok", value: "3.480", note: "Unit dalam gudang", icon: "▣" },
  { label: "Stok Perlu Perhatian", value: "7", note: "Stok rendah atau habis", icon: "!" },
];

const products = [
  { sku: "TOP001-M-WHT", name: "Basic T-Shirt", category: "Atasan", variant: "M · Putih", stock: 240, location: "A-01", status: "Normal" },
  { sku: "BOT001-28-BLU", name: "Wide Leg Jeans", category: "Bawahan", variant: "28 · Blue Denim", stock: 32, location: "B-02", status: "Normal" },
  { sku: "OUT001-L-BLU", name: "Classic Denim Jacket", category: "Outerwear", variant: "L · Dark Blue", stock: 12, location: "C-01", status: "Low" },
  { sku: "DRS001-M-BLK", name: "Casual Mini Dress", category: "Dress & Jumpsuit", variant: "M · Black", stock: 0, location: "D-01", status: "Out of Stock" },
  { sku: "FTW001-38-WHT", name: "Everyday Sneakers", category: "Footwear", variant: "38 · White", stock: 5, location: "E-02", status: "Severe" },
  { sku: "BAG001-F-CRM", name: "Canvas Shoulder Bag", category: "Tas", variant: "All Size · Cream", stock: 26, location: "F-01", status: "Normal" },
  { sku: "ACC001-F-BLK", name: "Classic Baseball Cap", category: "Aksesori", variant: "All Size · Black", stock: 18, location: "G-01", status: "Normal" },
];

function Status({ value }) {
  const styles = {
    Normal: "bg-[#EAF3EC] text-[#477052]",
    Low: "bg-[#FFF1D9] text-[#93651F]",
    Severe: "bg-[#F9E4E5] text-[#A64F5A]",
    "Out of Stock": "bg-[#F0ECEC] text-[#77696C]",
  };
  return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${styles[value] || "bg-slate-100 text-slate-600"}`}>{value}</span>;
}

export default function Home() {
  return (
    <main className="flex min-h-screen bg-[#F8EEEE]">
      <Sidebar />
      <section className="min-w-0 flex-1 px-5 py-7 md:px-8 lg:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#BD858B]">FASHSTOCK / OVERVIEW</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#49343A] md:text-3xl">Dashboard Gudang</h1>
            <p className="mt-1.5 text-sm text-[#927D82]">Pantau persediaan pakaian, alas kaki, tas, dan aksesori fashion.</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#F0DDDE] bg-white px-4 py-2.5 shadow-sm">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F8EEEE] text-sm font-bold text-[#713E4A]">AD</span>
            <span>
              <span className="block text-xs font-bold text-[#49343A]">Admin Demo</span>
              <span className="mt-0.5 block text-[10px] text-[#A18489]">Administrator</span>
            </span>
            <span className="ml-2 text-xs text-[#A18489]">⌄</span>
          </div>
        </header>

        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <article key={item.label} className="rounded-2xl border border-[#F0DDDE] bg-white p-5 shadow-[0_5px_20px_rgba(113,62,74,0.04)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#927D82]">{item.label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold ${index === 3 ? "bg-[#F9E4E5] text-[#A64F5A]" : "bg-[#F8EEEE] text-[#713E4A]"}`}>{item.icon}</span>
              </div>
              <p className="my-3 text-3xl font-extrabold tracking-tight text-[#713E4A]">{item.value}</p>
              <p className="text-[11px] text-[#A18D91]">{item.note}</p>
            </article>
          ))}
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.6fr_1fr]">
          <section id="produk" className="min-w-0 overflow-hidden rounded-2xl border border-[#F0DDDE] bg-white shadow-[0_5px_20px_rgba(113,62,74,0.04)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F5E9E9] p-5">
              <div>
                <h2 className="font-extrabold text-[#49343A]">Persediaan Produk</h2>
                <p className="mt-1 text-xs text-[#A18D91]">Contoh persediaan dari tujuh kategori produk fashion</p>
              </div>
              <button type="button" disabled title="Fitur tambah produk belum diimplementasikan" className="cursor-not-allowed rounded-xl bg-[#713E4A] px-4 py-2.5 text-xs font-bold text-white opacity-80">
                + Tambah Produk
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-[#FFF8F7] text-[10px] font-bold uppercase tracking-wider text-[#9B858A]">
                  <tr>
                    <th className="px-5 py-3.5">Produk</th><th className="px-5 py-3.5">Kategori</th><th className="px-5 py-3.5">Varian</th><th className="px-5 py-3.5">Stok</th><th className="px-5 py-3.5">Lokasi Rak</th><th className="px-5 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => (
                    <tr key={p.sku} className="border-t border-[#F5EEEE] transition hover:bg-[#FFFBFA]">
                      <td className="px-5 py-4"><p className="font-bold text-[#49343A]">{p.name}</p><p className="mt-1 text-[10px] text-[#A18D91]">{p.sku}</p></td>
                      <td className="px-5 py-4 text-xs text-[#806B70]">{p.category}</td>
                      <td className="px-5 py-4 text-xs text-[#806B70]">{p.variant}</td>
                      <td className="px-5 py-4 font-bold text-[#49343A]">{p.stock}</td>
                      <td className="px-5 py-4 text-xs text-[#806B70]">{p.location}</td>
                      <td className="px-5 py-4"><Status value={p.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-[#F5EEEE] px-5 py-3 text-[10px] text-[#A18D91]">Data dashboard ini masih berupa contoh (dummy) dan belum terhubung ke PostgreSQL.</div>
          </section>

          <section className="rounded-2xl border border-[#F0DDDE] bg-white p-5 shadow-[0_5px_20px_rgba(113,62,74,0.04)]">
            <div>
              <h2 className="font-extrabold text-[#49343A]">Peringatan Stok</h2>
              <p className="mb-5 mt-1 text-xs text-[#A18D91]">Produk yang perlu diperiksa</p>
            </div>
            <div className="space-y-3">
              {products.filter((p) => p.status !== "Normal").map((p) => (
                <div key={p.sku} className="flex items-center justify-between gap-3 rounded-xl bg-[#FFF8F7] p-3.5">
                  <div className="min-w-0"><p className="truncate text-xs font-bold text-[#49343A]">{p.name}</p><p className="mt-1 text-[10px] text-[#A18D91]">{p.stock} unit · Rak {p.location}</p></div>
                  <Status value={p.status} />
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-[#F8EEEE] p-4">
              <p className="text-xs font-bold text-[#713E4A]">Catatan Gudang</p>
              <p className="mt-1.5 text-[11px] leading-5 text-[#927D82]">Periksa variasi ukuran dan warna sebelum membuat permintaan restock.</p>
            </div>
          </section>
        </div>

        <footer className="mt-8 text-center text-[10px] tracking-wide text-[#B49DA1]">FashStock · Smart Stock. Better Style.</footer>
      </section>
    </main>
  );
}
