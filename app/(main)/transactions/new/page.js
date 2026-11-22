import { requireUser } from "@/lib/auth";
import { availableReceivedOrders, productOptions, supplierOptions } from "@/lib/data";
import { createTransaction } from "@/actions/transactions";
import { todayISO } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import TransactionForm from "@/components/client/TransactionForm";

export const metadata = { title: "Transaksi Baru" };

export default async function NewTransactionPage({ searchParams }) {
  await requireUser(["manager", "staff"]);
  const sp = await searchParams;
  const type = sp.type === "OUT" ? "OUT" : "IN";
  const [products, suppliers, receivedOrders] = await Promise.all([
    productOptions(),
    type === "IN" ? supplierOptions() : [],
    type === "IN" ? availableReceivedOrders() : [],
  ]);
  const presetPo = receivedOrders.some((o) => String(o.id) === String(sp.po)) ? String(sp.po) : "";

  return (
    <>
      <PageHeader
        title={type === "IN" ? "Barang Masuk" : "Barang Keluar"}
        subtitle={type === "IN" ? "Catat penerimaan barang dari supplier." : "Catat pengiriman barang ke customer."}
        back={`/transactions?type=${type}`}
      />
      <TransactionForm
        key={type}
        type={type}
        action={createTransaction.bind(null, type)}
        products={products}
        suppliers={suppliers}
        receivedOrders={receivedOrders}
        defaultDate={todayISO()}
        presetProductId={sp.product ?? ""}
        presetPoId={presetPo}
        cancelHref={`/transactions?type=${type}`}
      />
    </>
  );
}
