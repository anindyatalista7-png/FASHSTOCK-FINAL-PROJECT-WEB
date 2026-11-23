import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import Scanner from "@/components/client/Scanner";
import Link from "next/link";
import Icon from "@/components/Icon";

export const metadata = { title: "Scan Barcode" };

export default async function ScanPage() {
  const user = await requireUser(["admin", "manager", "staff"]);
  return (
    <>
      <PageHeader
        title="Scan Barcode / QR"
        subtitle="Cari produk secepatnya dari label QR (berisi SKU) lalu lanjutkan ke transaksi."
        actions={<Link href="/products/labels" className="btn btn-outline"><Icon name="printer" className="h-4 w-4" /> Cetak Label</Link>}
      />
      <Scanner role={user.role} />
    </>
  );
}
