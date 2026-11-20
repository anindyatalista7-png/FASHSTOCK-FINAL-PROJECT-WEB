
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { label: "Dashboard", href: "/", icon: "▦" },
  { label: "Produk Fashion", href: "/products", icon: "◈" },
  { label: "Kategori Produk", href: "/categories", icon: "▤" },
  { label: "Transaksi Stok", href: "/transactions", icon: "⇄" },
  { label: "Restock Produk", href: "/restock", icon: "↻" },
  { label: "Supplier", href: "/suppliers", icon: "♧" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#713E4A] text-white">
      {/* LOGO DAN BRAND */}
      <div className="border-b border-white/15 px-5 pb-8 pt-9">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center overflow-hidden border border-[#E8C7C8] bg-[#F8EEEE] p-2 shadow-sm">
            <img
              src="/images/logo-fashstock.png"
              alt="Logo FashStock"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-[25px] font-semibold tracking-[-0.05em] text-white">
              FashStock
            </h1>

            <p className="mt-2 text-[9px] font-medium uppercase tracking-[0.15em] text-[#F2CDD2]">
              Fashion Warehouse
            </p>
          </div>
        </Link>
      </div>

      {/* NAVIGASI */}
      <nav className="flex-1 px-4 py-8">
        <p className="mb-5 px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#E8B9C2]">
          Menu Utama
        </p>

        <div className="space-y-2">
          {menuItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 border-l-[3px] px-4 py-3.5 text-[13px] transition-all duration-200 ${
                  active
                    ? "border-[#F8EEEE] bg-white/15 font-semibold text-white"
                    : "border-transparent text-[#F0D8DC] hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="flex w-5 items-center justify-center text-lg">
                  {item.icon}
                </span>

                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* FOOTER */}
      <div className="border-t border-white/15 px-6 py-6">
        <p className="font-serif text-sm italic text-[#F2CDD2]">
          Smart Stock. Better Style.
        </p>

        <p className="mt-3 text-[10px] tracking-wide text-[#D9B8BE]">
          © 2026 FashStock
        </p>
      </div>
    </aside>
  );
}
