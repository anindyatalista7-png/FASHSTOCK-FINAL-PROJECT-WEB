import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getProduct, productRecentTransactions } from "@/lib/data";
import { can } from "@/lib/permissions";
import { deleteProduct } from "@/actions/products";
import { fmtDate, fmtDateTime, num, rupiah } from "@/lib/format";
import { Card, EmptyState, InfoRow, PageHeader, StockBadge, TrxStatusBadge, TypeBadge } from "@/components/ui";
import ActionForm from "@/components/client/ActionForm";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const p = await getProduct(id);
  return { title: p ? p.name : "Produk" };
}

export default async function ProductDetailPage({ params }) {
  const user = await requireUser(["admin", "manager", "staff"]);
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();
  const history = await productRecentTransactions(product.id, 5);
  const manage = can.manageProducts(user);
  const lowStock = product.stock_status !== "Normal";
  const margin = product.selling_price - product.purchase_price;

  const stockBar = Math.min(100, (product.stock / Math.max(product.low_stock * 2, 1)) * 100);
  const barColor = {
    "Out of Stock": "bg-stone-400",
    Severe: "bg-red-500",
    Low: "bg-yellow-400",
    Normal: "bg-emerald-500",
  }[product.stock_status];

  return (
    <>
      <PageHeader
        title={product.name}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="sku">{product.sku}</span> · {product.category_name}</span>}
        back="/products"
        actions={
          <>
            {user.role === "manager" && lowStock && (
              <Link href={`/restock/new?product=${product.id}`} className="btn btn-accent">
                <Icon name="truck" className="h-4 w-4" /> Create Restock Order
              </Link>
            )}
            {manage && (
              <Link href={`/products/${product.id}/edit`} className="btn btn-outline">
                <Icon name="edit" className="h-4 w-4" /> Edit
              </Link>
            )}
            {manage && (
              <ActionForm
                action={deleteProduct.bind(null, product.id)}
                className="contents"
                confirmMessage={
                  product.stock > 0
                    ? `PERINGATAN: produk "${product.name}" masih memiliki stok ${product.stock} ${product.unit}.\nTetap hapus produk ini?`
                    : `Hapus produk "${product.name}"?`
                }
              >
                <input type="hidden" name="confirm_stock" value="1" />
                <SubmitButton className="btn btn-outline text-red-600 hover:border-red-300 hover:bg-red-50" pendingText="Menghapus...">
                  <Icon name="trash" className="h-4 w-4" /> Hapus
                </SubmitButton>
              </ActionForm>
            )}
          </>
        }
      />

      {lowStock && (
        <div className={`mb-6 flex items-start gap-3 rounded-2xl border p-4 text-sm ${product.stock_status === "Low" ? "border-yellow-200 bg-yellow-50 text-yellow-900" : product.stock_status === "Severe" ? "border-red-200 bg-red-50 text-red-900" : "border-stone-300 bg-stone-200/60 text-stone-800"}`}>
          <Icon name="alert" className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Stok produk ini berstatus <b>{product.stock_status}</b> ({num(product.stock)} {product.unit}).
            {user.role === "manager" ? " Pertimbangkan untuk membuat restock order ke supplier." : " Segera informasikan ke Warehouse Manager."}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <div className="card overflow-hidden">
            <div className="grid aspect-square place-items-center bg-stone-100">
              {product.has_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/images/products/${product.id}`} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <Icon name="box" className="h-20 w-20 text-stone-300" strokeWidth={1.2} />
              )}
            </div>
            <div className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Stok saat ini</p>
                  <p className="text-3xl font-extrabold tabular-nums text-ink">{num(product.stock)} <span className="text-base font-semibold text-stone-500">{product.unit}</span></p>
                </div>
                <StockBadge status={product.stock_status} />
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
                <div className={`h-full rounded-full ${barColor}`} style={{ width: `${stockBar}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[11px] font-medium text-stone-500">
                <span>Min (Severe): {product.min_stock}</span>
                <span>Low: {product.low_stock}</span>
              </div>
            </div>
          </div>

          <Card title="Barcode & QR Code" actions={<Link href={`/products/labels?ids=${product.id}`} className="btn btn-ghost btn-sm"><Icon name="printer" className="h-4 w-4" /> Cetak</Link>}>
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/qr/${encodeURIComponent(product.sku)}`} alt={`QR ${product.sku}`} className="h-24 w-24 shrink-0 rounded-lg border border-stone-200 bg-white p-1" />
              <div className="text-xs text-stone-500">
                <p className="sku text-sm text-ink">{product.sku}</p>
                <p className="mt-1">SKU digunakan sebagai identitas unik produk pada label.</p>
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/barcode/${encodeURIComponent(product.sku)}`} alt={`Barcode ${product.sku}`} className="mt-4 h-20 w-full rounded-lg border border-stone-200 bg-white object-contain p-2" />
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Informasi Lengkap">
            <dl>
              <InfoRow label="Nama">{product.name}</InfoRow>
              <InfoRow label="SKU"><span className="sku">{product.sku}</span></InfoRow>
              <InfoRow label="Kategori">{product.category_name}</InfoRow>
              <InfoRow label="Deskripsi"><span className="whitespace-pre-line">{product.description}</span></InfoRow>
              <InfoRow label="Harga Beli">{rupiah(product.purchase_price)}</InfoRow>
              <InfoRow label="Harga Jual">
                {rupiah(product.selling_price)}{" "}
                <span className="ml-1 text-xs text-emerald-600">(margin {rupiah(margin)})</span>
              </InfoRow>
              <InfoRow label="Nilai Stok">{rupiah(product.stock * product.purchase_price)}</InfoRow>
              <InfoRow label="Lokasi Rak"><span className="sku rounded bg-stone-100 px-2 py-1">{product.rack_location}</span></InfoRow>
              <InfoRow label="Ditambahkan">{fmtDateTime(product.created_at)}</InfoRow>
              <InfoRow label="Diperbarui">{fmtDateTime(product.updated_at)}</InfoRow>
            </dl>
          </Card>

          <Card title="5 Transaksi Terakhir" bodyClass="p-0">
            {history.length === 0 ? (
              <EmptyState title="Belum ada transaksi" message="Produk ini belum pernah masuk atau keluar gudang." />
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr><th>No. Transaksi</th><th>Tipe</th><th>Tanggal</th><th>Supplier / Customer</th><th className="text-right">Qty</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {history.map((t) => (
                      <tr key={t.id}>
                        <td><Link href={`/transactions/${t.id}`} className="sku font-semibold text-ink hover:underline">{t.trx_number}</Link></td>
                        <td><TypeBadge type={t.type} /></td>
                        <td className="whitespace-nowrap text-stone-600">{fmtDate(t.trx_date)}</td>
                        <td className="text-stone-600">{t.party}</td>
                        <td className={`text-right font-bold tabular-nums ${t.type === "IN" ? "text-emerald-600" : "text-orange-600"}`}>{t.type === "IN" ? "+" : "−"}{num(t.quantity)}</td>
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
