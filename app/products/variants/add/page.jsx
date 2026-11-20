
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../../../components/Sidebar";

export default function AddVariantPage() {
  const router = useRouter();

  // Menyimpan data produk dan status halaman
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Data formulir varian produk
  const [form, setForm] = useState({
    id_product: "",
    sku: "",
    size: "",
    color: "",
    minimum_stock: "5",
    low_stock: "10",
    rack_location: "",
  });

  // Mengambil produk dari database melalui API
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal mengambil daftar produk."
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

    loadProducts();
  }, []);

  // Memperbarui input formulir
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Menyimpan varian baru
  async function handleSubmit(event) {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch("/api/variants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_product: Number(form.id_product),
          sku: form.sku,
          size: form.size,
          color: form.color,
          minimum_stock: Number(form.minimum_stock),
          low_stock: Number(form.low_stock),
          rack_location: form.rack_location,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menyimpan varian produk."
        );
      }

      alert("Varian produk berhasil ditambahkan!");

      router.push("/products");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-[#EEDFE0] bg-white px-4 py-3 text-sm text-[#49343A] outline-none focus:border-[#BD858B]";

  const labelClass =
    "mb-2 block text-sm font-semibold text-[#713E4A]";

  return (
    <div className="flex min-h-screen bg-[#FFFBF8] text-[#49343A]">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        {/* Judul halaman */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
            FashStock / Produk Fashion
          </p>

          <h1 className="font-serif text-3xl text-[#713E4A] md:text-4xl">
            Tambah Varian Produk
          </h1>

          <p className="mt-2 text-sm text-[#927D82]">
            Tambahkan ukuran dan warna baru pada produk
            fashion yang sudah tersedia.
          </p>
        </div>

        {/* Form tambah varian */}
        <section className="max-w-3xl rounded-2xl border border-[#EEDFE0] bg-white p-6 md:p-8">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <p>Memuat daftar produk...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Pilih produk */}
              <div>
                <label htmlFor="id_product" className={labelClass}>
                  Pilih Produk
                </label>

                <select
                  id="id_product"
                  name="id_product"
                  value={form.id_product}
                  onChange={handleChange}
                  required
                  className={inputClass}
                >
                  <option value="">-- Pilih Produk --</option>

                  {products.map((product) => (
                    <option
                      key={product.id_product}
                      value={product.id_product}
                    >
                      {product.product_name}
                    </option>
                  ))}
                </select>

                {products.length === 0 && (
                  <p className="mt-2 text-sm text-[#927D82]">
                    Belum ada produk yang tersedia.
                  </p>
                )}
              </div>

              {/* SKU varian */}
              <div>
                <label htmlFor="sku" className={labelClass}>
                  SKU Varian
                </label>

                <input
                  id="sku"
                  name="sku"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="Contoh: FSH001-XL-BLK"
                  required
                  className={inputClass}
                />
              </div>

              {/* Ukuran dan warna */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="size" className={labelClass}>
                    Ukuran
                  </label>

                  <input
                    id="size"
                    name="size"
                    value={form.size}
                    onChange={handleChange}
                    placeholder="Contoh: XL"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="color" className={labelClass}>
                    Warna
                  </label>

                  <input
                    id="color"
                    name="color"
                    value={form.color}
                    onChange={handleChange}
                    placeholder="Contoh: Hitam"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Batas stok */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="minimum_stock"
                    className={labelClass}
                  >
                    Minimum Stok
                  </label>

                  <input
                    id="minimum_stock"
                    name="minimum_stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.minimum_stock}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="low_stock" className={labelClass}>
                    Batas Stok Rendah
                  </label>

                  <input
                    id="low_stock"
                    name="low_stock"
                    type="number"
                    min="0"
                    step="1"
                    value={form.low_stock}
                    onChange={handleChange}
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* Lokasi penyimpanan */}
              <div>
                <label
                  htmlFor="rack_location"
                  className={labelClass}
                >
                  Lokasi Rak
                </label>

                <input
                  id="rack_location"
                  name="rack_location"
                  value={form.rack_location}
                  onChange={handleChange}
                  placeholder="Contoh: A-04"
                  className={inputClass}
                />
              </div>

              {/* Informasi stok */}
              <div className="rounded-xl bg-[#F8EEEE] p-4">
                <p className="text-sm font-semibold text-[#713E4A]">
                  Stok Awal: 0 Unit
                </p>

                <p className="mt-1 text-xs text-[#927D82]">
                  Stok akan bertambah melalui fitur Transaksi
                  Stok Masuk.
                </p>
              </div>

              {/* Tombol aksi */}
              <div className="flex justify-end gap-3 border-t border-[#EEDFE0] pt-6">
                <Link
                  href="/products"
                  className="rounded-xl border border-[#EEDFE0] px-5 py-3 text-sm font-semibold text-[#713E4A]"
                >
                  Batal
                </Link>

                <button
                  type="submit"
                  disabled={saving || products.length === 0}
                  className="rounded-xl bg-[#713E4A] px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan Varian"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
