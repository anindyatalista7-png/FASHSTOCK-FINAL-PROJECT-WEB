"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { queryOne, withTransaction } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { dbErrorMessage, fail, intOrNull, isValidDate, parseItems, str, withMsg } from "@/lib/validation";

class UserError extends Error {}

function refresh(id) {
  revalidatePath("/restock");
  revalidatePath("/dashboard");
  if (id) revalidatePath(`/restock/${id}`);
}

/* ----------------------- CREATE (Warehouse Manager) ------------------- */

export async function createRestockOrder(prevState, formData) {
  let user;
  try {
    user = await assertRole(["manager"]);
  } catch (err) {
    return fail(err.message);
  }
  const values = {
    supplier_id: str(formData, "supplier_id"),
    order_date: str(formData, "order_date"),
    expected_date: str(formData, "expected_date"),
    notes: str(formData, "notes"),
  };
  const e = {};
  const supplierId = intOrNull(values.supplier_id);
  if (!supplierId) e.supplier_id = "Supplier wajib dipilih.";
  else {
    const sup = await queryOne("SELECT id FROM users WHERE id = $1 AND role = 'supplier' AND status = 'Approved'", [supplierId]);
    if (!sup) e.supplier_id = "Supplier tidak valid atau belum di-approve.";
  }
  if (!isValidDate(values.order_date)) e.order_date = "Tanggal order wajib diisi dengan benar.";
  if (!isValidDate(values.expected_date)) e.expected_date = "Expected delivery date wajib diisi dengan benar.";
  else if (!e.order_date && values.expected_date < values.order_date)
    e.expected_date = "Expected delivery date tidak boleh sebelum tanggal order.";
  if (values.notes.length < 3) e.notes = "Catatan wajib diisi (min. 3 karakter).";
  else if (values.notes.length > 500) e.notes = "Catatan maksimal 500 karakter.";

  const { items, error: itemsError } = parseItems(formData);
  if (itemsError) e.items = itemsError;
  if (Object.keys(e).length) return fail("Periksa kembali isian restock order.", e, values);

  let newId;
  try {
    newId = await withTransaction(async (client) => {
      const ids = items.map((i) => i.productId);
      const { rows: found } = await client.query(
        "SELECT id FROM products WHERE id = ANY($1::int[]) AND deleted_at IS NULL",
        [ids]
      );
      if (found.length !== ids.length) throw new UserError("Salah satu produk tidak ditemukan atau sudah dihapus.");

      // Nomor PO otomatis: PO-YYYYMMDD-00001
      const { rows: seq } = await client.query(
        "SELECT TO_CHAR(NOW(), 'YYYYMMDD') AS d, LPAD(NEXTVAL('po_number_seq')::text, 5, '0') AS n"
      );
      const poNumber = `PO-${seq[0].d}-${seq[0].n}`;
      const { rows } = await client.query(
        `INSERT INTO restock_orders (po_number, supplier_id, created_by, order_date, expected_date, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'Pending') RETURNING id`,
        [poNumber, supplierId, user.id, values.order_date, values.expected_date, values.notes]
      );
      const orderId = rows[0].id;
      for (const it of items) {
        await client.query(
          "INSERT INTO restock_order_items (restock_order_id, product_id, quantity) VALUES ($1, $2, $3)",
          [orderId, it.productId, it.quantity]
        );
      }
      await client.query(
        "INSERT INTO restock_status_logs (restock_order_id, status, note, changed_by) VALUES ($1, 'Pending', 'Restock order dibuat', $2)",
        [orderId, user.id]
      );
      return orderId;
    });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err), {}, values);
  }
  refresh();
  redirect(withMsg(`/restock/${newId}`, "Restock order berhasil dibuat dan dikirim ke supplier."));
}

/* ------------------- Perubahan status (dengan log) -------------------- */

