
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { assertRole } from "@/lib/auth";
import { fail, withMsg } from "@/lib/validation";

export async function verifySupplier(id, decision, prevState, formData) {
  let admin;

  try {
    admin = await assertRole(["admin"]);
  } catch (err) {
    return fail(err.message);
  }

  if (!["Approved", "Rejected"].includes(decision)) {
    return fail("Keputusan tidak valid.");
  }

  const sup = await queryOne(
    "SELECT id, company_name, status FROM users WHERE id = $1 AND role = 'supplier'",
    [id]
  );

  if (!sup) {
    return fail("Supplier tidak ditemukan.");
  }

  if (sup.status !== "Pending") {
    return fail("Supplier yang sudah diverifikasi tidak dapat diubah kembali.");
  }

  if (decision === "Rejected") {
    const active = await queryOne(
      "SELECT COUNT(*) AS n FROM restock_orders WHERE supplier_id = $1 AND status IN ('Pending','Confirmed','In Transit')",
      [id]
    );

    if (active.n > 0) {
      return fail(`Supplier masih memiliki ${active.n} restock order yang berjalan.`);
    }
  }

  const updated = await query(
    "UPDATE users SET status = $1, verified_by = $2, verified_at = NOW() WHERE id = $3 AND role = 'supplier' AND status = 'Pending' RETURNING id",
    [decision, admin.id, id]
  );

  if (!updated.rows.length) {
    return fail("Status supplier sudah berubah.");
  }

  if (decision === "Rejected") {
    await query(
      "DELETE FROM sessions WHERE user_id = $1",
      [id]
    );
  }

  revalidatePath("/suppliers");
  revalidatePath("/dashboard");

  const back =
    formData?.get?.("redirect_to") === "dashboard"
      ? "/dashboard"
      : "/suppliers";

  redirect(
    withMsg(
      back,
      `Supplier ${sup.company_name} berhasil di-${decision === "Approved" ? "approve" : "reject"}.`
    )
  );
}
