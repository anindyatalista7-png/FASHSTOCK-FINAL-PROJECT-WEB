"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "../Icon";
import { logoutAction } from "@/actions/auth";

function NavLinks({ nav, pathname, onNavigate }) {
  return (
    <nav className="flex flex-col gap-1">
      {nav.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              active ? "bg-white/10 text-white" : "text-[#E6C9D0] hover:bg-white/10 hover:text-white"
            }`}
          >
            {active && <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-brand-400" />}
            <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-brand-400" : ""}`} />
            <span className="flex-1">{item.label}</span>
            {item.count > 0 && (
              <span className="rounded-full bg-brand-400 px-2 py-0.5 text-[10px] font-black text-ink">{item.count}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5 px-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-400 text-ink">
        <Icon name="box" className="h-5 w-5" strokeWidth={2.2} />
      </span>
      <span className="leading-tight">
        <span className="block text-base font-extrabold tracking-tight text-white">FashStock</span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-[#D7A0AA]">Warehouse</span>
      </span>
    </Link>
  );
}

function UserBox({ user, roleLabel }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8E5665] text-sm font-bold text-white">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{user.name}</p>
          <p className="truncate text-[11px] text-[#E6C9D0]">{roleLabel}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" title="Keluar" className="rounded-lg p-2 text-stone-400 transition hover:bg-white/10 hover:text-white">
            <Icon name="logout" className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Sidebar({ nav, user, roleLabel }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col gap-6 bg-ink px-4 py-6 lg:flex">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#D7A0AA]">Menu</p>
          <NavLinks nav={nav} pathname={pathname} />
        </div>
        <UserBox user={user} roleLabel={roleLabel} />
      </aside>

      
      <header className="no-print sticky top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded-lg p-2 text-white hover:bg-white/10" aria-label="Buka menu">
          <Icon name="menu" className="h-6 w-6" />
        </button>
      </header>

      
      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 bg-ink px-4 py-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Brand />
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-stone-400 hover:bg-white/10" aria-label="Tutup menu">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks nav={nav} pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <UserBox user={user} roleLabel={roleLabel} />
          </aside>
        </div>
      )}
    </>
  );
}
