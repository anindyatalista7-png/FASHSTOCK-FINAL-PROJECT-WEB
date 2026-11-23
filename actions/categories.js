"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { dbErrorMessage, fail, readImage, str, withMsg } from "@/lib/validation";

const MANAGERS = ["admin", "manager"];

async function validate(fd, { id = null, isCreate }) {
  const values = { name: str(fd, "name"), description: str(fd, "description") };
  const e = {};
  if (values.name.length < 2) e.name = "Nama kategori minimal 2 karakter.";
  else if (values.name.length > 100) e.name = "Nama kategori maksimal 100 karakter.";
  else {
    const dup = await queryOne(
      "SELECT 1 FROM categories WHERE LOWER(name) = LOWER($1) AND ($2::int IS NULL OR id <> $2)",
      [values.name, id]
    );
    if (dup) e.name = "Nama kategori sudah digunakan (harus unique).";
  }
  if (values.description.length < 5) e.description = "Deskripsi wajib diisi (min. 5 karakter).";
  const { file, error } = await readImage(fd, "image", { required: isCreate });
  if (error) e.image = error;
  return { values, e, file };
}

export async function createCategory(prevState, formData) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err.message);
  }
  const { values, e, file } = await validate(formData, { isCreate: true });
  if (Object.keys(e).length) return fail("Periksa kembali isian kategori.", e, values);
  try {
    await query("INSERT INTO categories (name, description, image, image_type) VALUES ($1, $2, $3, $4)", [
      values.name, values.description, file.buffer, file.type,
    ]);
  } catch (err) {
    return fail(dbErrorMessage(err), {}, values);
  }
  revalidatePath("/categories");
  redirect(withMsg("/categories", "Kategori berhasil ditambahkan."));
}

export async function updateCategory(id, prevState, formData) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err.message);
  }
  const existing = await queryOne("SELECT id FROM categories WHERE id = $1", [id]);
  if (!existing) return fail("Kategori tidak ditemukan.");
  const { values, e, file } = await validate(formData, { id, isCreate: false });
  if (Object.keys(e).length) return fail("Periksa kembali isian kategori.", e, values);
  try {
    await query(
      `UPDATE categories SET name = $1, description = $2,
              image = COALESCE($3, image), image_type = COALESCE($4, image_type)
        WHERE id = $5`,
      [values.name, values.description, file?.buffer ?? null, file?.type ?? null, id]
    );
  } catch (err) {
    return fail(dbErrorMessage(err), {}, values);
  }
  revalidatePath("/categories");
  redirect(withMsg("/categories", "Kategori berhasil diperbarui."));
}

export async function deleteCategory(id) {
  try {
    await assertRole(MANAGERS);
  } catch (err) {
    return fail(err.message);
  }
  const cat = await queryOne(
    `SELECT c.name,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.deleted_at IS NULL) AS active_products,
            (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS all_products
       FROM categories c WHERE c.id = $1`,
    [id]
  );
  if (!cat) return fail("Kategori tidak ditemukan.");
  if (cat.active_products > 0)
    return fail(`Kategori "${cat.name}" masih memiliki ${cat.active_products} produk sehingga tidak dapat dihapus.`);
  try {
    // Produk yang sudah di-soft-delete dilepas dari kategori agar FK tidak menghalangi
    if (cat.all_products > 0) await query("UPDATE products SET category_id = NULL WHERE category_id = $1", [id]);
    await query("DELETE FROM categories WHERE id = $1", [id]);
  } catch (err) {
    return fail(dbErrorMessage(err));
  }
  revalidatePath("/categories");
  redirect(withMsg("/categories", `Kategori "${cat.name}" berhasil dihapus.`));
}
