
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Mengambil data produk
  async function fetchProducts(keyword = "") {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/products?q=${encodeURIComponent(keyword)}`,
        { cache: "no-store" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil data produk."
        );
      }

      setProducts(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Pencarian produk
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(search);
    }, 300);

    return () => clearTimeout(timer);
  }, [search]);

  // Hapus varian produk
  async function handleDelete(variant) {
    const confirmed = window.confirm(
      `Yakin ingin menghapus varian ${variant.sku}?\n\n` +
        "Varian hanya dapat dihapus jika stok 0 dan belum memiliki riwayat transaksi."
    );

    if (!confirmed) return;

    try {
      setDeletingId(variant.id_variant);
      setMessage("");
      setError("");

      const response = await fetch(
        `/api/variants/${variant.id_variant}/delete`,
        { method: "DELETE" }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menghapus varian."
        );
      }

      await fetchProducts(search);

      setMessage(
        result.message || "Varian berhasil dihapus."
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  // Mengubah produk menjadi baris per varian
  const rows = products.flatMap((product) => {
    const variants = Array.isArray(product.variants)
      ? product.variants
      : [];

    if (variants.length === 0) {
      return [{ product, variant: null }];
    }

    return variants.map((variant) => ({
      product,
      variant,
    }));
  });

  // Statistik persediaan
  const totalProducts = products.length;

  const totalVariants = products.reduce(
    (sum, product) =>
      sum + (product.variants?.length || 0),
    0
  );

  const totalStock = products.reduce(
    (sum, product) =>
      sum +
      (product.variants || []).reduce(
        (total, variant) =>
          total + Number(variant.current_stock || 0),
        0
      ),
    0
  );

  const attentionCount = products.reduce(
    (sum, product) =>
      sum +
      (product.variants || []).filter(
        (variant) =>
          Number(variant.current_stock) <=
          Number(variant.low_stock)
      ).length,
    0
  );

  function formatRupiah(value) {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function getStockStatus(variant) {
    if (!variant) return "-";

    const stock = Number(variant.current_stock || 0);
    const minimum = Number(variant.minimum_stock || 0);
    const low = Number(variant.low_stock || 0);

    if (stock === 0) return "Habis";
    if (stock <= minimum) return "Kritis";
    if (stock <= low) return "Menipis";

    return "Aman";
  }

  function getStatusStyle(status) {
    if (status === "Habis") {
      return {
        background: "#FBE5E5",
        color: "#A23E48",
      };
    }

    if (status === "Kritis") {
      return {
        background: "#F8E3E6",
        color: "#9C4454",
      };
    }

    if (status === "Menipis") {
      return {
        background: "#FFF0DC",
        color: "#966321",
      };
    }

    return {
      background: "#E7F2E9",
      color: "#34714C",
    };
  }

  return (
    <div className="flex min-h-screen bg-[#FFFBF8] text-[#49343A]">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
              FashStock / Inventaris
            </p>

            <h1 className="font-serif text-3xl font-semibold text-[#713E4A] md:text-4xl">
              Manajemen Produk
            </h1>

            <p className="mt-2 text-sm text-[#8A7479]">
              Kelola produk fashion, varian, dan persediaan gudang.
            </p>
          </div>

          {/* TOMBOL TAMBAH PRODUK DAN VARIAN */}
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products/variants/add"
              className="rounded-xl border border-[#BD858B] bg-white px-5 py-3 text-sm font-semibold text-[#713E4A] transition hover:bg-[#F8EEEE]"
            >
              + Tambah Varian
            </Link>

            <Link
              href="/products/add"
              className="rounded-xl bg-[#713E4A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5D303B]"
            >
              + Tambah Produk
            </Link>
          </div>
        </div>

        {/* STATISTIK */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Produk",
              value: totalProducts,
              note: "Jenis produk fashion",
            },
            {
              label: "Total Varian",
              value: totalVariants,
              note: "SKU terdaftar",
            },
            {
              label: "Total Stok",
              value: totalStock,
              note: "Unit persediaan",
            },
            {
              label: "Perlu Perhatian",
              value: attentionCount,
              note: "Stok rendah atau habis",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-[#EEDFE0] bg-white p-5"
            >
              <p className="text-sm text-[#8A7479]">
                {stat.label}
              </p>

              <h2 className="mt-3 font-serif text-3xl font-semibold text-[#713E4A]">
                {stat.value.toLocaleString("id-ID")}
              </h2>

              <p className="mt-2 text-xs text-[#A18D91]">
                {stat.note}
              </p>
            </div>
          ))}
        </div>

        {/* DAFTAR PERSEDIAAN */}
        <section className="overflow-hidden rounded-2xl border border-[#EEDFE0] bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EEDFE0] p-5">
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#713E4A]">
                Daftar Persediaan
              </h2>

              <p className="mt-1 text-xs text-[#9A858A]">
                Data produk dan varian dari PostgreSQL
              </p>
            </div>

            <input
              type="text"
              placeholder="Cari produk atau SKU..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              className="w-full rounded-xl border border-[#EEDFE0] bg-[#FFFBF8] px-4 py-3 text-sm outline-none focus:border-[#BD858B] sm:w-72"
            />
          </div>

          {/* NOTIFIKASI */}
          {message && (
            <div className="mx-5 mt-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* TABEL */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-[#F8EEEE] text-xs uppercase tracking-wide text-[#713E4A]">
                <tr>
                  <th className="px-5 py-4">SKU</th>
                  <th className="px-5 py-4">Nama Produk</th>
                  <th className="px-5 py-4">Kategori</th>
                  <th className="px-5 py-4">Varian</th>
                  <th className="px-5 py-4">Harga Jual</th>
                  <th className="px-5 py-4">Stok</th>
                  <th className="px-5 py-4">Lokasi</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#F2E7E8]">
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-[#9A858A]"
                    >
                      Memuat data produk...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-5 py-12 text-center text-[#9A858A]"
                    >
                      Belum ada produk yang ditemukan.
                    </td>
                  </tr>
                ) : (
                  rows.map(({ product, variant }) => {
                    const status = getStockStatus(variant);

                    return (
                      <tr
                        key={
                          variant?.id_variant ||
                          `product-${product.id_product}`
                        }
                        className="transition hover:bg-[#FFFBF8]"
                      >
                        <td className="px-5 py-4 font-medium text-[#713E4A]">
                          {variant?.sku || "-"}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold">
                            {product.product_name}
                          </p>

                          <p className="mt-1 text-xs text-[#A18D91]">
                            {product.unit || "pcs"}
                          </p>
                        </td>

                        <td className="px-5 py-4">
                          {product.category_name || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {variant
                            ? `${variant.size || "-"} / ${
                                variant.color || "-"
                              }`
                            : "-"}
                        </td>

                        <td className="px-5 py-4">
                          {formatRupiah(product.selling_price)}
                        </td>

                        <td className="px-5 py-4 font-semibold">
                          {Number(
                            variant?.current_stock || 0
                          ).toLocaleString("id-ID")}
                        </td>

                        <td className="px-5 py-4">
                          {variant?.rack_location || "-"}
                        </td>

                        <td className="px-5 py-4">
                          {variant && (
                            <span
                              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
                              style={getStatusStyle(status)}
                            >
                              {status}
                            </span>
                          )}
                        </td>

                        {/* EDIT DAN HAPUS */}
                        <td className="px-5 py-4">
                          {variant ? (
                            <div className="flex items-center justify-center gap-2">
                              <Link
                                href={`/products/edit/${variant.id_variant}`}
                                className="rounded-lg border border-[#BD858B] px-3 py-2 text-xs font-semibold text-[#713E4A] transition hover:bg-[#F8EEEE]"
                              >
                                Edit
                              </Link>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(variant)
                                }
                                disabled={
                                  deletingId === variant.id_variant
                                }
                                className="rounded-lg border border-[#D9A1A8] px-3 py-2 text-xs font-semibold text-[#A64F5A] transition hover:bg-[#FBE5E5] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {deletingId === variant.id_variant
                                  ? "Menghapus..."
                                  : "Hapus"}
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#A18D91]">
                              Tidak ada varian
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-[#EEDFE0] px-5 py-4 text-xs text-[#9A858A]">
            Menampilkan {rows.length} baris persediaan.
          </div>
        </section>
      </main>
    </div>
  );
}
