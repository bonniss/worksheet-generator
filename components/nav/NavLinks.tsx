"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  return (
    <nav className="flex min-w-0 gap-1 overflow-x-auto text-sm">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 ${isActive(l.href) ? "bg-sky-50 font-semibold text-sky-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
