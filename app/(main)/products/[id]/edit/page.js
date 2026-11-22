import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { categoryOptions, getProduct } from "@/lib/data";
import { updateProduct } from "@/actions/products";
import { PageHeader } from "@/components/ui";
import ProductForm from "@/components/client/ProductForm";

export const metadata = { title: "Edit Produk" };

export default async function EditProductPage({ params }) {
  await requireUser(["admin", "manager"]);
  const { id } = await params;
  const [product, categories] = await Promise.all([getProduct(id), categoryOptions()]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Edit ${product.name}`} subtitle="Semua field dapat diubah kecuali SKU." back={`/products/${product.id}`} />
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} categories={categories} cancelHref={`/products/${product.id}`} />
    </>
  );
}
