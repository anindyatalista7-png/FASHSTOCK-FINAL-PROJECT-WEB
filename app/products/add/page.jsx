
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value) || 0);
}

function StatusBadge({ status }) {
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
      className={`inline-flex whitespace-nowrap px-3 py-1.5 text-[10px] font-semibold ${
        styles[status] || styles.Normal
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Memuat data produk dari PostgreSQL melalui API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          `/api/products?q=${encodeURIComponent(search)}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil data produk."
          );
        }

        setProducts(result.data || []);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, [search, refreshKey]);

  // Menghapus varian setelah konfirmasi pengguna.
  const handleDelete = useCallback(async (variant) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus varian ${variant.sku}?\n\n` +
      "Varian yang memiliki stok atau riwayat transaksi tidak dapat dihapus."
    );

    if (!confirmed) return;

    setDeletingId(variant.id_variant);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/variants/${variant.id_variant}/delete`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus varian."
        );
      }

      setMessage(result.message);
      setRefreshKey((previous) => previous + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }, []);

  // Statistik berdasarkan hasil pencarian.
  const totalVariants = products.reduce(
    (sum, product) => sum + Number(product.variant_count),
    0
  );

  const totalStock = products.reduce(
    (sum, product) => sum + Number(product.total_stock),
    0
  );

  const attentionCount = products.filter(
    (product) => product.stock_status !== "Normal"
  ).length;

  const summary = [
    {
      label: "Total Produk",
      value: products.length,
      number: "01",
    },
    {
      label: "Total Varian",
      value: totalVariants,
      number: "02",
    },
    {
      label: "Total Stok",
      value: totalStock,
      number: "03",
    },
    {
      label: "Perlu Perhatian",
      value: attentionCount,
      number: "04",
    },
  ];

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
                FASHSTOCK / PRODUCT MANAGEMENT
              </p>
            </div>

            <h1 className="mt-5 font-serif text-4xl text-[#713E4A] md:text-5xl">
              Product Inventory
            </h1>

            <p className="mt-3 text-sm leading-7 text-[#927D82]">
              Kelola koleksi, varian, dan persediaan produk fashion.
            </p>
          </div>

          <Link
            href="/products/add"
            className="bg-[#713E4A] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#5D303B]"
          >
            + Tambah Produk
          </Link>
        </header>

        {/* STATISTIK */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item, index) => (
            <article
              key={item.label}
              className={`border p-6 ${
                index === 3
                  ? "border-[#E9CDD0] bg-[#F8EEEE]"
                  : "border-[#EEDFE0] bg-white"
              }`}
            >
              <div className="flex justify-between">
                <p className="text-xs text-[#927D82]">
                  {item.label}
                </p>

                <span className="font-serif text-sm italic text-[#C7A9AE]">
                  {item.number}
                </span>
              </div>

              <p className="mt-6 font-serif text-4xl text-[#713E4A]">
                {loading ? "—" : formatNumber(item.value)}
              </p>
            </article>
          ))}
        </div>

        {/* PESAN HASIL OPERASI */}
        {message && (
          <div
            role="status"
            className="mb-5 border border-[#C9DFCE] bg-[#EAF3EC] px-5 py-4 text-sm text-[#477052]"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 border border-[#E9CDD0] bg-[#F9E4E5] px-5 py-4 text-sm text-[#A64F5A]"
          >
            {error}
          </div>
        )}

        {/* DAFTAR PRODUK */}
        <section className="overflow-hidden border border-[#EEDFE0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-5 border-b border-[#EEDFE0] px-6 py-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
                THE COLLECTION
              </p>

              <h2 className="mt-2 font-serif text-2xl text-[#713E4A]">
                Daftar Persediaan
              </h2>

              <p className="mt-2 text-xs text-[#927D82]">
                Produk dan varian yang tersimpan di PostgreSQL.
              </p>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setMessage("");
              }}
              placeholder="Cari produk, kategori, atau SKU..."
              className="w-full border border-[#E8D9DA] bg-[#FFFBF8] px-4 py-3 text-xs text-[#49343A] outline-none focus:border-[#713E4A] sm:w-72"
            />
          </div>

          {loading ? (
            <div className="px-6 py-16 text-center text-sm text-[#927D82]">
              Memuat koleksi produk...
            </div>
          ) : products.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="font-serif text-xl text-[#713E4A]">
                Produk tidak ditemukan
              </p>

              <p className="mt-2 text-xs text-[#927D82]">
                Coba kata kunci lain atau tambahkan produk baru.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left">
                <thead className="bg-[#FBF5F3]">
                  <tr>
                    {[
                      "Produk",
                      "Kategori",
                      "Varian",
                      "Stok",
                      "Lokasi Rak",
                      "Status",
                      "Aksi",
                    ].map((heading) => (
                      <th
                        key={heading}
                        className="px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#9B858A]"
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {products.map((product) => (
                    <tr
                      key={product.id_product}
                      className="border-t border-[#F2E8E7] transition hover:bg-[#FFFAF9]"
                    >
                      {/* INFORMASI PRODUK */}
                      <td className="px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-11 shrink-0 items-center justify-center overflow-hidden bg-[#F8EEEE]">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.product_name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span className="font-serif text-xl text-[#BD858B]">
                                F.
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="text-xs font-semibold text-[#49343A]">
                              {product.product_name}
                            </p>

                            <p className="mt-1 text-[10px] text-[#A18D91]">
                              {product.variant_count} varian
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* KATEGORI */}
                      <td className="px-5 py-5 text-xs text-[#806B70]">
                        {product.category_name}
                      </td>

                      {/* VARIAN DAN TOMBOL AKSI */}
                      <td className="px-5 py-5">
                        <div className="space-y-3">
                          {product.variants.map((variant) => (
                            <div
                              key={variant.id_variant}
                              className="text-[11px] text-[#806B70]"
                            >
                              <p className="font-semibold text-[#713E4A]">
                                {variant.sku}
                              </p>

                              <p className="mt-1">
                                {variant.size} · {variant.color}
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* TOTAL STOK */}
                      <td className="px-5 py-5 font-serif text-xl text-[#713E4A]">
                        {formatNumber(product.total_stock)}
                      </td>

                      {/* LOKASI RAK */}
                      <td className="px-5 py-5 text-xs text-[#806B70]">
                        {[
                          ...new Set(
                            product.variants
                              .map((variant) => variant.rack_location)
                              .filter(Boolean)
                          ),
                        ].join(", ") || "—"}
                      </td>

                      {/* STATUS STOK */}
                      <td className="px-5 py-5">
                        <StatusBadge status={product.stock_status} />
                      </td>

                      {/* EDIT DAN HAPUS */}
                      <td className="px-5 py-5">
                        <div className="space-y-3">
                          {product.variants.map((variant) => (
                            <div
                              key={variant.id_variant}
                              className="flex flex-wrap gap-2"
                            >
                              <Link
                                href={`/products/edit/${variant.id_variant}`}
                                className="border border-[#E8C7C8] px-3 py-2 text-center text-[11px] font-semibold text-[#713E4A] transition hover:bg-[#F8EEEE]"
                              >
                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() => handleDelete(variant)}
                                disabled={deletingId !== null}
                                className="border border-[#E9CDD0] px-3 py-2 text-[11px] font-semibold text-[#A64F5A] transition hover:bg-[#F9E4E5] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === variant.id_variant
                                  ? "Menghapus..."
                                  : "Hapus"}
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* FOOTER */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEDFE0] px-6 py-4">
            <p className="text-[11px] text-[#927D82]">
              Menampilkan {products.length} produk
              {search ? " sesuai pencarian" : ""}
            </p>

            <p className="font-serif text-sm italic text-[#927D82]">
              Smart Stock. Better Style.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
