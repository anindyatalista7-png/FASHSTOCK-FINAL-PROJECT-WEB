"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne, withTransaction } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { dbErrorMessage, fail, intOrNull, isValidDate, parseItems, str, withMsg } from "@/lib/validation";

const CREATORS = ["manager", "staff"];

class UserError extends Error {}

function refresh(id) {
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/products");
  if (id) revalidatePath(`/transactions/${id}`);
}

/** Pastikan semua produk ada & aktif. Mengembalikan map id -> produk. */
async function loadProducts(client, items) {
  const ids = items.map((i) => i.productId);
  const { rows } = await client.query(
    "SELECT id, sku, name, stock, unit FROM products WHERE id = ANY($1::int[]) AND deleted_at IS NULL",
    [ids]
  );
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const it of items) {
    if (!map.has(it.productId)) throw new UserError("Salah satu produk tidak ditemukan atau sudah dihapus.");
  }
  return map;
}

function checkStock(items, map) {
  for (const it of items) {
    const p = map.get(it.productId);
    if (it.quantity > p.stock) {
      throw new UserError(`Quantity ${p.name} (${it.quantity}) melebihi stok tersedia (${p.stock} ${p.unit}).`);
    }
  }
}

/* --------------------------------------------------------------------- */
/*  CREATE                                                               */
/* --------------------------------------------------------------------- */

export async function createTransaction(type, prevState, formData) {
  let user;
  try {
    user = await assertRole(CREATORS);
  } catch (err) {
    return fail(err.message);
  }
  if (type !== "IN" && type !== "OUT") return fail("Tipe transaksi tidak valid.");

  const values = {
    trx_date: str(formData, "trx_date"),
    notes: str(formData, "notes"),
    supplier_id: str(formData, "supplier_id"),
    restock_order_id: str(formData, "restock_order_id"),
    customer_name: str(formData, "customer_name"),
  };
  const e = {};
  if (!isValidDate(values.trx_date)) e.trx_date = `Tanggal ${type === "IN" ? "penerimaan" : "pengiriman"} wajib diisi dengan benar.`;
  if (type === "IN" && values.notes.length < 3) e.notes = "Catatan wajib diisi (min. 3 karakter).";
  if (values.notes.length > 500) e.notes = "Catatan maksimal 500 karakter.";

  let supplierId = null;
  let restockId = null;
  if (type === "IN") {
    restockId = intOrNull(values.restock_order_id);
    if (Number.isNaN(restockId)) restockId = null;
    if (restockId) {
      const order = await queryOne("SELECT id, supplier_id, status FROM restock_orders WHERE id = $1", [restockId]);
      if (!order) e.restock_order_id = "Restock Order tidak ditemukan.";
      else if (order.status !== "Received") e.restock_order_id = "Hanya Restock Order berstatus Received yang dapat dipilih.";
      else {
        const used = await queryOne(
          "SELECT trx_number FROM transactions WHERE restock_order_id = $1 AND status <> 'Rejected'",
          [restockId]
        );
        if (used) e.restock_order_id = `Restock Order sudah dipakai oleh transaksi ${used.trx_number}.`;
        supplierId = order.supplier_id; // otomatis dari PO
      }
    } else {
      supplierId = intOrNull(values.supplier_id);
      if (!supplierId) e.supplier_id = "Supplier wajib dipilih.";
      else {
        const sup = await queryOne("SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND status = 'Approved'", [supplierId]);
        if (!sup) e.supplier_id = "Supplier tidak valid atau belum di-approve.";
      }
    }
  } else {
    if (values.customer_name.length < 2) e.customer_name = "Nama customer/tujuan wajib diisi.";
    else if (values.customer_name.length > 150) e.customer_name = "Nama customer maksimal 150 karakter.";
  }

  const { items, error: itemsError } = parseItems(formData);
  if (itemsError) e.items = itemsError;
  if (Object.keys(e).length) return fail("Periksa kembali isian transaksi.", e, values);

  let newId;
  try {
    newId = await withTransaction(async (client) => {
      const map = await loadProducts(client, items);
      if (type === "OUT") checkStock(items, map);

      // Nomor transaksi otomatis: IN-YYYYMMDD-00001 / OUT-YYYYMMDD-00001
      const { rows: seq } = await client.query(
        "SELECT TO_CHAR(NOW(), 'YYYYMMDD') AS d, LPAD(NEXTVAL('trx_number_seq')::text, 5, '0') AS n"
      );
      const trxNumber = `${type}-${seq[0].d}-${seq[0].n}`;
      const { rows } = await client.query(
        `INSERT INTO transactions (trx_number, type, trx_date, supplier_id, restock_order_id, customer_name, notes, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', $8)
         RETURNING id`,
        [trxNumber, type, values.trx_date, supplierId, restockId, type === "OUT" ? values.customer_name : null, values.notes, user.id]
      );
      const trxId = rows[0].id;
      for (const it of items) {
        await client.query(
          "INSERT INTO transaction_items (transaction_id, product_id, quantity) VALUES ($1, $2, $3)",
          [trxId, it.productId, it.quantity]
        );
      }
      return trxId;
    });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err), {}, values);
  }

  refresh();
  const back = formData.get("redirect_to") === "dashboard" ? "/dashboard" : `/transactions/${newId}`;
  redirect(withMsg(back, "Transaksi berhasil dibuat dan menunggu approval Manager."));
}