async function changeStatus({ id, from, to, note, actor, supplierOnly }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query("SELECT id, po_number, status, supplier_id FROM restock_orders WHERE id = $1 FOR UPDATE", [id]);
    const order = rows[0];
    if (!order) throw new UserError("Restock order tidak ditemukan.");
    if (supplierOnly && order.supplier_id !== actor.id) throw new UserError("Restock order ini bukan milik Anda.");
    if (order.status !== from) throw new UserError(`Status order saat ini ${order.status}; tidak dapat diubah menjadi ${to}.`);

    await client.query("UPDATE restock_orders SET status = $1, status_note = $2 WHERE id = $3", [to, to === "Rejected" ? note : null, id]);
    await client.query(
      "INSERT INTO restock_status_logs (restock_order_id, status, note, changed_by) VALUES ($1, $2, $3, $4)",
      [id, to, note, actor.id]
    );
    return order.po_number;
  });
}

/** Supplier mengkonfirmasi order berstatus Pending */
export async function confirmRestockOrder(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(["supplier"]);
  } catch (err) {
    return fail(err.message);
  }
  let po;
  try {
    po = await changeStatus({ id, from: "Pending", to: "Confirmed", note: "Dikonfirmasi supplier, barang tersedia", actor: user, supplierOnly: true });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err));
  }
  refresh(id);
  const back = formData?.get?.("redirect_to") === "dashboard" ? "/dashboard" : `/restock/${id}`;
  redirect(withMsg(back, `${po} berhasil dikonfirmasi.`));
}

/** Supplier menolak order berstatus Pending (alasan wajib) */
export async function rejectRestockOrder(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(["supplier"]);
  } catch (err) {
    return fail(err.message);
  }
  const reason = str(formData, "reason");
  if (reason.length < 5) return fail("Catatan alasan penolakan wajib diisi (min. 5 karakter).", {}, { reason });
  if (reason.length > 500) return fail("Catatan maksimal 500 karakter.", {}, { reason });
  let po;
  try {
    po = await changeStatus({ id, from: "Pending", to: "Rejected", note: reason, actor: user, supplierOnly: true });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err), {}, { reason });
  }
  refresh(id);
  const back = formData.get("redirect_to") === "dashboard" ? "/dashboard" : `/restock/${id}`;
  redirect(withMsg(back, `${po} ditolak.`));
}

/** Manager: Confirmed -> In Transit -> Received */
export async function advanceRestockOrder(id, prevState, formData) {
  let user;
  try {
    user = await assertRole(["manager"]);
  } catch (err) {
    return fail(err.message);
  }
  const current = await queryOne("SELECT status FROM restock_orders WHERE id = $1", [id]);
  if (!current) return fail("Restock order tidak ditemukan.");
  const flow = {
    Confirmed: { to: "In Transit", note: "Barang dalam pengiriman" },
    "In Transit": { to: "Received", note: "Barang diterima di gudang, menunggu pencatatan Barang Masuk" },
  }[current.status];
  if (!flow) return fail(`Status ${current.status} tidak dapat dilanjutkan oleh Manager.`);

  let po;
  try {
    po = await changeStatus({ id, from: current.status, to: flow.to, note: flow.note, actor: user });
  } catch (err) {
    return fail(err instanceof UserError ? err.message : dbErrorMessage(err));
  }
  refresh(id);
  redirect(withMsg(`/restock/${id}`, `${po} sekarang berstatus ${flow.to}.`));
}

/** Manager memberi rating & feedback setelah order Received */
export async function rateRestockOrder(id, prevState, formData) {
  try {
    await assertRole(["manager"]);
  } catch (err) {
    return fail(err.message);
  }
  const rating = intOrNull(str(formData, "rating"));
  const feedback = str(formData, "feedback");
  if (!rating || Number.isNaN(rating) || rating < 1 || rating > 5) return fail("Pilih rating 1 sampai 5 bintang.", {}, { feedback });
  if (feedback.length > 500) return fail("Feedback maksimal 500 karakter.", {}, { feedback });

  const row = await queryOne(
    `UPDATE restock_orders SET rating = $1, feedback = NULLIF($2, ''), rated_at = NOW()
      WHERE id = $3 AND status = 'Received' RETURNING po_number`,
    [rating, feedback, id]
  );
  if (!row) return fail("Rating hanya dapat diberikan untuk order berstatus Received.");
  refresh(id);
  revalidatePath("/suppliers");
  redirect(withMsg(`/restock/${id}`, `Rating untuk ${row.po_number} tersimpan.`));
}
