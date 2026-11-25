import { Suspense } from "react";
import Sidebar from "@/components/client/Sidebar";
import Flash from "@/components/client/Flash";
import { requireUser } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { ROLES } from "@/lib/constants";

async function buildNav(user) {
  const c = await queryOne(
    `SELECT
       (SELECT COUNT(*) FROM transactions WHERE status = 'Pending')                                   AS pending_trx,
       (SELECT COUNT(*) FROM users WHERE role = 'supplier' AND status = 'Pending')                    AS pending_sup,
       (SELECT COUNT(*) FROM restock_orders WHERE status = 'Pending' AND supplier_id = $1)            AS supplier_pending,
       (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL
          AND stock_status(stock, min_stock, low_stock) IN ('Out of Stock','Severe'))               AS critical`,
    [user.id]
  );

  const items = {
    dashboard: { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
    products: { href: "/products", label: "Produk", icon: "box", count: user.role !== "staff" ? c.critical : 0 },
    categories: { href: "/categories", label: "Kategori", icon: "tag" },
    transactions: { href: "/transactions", label: "Transaksi", icon: "swap", count: user.role === "manager" ? c.pending_trx : 0 },
    restock: { href: "/restock", label: user.role === "supplier" ? "Restock Order" : "Restock", icon: "truck", count: user.role === "supplier" ? c.supplier_pending : 0 },
    suppliers: { href: "/suppliers", label: "Supplier", icon: "users", count: c.pending_sup },
    history: { href: "/history", label: "Riwayat Transaksi", icon: "history" },
    export: { href: "/export", label: "Ekspor Data", icon: "download" },
  };
  const byRole = {
    admin: ["dashboard", "products", "categories", "transactions", "restock", "suppliers", "export"],
    manager: ["dashboard", "products", "categories", "transactions", "restock", "export"],
    staff: ["dashboard", "products", "transactions", "restock", "export"],
    supplier: ["dashboard", "restock", "history"],
  };
  return byRole[user.role].map((k) => items[k]);
}

export default async function MainLayout({ children }) {
  const user = await requireUser();
  const nav = await buildNav(user);

  return (
    <div className="min-h-screen">
      <Sidebar nav={nav} user={{ name: user.name }} roleLabel={user.role === "supplier" ? user.company_name : ROLES[user.role]} />
      <Suspense>
        <Flash />
      </Suspense>
      <main className="lg:pl-64 print:pl-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
