import Link from "next/link";
import Icon from "./Icon";

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <Link href={back} className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-ink">
            <Icon name="back" className="h-3.5 w-3.5" /> Kembali
          </Link>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, actions, children, className = "", bodyClass = "p-5" }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          {actions}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </section>
  );
}

const TONES = {
  dark: "bg-ink text-white",
  amber: "bg-brand-400 text-ink",
  light: "bg-white text-ink border border-stone-200",
  red: "bg-red-50 text-red-900 border border-red-100",
};

export function StatCard({ label, value, hint, icon, tone = "light", href }) {
  const body = (
    <div className={`relative h-full overflow-hidden rounded-2xl p-5 ${TONES[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${tone === "dark" ? "text-stone-400" : "opacity-70"}`}>{label}</p>
        {icon && <Icon name={icon} className="h-5 w-5 opacity-70" />}
      </div>
      <p className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">{value}</p>
      {hint && <p className={`mt-1 text-xs ${tone === "dark" ? "text-stone-400" : "opacity-70"}`}>{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition hover:-translate-y-0.5">
      {body}
    </Link>
  ) : (
    body
  );
}

export function EmptyState({ title = "Belum ada data", message, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <div className="mb-1 rounded-2xl bg-stone-100 p-3 text-stone-400">
        <Icon name="layers" className="h-6 w-6" />
      </div>
      <p className="font-semibold text-stone-700">{title}</p>
      {message && <p className="max-w-sm text-sm text-stone-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Field({ label, error, hint, children, className = "", required }) {
  return (
    <div className={className}>
      {label && (
        <label className="label">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function InfoRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-stone-100 py-3 last:border-0 sm:flex-row sm:items-start sm:gap-4">
      <dt className="w-44 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone-500">{label}</dt>
      <dd className="text-sm text-stone-800">{children}</dd>
    </div>
  );
}

/* ---------- Badges ---------- */

function Pill({ className, children, dot }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-bold ${className}`}>
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {children}
    </span>
  );
}

const STOCK_STYLE = {
  "Out of Stock": ["bg-stone-200 text-stone-700", "bg-stone-500"],
  Severe: ["bg-red-100 text-red-700", "bg-red-500"],
  Low: ["bg-yellow-100 text-yellow-800", "bg-yellow-500"],
  Normal: ["bg-emerald-100 text-emerald-700", "bg-emerald-500"],
};
export function StockBadge({ status }) {
  const [cls, dot] = STOCK_STYLE[status] ?? STOCK_STYLE.Normal;
  return <Pill className={cls} dot={dot}>{status}</Pill>;
}

const TRX_STYLE = {
  Pending: "bg-amber-100 text-amber-800",
  Approved: "bg-emerald-100 text-emerald-700",
  Rejected: "bg-red-100 text-red-700",
  Shipped: "bg-sky-100 text-sky-700",
};
export function TrxStatusBadge({ status }) {
  return <Pill className={TRX_STYLE[status]}>{status}</Pill>;
}

const RESTOCK_STYLE = {
  Pending: "bg-amber-100 text-amber-800",
  Confirmed: "bg-sky-100 text-sky-700",
  Rejected: "bg-red-100 text-red-700",
  "In Transit": "bg-violet-100 text-violet-700",
  Inspecting: "bg-orange-100 text-orange-700",
  Returned: "bg-red-100 text-red-700",
  Received: "bg-emerald-100 text-emerald-700",
};
export function RestockStatusBadge({ status }) {
  return <Pill className={RESTOCK_STYLE[status]}>{status}</Pill>;
}

export function TypeBadge({ type }) {
  return type === "IN" ? (
    <Pill className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
      <Icon name="arrowIn" className="h-3 w-3" strokeWidth={2.5} /> Masuk
    </Pill>
  ) : (
    <Pill className="bg-orange-50 text-orange-700 ring-1 ring-orange-200">
      <Icon name="arrowOut" className="h-3 w-3" strokeWidth={2.5} /> Keluar
    </Pill>
  );
}

export function SupplierStatusBadge({ status }) {
  const map = {
    Pending: "bg-amber-100 text-amber-800",
    Approved: "bg-emerald-100 text-emerald-700",
    Rejected: "bg-red-100 text-red-700",
  };
  return <Pill className={map[status]}>{status}</Pill>;
}

export function Stars({ value, className = "h-4 w-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" title={`${value ?? 0} dari 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Icon key={n} name="star" filled={n <= Math.round(value || 0)} className={`${className} ${n <= Math.round(value || 0) ? "text-brand-500" : "text-stone-300"}`} />
      ))}
    </span>
  );
}

export function ProductThumb({ id, hasImage, name, size = "h-10 w-10" }) {
  if (!hasImage) {
    return (
      <div className={`${size} grid shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-400`}>
        <Icon name="box" className="h-1/2 w-1/2" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/api/images/products/${id}`} alt={name} className={`${size} shrink-0 rounded-xl border border-stone-200 object-cover`} />
  );
}
