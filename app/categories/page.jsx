
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";

export default function CategoriesPage() {
  // State daftar kategori
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // State formulir tambah kategori
  const [form, setForm] = useState({
    category_name: "",
    description: "",
  });

  // Mengambil kategori dari API
  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/categories", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal mengambil kategori."
        );
      }

      setCategories(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Mengubah input formulir
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Menyimpan kategori baru
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menambahkan kategori."
        );
      }

      setMessage("Kategori berhasil ditambahkan!");

      setForm({
        category_name: "",
        description: "",
      });

      await loadCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // Filter pencarian kategori
  const filteredCategories = categories.filter((category) =>
    category.category_name
      .toLowerCase()
      .includes(search.toLowerCase().trim())
  );

  // Menghitung total produk
  const totalProducts = categories.reduce(
    (total, category) =>
      total + Number(category.total_products || 0),
    0
  );

  const inputClass =
    "w-full rounded-xl border border-[#EEDFE0] bg-white px-4 py-3 text-sm text-[#49343A] outline-none focus:border-[#BD858B]";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#713E4A]";

  return (
    <div className="flex min-h-screen bg-[#FFFBF8] text-[#49343A]">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        {/* Header halaman */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
            FashStock / Kategori
          </p>

          <h1 className="font-serif text-3xl text-[#713E4A] md:text-4xl">
            Manajemen Kategori
          </h1>

          <p className="mt-2 text-sm text-[#927D82]">
            Kelola kelompok produk fashion yang tersedia
            di gudang FashStock.
          </p>
        </div>

        {/* Notifikasi */}
        {message && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700"
          >
            {message}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* Statistik kategori */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#EEDFE0] bg-white p-6">
            <p className="text-sm text-[#927D82]">
              Total Kategori
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#713E4A]">
              {categories.length}
            </h2>
          </div>

          <div className="rounded-2xl border border-[#EEDFE0] bg-white p-6">
            <p className="text-sm text-[#927D82]">
              Total Produk Terdaftar
            </p>

            <h2 className="mt-2 text-3xl font-bold text-[#713E4A]">
              {totalProducts}
            </h2>
          </div>
        </div>

        <div className="grid items-start gap-6 xl:grid-cols-[1fr_1.4fr]">
          {/* Form tambah kategori */}
          <section className="rounded-2xl border border-[#EEDFE0] bg-white p-6">
            <h2 className="mb-2 text-xl font-semibold text-[#713E4A]">
              Tambah Kategori
            </h2>

            <p className="mb-6 text-sm text-[#927D82]">
              Tambahkan kategori produk fashion baru.
            </p>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="category_name"
                  className={labelClass}
                >
                  Nama Kategori
                </label>

                <input
                  id="category_name"
                  name="category_name"
                  value={form.category_name}
                  onChange={handleChange}
                  placeholder="Contoh: Outerwear"
                  maxLength={100}
                  required
                  className={inputClass}
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className={labelClass}
                >
                  Deskripsi Kategori
                </label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Contoh: Jaket, blazer, dan cardigan"
                  rows={4}
                  required
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-[#713E4A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#5D303B] disabled:opacity-50"
              >
                {saving
                  ? "Menyimpan..."
                  : "+ Simpan Kategori"}
              </button>
            </form>
          </section>

          {/* Daftar kategori */}
          <section className="min-w-0 rounded-2xl border border-[#EEDFE0] bg-white p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-[#713E4A]">
                Daftar Kategori
              </h2>

              <button
                type="button"
                onClick={loadCategories}
                className="rounded-lg border border-[#EEDFE0] px-3 py-2 text-xs font-semibold text-[#713E4A]"
              >
                Refresh
              </button>
            </div>

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari nama kategori..."
              className={`${inputClass} mb-5`}
            />

            <div className="overflow-x-auto">
              <table className="w-full min-w-[460px] text-left text-sm">
                <thead className="bg-[#F8EEEE] text-[#713E4A]">
                  <tr>
                    <th className="px-4 py-3">No.</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Deskripsi</th>
                    <th className="px-4 py-3">Produk</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center"
                      >
                        Memuat kategori...
                      </td>
                    </tr>
                  ) : filteredCategories.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-[#927D82]"
                      >
                        Tidak ada kategori ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map(
                      (category, index) => (
                        <tr
                          key={category.id_category}
                          className="border-b border-[#F0E5E7]"
                        >
                          <td className="px-4 py-4">
                            {index + 1}
                          </td>

                          <td className="px-4 py-4 font-semibold text-[#713E4A]">
                            {category.category_name}
                          </td>

                          <td className="px-4 py-4">
                            {category.description || "-"}
                          </td>

                          <td className="px-4 py-4">
                            {category.total_products || 0}
                          </td>
                        </tr>
                      )
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Link
                href="/products"
                className="text-sm font-semibold text-[#713E4A] underline"
              >
                Lihat Manajemen Produk
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
