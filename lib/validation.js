import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./constants";

export function str(fd, key) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

export function intOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  if (!/^-?\d+$/.test(String(value).trim())) return NaN;
  return parseInt(value, 10);
}

export function numOrNull(value) {
  if (value === "" || value === null || value === undefined) return null;
  const cleaned = String(value).trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return NaN;
  return parseFloat(cleaned);
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/**
 * Ambil daftar item dari form: input berulang `product_id` dan `quantity`.
 * Mengembalikan { items, error }.
 */
export function parseItems(fd) {
  const productIds = fd.getAll("product_id").map((v) => String(v).trim());
  const quantities = fd.getAll("quantity").map((v) => String(v).trim());
  const items = [];
  const seen = new Set();

  for (let i = 0; i < productIds.length; i++) {
    const pid = intOrNull(productIds[i]);
    const qty = intOrNull(quantities[i]);
    if (pid === null && (qty === null || Number.isNaN(qty))) continue; // baris kosong
    if (pid === null || Number.isNaN(pid)) return { items, error: `Baris ${i + 1}: pilih produk.` };
    if (qty === null || Number.isNaN(qty) || qty <= 0)
      return { items, error: `Baris ${i + 1}: quantity harus bilangan bulat lebih dari 0.` };
    if (seen.has(pid)) return { items, error: `Baris ${i + 1}: produk yang sama dipilih lebih dari sekali.` };
    seen.add(pid);
    items.push({ productId: pid, quantity: qty });
  }
  if (items.length === 0) return { items, error: "Minimal satu produk harus ditambahkan." };
  return { items, error: null };
}

/**
 * Validasi file gambar dari FormData. Mengembalikan
 * { file: {buffer, type} | null, error }.
 */
export async function readImage(fd, key, { required }) {
  const file = fd.get(key);
  const empty = !file || typeof file === "string" || file.size === 0;
  if (empty) return { file: null, error: required ? "Gambar wajib diunggah." : null };
  if (!ALLOWED_IMAGE_TYPES.includes(file.type))
    return { file: null, error: "Format gambar harus JPG, PNG, WEBP, atau GIF." };
  if (file.size > MAX_IMAGE_BYTES) return { file: null, error: "Ukuran gambar maksimal 2 MB." };
  const buffer = Buffer.from(await file.arrayBuffer());
  return { file: { buffer, type: file.type }, error: null };
}

/** Bentuk state standar untuk useActionState. */
export function fail(error, fieldErrors = {}, values = {}) {
  return { ok: false, error, fieldErrors, values, ts: Date.now() };
}

export function success(message) {
  return { ok: true, message, fieldErrors: {}, values: {}, ts: Date.now() };
}

export function withMsg(path, msg, key = "msg") {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(msg)}`;
}

/** Ubah error database menjadi pesan yang ramah pengguna. */
export function dbErrorMessage(err, fallback = "Terjadi kesalahan pada server.") {
  if (!err) return fallback;
  if (err.code === "23505") {
    if (String(err.constraint).includes("sku")) return "SKU sudah digunakan produk lain.";
    if (String(err.constraint).includes("categories_name")) return "Nama kategori sudah digunakan.";
    if (String(err.constraint).includes("email")) return "Email sudah terdaftar.";
    if (String(err.constraint).includes("restock")) return "Restock Order tersebut sudah dipakai oleh transaksi masuk lain.";
    return "Data duplikat terdeteksi.";
  }
  if (err.code === "23503") return "Data masih dipakai oleh data lain sehingga tidak dapat diproses.";
  if (err.code === "23514") {
    if (String(err.constraint).includes("stock")) return "Stok tidak mencukupi atau nilai stok tidak valid.";
    return "Data tidak memenuhi aturan validasi.";
  }
  console.error(err);
  return fallback;
}
