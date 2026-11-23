import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { listCategories, listProducts, listRestockOrders, listSuppliers, listTransactions } from "@/lib/data";
import { EXPORTABLE } from "@/lib/permissions";
import { buildCsv, buildXlsx } from "@/lib/xlsx";

const d = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : "");
const dt = (v) => (v ? new Date(v).toISOString().replace("T", " ").slice(0, 16) : "");

/* Setiap modul mengembalikan daftar sheet: [{ name, columns, rows }] */
const BUILDERS = {
  async products(sp) {
    const { rows } = await listProducts({ q: sp.get("q") || "", category: sp.get("category") || "", status: sp.get("status") || "", all: true });
    return [
      {
        name: "Produk",
        columns: ["SKU", "Nama", "Kategori", "Deskripsi", "Harga Beli", "Harga Jual", "Stok", "Unit", "Stok Minimum", "Stok Low", "Status Stok", "Lokasi Rak", "Nilai Stok", "Ditambahkan"].map((header) => ({ header })),
        rows: rows.map((p) => [p.sku, p.name, p.category_name, p.description, p.purchase_price, p.selling_price, p.stock, p.unit, p.min_stock, p.low_stock, p.stock_status, p.rack_location, p.stock * p.purchase_price, d(p.created_at)]),
      },
    ];
  },

  async transactions(sp, user) {
    const filters = {
      type: sp.get("type") || "",
      status: sp.get("status") || "",
      from: sp.get("from") || "",
      to: sp.get("to") || "",
      all: true,
      sort: "date",
      dir: "desc",
      // Staff hanya boleh mengekspor transaksi yang mereka buat sendiri
      createdBy: user.role === "staff" ? user.id : undefined,
    };
    const { rows } = await listTransactions(filters);
    const ids = rows.map((r) => r.id);
    const { rows: items } = ids.length
      ? await query(
          `SELECT t.trx_number, t.type, t.status, p.sku, p.name, i.quantity, p.unit
             FROM transaction_items i JOIN transactions t ON t.id = i.transaction_id JOIN products p ON p.id = i.product_id
            WHERE t.id = ANY($1::int[]) ORDER BY t.trx_date DESC, t.id DESC, i.id`,
          [ids]
        )
      : { rows: [] };
    return [
      {
        name: "Transaksi",
        columns: ["No. Transaksi", "Tipe", "Tanggal", "Supplier", "No. PO", "Customer", "Jumlah Item", "Total Qty", "Status", "Catatan", "Alasan Reject", "Dibuat Oleh", "Direview Oleh", "Waktu Review", "Waktu Shipped"].map((header) => ({ header })),
        rows: rows.map((t) => [t.trx_number, t.type === "IN" ? "Barang Masuk" : "Barang Keluar", d(t.trx_date), t.supplier_name, t.po_number, t.customer_name, t.item_count, t.total_qty, t.status, t.notes, t.reject_reason, t.created_by_name, t.reviewed_by_name, dt(t.reviewed_at), dt(t.shipped_at)]),
      },
      {
        name: "Detail Item",
        columns: ["No. Transaksi", "Tipe", "Status", "SKU", "Produk", "Quantity", "Unit"].map((header) => ({ header })),
        rows: items.map((i) => [i.trx_number, i.type, i.status, i.sku, i.name, i.quantity, i.unit]),
      },
    ];
  },

  async restock(sp) {
    const { rows } = await listRestockOrders({ status: sp.get("status") || "", all: true });
    const ids = rows.map((r) => r.id);
    const { rows: items } = ids.length
      ? await query(
          `SELECT r.po_number, p.sku, p.name, i.quantity, p.unit, p.purchase_price
             FROM restock_order_items i JOIN restock_orders r ON r.id = i.restock_order_id JOIN products p ON p.id = i.product_id
            WHERE r.id = ANY($1::int[]) ORDER BY r.id DESC, i.id`,
          [ids]
        )
      : { rows: [] };
    return [
      {
        name: "Restock Order",
        columns: ["No. PO", "Supplier", "Tanggal Order", "Expected Delivery", "Jumlah Item", "Total Qty", "Status", "Catatan", "Catatan Status", "Rating", "Feedback", "Dibuat Oleh"].map((header) => ({ header })),
        rows: rows.map((r) => [r.po_number, r.supplier_name, d(r.order_date), d(r.expected_date), r.item_count, r.total_qty, r.status, r.notes, r.status_note, r.rating, r.feedback, r.created_by_name]),
      },
      {
        name: "Detail Item",
        columns: ["No. PO", "SKU", "Produk", "Quantity", "Unit", "Harga Beli", "Subtotal"].map((header) => ({ header })),
        rows: items.map((i) => [i.po_number, i.sku, i.name, i.quantity, i.unit, i.purchase_price, i.quantity * i.purchase_price]),
      },
    ];
  },

  async categories() {
    const rows = await listCategories();
    return [
      {
        name: "Kategori",
        columns: ["Nama", "Deskripsi", "Jumlah Produk", "Total Stok"].map((header) => ({ header })),
        rows: rows.map((c) => [c.name, c.description, c.product_count, c.total_stock]),
      },
    ];
  },

  async suppliers(sp) {
    const rows = await listSuppliers({ status: sp.get("status") || "" });
    return [
      {
        name: "Supplier",
        columns: ["Perusahaan", "Nama PIC", "Email", "Telepon", "Alamat", "Status", "Tanggal Daftar", "Jumlah Order", "Rating Rata-rata"].map((header) => ({ header })),
        rows: rows.map((s) => [s.company_name, s.name, s.email, s.phone, s.address, s.status, d(s.created_at), s.order_count, s.avg_rating]),
      },
    ];
  },
};

// GET /api/export/:module?format=xlsx|csv&...filter
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { module } = await params;
  if (!BUILDERS[module]) return NextResponse.json({ error: "Modul tidak dikenal" }, { status: 404 });
  if (!EXPORTABLE[user.role]?.includes(module)) {
    return NextResponse.json({ error: "Anda tidak memiliki izin mengekspor modul ini" }, { status: 403 });
  }

  const sp = request.nextUrl.searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const sheets = await BUILDERS[module](sp, user);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `fashstock-${module}-${stamp}.${format}`;

  if (format === "csv") {
    const csv = buildCsv(sheets[0].columns, sheets[0].rows);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  const buf = buildXlsx(sheets);
  return new Response(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
