import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getCategory } from "@/lib/data";
import { updateCategory } from "@/actions/categories";
import { PageHeader } from "@/components/ui";
import CategoryForm from "@/components/client/CategoryForm";

export const metadata = { title: "Edit Kategori" };

export default async function EditCategoryPage({ params }) {
  await requireUser(["admin", "manager"]);
  const { id } = await params;
  const category = await getCategory(id);
  if (!category) notFound();
  return (
    <>
      <PageHeader title={`Edit ${category.name}`} back="/categories" />
      <CategoryForm action={updateCategory.bind(null, category.id)} category={category} />
    </>
  );
}
