import "server-only";
import { Pool, types } from "pg";

// NUMERIC (OID 1700) -> number JS, DATE (OID 1082) -> string "YYYY-MM-DD"
types.setTypeParser(1700, (v) => (v === null ? null : parseFloat(v)));
types.setTypeParser(1082, (v) => v);
// COUNT/SUM bigint (OID 20) -> number
types.setTypeParser(20, (v) => (v === null ? null : parseInt(v, 10)));

const globalForPg = globalThis;

const pool =
  globalForPg.__fashstockWebPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    options: "-c search_path=fashstock_web,public",
  });

// Hindari membuat pool baru setiap hot-reload saat development
if (process.env.NODE_ENV !== "production") globalForPg.__fashstockWebPool = pool;

/** Jalankan raw SQL dengan parameter ($1, $2, ...). */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/** Ambil satu baris (atau null). */
export async function queryOne(text, params = []) {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
}

/**
 * Jalankan beberapa query dalam satu transaksi database (BEGIN/COMMIT/ROLLBACK).
 * Callback menerima `client` yang wajib dipakai untuk semua query di dalamnya.
 */
export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
