import "server-only";
import { query, queryOne } from "./db";
import { PAGE_SIZE } from "./constants";

/* =====================================================================
 * Query baca (SELECT) yang dipakai bersama oleh halaman, route handler,
 * dan fitur ekspor. Semua memakai raw SQL dengan parameter ($n).
 * ===================================================================== */

const STATUS_SQL = "stock_status(p.stock, p.min_stock, p.low_stock)";

function pageInfo(page, pageSize = PAGE_SIZE) {
  const p = Math.max(1, parseInt(page, 10) || 1);
  return { page: p, limit: pageSize, offset: (p - 1) * pageSize };
}

function finish(rows, page, limit) {
  const total = rows[0]?.total_count ?? 0;
  return { rows, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

/* ------------------------------ PRODUCTS ------------------------------ */

export async function listProducts({ q, category, status, sort = "name", dir = "asc", page = 1, all = false } = {}) {
  const where = ["p.deleted_at IS NULL"];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);
  }
  if (category) {
    params.push(parseInt(category, 10) || 0);
    where.push(`p.category_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    where.push(`${STATUS_SQL} = $${params.length}`);
  }
  const sortCol = { name: "p.name", stock: "p.stock", created: "p.created_at", sku: "p.sku" }[sort] ?? "p.name";
  const sortDir = dir === "desc" ? "DESC" : "ASC";

  const { page: pg, limit, offset } = pageInfo(page);
  let paging = "";
  if (!all) {
    params.push(limit, offset);
    paging = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.category_id, c.name AS category_name, p.description,
            p.purchase_price, p.selling_price, p.min_stock, p.low_stock, p.stock, p.unit,
            p.rack_location, p.created_at, p.updated_at,
            (p.image IS NOT NULL) AS has_image,
            ${STATUS_SQL} AS stock_status,
            COUNT(*) OVER() AS total_count
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where.join(" AND ")}
      ORDER BY ${sortCol} ${sortDir}, p.id ASC
      ${paging}`,
    params
  );
  return finish(rows, pg, all ? Math.max(rows.length, 1) : limit);
}

export async function getProduct(id) {
  const pid = parseInt(id, 10);
  if (!pid) return null;
  return queryOne(
    `SELECT p.id, p.sku, p.name, p.category_id, c.name AS category_name, p.description,
            p.purchase_price, p.selling_price, p.min_stock, p.low_stock, p.stock, p.unit,
            p.rack_location, p.created_at, p.updated_at,
            (p.image IS NOT NULL) AS has_image,
            ${STATUS_SQL} AS stock_status
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [pid]
  );
}

export async function getProductBySku(sku) {
  return queryOne(
    `SELECT p.id, p.sku, p.name, c.name AS category_name, p.stock, p.unit, p.rack_location,
            p.selling_price, (p.image IS NOT NULL) AS has_image, ${STATUS_SQL} AS stock_status
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
      WHERE UPPER(p.sku) = UPPER($1) AND p.deleted_at IS NULL`,
    [sku]
  );
}

/** Daftar ringkas produk untuk dropdown pada form transaksi/restock. */
export async function productOptions() {
  const { rows } = await query(
    `SELECT p.id, p.sku, p.name, p.stock, p.unit, ${STATUS_SQL} AS stock_status
       FROM products p
      WHERE p.deleted_at IS NULL
      ORDER BY p.name`
  );
  return rows;
}

export async function productRecentTransactions(productId, limit = 5) {
  const { rows } = await query(
    `SELECT t.id, t.trx_number, t.type, t.trx_date, t.status, ti.quantity,
            COALESCE(s.company_name, t.customer_name) AS party
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       LEFT JOIN users s ON s.id = t.supplier_id
      WHERE ti.product_id = $1
      ORDER BY t.trx_date DESC, t.created_at DESC
      LIMIT $2`,
    [productId, limit]
  );
  return rows;
}

/* ----------------------------- CATEGORIES ----------------------------- */

export async function listCategories({ q } = {}) {
  const params = [];
  let where = "";
  if (q) {
    params.push(`%${q}%`);
    where = "WHERE c.name ILIKE $1 OR c.description ILIKE $1";
  }
  const { rows } = await query(
    `SELECT c.id, c.name, c.description, (c.image IS NOT NULL) AS has_image, c.created_at, c.updated_at,
            COUNT(p.id) AS product_count,
            COALESCE(SUM(p.stock), 0) AS total_stock
       FROM categories c
       LEFT JOIN products p ON p.category_id = c.id AND p.deleted_at IS NULL
       ${where}
      GROUP BY c.id
      ORDER BY c.name`,
    params
  );
  return rows;
}

export async function getCategory(id) {
  const cid = parseInt(id, 10);
  if (!cid) return null;
  return queryOne(
    "SELECT id, name, description, (image IS NOT NULL) AS has_image FROM categories WHERE id = $1",
    [cid]
  );
}

export async function categoryOptions() {
  const { rows } = await query("SELECT id, name FROM categories ORDER BY name");
  return rows;
}

/* ------------------------------ SUPPLIERS ----------------------------- */

export async function supplierOptions() {
  const { rows } = await query(
    `SELECT id, name, company_name FROM users
      WHERE role = 'supplier' AND status = 'Approved'
      ORDER BY company_name`
  );
  return rows;
}

export async function listSuppliers({ status, q } = {}) {
  const where = ["u.role = 'supplier'"];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`u.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.name ILIKE $${params.length} OR u.company_name ILIKE $${params.length} OR u.email ILIKE $${params.length})`);
  }
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.company_name, u.phone, u.address, u.status, u.created_at, u.verified_at,
            v.name AS verified_by_name,
            (SELECT COUNT(*) FROM restock_orders r WHERE r.supplier_id = u.id) AS order_count,
            (SELECT ROUND(AVG(r.rating)::numeric, 1) FROM restock_orders r WHERE r.supplier_id = u.id AND r.rating IS NOT NULL) AS avg_rating
       FROM users u
       LEFT JOIN users v ON v.id = u.verified_by
      WHERE ${where.join(" AND ")}
      ORDER BY CASE u.status WHEN 'Pending' THEN 0 WHEN 'Approved' THEN 1 ELSE 2 END, u.created_at DESC`,
    params
  );
  return rows;
}

