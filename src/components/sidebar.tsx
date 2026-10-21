"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { menu } from "./menu";

export function Sidebar({ brand, isAdmin }: { brand: string; isAdmin: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-30 rounded-theme bg-sidebar p-2 text-sidebar-foreground md:hidden"
        aria-label="Abrir menu"
      >
        <Menu size={20} />
      </button>
      {open && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform md:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <span className="text-lg font-semibold text-sidebar-active-foreground">{brand}</span>
          <button type="button" onClick={() => setOpen(false)} className="md:hidden" aria-label="Fechar menu">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          {menu.map((group, i) => {
            const items = group.items.filter((it) => !it.adminOnly || isAdmin);
            if (!items.length) return null;
            return (
              <div key={group.label ?? i} className="mt-4">
                {group.label && <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wide opacity-60">{group.label}</p>}
                <ul>
                  {items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(href);
                    return (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => setOpen(false)}
                          aria-current={active ? "page" : undefined}
                          className={`flex items-center gap-3 rounded-theme px-3 py-2 text-sm ${active ? "bg-sidebar-active text-sidebar-active-foreground" : "hover:bg-white/10"}`}
                        >
                          <Icon size={18} />
                          {label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
