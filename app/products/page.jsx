
"use client";

import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";

function StockBadge({ status }) {
  const styles = {
    Normal: "bg-[#EAF3EC] text-[#477052]",
    Low: "bg-[#FFF1D9] text-[#93651F]",
    Severe: "bg-[#F9E4E5] text-[#A64F5A]",
    "Out of Stock": "bg-[#F0ECEC] text-[#77696C]",
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${
        styles[status] || "bg-slate-100 text-slate-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function fetchProducts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(search)}`
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Gagal mengambil produk.");
        }

        if (isMounted) {
          setProducts(result.data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [search]);

  const totalVariants = products.reduce(
    (total, product) => total + Number(product.variant_count),
    0
  );

  const totalStock = products.reduce(
    (total, product) => total + Number(product.total_stock),
    0
  );

  const attentionProducts = products.filter(
    (product) => product.stock_status !== "Normal"
  ).length;

  return (
    <main className="flex min-h-screen bg-[#F8EEEE]">
      <Sidebar active="products" />

      <section className="min-w-0 flex-1 px-5 py-7 md:px-8 lg:px-10">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#BD858B]">
              FASHSTOCK / INVENTORY
            </p>

            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-[#49343A] md:text-3xl">
              Produk Fashion
            </h1>

            <p className="mt-1.5 text-sm text-[#927D82]">
              Kelola produk dan persediaan fashion di gudang.
            </p>
          </div>

          <div className="rounded-2xl border border-[#F0DDDE] bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-bold text-[#713E4A]">
              Smart Stock. Better Style.
            </p>
            <p className="mt-1 text-[10px] text-[#A18489]">
              Fashion Warehouse Management
            </p>
          </div>
        </header>

        {/* Ringkasan produk */}
        <div className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Produk",
              value: products.length,
              icon: "▦",
            },
            {
              label: "Total Varian",
              value: totalVariants,
              icon: "◈",
            },
            {
              label: "Total Stok",
              value: totalStock.toLocaleString("id-ID"),
              icon: "▣",
            },
            {
              label: "Perlu Perhatian",
              value: attentionProducts,
              icon: "!",
            },
          ].map((item, index) => (
            <article
              key={item.label}
              className="rounded-2xl border border-[#F0DDDE] bg-white p-5 shadow-[0_5px_20px_rgba(113,62,74,0.04)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[#927D82]">
                  {item.label}
                </p>

                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8EEEE] text-lg font-bold text-[#713E4A]">
                  {item.icon}
                </span>
              </div>

              <p className="my-3 text-3xl font-extrabold text-[#713E4A]">
                {item.value}
              </p>
            </article>
          ))}
        </div>

        {/* Tabel produk */}
        <section className="overflow-hidden rounded-2xl border border-[#F0DDDE] bg-white shadow-[0_5px_20px_rgba(113,62,74,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#F5E9E9] p-5">
            <div>
              <h2 className="font-extrabold text-[#49343A]">
                Daftar Persediaan
              </h2>
              <p className="mt-1 text-xs text-[#A18D91]">
                Data produk yang tersimpan di PostgreSQL.
              </p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nama, kategori, atau SKU..."
                className="w-full rounded-xl border border-[#E8C7C8] bg-[#FFFBFA] px-4 py-2.5 text-xs text-[#49343A] outline-none transition placeholder:text-[#B49DA1] focus:border-[#713E4A] focus:ring-2 focus:ring-[#F8EEEE]"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-[#927D82]">
              Memuat data produk...
            </div>
          ) : error ? (
            <div className="m-5 rounded-xl bg-[#F9E4E5] p-5 text-sm text-[#A64F5A]">
              <p className="font-bold">Data belum berhasil dimuat.</p>
              <p className="mt-1">{error}</p>
              <p className="mt-2 text-xs">
                Periksa koneksi database dan konfigurasi .env.local.
              </p>
            </div>
          ) : products.length === 0 ? (
            <div className="p-12 text-center">
              <p className="font-bold text-[#713E4A]">
                Produk tidak ditemukan.
              </p>
              <p className="mt-1 text-xs text-[#A18D91]">
                Coba gunakan kata kunci pencarian yang berbeda.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[#FFF8F7] text-[10px] font-bold uppercase tracking-wider text-[#9B858A]">
                  <tr>
                    <th className="px-5 py-4">Produk</th>
                    <th className="px-5 py-4">Kategori</th>
                    <th className="px-5 py-4">Varian / SKU</th>
                    <th className="px-5 py-4">Total Stok</th>
                    <th className="px-5 py-4">Lokasi Rak</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id_product}
                      className="border-t border-[#F5EEEE] transition hover:bg-[#FFFBFA]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.product_name}
                              className="h-12 w-12 rounded-xl border border-[#F0DDDE] object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F8EEEE] text-xl text-[#BD858B]">
                              ◈
                            </div>
                          )}

                          <div>
                            <p className="font-bold text-[#49343A]">
                              {product.product_name}
                            </p>
                            <p className="mt-1 text-[10px] text-[#A18D91]">
                              {product.variant_count} varian
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-xs text-[#806B70]">
                        {product.category_name}
                      </td>

                      <td className="max-w-[240px] px-5 py-4">
                        <div className="space-y-1.5">
                          {product.variants.map((variant) => (
                            <div
                              key={variant.id_variant}
                              className="text-[10px] text-[#806B70]"
                            >
                              <span className="font-bold text-[#713E4A]">
                                {variant.sku}
                              </span>
                              <span>
                                {" "}· {variant.size} · {variant.color}
                              </span>
                            </div>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-[#49343A]">
                        {Number(product.total_stock).toLocaleString("id-ID")}{" "}
                        <span className="text-[10px] font-normal text-[#A18D91]">
                          {product.unit}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {product.variants.map((variant) => (
                            <p
                              key={variant.id_variant}
                              className="text-[10px] text-[#806B70]"
                            >
                              {variant.rack_location || "-"}
                            </p>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <StockBadge status={product.stock_status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="border-t border-[#F5EEEE] px-5 py-3 text-[10px] text-[#A18D91]">
            Menampilkan {products.length} produk dari database FashStock.
          </div>
        </section>

        <footer className="mt-8 text-center text-[10px] tracking-wide text-[#B49DA1]">
          FashStock · Smart Stock. Better Style.
        </footer>
      </section>
    </main>
  );
}