/* ---------------------------- TRANSACTIONS ---------------------------- */

export async function listTransactions(
  { type, status, from, to, party, q, sort = "date", dir = "desc", page = 1, createdBy, supplierId, all = false } = {}
) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll("$?", `$${params.length}`));
  };
  if (type === "IN" || type === "OUT") add("t.type = $?", type);
  if (status) add("t.status = $?", status);
  if (from) add("t.trx_date >= $?", from);
  if (to) add("t.trx_date <= $?", to);
  if (party) add("(s.company_name ILIKE $? OR t.customer_name ILIKE $?)", `%${party}%`);
  if (q) add("t.trx_number ILIKE $?", `%${q}%`);
  if (createdBy) add("t.created_by = $?", createdBy);
  if (supplierId) add("t.supplier_id = $?", supplierId);

  const sortCol = { date: "t.trx_date", number: "t.trx_number", created: "t.created_at", status: "t.status" }[sort] ?? "t.trx_date";
  const sortDir = dir === "asc" ? "ASC" : "DESC";
  const { page: pg, limit, offset } = pageInfo(page);
  let paging = "";
  if (!all) {
    params.push(limit, offset);
    paging = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await query(
    `SELECT t.id, t.trx_number, t.type, t.trx_date, t.status, t.notes, t.customer_name, t.reject_reason,
            t.supplier_id, s.company_name AS supplier_name, r.po_number,
            t.created_by, cu.name AS created_by_name, rv.name AS reviewed_by_name, t.reviewed_at, t.shipped_at, t.created_at,
            (SELECT COUNT(*) FROM transaction_items i WHERE i.transaction_id = t.id) AS item_count,
            (SELECT COALESCE(SUM(i.quantity), 0) FROM transaction_items i WHERE i.transaction_id = t.id) AS total_qty,
            COUNT(*) OVER() AS total_count
       FROM transactions t
       LEFT JOIN users s  ON s.id = t.supplier_id
       LEFT JOIN users cu ON cu.id = t.created_by
       LEFT JOIN users rv ON rv.id = t.reviewed_by
       LEFT JOIN restock_orders r ON r.id = t.restock_order_id
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY ${sortCol} ${sortDir}, t.id DESC
      ${paging}`,
    params
  );
  return finish(rows, pg, all ? Math.max(rows.length, 1) : limit);
}

export async function getTransaction(id) {
  const tid = parseInt(id, 10);
  if (!tid) return null;
  const trx = await queryOne(
    `SELECT t.*, s.company_name AS supplier_name, s.name AS supplier_pic, r.po_number,
            cu.name AS created_by_name, rv.name AS reviewed_by_name
       FROM transactions t
       LEFT JOIN users s  ON s.id = t.supplier_id
       LEFT JOIN users cu ON cu.id = t.created_by
       LEFT JOIN users rv ON rv.id = t.reviewed_by
       LEFT JOIN restock_orders r ON r.id = t.restock_order_id
      WHERE t.id = $1`,
    [tid]
  );
  if (!trx) return null;
  const { rows: items } = await query(
    `SELECT i.id, i.product_id, i.quantity, p.sku, p.name, p.unit, p.stock, p.purchase_price, p.selling_price,
            (p.deleted_at IS NOT NULL) AS product_deleted
       FROM transaction_items i
       JOIN products p ON p.id = i.product_id
      WHERE i.transaction_id = $1
      ORDER BY i.id`,
    [tid]
  );
  return { ...trx, items };
}

