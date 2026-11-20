
import Link from "next/link";
import Sidebar from "../components/Sidebar";
import pool from "../lib/db";

export const dynamic = "force-dynamic";

// Mengubah angka menjadi format Indonesia.
function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

// Komponen status stok.
function StockStatus({ status }) {
  const styles = {
    Normal: "bg-[#EAF3EC] text-[#477052]",
    Low: "bg-[#FFF1D9] text-[#93651F]",
    Severe: "bg-[#F9E4E5] text-[#A64F5A]",
    "Out of Stock": "bg-[#F0ECEC] text-[#77696C]",
  };

  const labels = {
    Normal: "Normal",
    Low: "Stok Rendah",
    Severe: "Stok Kritis",
    "Out of Stock": "Stok Habis",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-sm px-3 py-1.5 text-[10px] font-semibold ${
        styles[status] || styles.Normal
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

// Mengambil seluruh data dashboard dari PostgreSQL.
async function getDashboardData() {
  const [categoryResult, stockResult, productResult] =
    await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM categories
      `),

      pool.query(`
        SELECT
          COUNT(*)::int AS total_variants,
          COALESCE(SUM(current_stock), 0)::int AS total_stock,
          COUNT(*) FILTER (
            WHERE current_stock <= low_stock
          )::int AS attention_count
        FROM product_variants
      `),

      pool.query(`
        SELECT
          p.id_product,
          p.product_name,
          c.category_name,
          pv.id_variant,
          pv.sku,
          pv.size,
          pv.color,
          pv.current_stock,
          pv.rack_location,
          CASE
            WHEN pv.current_stock = 0 THEN 'Out of Stock'
            WHEN pv.current_stock <= pv.minimum_stock THEN 'Severe'
            WHEN pv.current_stock <= pv.low_stock THEN 'Low'
            ELSE 'Normal'
          END AS stock_status
        FROM product_variants pv
        JOIN products p
          ON p.id_product = pv.id_product
        JOIN categories c
          ON c.id_category = p.id_category
        ORDER BY p.id_product DESC, pv.id_variant DESC
      `),
    ]);

  return {
    totalCategories: categoryResult.rows[0].total,
    totalVariants: stockResult.rows[0].total_variants,
    totalStock: stockResult.rows[0].total_stock,
    attentionCount: stockResult.rows[0].attention_count,
    products: productResult.rows,
  };
}

export default async function Home() {
  const data = await getDashboardData();

  const stats = [
    {
      label: "Kategori Produk",
      value: data.totalCategories,
      note: "Kelompok produk fashion",
      number: "01",
    },
    {
      label: "Total Varian",
      value: data.totalVariants,
      note: "SKU ukuran dan warna",
      number: "02",
    },
    {
      label: "Total Stok",
      value: data.totalStock,
      note: "Unit tersedia di gudang",
      number: "03",
    },
    {
      label: "Perlu Perhatian",
      value: data.attentionCount,
      note: "Stok rendah, kritis, atau habis",
      number: "04",
    },
  ];

  const recentProducts = data.products.slice(0, 7);

  const attentionProducts = data.products
    .filter((product) => product.stock_status !== "Normal")
    .sort((a, b) => {
      const priority = {
        "Out of Stock": 0,
        Severe: 1,
        Low: 2,
      };

      return priority[a.stock_status] - priority[b.stock_status];
    })
    .slice(0, 5);

  return (
    <main className="flex min-h-screen bg-[#FFFBF8]">
      <Sidebar />

      <section className="min-w-0 flex-1 px-5 py-8 md:px-9 lg:px-12">
        {/* HEADER */}
        <header className="mb-10 flex flex-wrap items-start justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-9 bg-[#BD858B]" />

              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#BD858B]">
                FASHSTOCK / WAREHOUSE OVERVIEW
              </p>
            </div>

            <h1 className="mt-5 font-serif text-4xl font-normal tracking-tight text-[#713E4A] md:text-5xl">
              Dashboard Gudang
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-[#927D82]">
              Pantau persediaan pakaian, alas kaki, tas, dan aksesori
              fashion dalam satu ruang kerja yang terorganisir.
            </p>
          </div>

          <div className="flex items-center gap-3 border border-[#EEDFE0] bg-white px-4 py-3">
            <div className="flex h-10 w-10 items-center justify-center bg-[#F8EEEE] font-serif text-lg text-[#713E4A]">
              FS
            </div>

            <div>
              <p className="text-xs font-semibold text-[#49343A]">
                FashStock
              </p>
              <p className="mt-1 text-[10px] text-[#927D82]">
                Inventory Workspace
              </p>
            </div>
          </div>
        </header>

        {/* SECTION TITLE */}
        <div className="mb-5 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
              INVENTORY SUMMARY
            </p>

            <h2 className="mt-2 font-serif text-2xl text-[#713E4A]">
              Ringkasan Persediaan
            </h2>
          </div>


        </div>

        {/* STATISTIC CARDS */}
        <div className="mb-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <article
              key={item.label}
              className={`border p-6 ${
                index === 3
                  ? "border-[#E9CDD0] bg-[#F8EEEE]"
                  : "border-[#EEDFE0] bg-white"
              }`}
            >
              <div className="flex items-start justify-between">
                <p className="text-xs font-medium text-[#927D82]">
                  {item.label}
                </p>

                <span className="font-serif text-sm italic text-[#C7A9AE]">
                  {item.number}
                </span>
              </div>

              <p className="mt-6 font-serif text-4xl tracking-tight text-[#713E4A]">
                {formatNumber(item.value)}
              </p>

              <div className="mt-5 h-px bg-[#EEDFE0]" />

              <p className="mt-3 text-[11px] text-[#A18D91]">
                {item.note}
              </p>
            </article>
          ))}
        </div>

        {/* MAIN CONTENT */}
        <div className="grid items-start gap-6 2xl:grid-cols-[1.65fr_1fr]">
          {/* PRODUCT TABLE */}
          <section className="min-w-0 overflow-hidden border border-[#EEDFE0] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEDFE0] px-6 py-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
                  THE COLLECTION
                </p>

                <h2 className="mt-2 font-serif text-2xl text-[#713E4A]">
                  Persediaan Produk
                </h2>

                <p className="mt-2 text-xs text-[#927D82]">
                  Daftar varian produk terbaru yang tercatat di gudang.
                </p>
              </div>

              <Link
                href="/products"
                className="border border-[#713E4A] px-4 py-2.5 text-xs font-semibold text-[#713E4A] transition hover:bg-[#713E4A] hover:text-white"
              >
                Lihat Semua Produk
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left">
                <thead className="bg-[#FBF5F3]">
                  <tr>
                    {[
                      "Produk",
                      "Kategori",
                      "Varian",
                      "Stok",
                      "Lokasi",
                      "Status",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9B858A]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {recentProducts.map((product) => (
                    <tr
                      key={product.id_variant}
                      className="border-t border-[#F2E8E7] transition hover:bg-[#FFFAF9]"
                    >
                      <td className="px-5 py-4">
                        <p className="text-xs font-semibold text-[#49343A]">
                          {product.product_name}
                        </p>

                        <p className="mt-1.5 text-[10px] tracking-wide text-[#A18D91]">
                          {product.sku}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-xs text-[#806B70]">
                        {product.category_name}
                      </td>

                      <td className="px-5 py-4 text-xs text-[#806B70]">
                        {product.size} · {product.color}
                      </td>

                      <td className="px-5 py-4">
                        <span className="font-serif text-lg text-[#713E4A]">
                          {formatNumber(product.current_stock)}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-xs text-[#806B70]">
                        {product.rack_location || "—"}
                      </td>

                      <td className="px-5 py-4">
                        <StockStatus status={product.stock_status} />
                      </td>
                    </tr>
                  ))}

                  {recentProducts.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-14 text-center text-sm text-[#927D82]"
                      >
                        Belum ada varian produk di database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-[#EEDFE0] px-6 py-4">
              <p className="text-[11px] text-[#927D82]">
                Menampilkan {recentProducts.length} dari{" "}
                {formatNumber(data.totalVariants)} varian
              </p>

              <Link
                href="/products"
                className="text-xs font-semibold text-[#713E4A] hover:underline"
              >
                Seluruh Inventaris →
              </Link>
            </div>
          </section>

          {/* STOCK ALERTS */}
          <section className="border border-[#EEDFE0] bg-white">
            <div className="border-b border-[#EEDFE0] px-6 py-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
                  STOCK MONITORING
                </p>

                <span className="text-[10px] text-[#A18D91]">
                  PostgreSQL
                </span>
              </div>

              <h2 className="mt-2 font-serif text-2xl text-[#713E4A]">
                Peringatan Stok
              </h2>

              <p className="mt-2 text-xs leading-6 text-[#927D82]">
                Varian dengan persediaan rendah, kritis,
                atau sudah habis.
              </p>
            </div>

            <div className="px-6">
              {attentionProducts.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="font-serif text-xl text-[#713E4A]">
                    Persediaan Aman
                  </p>

                  <p className="mt-2 text-xs text-[#927D82]">
                    Tidak ada varian yang memerlukan perhatian.
                  </p>
                </div>
              ) : (
                attentionProducts.map((product) => (
                  <div
                    key={product.id_variant}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F2E8E7] py-4 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-[#49343A]">
                        {product.product_name}
                      </p>

                      <p className="mt-1.5 text-[10px] text-[#A18D91]">
                        {product.size} · {product.color}
                      </p>

                      <p className="mt-1 text-[10px] text-[#A18D91]">
                        {formatNumber(product.current_stock)} unit
                        {" · "}Rak {product.rack_location || "—"}
                      </p>
                    </div>

                    <StockStatus status={product.stock_status} />
                  </div>
                ))
              )}
            </div>

            <div className="mx-6 mb-6 mt-4 border-l-2 border-[#BD858B] bg-[#FBF5F3] px-4 py-4">
              <p className="text-xs font-semibold text-[#713E4A]">
                Catatan Inventaris
              </p>

              <p className="mt-2 text-[11px] leading-6 text-[#927D82]">
                Periksa ukuran, warna, dan lokasi rak sebelum
                melakukan permintaan restock.
              </p>
            </div>
          </section>
        </div>

        {/* FOOTER */}
        <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-[#EEDFE0] pt-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#A18D91]">
            FashStock © 2026
          </p>

          <p className="font-serif text-sm italic text-[#927D82]">
            Smart Stock. Better Style.
          </p>
        </footer>
      </section>
    </main>
  );
}