/* --------------------------------------------------------------------- */
/*  UPDATE (hanya Pending; field: produk, quantity, catatan)             */
/* --------------------------------------------------------------------- */

export async function updateTransaction(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(CREATORS);
  } catch (err) {
    return fail(err.message);
  }
  const values = { notes: str(formData, "notes") };
  const e = {};
  const { items, error: itemsError } = parseItems(formData);
  if (itemsError) e.items = itemsError;
  if (values.notes.length > 500) e.notes = "Catatan maksimal 500 karakter.";

  const current = await queryOne("SELECT id, type, status, created_by FROM transactions WHERE id = $1", [id]);
  if (!current) return fail("Transaksi tidak ditemukan.");
  if (current.type === "IN" && values.notes.length < 3) e.notes = "Catatan wajib diisi (min. 3 karakter).";
  if (Object.keys(e).length) return fail("Periksa kembali isian transaksi.", e, values);

  try {
    await withTransaction(async (client) => {
      const { rows } = await client.query("SELECT id, type, status, created_by FROM transactions WHERE id = $1 FOR UPDATE", [id]);
      const trx = rows[0];
      if (trx.status !== "Pending") throw new UserError("Hanya transaksi berstatus Pending yang dapat diedit.");
      if (user.role === "staff" && trx.created_by !== user.id)
        throw new UserError("Staff hanya dapat mengedit transaksi yang dibuatnya sendiri.");

      const map = await loadProducts(client, items);
      if (trx.type === "OUT") checkStock(items, map);

      await client.query("UPDATE transactions SET notes = $1 WHERE id = $2", [values.notes, id]);
      await client.query("DELETE FROM transaction_items WHERE transaction_id = $1", [id]);
      for (const it of items) {
        await client.query(
          "INSERT INTO transaction_items (transaction_id, product_id, quantity) VALUES ($1, $2, $3)",
          [id, it.productId, it.quantity]
        );
      }
    });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err), {}, values);
  }
  refresh(id);
  redirect(withMsg(`/transactions/${id}`, "Transaksi berhasil diperbarui."));
}

/* --------------------------------------------------------------------- */
/*  DELETE (hanya Pending; staff hanya milik sendiri)                     */
/* --------------------------------------------------------------------- */

export async function deleteTransaction(id) {
  let user;
  try {
    user = await assertRole(CREATORS);
  } catch (err) {
    return fail(err.message);
  }
  const trx = await queryOne("SELECT id, trx_number, type, status, created_by FROM transactions WHERE id = $1", [id]);
  if (!trx) return fail("Transaksi tidak ditemukan.");
  if (trx.status !== "Pending") return fail("Hanya transaksi berstatus Pending yang dapat dihapus.");
  if (user.role === "staff" && trx.created_by !== user.id)
    return fail("Staff hanya dapat menghapus transaksi yang dibuatnya sendiri.");

  const { rowCount } = await query("DELETE FROM transactions WHERE id = $1 AND status = 'Pending'", [id]);
  if (rowCount === 0) return fail("Transaksi sudah diproses sehingga tidak dapat dihapus.");
  refresh();
  redirect(withMsg(`/transactions?type=${trx.type}`, `Transaksi ${trx.trx_number} berhasil dihapus.`));
}

