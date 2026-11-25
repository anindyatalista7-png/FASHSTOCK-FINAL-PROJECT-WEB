
import AutoFilterForm from "@/components/client/AutoFilterForm";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSuppliers } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { EmptyState, PageHeader, Stars, SupplierStatusBadge } from "@/components/ui";
import SupplierDecision from "@/components/SupplierDecision";
import Icon from "@/components/Icon";

export const metadata = { title: "Verifikasi Supplier" };

export default async function SuppliersPage({ searchParams }) {
  await requireUser(["admin"]);
  const sp = await searchParams;
  const status = ["Pending", "Approved", "Rejected"].includes(sp.status) ? sp.status : "";
  const q = sp.q?.trim() || "";
  const suppliers = await listSuppliers({ status, q });
  const pendingCount = (await listSuppliers({ status: "Pending" })).length;

  return (
    <>
      <PageHeader
        title="Supplier"
        subtitle="Verifikasi pendaftaran supplier dan pantau performanya."
        actions={
          <>
            <a href="/api/export/suppliers?format=xlsx" className="btn btn-outline">
              <Icon name="download" className="h-4 w-4" /> Excel
            </a>
            <a href="/api/export/suppliers?format=csv" className="btn btn-outline">
              CSV
            </a>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[
          ["", "Semua"],
          ["Pending", `Pending (${pendingCount})`],
          ["Approved", "Approved"],
          ["Rejected", "Rejected"]
        ].map(([s, label]) => (
          <Link
            key={label}
            href={`/suppliers${s ? `?status=${s}` : ""}`}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              status === s
                ? "bg-ink text-white"
                : "bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-stone-400"
            }`}
          >
            {label}
          </Link>
        ))}

        <AutoFilterForm className="ml-auto flex w-full gap-2 sm:w-auto">
          {status && (
            <input type="hidden" name="status" value={status} />
          )}

          <input
            name="q"
            defaultValue={q}
            placeholder="Cari nama / perusahaan / email"
            className="input py-2 sm:w-72"
          />

          <Link href="/suppliers" className="btn btn-ghost">
            Reset
          </Link>
        </AutoFilterForm>
      </div>

      {suppliers.length === 0 ? (
        <div className="card">
          <EmptyState title="Tidak ada supplier" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {suppliers.map((s) => (
            <article
              key={s.id}
              className={`card flex flex-col p-5 ${
                s.status === "Pending" ? "ring-2 ring-brand-300" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-ink">
                    {s.company_name}
                  </h3>
                  <p className="text-sm text-stone-500">
                    {s.name}
                  </p>
                </div>

                <SupplierStatusBadge status={s.status} />
              </div>

              <dl className="mt-4 flex-1 space-y-1.5 text-sm text-stone-600">
                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-semibold uppercase text-stone-400">
                    Email
                  </dt>
                  <dd className="truncate">{s.email}</dd>
                </div>

                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-semibold uppercase text-stone-400">
                    Telepon
                  </dt>
                  <dd>{s.phone}</dd>
                </div>

                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-semibold uppercase text-stone-400">
                    Alamat
                  </dt>
                  <dd className="line-clamp-2">{s.address}</dd>
                </div>

                <div className="flex gap-2">
                  <dt className="w-20 shrink-0 text-xs font-semibold uppercase text-stone-400">
                    Daftar
                  </dt>
                  <dd>{fmtDate(s.created_at)}</dd>
                </div>

                {s.status === "Approved" && (
                  <div className="flex items-center gap-2">
                    <dt className="w-20 shrink-0 text-xs font-semibold uppercase text-stone-400">
                      Rating
                    </dt>

                    <dd className="flex items-center gap-2">
                      {s.avg_rating ? (
                        <>
                          <Stars
                            value={s.avg_rating}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs">
                            {s.avg_rating} · {s.order_count} order
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-stone-400">
                          Belum ada · {s.order_count} order
                        </span>
                      )}
                    </dd>
                  </div>
                )}

                {s.verified_by_name && (
                  <p className="pt-1 text-xs text-stone-400">
                    Diverifikasi {s.verified_by_name}, {fmtDate(s.verified_at)}
                  </p>
                )}
              </dl>

              {s.status === "Pending" && (
                <div className="mt-4 border-t border-stone-100 pt-4">
                  <SupplierDecision
                    supplier={s}
                    show={["Approved", "Rejected"]}
                  />
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
