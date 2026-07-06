"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { APP_VERSION } from "@/lib/version";

// Minimal 24px stroke icons (currentColor) so they inherit link color.
function Icon({ path }: { path: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px] shrink-0"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const navItems = [
  { href: "/", label: "Home", icon: "M3 11.5 12 4l9 7.5M5 10v10h14V10" },
  {
    href: "/catalog",
    label: "Catalog",
    icon: "M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2zM8 3v18",
  },
  {
    href: "/shelves",
    label: "Shelves",
    icon: "M4 4h16M4 12h16M4 20h16M8 4v8m4-8v8m6-8v8",
  },
  {
    href: "/members",
    label: "Members",
    icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6m13 9v-1a4 4 0 0 0-3-3.87M16 4.13a4 4 0 0 1 0 7.75",
  },
  {
    href: "/profile",
    label: "Profile",
    icon: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8",
  },
];

// How close to the left edge a touch must start to begin an opening drag.
const EDGE_ZONE = 28;
// Direction lock: ignore movement until the finger clears this many px.
const SLOP = 8;
// Flick speed (px/ms) above which release direction wins over position.
const FLICK = 0.3;
const SETTLE_MS = 220;

export function NavDrawer() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const drag = useRef({
    active: false,
    decided: false,
    horizontal: false,
    startX: 0,
    startY: 0,
    startTranslate: 0, // px at drag start: -width = closed, 0 = open
    width: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0, // px/ms, positive = opening
  });

  // Imperatively place the panel + backdrop so the finger tracks 1:1
  // without waiting on React re-renders.
  function paint(tx: number, width: number) {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const progress = width > 0 ? (tx + width) / width : 0; // 0 closed → 1 open
    if (panel) panel.style.transform = `translateX(${tx}px)`;
    if (backdrop) {
      backdrop.style.opacity = String(progress);
      backdrop.style.pointerEvents = progress > 0.01 ? "auto" : "none";
    }
  }

  // Drop all inline overrides so the className-driven transition takes over.
  function clearInline() {
    for (const el of [panelRef.current, backdropRef.current]) {
      if (!el) continue;
      el.style.transform = "";
      el.style.transition = "";
      el.style.opacity = "";
      el.style.pointerEvents = "";
    }
  }

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const width = panelRef.current?.offsetWidth ?? 0;
      const d = drag.current;
      if (!open) {
        // Only the left edge initiates an opening drag.
        if (t.clientX > EDGE_ZONE) return;
        d.startTranslate = -width;
        // Pre-empt iOS Safari's edge swipe-back, which can latch at touchstart.
        if (e.cancelable) e.preventDefault();
      } else {
        // While open, a left-swipe anywhere drags it closed.
        d.startTranslate = 0;
      }
      d.active = true;
      d.decided = false;
      d.horizontal = false;
      d.startX = d.lastX = t.clientX;
      d.startY = t.clientY;
      d.width = width;
      d.lastT = performance.now();
      d.velocity = 0;
    }

    function onTouchMove(e: TouchEvent) {
      const d = drag.current;
      if (!d.active) return;
      const t = e.touches[0];
      const dx = t.clientX - d.startX;
      const dy = t.clientY - d.startY;

      // We've claimed this touch as a drawer candidate (it began in the left
      // edge zone, or while the drawer is open). Suppress the browser's native
      // edge swipe-back gesture for it before it can take over.
      if (e.cancelable) e.preventDefault();

      if (!d.decided) {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        d.decided = true;
        d.horizontal = Math.abs(dx) > Math.abs(dy);
        if (!d.horizontal) {
          d.active = false; // vertical scroll — let the page have it
          return;
        }
        // Kill transitions so the panel tracks the finger instantly.
        if (panelRef.current) panelRef.current.style.transition = "none";
        if (backdropRef.current) backdropRef.current.style.transition = "none";
      }
      if (!d.horizontal) return;

      const now = performance.now();
      const dt = now - d.lastT;
      if (dt > 0) d.velocity = (t.clientX - d.lastX) / dt;
      d.lastX = t.clientX;
      d.lastT = now;

      const tx = Math.max(-d.width, Math.min(0, d.startTranslate + dx));
      paint(tx, d.width);
    }

    function onTouchEnd() {
      const d = drag.current;
      if (!d.active) return;
      d.active = false;
      if (!d.horizontal || d.width === 0) return;

      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      const currentTx = panel
        ? new DOMMatrix(getComputedStyle(panel).transform).m41
        : d.startTranslate;
      const progress = (currentTx + d.width) / d.width;

      const willOpen =
        Math.abs(d.velocity) > FLICK ? d.velocity > 0 : progress > 0.5;

      // Animate the remaining distance from where the finger let go.
      const target = willOpen ? 0 : -d.width;
      if (panel) {
        panel.style.transition = `transform ${SETTLE_MS - 20}ms ease-out`;
        panel.style.transform = `translateX(${target}px)`;
      }
      if (backdrop) {
        backdrop.style.transition = `opacity ${SETTLE_MS - 20}ms ease-out`;
        backdrop.style.opacity = willOpen ? "1" : "0";
        backdrop.style.pointerEvents = willOpen ? "auto" : "none";
      }
      setOpen(willOpen);
      // Hand control back to className styles once settled (no jump: they match).
      window.setTimeout(() => {
        if (!drag.current.active) clearInline();
      }, SETTLE_MS);
    }

    document.addEventListener("touchstart", onTouchStart, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open]);

  // Portal target (document.body) is only available on the client.
  useEffect(() => setMounted(true), []);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative h-8 w-8 rounded-md transition-colors hover:bg-accent/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/50"
        aria-label={open ? "Close menu" : "Open menu"}
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

      {mounted &&
        createPortal(
          <>
            {/* Dimming backdrop — opacity tracks the drag, capped by bg-black/50 */}
            <div
              ref={backdropRef}
              onClick={() => setOpen(false)}
              aria-hidden
              className={`fixed inset-0 z-[60] bg-black/50 transition-opacity duration-200 ease-out ${
                open ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />

            {/* The sliding panel */}
            <div
              ref={panelRef}
              role="menu"
              aria-hidden={!open}
              className={`fixed inset-y-0 left-0 z-[61] flex w-72 max-w-[80vw] flex-col border-r border-accent/20 bg-paper shadow-2xl transition-transform duration-200 ease-out [will-change:transform] ${
                open ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <div className="border-b border-accent/15 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
                <span className="text-xl font-bold tracking-tight text-accent-dark">
                  Chapterhouse
                </span>
              </div>
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      role="menuitem"
                      tabIndex={open ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors ${
                        active
                          ? "bg-accent/15 text-accent-dark"
                          : "text-ink/80 hover:bg-accent/10 hover:text-ink active:bg-accent/15"
                      }`}
                    >
                      <Icon path={item.icon} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="border-t border-accent/15 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-xs font-medium text-ink/40">
                Chapterhouse · {APP_VERSION}
              </div>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