/* ------------------------------ RESTOCK ------------------------------- */

export async function listRestockOrders({ status, supplierId, q, page = 1, all = false, active = false, sort = "newest" } = {}) {
  const orderBy = ({ newest: "r.order_date DESC", oldest: "r.order_date ASC", supplier: "s.company_name ASC", qty_asc: "total_qty ASC", qty_desc: "total_qty DESC" })[sort] || "r.order_date DESC";
  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`r.status = $${params.length}`);
  }
  if (active) where.push("r.status IN ('Pending','Confirmed','In Transit')");
  if (supplierId) {
    params.push(supplierId);
    where.push(`r.supplier_id = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    where.push(`(r.po_number ILIKE $${params.length} OR s.company_name ILIKE $${params.length})`);
  }
  const { page: pg, limit, offset } = pageInfo(page);
  let paging = "";
  if (!all) {
    params.push(limit, offset);
    paging = `LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }
  const { rows } = await query(
    `SELECT r.id, r.po_number, r.supplier_id, s.company_name AS supplier_name, r.order_date, r.expected_date,
            r.notes, r.status, r.status_note, r.rating, r.feedback, r.created_at, r.updated_at,
            m.name AS created_by_name,
            (SELECT COUNT(*) FROM restock_order_items i WHERE i.restock_order_id = r.id) AS item_count,
            (SELECT COALESCE(SUM(i.quantity), 0) FROM restock_order_items i WHERE i.restock_order_id = r.id) AS total_qty,
            COUNT(*) OVER() AS total_count
       FROM restock_orders r
       JOIN users s ON s.id = r.supplier_id
       JOIN users m ON m.id = r.created_by
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY ${orderBy}, r.id DESC
      ${paging}`,
    params
  );
  return finish(rows, pg, all ? Math.max(rows.length, 1) : limit);
}

export async function getRestockOrder(id) {
  const rid = parseInt(id, 10);
  if (!rid) return null;
  const order = await queryOne(
    `SELECT r.*, s.company_name AS supplier_name, s.name AS supplier_pic, s.phone AS supplier_phone,
            s.email AS supplier_email, m.name AS created_by_name
       FROM restock_orders r
       JOIN users s ON s.id = r.supplier_id
       JOIN users m ON m.id = r.created_by
      WHERE r.id = $1`,
    [rid]
  );
  if (!order) return null;
  const [{ rows: items }, { rows: logs }, { rows: incoming }] = await Promise.all([
    query(
      `SELECT i.id, i.product_id, i.quantity, p.sku, p.name, p.unit, p.stock, p.purchase_price
         FROM restock_order_items i JOIN products p ON p.id = i.product_id
        WHERE i.restock_order_id = $1 ORDER BY i.id`,
      [rid]
    ),
    query(
      `SELECT l.status, l.note, l.changed_at, u.name AS changed_by_name
         FROM restock_status_logs l LEFT JOIN users u ON u.id = l.changed_by
        WHERE l.restock_order_id = $1 ORDER BY l.changed_at, l.id`,
      [rid]
    ),
    query(
      `SELECT id, trx_number, status, trx_date FROM transactions
        WHERE restock_order_id = $1 ORDER BY created_at DESC`,
      [rid]
    ),
  ]);
  return { ...order, items, logs, incoming };
}

/** PO siap dicatat setelah pemeriksaan selesai, termasuk PO lama yang sudah Received. */
export async function availableReceivedOrders(includeId = null) {
  const { rows } = await query(
    `SELECT r.id, r.po_number, r.supplier_id, s.company_name AS supplier_name
       FROM restock_orders r
       JOIN users s ON s.id = r.supplier_id
      WHERE (r.status = 'Received' OR (r.status = 'Inspecting' AND r.inspection_result = 'Passed'))
        AND (r.id = $1 OR NOT EXISTS (
              SELECT 1 FROM transactions t
               WHERE t.restock_order_id = r.id AND t.status <> 'Rejected'))
      ORDER BY r.updated_at DESC`,
    [includeId]
  );
  return rows;
}