/* --------------------------------------------------------------------- */
/*  APPROVE (Manager) - stok di-update dalam satu DB transaction         */
/* --------------------------------------------------------------------- */

export async function approveTransaction(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(["manager"]);
  } catch (err) {
    return fail(err.message);
  }
  let trxNumber;
  try {
    trxNumber = await withTransaction(async (client) => {
      const { rows } = await client.query("SELECT id, trx_number, type, status FROM transactions WHERE id = $1 FOR UPDATE", [id]);
      const trx = rows[0];
      if (!trx) throw new UserError("Transaksi tidak ditemukan.");
      if (trx.status !== "Pending") throw new UserError(`Transaksi sudah berstatus ${trx.status}.`);

      const { rows: items } = await client.query(
        `SELECT i.product_id, i.quantity, p.name, p.unit
           FROM transaction_items i JOIN products p ON p.id = i.product_id
          WHERE i.transaction_id = $1
          ORDER BY i.product_id`, // urutan tetap untuk menghindari deadlock
        [id]
      );
      if (items.length === 0) throw new UserError("Transaksi tidak memiliki item.");

      for (const it of items) {
        if (trx.type === "IN") {
          await client.query("UPDATE products SET stock = stock + $1 WHERE id = $2", [it.quantity, it.product_id]);
        } else {
          const res = await client.query(
            "UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1 RETURNING stock",
            [it.quantity, it.product_id]
          );
          if (res.rowCount === 0) {
            throw new UserError(`Stok ${it.name} tidak mencukupi untuk mengeluarkan ${it.quantity} ${it.unit}. Approval dibatalkan.`);
          }
        }
      }
      await client.query(
        "UPDATE transactions SET status = 'Approved', reviewed_by = $1, reviewed_at = NOW(), reject_reason = NULL WHERE id = $2",
        [user.id, id]
      );
      return trx.trx_number;
    });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err));
  }
  refresh(id);
  const back = formData?.get?.("redirect_to") === "dashboard" ? "/dashboard" : `/transactions/${id}`;
  redirect(withMsg(back, `Transaksi ${trxNumber} di-approve. Stok telah diperbarui.`));
}

/* --------------------------------------------------------------------- */
/*  REJECT (Manager) - alasan wajib                                       */
/* --------------------------------------------------------------------- */

export async function rejectTransaction(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(["manager"]);
  } catch (err) {
    return fail(err.message);
  }
  const reason = str(formData, "reason");
  if (reason.length < 5) return fail("Alasan penolakan wajib diisi (min. 5 karakter).", { reason: "Wajib diisi." }, { reason });
  if (reason.length > 500) return fail("Alasan maksimal 500 karakter.", {}, { reason });

  const { rows } = await query(
    `UPDATE transactions
        SET status = 'Rejected', reject_reason = $1, reviewed_by = $2, reviewed_at = NOW()
      WHERE id = $3 AND status = 'Pending'
      RETURNING trx_number`,
    [reason, user.id, id]
  );
  if (rows.length === 0) return fail("Transaksi tidak ditemukan atau sudah diproses.");
  refresh(id);
  const back = formData.get("redirect_to") === "dashboard" ? "/dashboard" : `/transactions/${id}`;
  redirect(withMsg(back, `Transaksi ${rows[0].trx_number} ditolak. Stok tidak berubah.`));
}

/* --------------------------------------------------------------------- */
/*  SHIPPED (Barang Keluar yang sudah Approved)                           */
/* --------------------------------------------------------------------- */

export async function markShipped(id) {
  try {
    await assertRole(["staff", "manager"]);
  } catch (err) {
    return fail(err.message);
  }
  const { rows } = await query(
    `UPDATE transactions SET status = 'Shipped', shipped_at = NOW()
      WHERE id = $1 AND type = 'OUT' AND status = 'Approved'
      RETURNING trx_number`,
    [id]
  );
  if (rows.length === 0) return fail("Hanya barang keluar berstatus Approved yang dapat ditandai Shipped.");
  refresh(id);
  redirect(withMsg(`/transactions/${id}`, `Transaksi ${rows[0].trx_number} ditandai Shipped.`));
}
