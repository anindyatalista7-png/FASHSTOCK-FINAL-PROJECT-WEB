import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { listRestockOrders, listSuppliers, listTransactions, productOptions, supplierOptions, availableReceivedOrders } from "@/lib/data";
import { approveTransaction, createTransaction } from "@/actions/transactions";
import { confirmRestockOrder } from "@/actions/restock";
import { fmtDate, fmtDateTime, num, rupiah, todayISO } from "@/lib/format";
import { Card, EmptyState, RestockStatusBadge, Stars, StatCard, StockBadge, TrxStatusBadge, TypeBadge } from "@/components/ui";
import SupplierDecision from "@/components/SupplierDecision";
import ActionForm from "@/components/client/ActionForm";
import SubmitButton from "@/components/client/SubmitButton";
import QuickEntryForm from "@/components/client/QuickEntryForm";
import Icon from "@/components/Icon";

export const metadata = { title: "Dashboard" };

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function Hello({ user, children }) {
  return (
    <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-stone-500">{greeting()},</p>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{user.name}</h1>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

async function criticalProducts(statuses) {
  const { rows } = await query(
    `SELECT id, sku, name, stock, unit, min_stock, low_stock, rack_location,
            stock_status(stock, min_stock, low_stock) AS stock_status
       FROM products
      WHERE deleted_at IS NULL AND stock_status(stock, min_stock, low_stock) = ANY($1::text[])
      ORDER BY stock ASC, name
      LIMIT 8`,
    [statuses]
  );
  return rows;
}

/** Grafik batang sederhana barang masuk vs keluar 7 hari terakhir (stok yang sudah di-approve). */
async function weeklyMovement() {
  const { rows } = await query(
    `SELECT d::date AS day,
            COALESCE(SUM(i.quantity) FILTER (WHERE t.type = 'IN'), 0)  AS qty_in,
            COALESCE(SUM(i.quantity) FILTER (WHERE t.type = 'OUT'), 0) AS qty_out
       FROM generate_series(CURRENT_DATE - 6, CURRENT_DATE, INTERVAL '1 day') d
       LEFT JOIN transactions t ON t.trx_date = d::date AND t.status IN ('Approved','Shipped')
       LEFT JOIN transaction_items i ON i.transaction_id = t.id
      GROUP BY d ORDER BY d`
  );
  return rows.map((r) => ({ ...r, day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10) }));
}

function MovementChart({ data }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.qty_in, d.qty_out]));
  const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
  return (
    <div>
      <div className="flex h-40 items-end gap-2 sm:gap-4">
        {data.map((d) => (
          <div key={d.day} className="flex h-full flex-1 flex-col justify-end">
            <div className="flex h-full items-end justify-center gap-1">
              <div className="w-full max-w-4 rounded-t-md bg-emerald-500 transition-all" style={{ height: `${(d.qty_in / max) * 100}%`, minHeight: d.qty_in ? 4 : 0 }} title={`Masuk: ${d.qty_in}`} />
              <div className="w-full max-w-4 rounded-t-md bg-orange-400 transition-all" style={{ height: `${(d.qty_out / max) * 100}%`, minHeight: d.qty_out ? 4 : 0 }} title={`Keluar: ${d.qty_out}`} />
            </div>
            <p className="mt-2 text-center text-[10px] font-semibold text-stone-500">{days[new Date(d.day + "T00:00:00").getDay()]}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-4 text-xs text-stone-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Masuk ({num(data.reduce((s, d) => s + d.qty_in, 0))})</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-orange-400" /> Keluar ({num(data.reduce((s, d) => s + d.qty_out, 0))})</span>
      </div>
    </div>
  );
}

function CriticalList({ items, showRestock }) {
  if (items.length === 0) return <EmptyState title="Semua stok aman" message="Tidak ada produk dengan stok kritis." />;
  return (
    <ul className="divide-y divide-stone-100">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-3 px-5 py-3">
          <div className="min-w-0 flex-1">
            <Link href={`/products/${p.id}`} className="block truncate text-sm font-semibold text-ink hover:underline">{p.name}</Link>
            <p className="text-xs text-stone-500"><span className="sku">{p.sku}</span> · Rak {p.rack_location} · min {p.min_stock}</p>
          </div>
          <span className="text-sm font-bold tabular-nums">{num(p.stock)} <span className="text-xs font-normal text-stone-500">{p.unit}</span></span>
          <StockBadge status={p.stock_status} />
          {showRestock && (
            <Link href={`/restock/new?product=${p.id}`} className="btn btn-outline btn-sm hidden sm:inline-flex">Restock</Link>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ============================== ADMIN ============================== */

async function AdminDashboard({ user }) {
  const [stats, pendingSuppliers, critical, weekly] = await Promise.all([
    queryOne(
      `SELECT (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL) AS total_products,
              (SELECT COUNT(*) FROM transactions WHERE DATE_TRUNC('month', trx_date) = DATE_TRUNC('month', CURRENT_DATE)) AS trx_month,
              (SELECT COALESCE(SUM(stock * purchase_price), 0) FROM products WHERE deleted_at IS NULL) AS inventory_value,
              (SELECT COALESCE(SUM(stock * selling_price), 0) FROM products WHERE deleted_at IS NULL) AS retail_value,
              (SELECT COUNT(*) FROM categories) AS categories,
              (SELECT COUNT(*) FROM users WHERE role = 'supplier' AND status = 'Approved') AS active_suppliers`
    ),
    listSuppliers({ status: "Pending" }),
    criticalProducts(["Severe", "Out of Stock"]),
    weeklyMovement(),
  ]);
  const modules = [
    ["/products", "box", "Produk", "Kelola produk & stok"],
    ["/categories", "tag", "Kategori", "Kelompok produk"],
    ["/transactions", "swap", "Transaksi", "Monitoring keluar-masuk"],
    ["/restock", "truck", "Restock", "Purchase order supplier"],
    ["/suppliers", "users", "Supplier", "Verifikasi & performa"],
    ["/export", "download", "Ekspor", "Unduh Excel / CSV"],
  ];

  return (
    <>
      <Hello user={user}>
        <Link href="/products/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Produk</Link>
      </Hello>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Produk" value={num(stats.total_products)} hint={`${stats.categories} kategori`} icon="box" tone="dark" href="/products" />
        <StatCard label="Transaksi Bulan Ini" value={num(stats.trx_month)} hint="Barang masuk & keluar" icon="swap" href="/transactions" />
        <StatCard label="Nilai Inventori" value={rupiah(stats.inventory_value)} hint={`Nilai jual ${rupiah(stats.retail_value)}`} icon="coins" tone="amber" />
        <StatCard label="Supplier Pending" value={num(pendingSuppliers.length)} hint={`${stats.active_suppliers} supplier aktif`} icon="users" tone={pendingSuppliers.length ? "red" : "light"} href="/suppliers?status=Pending" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title={`Supplier Menunggu Approval (${pendingSuppliers.length})`} bodyClass="p-0" actions={<Link href="/suppliers" className="text-xs font-bold text-stone-500 hover:text-ink">Lihat semua →</Link>}>
          {pendingSuppliers.length === 0 ? (
            <EmptyState title="Tidak ada pendaftaran baru" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {pendingSuppliers.map((s) => (
                <li key={s.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{s.company_name}</p>
                    <p className="truncate text-xs text-stone-500">{s.name} · {s.email} · daftar {fmtDate(s.created_at)}</p>
                  </div>
                  <SupplierDecision supplier={s} from="dashboard" />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Pergerakan Stok 7 Hari"><MovementChart data={weekly} /></Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <Card title="⚠ Alert: Stok Severe & Out of Stock" bodyClass="p-0" actions={<Link href="/products?status=Severe" className="text-xs font-bold text-stone-500 hover:text-ink">Lihat →</Link>}>
          <CriticalList items={critical} />
        </Card>
        <Card title="Akses Cepat">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {modules.map(([href, icon, label, desc]) => (
              <Link key={href} href={href} className="group rounded-xl border border-stone-200 p-3 transition hover:border-ink hover:bg-stone-50">
                <Icon name={icon} className="mb-2 h-5 w-5 text-stone-500 group-hover:text-ink" />
                <p className="text-sm font-bold text-ink">{label}</p>
                <p className="text-[11px] leading-tight text-stone-500">{desc}</p>
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* ============================= MANAGER ============================= */

async function ManagerDashboard({ user }) {
  const [stats, pending, critical, restocks] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) AS total_items,
              COALESCE(SUM(stock), 0) AS total_units,
              COUNT(*) FILTER (WHERE stock_status(stock, min_stock, low_stock) <> 'Normal') AS alerts,
              COUNT(*) FILTER (WHERE stock_status(stock, min_stock, low_stock) = 'Out of Stock') AS oos
         FROM products WHERE deleted_at IS NULL`
    ),
    listTransactions({ status: "Pending", sort: "created", dir: "asc" }),
    criticalProducts(["Low", "Severe", "Out of Stock"]),
    listRestockOrders({ active: true }),
  ]);

  return (
    <>
      <Hello user={user}>
        <Link href="/restock/new" className="btn btn-primary"><Icon name="truck" className="h-4 w-4" /> Restock Order</Link>
      </Hello>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total Item" value={num(stats.total_items)} hint={`${num(stats.total_units)} unit di gudang`} icon="box" tone="dark" href="/products" />
        <StatCard label="Low Stock Alerts" value={num(stats.alerts)} hint={`${stats.oos} produk habis`} icon="alert" tone={stats.alerts ? "red" : "light"} href="/products?status=Low" />
        <StatCard label="Perlu Approval" value={num(pending.total)} hint="Transaksi Pending" icon="clock" tone="amber" href="/transactions?status=Pending" />
        <StatCard label="Restock Berjalan" value={num(restocks.total)} hint="Pending · Confirmed · In Transit" icon="truck" href="/restock" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title={`Transaksi Menunggu Approval (${pending.total})`} bodyClass="p-0">
          {pending.rows.length === 0 ? (
            <EmptyState title="Tidak ada transaksi pending" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {pending.rows.map((t) => (
                <li key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link>
                      <TypeBadge type={t.type} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {t.type === "IN" ? t.supplier_name : t.customer_name} · {t.item_count} item · qty {num(t.total_qty)} · oleh {t.created_by_name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <ActionForm action={approveTransaction.bind(null, t.id)} confirmMessage={`Approve ${t.trx_number}? Stok akan diperbarui.`}>
                      <input type="hidden" name="redirect_to" value="dashboard" />
                      <SubmitButton className="btn btn-success btn-sm" pendingText="...">Approve</SubmitButton>
                    </ActionForm>
                    <Link href={`/transactions/${t.id}`} className="btn btn-outline btn-sm">Tinjau / Reject</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Restock Order Berjalan" bodyClass="p-0" actions={<Link href="/restock" className="text-xs font-bold text-stone-500 hover:text-ink">Semua →</Link>}>
          {restocks.rows.length === 0 ? (
            <EmptyState title="Tidak ada order berjalan" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {restocks.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/restock/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="sku font-semibold text-ink">{r.po_number}</p>
                      <p className="truncate text-xs text-stone-500">{r.supplier_name} · expected {fmtDate(r.expected_date)}</p>
                    </div>
                    <RestockStatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6" title="Low Stock Alerts" bodyClass="p-0" actions={<Link href="/products?sort=stock" className="text-xs font-bold text-stone-500 hover:text-ink">Semua produk →</Link>}>
        <CriticalList items={critical} showRestock />
      </Card>
    </>
  );
}

/* ============================== STAFF ============================== */

async function StaffDashboard({ user }) {
  const [products, suppliers, todayRows, received, mine] = await Promise.all([
    productOptions(),
    supplierOptions(),
    query(
      `SELECT t.id, t.trx_number, t.type, t.status, t.created_at, t.customer_name, s.company_name AS supplier_name, u.name AS created_by_name,
              (SELECT COALESCE(SUM(quantity), 0) FROM transaction_items i WHERE i.transaction_id = t.id) AS total_qty
         FROM transactions t
         LEFT JOIN users s ON s.id = t.supplier_id
         JOIN users u ON u.id = t.created_by
        WHERE t.trx_date = CURRENT_DATE OR t.created_at::date = CURRENT_DATE
        ORDER BY t.created_at DESC`
    ),
    availableReceivedOrders(),
    queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
              COUNT(*) FILTER (WHERE type = 'OUT' AND status = 'Approved') AS to_ship
         FROM transactions WHERE created_by = $1`,
      [user.id]
    ),
  ]);
  const today = todayISO();

  return (
    <>
      <Hello user={user}>
        <Link href="/transactions/new?type=IN" className="btn btn-outline"><Icon name="arrowIn" className="h-4 w-4" /> Barang Masuk</Link>
        <Link href="/transactions/new?type=OUT" className="btn btn-primary"><Icon name="arrowOut" className="h-4 w-4" /> Barang Keluar</Link>
      </Hello>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Transaksi Hari Ini" value={num(todayRows.rows.length)} icon="swap" tone="dark" />
        <StatCard label="Milik Saya: Pending" value={num(mine.pending)} hint="Menunggu approval" icon="clock" href="/transactions?status=Pending&mine=1" />
        <StatCard label="Siap Dikirim" value={num(mine.to_ship)} hint="Approved, tandai Shipped" icon="truck" tone="amber" href="/transactions?type=OUT&status=Approved&mine=1" />
        <StatCard label="PO Siap Diterima" value={num(received.length)} hint="Status Received" icon="arrowIn" href="/transactions/new?type=IN" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[380px_1fr]">
        <Card title="Quick Entry Transaksi">
          <QuickEntryForm actionIn={createTransaction.bind(null, "IN")} actionOut={createTransaction.bind(null, "OUT")} products={products} suppliers={suppliers} today={today} />
        </Card>

        <div className="space-y-6">
          {received.length > 0 && (
            <Card title="Restock Order Received — Belum Dicatat" bodyClass="p-0">
              <ul className="divide-y divide-stone-100">
                {received.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div>
                      <p className="sku font-semibold text-ink">{o.po_number}</p>
                      <p className="text-xs text-stone-500">{o.supplier_name}</p>
                    </div>
                    <Link href={`/transactions/new?type=IN&po=${o.id}`} className="btn btn-success btn-sm"><Icon name="arrowIn" className="h-3.5 w-3.5" /> Catat Barang Masuk</Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title={`Transaksi Hari Ini · ${fmtDate(today)}`} bodyClass="p-0">
            {todayRows.rows.length === 0 ? (
              <EmptyState title="Belum ada transaksi hari ini" />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>No.</th><th>Tipe</th><th>Supplier / Customer</th><th className="text-right">Qty</th><th>Oleh</th><th>Status</th></tr></thead>
                  <tbody>
                    {todayRows.rows.map((t) => (
                      <tr key={t.id}>
                        <td><Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link><p className="text-[11px] text-stone-400">{fmtDateTime(t.created_at).split(", ")[1]}</p></td>
                        <td><TypeBadge type={t.type} /></td>
                        <td className="text-stone-700">{t.type === "IN" ? t.supplier_name : t.customer_name}</td>
                        <td className="text-right font-bold tabular-nums">{num(t.total_qty)}</td>
                        <td className="text-stone-600">{t.created_by_name}</td>
                        <td><TrxStatusBadge status={t.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}

/* ============================= SUPPLIER ============================ */

async function SupplierDashboard({ user }) {
  const [stats, toConfirm, history] = await Promise.all([
    queryOne(
      `SELECT COUNT(*) FILTER (WHERE status = 'Pending') AS pending,
              COUNT(*) FILTER (WHERE status IN ('Confirmed','In Transit')) AS in_progress,
              COUNT(*) FILTER (WHERE status = 'Received') AS received,
              ROUND(AVG(rating)::numeric, 1) AS avg_rating
         FROM restock_orders WHERE supplier_id = $1`,
      [user.id]
    ),
    listRestockOrders({ supplierId: user.id, status: "Pending", all: true }),
    query(
      `SELECT r.id, r.po_number, r.status, r.expected_date, r.rating, r.updated_at,
              (SELECT COALESCE(SUM(quantity), 0) FROM restock_order_items i WHERE i.restock_order_id = r.id) AS total_qty,
              (SELECT MAX(changed_at) FROM restock_status_logs l WHERE l.restock_order_id = r.id AND l.status = 'In Transit') AS shipped_at,
              (SELECT MAX(changed_at) FROM restock_status_logs l WHERE l.restock_order_id = r.id AND l.status = 'Received') AS received_at
         FROM restock_orders r
        WHERE r.supplier_id = $1 AND r.status IN ('In Transit', 'Received')
        ORDER BY r.updated_at DESC LIMIT 10`,
      [user.id]
    ),
  ]);

  return (
    <>
      <Hello user={user}>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-stone-600 ring-1 ring-stone-200">{user.company_name}</span>
      </Hello>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Perlu Konfirmasi" value={num(stats.pending)} icon="clock" tone={stats.pending ? "amber" : "light"} href="/restock?status=Pending" />
        <StatCard label="Sedang Diproses" value={num(stats.in_progress)} hint="Confirmed · In Transit" icon="truck" tone="dark" />
        <StatCard label="Terkirim" value={num(stats.received)} hint="Received oleh gudang" icon="check" href="/restock?status=Received" />
        <StatCard label="Rating Rata-rata" value={stats.avg_rating ? `${stats.avg_rating} / 5` : "-"} icon="star" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title={`Restock Order Perlu Dikonfirmasi (${toConfirm.rows.length})`} bodyClass="p-0">
          {toConfirm.rows.length === 0 ? (
            <EmptyState title="Tidak ada order baru" message="Order baru dari gudang akan muncul di sini." />
          ) : (
            <ul className="divide-y divide-stone-100">
              {toConfirm.rows.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/restock/${r.id}`} className="sku font-semibold text-ink hover:underline">{r.po_number}</Link>
                    <p className="text-xs text-stone-500">{r.item_count} produk · qty {num(r.total_qty)} · kirim sebelum {fmtDate(r.expected_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <ActionForm action={confirmRestockOrder.bind(null, r.id)} confirmMessage={`Konfirmasi ${r.po_number}?`}>
                      <input type="hidden" name="redirect_to" value="dashboard" />
                      <SubmitButton className="btn btn-success btn-sm" pendingText="...">Konfirmasi</SubmitButton>
                    </ActionForm>
                    <Link href={`/restock/${r.id}`} className="btn btn-outline btn-sm">Detail / Tolak</Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Riwayat Pengiriman ke Gudang" bodyClass="p-0" actions={<Link href="/history" className="text-xs font-bold text-stone-500 hover:text-ink">Transaksi →</Link>}>
          {history.rows.length === 0 ? (
            <EmptyState title="Belum ada pengiriman" />
          ) : (
            <ul className="divide-y divide-stone-100">
              {history.rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/restock/${r.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-stone-50">
                    <div className="min-w-0">
                      <p className="sku font-semibold text-ink">{r.po_number}</p>
                      <p className="text-xs text-stone-500">
                        Dikirim {r.shipped_at ? fmtDate(r.shipped_at) : "-"}
                        {r.received_at && ` · diterima ${fmtDate(r.received_at)}`} · qty {num(r.total_qty)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <RestockStatusBadge status={r.status} />
                      {r.rating && <Stars value={r.rating} className="h-3 w-3" />}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role === "admin") return <AdminDashboard user={user} />;
  if (user.role === "manager") return <ManagerDashboard user={user} />;
  if (user.role === "staff") return <StaffDashboard user={user} />;
  return <SupplierDashboard user={user} />;
}
