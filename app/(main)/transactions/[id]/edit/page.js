import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getTransaction, productOptions } from "@/lib/data";
import { updateTransaction } from "@/actions/transactions";
import { withMsg } from "@/lib/validation";
import { PageHeader } from "@/components/ui";
import TransactionForm from "@/components/client/TransactionForm";

export const metadata = { title: "Edit Transaksi" };

export default async function EditTransactionPage({ params }) {
  const user = await requireUser(["manager", "staff"]);
  const { id } = await params;
  const trx = await getTransaction(id);
  if (!trx) notFound();
  if (trx.status !== "Pending") redirect(withMsg(`/transactions/${trx.id}`, "Hanya transaksi Pending yang dapat diedit.", "err"));
  if (user.role === "staff" && trx.created_by !== user.id)
    redirect(withMsg(`/transactions/${trx.id}`, "Anda hanya dapat mengedit transaksi yang Anda buat.", "err"));
  const products = await productOptions();

  return (
    <>
      <PageHeader title={`Edit ${trx.trx_number}`} subtitle="Field yang dapat diubah: produk, quantity, dan catatan." back={`/transactions/${trx.id}`} />
      <TransactionForm type={trx.type} action={updateTransaction.bind(null, trx.id)} products={products} trx={trx} cancelHref={`/transactions/${trx.id}`} />
    </>
  );
}
