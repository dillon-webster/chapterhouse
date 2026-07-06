"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/shelves", label: "Shelves" },
  { href: "/members", label: "Members" },
  { href: "/profile", label: "Profile" },
];

export function NavMenu() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative h-8 w-8 rounded-md transition-colors hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/50"
        aria-label="Open menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className={`absolute left-1/2 top-1/2 block h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent-dark transition-[opacity,transform] duration-300 ease-out sm:duration-200 ${
            open ? "-translate-y-1/2 rotate-45" : "-translate-y-[7px] rotate-0"
          }`}
        />
        <span
          className={`absolute left-1/2 top-1/2 block h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-dark transition-[opacity,transform] duration-300 ease-out sm:duration-200 ${
            open ? "scale-x-50 opacity-0" : "scale-x-100 opacity-100"
          }`}
        />
        <span
          className={`absolute left-1/2 top-1/2 block h-0.5 w-5 -translate-x-1/2 rounded-full bg-accent-dark transition-[opacity,transform] duration-300 ease-out sm:duration-200 ${
            open ? "-translate-y-1/2 -rotate-45" : "translate-y-[5px] rotate-0"
          }`}
        />
      </button>

      <div
        role="menu"
        aria-hidden={!open}
        className={`absolute right-0 top-full z-20 mt-2 w-40 origin-top-right rounded-lg border border-accent/20 bg-paper shadow-lg transition-[opacity,transform] duration-300 ease-out sm:duration-200 ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              role="menuitem"
              tabIndex={open ? 0 : -1}
              className={`block px-4 py-3 text-sm transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-accent/10 ${
                active ? "font-semibold text-accent-dark" : "text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
