const menus = [
  { icon: "▦", label: "Dashboard", href: "/", active: true },
  { icon: "◈", label: "Produk Fashion", href: "#produk" },
  { icon: "▤", label: "Kategori", href: "#kategori" },
  { icon: "⇄", label: "Transaksi", href: "#transaksi" },
  { icon: "▣", label: "Restock", href: "#restock" },
  { icon: "♙", label: "Supplier", href: "#supplier" },
];

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-64 shrink-0 flex-col border-r border-[#F0DDDE] bg-white px-5 py-7">
      <a href="/" className="mb-10 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#713E4A] text-sm font-extrabold tracking-tight text-white shadow-sm">
          FS
        </span>
        <span>
          <span className="block text-xl font-extrabold tracking-tight text-[#713E4A]">FashStock</span>
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.15em] text-[#A18489]">Fashion Warehouse</span>
        </span>
      </a>

      <p className="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-[#B49DA1]">WORKSPACE</p>
      <nav className="space-y-1.5">
        {menus.map((menu) => (
          <a
            key={menu.label}
            href={menu.href}
            aria-current={menu.active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              menu.active
                ? "bg-[#713E4A] text-white shadow-sm"
                : "text-[#806B70] hover:bg-[#F8EEEE] hover:text-[#713E4A]"
            }`}
          >
            <span className="w-5 text-center text-base">{menu.icon}</span>
            <span>{menu.label}</span>
          </a>
        ))}
      </nav>

      <div className="mt-auto rounded-2xl bg-[#F8EEEE] p-4">
        <p className="text-xs font-bold text-[#713E4A]">Smart Stock. Better Style.</p>
        <p className="mt-1.5 text-[11px] leading-5 text-[#927D82]">
          Kelola persediaan fashion dengan lebih teratur.
        </p>
      </div>
    </aside>
  );
}
