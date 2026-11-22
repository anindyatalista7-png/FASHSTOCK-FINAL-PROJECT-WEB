import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCategories } from "@/lib/data";
import { deleteCategory } from "@/actions/categories";
import { num } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/ui";
import ActionForm from "@/components/client/ActionForm";
import SubmitButton from "@/components/client/SubmitButton";
import Icon from "@/components/Icon";

export const metadata = { title: "Kategori" };

export default async function CategoriesPage({ searchParams }) {
  const user = await requireUser(["admin", "manager"]);
  const sp = await searchParams;
  const q = sp.q?.trim() || "";
  const categories = await listCategories({ q });

  return (
    <>
      <PageHeader
        title="Kategori Produk"
        subtitle={`${categories.length} kategori tersedia.`}
        actions={
          <>
            {user.role === "admin" && (
              <a href="/api/export/categories?format=xlsx" className="btn btn-outline"><Icon name="download" className="h-4 w-4" /> Excel</a>
            )}
            <Link href="/categories/new" className="btn btn-primary"><Icon name="plus" className="h-4 w-4" /> Tambah Kategori</Link>
          </>
        }
      />
      <form method="GET" className="mb-5 flex max-w-md gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input name="q" defaultValue={q} placeholder="Cari kategori..." className="input pl-10" />
        </div>
        <button className="btn btn-primary">Cari</button>
      </form>

      {categories.length === 0 ? (
        <div className="card"><EmptyState title="Kategori tidak ditemukan" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((c) => (
            <article key={c.id} className="card flex flex-col overflow-hidden">
              <div className="relative h-36 bg-stone-200">
                {c.has_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/images/categories/${c.id}`} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center bg-[repeating-linear-gradient(45deg,#e7e5e4_0_12px,#f5f5f4_12px_24px)]">
                    <Icon name="tag" className="h-10 w-10 text-stone-400" />
                  </div>
                )}
                <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur">
                  {c.product_count} produk
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold text-ink">{c.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-sm text-stone-500">{c.description}</p>
                <p className="mt-3 text-xs text-stone-500">Total stok: <b className="text-stone-700">{num(c.total_stock)}</b></p>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-4">
                  <Link href={`/products?category=${c.id}`} className="btn btn-ghost btn-sm">Lihat produk</Link>
                  <Link href={`/categories/${c.id}/edit`} className="btn btn-outline btn-sm"><Icon name="edit" className="h-3.5 w-3.5" /> Edit</Link>
                  {c.product_count > 0 ? (
                    <span className="ml-auto text-[11px] text-stone-400" title="Kategori yang memiliki produk tidak dapat dihapus">Tidak dapat dihapus</span>
                  ) : (
                    <ActionForm action={deleteCategory.bind(null, c.id)} confirmMessage={`Hapus kategori "${c.name}"?`} className="ml-auto">
                      <SubmitButton className="btn btn-sm text-red-600 hover:bg-red-50" pendingText="...">
                        <Icon name="trash" className="h-3.5 w-3.5" /> Hapus
                      </SubmitButton>
                    </ActionForm>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
