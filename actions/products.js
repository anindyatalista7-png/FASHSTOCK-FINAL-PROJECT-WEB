"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { assertRole, AuthError } from "@/lib/auth";
import { UNITS } from "@/lib/constants";
import { dbErrorMessage, fail, intOrNull, numOrNull, readImage, str, withMsg } from "@/lib/validation";

const MANAGERS = ["admin", "manager"];

/** Validasi field produk. `isCreate` menentukan apakah SKU & gambar wajib. */
async function validateProduct(fd, isCreate) {
  const v = {
    sku: str(fd, "sku").toUpperCase(),
    name: str(fd, "name"),
    category_id: str(fd, "category_id"),
    description: str(fd, "description"),
    purchase_price: str(fd, "purchase_price"),
    selling_price: str(fd, "selling_price"),
    min_stock: str(fd, "min_stock"),
    low_stock: str(fd, "low_stock"),
    stock: str(fd, "stock"),
    unit: str(fd, "unit"),
    rack_location: str(fd, "rack_location").toUpperCase(),
  };
  const e = {};

  if (isCreate) {
    if (!v.sku) e.sku = "SKU wajib diisi.";
    else if (!/^[A-Z0-9][A-Z0-9-_]{1,49}$/.test(v.sku)) e.sku = "SKU 2–50 karakter: huruf, angka, '-' atau '_'.";
  }
  if (v.name.length < 2) e.name = "Nama produk wajib diisi (min. 2 karakter).";
  else if (v.name.length > 150) e.name = "Nama produk maksimal 150 karakter.";

  const categoryId = intOrNull(v.category_id);
  if (!categoryId) e.category_id = "Kategori wajib dipilih.";
  else {
    const cat = await queryOne("SELECT id FROM categories WHERE id = $1", [categoryId]);
    if (!cat) e.category_id = "Kategori tidak ditemukan.";
  }
  if (v.description.length < 5) e.description = "Deskripsi wajib diisi (min. 5 karakter).";

  const buy = numOrNull(v.purchase_price);
  const sell = numOrNull(v.selling_price);
  if (buy === null || Number.isNaN(buy) || buy < 0) e.purchase_price = "Harga beli harus angka ≥ 0.";
  if (sell === null || Number.isNaN(sell) || sell < 0) e.selling_price = "Harga jual harus angka ≥ 0.";
  else if (!e.purchase_price && sell < buy) e.selling_price = "Harga jual tidak boleh lebih kecil dari harga beli.";

  const min = intOrNull(v.min_stock);
  const low = intOrNull(v.low_stock);
  const stock = intOrNull(v.stock);
  if (min === null || Number.isNaN(min) || min < 0) e.min_stock = "Stok minimum harus bilangan bulat ≥ 0.";
  if (low === null || Number.isNaN(low) || low < 0) e.low_stock = "Stok Low harus bilangan bulat ≥ 0.";
  else if (!e.min_stock && low <= min) e.low_stock = "Stok Low harus lebih besar dari stok minimum.";
  if (stock === null || Number.isNaN(stock)) e.stock = "Jumlah stok wajib diisi (bilangan bulat).";
  else if (stock < 0) e.stock = "Jumlah stok tidak boleh negatif.";

  if (!UNITS.includes(v.unit)) e.unit = "Pilih unit yang tersedia.";
  if (!v.rack_location) e.rack_location = "Lokasi rak wajib diisi.";
  else if (v.rack_location.length > 50) e.rack_location = "Lokasi rak maksimal 50 karakter.";

  const { file, error: imgErr } = await readImage(fd, "image", { required: isCreate });
  if (imgErr) e.image = imgErr;

  return {
    values: v,
    errors: e,
    data: { categoryId, buy, sell, min, low, stock, file },
  };
}

export async function createProduct(prevState, formData) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err.message);
  }
  const { values, errors, data } = await validateProduct(formData, true);

  if (!errors.sku) {
    const dup = await queryOne("SELECT 1 FROM products WHERE UPPER(sku) = $1", [values.sku]);
    if (dup) errors.sku = "SKU sudah digunakan produk lain (SKU harus unique).";
  }
  if (Object.keys(errors).length) return fail("Periksa kembali isian produk.", errors, values);

  let newId;
  try {
    const row = await queryOne(
      `INSERT INTO products (sku, name, category_id, description, purchase_price, selling_price,
                             min_stock, low_stock, stock, unit, rack_location, image, image_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id`,
      [
        values.sku, values.name, data.categoryId, values.description, data.buy, data.sell,
        data.min, data.low, data.stock, values.unit, values.rack_location, data.file.buffer, data.file.type,
      ]
    );
    newId = row.id;
  } catch (err) {
    return fail(dbErrorMessage(err), {}, values);
  }
  revalidatePath("/products");
  redirect(withMsg(`/products/${newId}`, "Produk berhasil ditambahkan."));
}

export async function updateProduct(id, prevState, formData) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err.message);
  }
  const existing = await queryOne("SELECT id FROM products WHERE id = $1 AND deleted_at IS NULL", [id]);
  if (!existing) return fail("Produk tidak ditemukan.");

  const { values, errors, data } = await validateProduct(formData, false);
  if (Object.keys(errors).length) return fail("Periksa kembali isian produk.", errors, values);

  try {
    // SKU tidak ikut diubah. Gambar hanya diganti jika file baru diunggah.
    await query(
      `UPDATE products
          SET name = $1, category_id = $2, description = $3, purchase_price = $4, selling_price = $5,
              min_stock = $6, low_stock = $7, stock = $8, unit = $9, rack_location = $10,
              image = COALESCE($11, image), image_type = COALESCE($12, image_type)
        WHERE id = $13 AND deleted_at IS NULL`,
      [
        values.name, data.categoryId, values.description, data.buy, data.sell, data.min, data.low,
        data.stock, values.unit, values.rack_location, data.file?.buffer ?? null, data.file?.type ?? null, id,
      ]
    );
  } catch (err) {
    return fail(dbErrorMessage(err), {}, values);
  }
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  redirect(withMsg(`/products/${id}`, "Produk berhasil diperbarui."));
}

export async function deleteProduct(id, prevState, formData) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err instanceof AuthError ? err.message : "Gagal menghapus.");
  }
  const product = await queryOne(
    `SELECT p.id, p.name, p.stock,
            (SELECT COUNT(*) FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id
              WHERE i.product_id = p.id AND t.status = 'Pending') AS pending_trx,
            (SELECT COUNT(*) FROM restock_order_items i JOIN restock_orders r ON r.id = i.restock_order_id
              WHERE i.product_id = p.id AND r.status IN ('Pending','Confirmed','In Transit')) AS active_restock
       FROM products p WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [id]
  );
  if (!product) return fail("Produk tidak ditemukan atau sudah dihapus.");
  if (product.pending_trx > 0)
    return fail(`Produk masih dipakai di ${product.pending_trx} transaksi Pending. Selesaikan transaksi tersebut terlebih dahulu.`);
  if (product.active_restock > 0)
    return fail(`Produk masih ada di ${product.active_restock} restock order yang sedang berjalan.`);
  if (product.stock > 0 && formData.get("confirm_stock") !== "1")
    return fail(`Peringatan: produk masih memiliki stok ${product.stock}. Konfirmasi penghapusan diperlukan.`);

  // Soft delete: data hilang dari daftar, riwayat transaksi tetap utuh.
  await query("UPDATE products SET deleted_at = NOW() WHERE id = $1", [id]);
  revalidatePath("/products");
  redirect(withMsg("/products", `Produk "${product.name}" berhasil dihapus.`));
}
