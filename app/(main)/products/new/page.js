import { requireUser } from "@/lib/auth";
import { categoryOptions } from "@/lib/data";
import { createProduct } from "@/actions/products";
import { PageHeader } from "@/components/ui";
import ProductForm from "@/components/client/ProductForm";

export const metadata = { title: "Tambah Produk" };

export default async function NewProductPage() {
  await requireUser(["admin", "manager"]);
  const categories = await categoryOptions();
  return (
    <>
      <PageHeader title="Tambah Produk" subtitle="Semua field wajib diisi. SKU harus unik." back="/products" />
      <ProductForm action={createProduct} categories={categories} cancelHref="/products" />
    </>
  );
}
