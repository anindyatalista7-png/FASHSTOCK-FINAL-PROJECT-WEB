
"use client";

import { usePathname } from "next/navigation";

const menus = [
  { icon: "▦", label: "Dashboard", href: "/" },
  { icon: "◈", label: "Produk Fashion", href: "/products" },
  { icon: "▤", label: "Kategori", href: "#kategori" },
  { icon: "⇄", label: "Transaksi", href: "#transaksi" },
  { icon: "▥", label: "Restock", href: "#restock" },
  { icon: "♧", label: "Supplier", href: "#supplier" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col bg-[#713E4A] px-5 py-8 text-white">
      {/* Brand */}
      <a href="/" className="mb-14 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center border border-white/30 text-xl font-semibold tracking-tight">
          F.
        </div>

        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            FashStock
          </h2>
          <p className="mt-1 text-[9px] uppercase tracking-[0.25em] text-[#E8C7C8]">
            Fashion Warehouse
          </p>
        </div>
      </a>

      {/* Navigation */}
      <p className="mb-5 px-3 text-[10px] uppercase tracking-[0.24em] text-[#D6AEB4]">
        Workspace
      </p>

      <nav className="space-y-2">
        {menus.map((menu) => {
          const active = pathname === menu.href;

          return (
            <a
              key={menu.label}
              href={menu.href}
              className={`flex items-center gap-4 border-l-2 px-4 py-3.5 text-sm transition ${
                active
                  ? "border-[#F5D8D9] bg-white/10 font-semibold text-white"
                  : "border-transparent text-[#E6C8CD] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="w-5 text-center text-lg">
                {menu.icon}
              </span>
              <span>{menu.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="mt-auto border-t border-white/20 pt-6">
        <p className="font-serif text-lg italic text-[#F7E7E7]">
          Smart Stock.
        </p>
        <p className="font-serif text-lg italic text-[#F7E7E7]">
          Better Style.
        </p>

        <p className="mt-4 text-[10px] leading-5 tracking-wide text-[#D6AEB4]">
          FASHSTOCK © 2026
          <span className="block">Inventory Management</span>
        </p>
      </div>
    </aside>
  );
}
