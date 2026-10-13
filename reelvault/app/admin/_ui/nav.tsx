"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** The menu. A client component only so it can highlight the page you are on. */
export function NavLinks({ items }: { items: readonly (readonly [string, string])[] }) {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible">
      {items.map(([href, label]) => {
        const active = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-lg px-3 py-2.5 text-[15px] transition-colors ${active ? "bg-white/15 font-semibold text-white" : "text-zinc-400 hover:bg-white/10 hover:text-white"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
