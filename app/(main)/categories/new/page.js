import { requireUser } from "@/lib/auth";
import { createCategory } from "@/actions/categories";
import { PageHeader } from "@/components/ui";
import CategoryForm from "@/components/client/CategoryForm";

export const metadata = { title: "Tambah Kategori" };

export default async function NewCategoryPage() {
  await requireUser(["admin", "manager"]);
  return (
    <>
      <PageHeader title="Tambah Kategori" subtitle="Nama kategori harus unik." back="/categories" />
      <CategoryForm action={createCategory} />
    </>
  );
}
