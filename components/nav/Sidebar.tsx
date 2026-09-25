"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FileStack, LogOut, Menu, Sparkles, Upload, User, Users, X } from "lucide-react";
import { Avatar, RoleBadge, cx } from "@/components/ui";

const ICONS = { sparkles: Sparkles, files: FileStack, users: Users, upload: Upload, user: User };

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };
export type NavSection = { label: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  user: { name: string; username: string; role: "admin" | "user" };
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-display text-[15px] font-extrabold text-white">W</span>
      <span className="font-display text-[15px] font-bold tracking-[0.01em] text-zinc-900">Worksheet</span>
    </Link>
  );
}

export function Sidebar({ sections, user, logoutAction, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Đóng menu mobile khi chuyển trang
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const nav = (
    <nav className="flex-1 overflow-y-auto px-4 py-2">
      {sections.map((s) => (
        <div key={s.label} className="mb-6">
          <div className="mb-1.5 px-3 text-overline uppercase text-zinc-400">{s.label}</div>
          <ul className="m-0 list-none p-0">
            {s.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "relative flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm transition-colors",
                      active ? "bg-primary-soft font-medium text-primary" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
                    <Icon size={17} strokeWidth={active ? 2.25 : 1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const account = (
    <div className="border-0 border-t border-solid border-zinc-100 p-4">
      <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
        <Avatar name={user.name} size={34} />
        <Link href="/profile" className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-zinc-900">{user.name}</div>
          <div className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
            <span className="truncate font-mono">@{user.username}</span>
            {user.role === "admin" && <RoleBadge role="admin" />}
          </div>
        </Link>
        <form action={logoutAction}>
          <button
            title="Đăng xuất"
            aria-label="Đăng xuất"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-danger"
          >
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop: sidebar cố định */}
      <aside className="app-ui fixed inset-y-0 left-0 z-30 hidden w-sidebar print:!hidden flex-col border-0 border-r border-solid border-zinc-100 bg-white lg:flex">
        <div className="flex h-16 items-center px-7">
          <Brand />
        </div>
        {nav}
        {account}
      </aside>

      {/* Mobile: thanh trên + drawer */}
      <div className="app-ui sticky top-0 z-30 flex h-14 print:!hidden items-center justify-between border-0 border-b border-solid border-zinc-100 bg-white/95 px-4 backdrop-blur lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen(true)}
          aria-label="Mở menu"
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-zinc-600 hover:bg-zinc-100"
        >
          <Menu size={20} />
        </button>
      </div>
      {open && (
        <div className="app-ui fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/35" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-sidebar max-w-[85vw] flex-col bg-white shadow-large">
            <div className="flex h-14 items-center justify-between px-5">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Đóng menu"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-zinc-500 hover:bg-zinc-100"
              >
                <X size={18} />
              </button>
            </div>
            {nav}
            {account}
          </aside>
        </div>
      )}

      <div className="lg:pl-sidebar print:!pl-0">{children}</div>
    </div>
  );
}
