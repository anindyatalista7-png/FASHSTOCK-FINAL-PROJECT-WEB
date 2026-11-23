import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { supplierOptions } from "@/lib/data";
import { createRestockOrder } from "@/actions/restock";
import { todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import RestockForm from "@/components/client/RestockForm";

export const metadata = { title: "Buat Restock Order" };

export default async function NewRestockPage({ searchParams }) {
  await requireUser(["manager"]);
  const sp = await searchParams;
  const [{ rows: products }, suppliers] = await Promise.all([
    query(
      `SELECT id, sku, name, stock, unit, low_stock, stock_status(stock, min_stock, low_stock) AS stock_status
         FROM products WHERE deleted_at IS NULL
        ORDER BY CASE stock_status(stock, min_stock, low_stock) WHEN 'Out of Stock' THEN 0 WHEN 'Severe' THEN 1 WHEN 'Low' THEN 2 ELSE 3 END, name`
    ),
    supplierOptions(),
  ]);
  return (
    <>
      <PageHeader title="Buat Restock Order" subtitle="Purchase Order akan dikirim ke supplier untuk dikonfirmasi." back="/restock" />
      <RestockForm action={createRestockOrder} products={products} suppliers={suppliers} defaultDate={todayISO()} presetProductId={sp.product ?? ""} />
    </>
  );
}
