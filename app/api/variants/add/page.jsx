
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../../../components/Sidebar";

const initialForm = {
  id_product: "",
  sku: "",
  size: "",
  color: "",
  minimum_stock: "5",
  low_stock: "10",
  rack_location: "",
};

export default function AddVariantPage() {
  const router = useRouter();

  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Mengambil produk yang sudah tersimpan
  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true);

        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Gagal memuat produk."
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

  // Mengubah nilai formulir
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Mengirim data varian ke API
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
          ...form,
          id_product: Number(form.id_product),
          minimum_stock: Number(form.minimum_stock),
          low_stock: Number(form.low_stock),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Gagal menambahkan varian."
        );
      }

      window.alert("Varian produk berhasil ditambahkan!");
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
    "mb-2 block text-sm font-medium text-[#713E4A]";

  return (
    <div className="flex min-h-screen bg-[#FFFBF8] text-[#49343A]">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 py-8 md:px-10">
        {/* HEADER */}
        <div className="mb-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#BD858B]">
            FashStock / Produk Fashion
          </p>

          <h1 className="font-serif text-3xl text-[#713E4A] md:text-4xl">
            Tambah Varian Produk
          </h1>

          <p className="mt-2 text-sm text-[#927D82]">
            Tambahkan ukuran atau warna baru pada produk
            yang sudah terdaftar di gudang.
          </p>
        </div>

        {/* FORMULIR */}
        <section className="max-w-3xl rounded-2xl border border-[#EEDFE0] bg-white p-6 md:p-8">
          {error && (
            <div
              role="alert"
              className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          {loading ? (
            <p className="text-sm text-[#927D82]">
              Memuat daftar produk...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PILIH PRODUK */}
              <div>
                <label
                  htmlFor="id_product"
                  className={labelClass}
                >
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
                  <option value="">
                    -- Pilih Produk Fashion --
                  </option>

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
                    Belum ada produk. Tambahkan produk
                    terlebih dahulu.
                  </p>
                )}
              </div>

              {/* SKU */}
              <div>
                <label htmlFor="sku" className={labelClass}>
                  SKU Varian
                </label>

                <input
                  id="sku"
                  name="sku"
                  type="text"
                  value={form.sku}
                  onChange={handleChange}
                  placeholder="Contoh: FSH001-XL-BLK"
                  required
                  maxLength={100}
                  className={inputClass}
                />

                <p className="mt-2 text-xs text-[#927D82]">
                  Setiap varian wajib memiliki SKU unik.
                </p>
              </div>

              {/* UKURAN DAN WARNA */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="size"
                    className={labelClass}
                  >
                    Ukuran
                  </label>

                  <input
                    id="size"
                    name="size"
                    type="text"
                    value={form.size}
                    onChange={handleChange}
                    placeholder="Contoh: XL"
                    required
                    className={inputClass}
                  />
                </div>

                <div>
                  <label
                    htmlFor="color"
                    className={labelClass}
                  >
                    Warna
                  </label>

                  <input
                    id="color"
                    name="color"
                    type="text"
                    value={form.color}
                    onChange={handleChange}
                    placeholder="Contoh: Hitam"
                    required
                    className={inputClass}
                  />
                </div>
              </div>

              {/* BATAS STOK */}
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
                  <label
                    htmlFor="low_stock"
                    className={labelClass}
                  >
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

              {/* LOKASI RAK */}
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
                  type="text"
                  value={form.rack_location}
                  onChange={handleChange}
                  placeholder="Contoh: A-04"
                  className={inputClass}
                />
              </div>

              {/* INFORMASI STOK AWAL */}
              <div className="rounded-xl border border-[#EEDFE0] bg-[#F8EEEE] p-4">
                <p className="text-sm font-semibold text-[#713E4A]">
                  Stok Awal: 0 Unit
                </p>

                <p className="mt-1 text-xs text-[#927D82]">
                  Stok akan ditambahkan melalui fitur
                  Transaksi Stok Masuk agar setiap perubahan
                  persediaan memiliki riwayat.
                </p>
              </div>

              {/* TOMBOL AKSI */}
              <div className="flex flex-wrap justify-end gap-3 border-t border-[#EEDFE0] pt-6">
                <Link
                  href="/products"
                  className="rounded-xl border border-[#EEDFE0] px-5 py-3 text-sm font-semibold text-[#713E4A]"
                >
                  Batal
                </Link>

                <button
                  type="submit"
                  disabled={saving || products.length === 0}
                  className="rounded-xl bg-[#713E4A] px-6 py-3 text-sm font-semibold text-white hover:bg-[#5D303B] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Menyimpan..."
                    : "Simpan Varian"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
