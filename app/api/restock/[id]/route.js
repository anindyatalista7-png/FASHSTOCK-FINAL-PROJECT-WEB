import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/restock/:id -> supplier & daftar produk PO (untuk auto-fill form Barang Masuk)
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user || !["manager", "staff"].includes(user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orderId = parseInt(id, 10);
  if (!orderId) return NextResponse.json({ error: "ID tidak valid" }, { status: 400 });

  const order = await queryOne(
    `SELECT r.id, r.po_number, r.status, r.supplier_id, s.company_name AS supplier_name
       FROM restock_orders r JOIN users s ON s.id = r.supplier_id WHERE r.id = $1`,
    [orderId]
  );
  if (!order) return NextResponse.json({ error: "Restock Order tidak ditemukan" }, { status: 404 });
  if (order.status !== "Received" && !(order.status === "Inspecting" && (await queryOne("SELECT inspection_result FROM restock_orders WHERE id = $1", [orderId]))?.inspection_result === "Passed")) {
    return NextResponse.json({ error: `Restock Order berstatus ${order.status}, belum lolos pemeriksaan` }, { status: 422 });
  }
  const used = await queryOne(
    "SELECT trx_number FROM transactions WHERE restock_order_id = $1 AND status <> 'Rejected'",
    [orderId]
  );
  if (used) return NextResponse.json({ error: `Sudah dipakai oleh transaksi ${used.trx_number}` }, { status: 409 });

  const { rows: items } = await query(
    `SELECT i.product_id, i.quantity, p.sku, p.name, p.unit
       FROM restock_order_items i JOIN products p ON p.id = i.product_id
      WHERE i.restock_order_id = $1 AND p.deleted_at IS NULL ORDER BY i.id`,
    [orderId]
  );
  return NextResponse.json({ ...order, items });
}
