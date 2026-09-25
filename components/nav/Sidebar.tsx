"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, FileStack, Library, LogOut, Megaphone, Menu, PanelLeftClose, PanelLeftOpen, Settings2, Sparkles, Upload, User, Users, X,
} from "lucide-react";
import { LogoMark, PRODUCT_NAME } from "@/components/brand/Logo";
import { Avatar, RoleBadge, cx } from "@/components/ui";
import { CHANGELOG_SEEN_KEY, LATEST_VERSION } from "@/lib/changelog";
import { SIDEBAR_COOKIE } from "./constants";
import { startNavigationProgress } from "./progress-events";

const ICONS = { sparkles: Sparkles, files: FileStack, users: Users, upload: Upload, user: User, settings: Settings2, chart: BarChart3, library: Library, news: Megaphone };

export type NavItem = {
  href: string; label: string; icon: keyof typeof ICONS; exact?: boolean;
  /** Hiện chấm "mới" khi có bản changelog chưa xem */
  badgeWhenNew?: boolean;
};
export type NavSection = { label: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  user: { name: string; username: string; role: "admin" | "user" };
  logoutAction: () => Promise<void>;
  initialCollapsed: boolean;
  children: React.ReactNode;
};

/** Tooltip bên phải khi sidebar thu gọn (spec: nền #18181B, chữ trắng 12px, radius 6px). */
function Tip({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-medium transition-opacity delay-100 group-hover:opacity-100 group-focus-visible:opacity-100">
      {children}
    </span>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={PRODUCT_NAME}>
      <LogoMark size={32} className="shrink-0" />
      {!collapsed && <span className="truncate font-display text-[15px] font-bold tracking-[0.01em] text-zinc-900">{PRODUCT_NAME}</span>}
    </Link>
  );
}

export function Sidebar({ sections, user, logoutAction, initialCollapsed, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  // Có bản changelog chưa xem (đọc từ trình duyệt sau khi mount để không lệch với HTML server)
  const [hasNews, setHasNews] = useState(false);
  useEffect(() => {
    const check = () => {
      try { setHasNews(localStorage.getItem(CHANGELOG_SEEN_KEY) !== LATEST_VERSION); } catch { setHasNews(false); }
    };
    check();
    window.addEventListener("changelog-seen", check);
    window.addEventListener("storage", check);
    return () => { window.removeEventListener("changelog-seen", check); window.removeEventListener("storage", check); };
  }, []);

  // Đóng menu mobile khi chuyển trang
  useEffect(() => setOpen(false), [pathname]);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      // Cookie để server render đúng độ rộng ngay lần tải sau (không nhảy layout)
      document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);

  // Ctrl/⌘ + B (bỏ qua khi đang gõ trong ô nhập)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const isActive = (item: NavItem) =>
    item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(item.href + "/");

  const renderNav = (c: boolean) => (
    <nav className={cx("flex-1 py-2", c ? "px-3" : "overflow-y-auto px-4")}>
      {sections.map((s, i) => (
        <div key={s.label} className={c ? "mb-2" : "mb-6"}>
          {c
            ? i > 0 && <div className="mx-2 mb-2 h-px bg-zinc-100" />
            : <div className="mb-1.5 px-3 text-overline uppercase text-zinc-400">{s.label}</div>}
          <ul className="m-0 list-none p-0">
            {s.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={c ? item.label : undefined}
                    className={cx(
                      "group relative flex h-10 items-center rounded-lg text-sm transition-colors",
                      c ? "justify-center" : "gap-2.5 px-3",
                      active ? "bg-primary-soft font-medium text-primary" : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
                    <span className="relative flex shrink-0">
                      <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                      {item.badgeWhenNew && hasNews && (
                        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white" aria-label="Có cập nhật mới" />
                      )}
                    </span>
                    {!c && item.label}
                    <Tip show={c}>{item.label}</Tip>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  const logoutButton = (c: boolean) => (
    <form action={logoutAction} onSubmit={() => startNavigationProgress()}>
      <button
        aria-label="Đăng xuất"
        title={c ? undefined : "Đăng xuất"}
        className="group relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-danger"
      >
        <LogOut size={16} />
        <Tip show={c}>Đăng xuất</Tip>
      </button>
    </form>
  );

  const renderAccount = (c: boolean) => (
    <div className={cx("border-0 border-t border-solid border-zinc-100", c ? "px-3 py-3" : "p-4")}>
      {c ? (
        <div className="flex flex-col items-center gap-1.5">
          <Link href="/profile" aria-label="Hồ sơ cá nhân" className="group relative rounded-full">
            <Avatar name={user.name} size={34} />
            <Tip show>{user.name} · @{user.username}</Tip>
          </Link>
          {logoutButton(true)}
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-lg px-2 py-1.5">
          <Avatar name={user.name} size={34} />
          <Link href="/profile" className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-zinc-900">{user.name}</div>
            <div className="flex items-center gap-1.5 truncate text-xs text-zinc-500">
              <span className="truncate font-mono">@{user.username}</span>
              {user.role === "admin" && <RoleBadge role="admin" />}
            </div>
          </Link>
          {logoutButton(false)}
        </div>
      )}
    </div>
  );

  const toggleButton = (
    <button
      onClick={toggle}
      aria-label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
      aria-expanded={!collapsed}
      className="group relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
    >
      {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-medium transition-opacity delay-100 group-hover:opacity-100">
        {collapsed ? "Mở rộng" : "Thu gọn"} <kbd className="ml-1 font-mono text-[11px] text-zinc-400">Ctrl B</kbd>
      </span>
    </button>
  );

  return (
    <div className="min-h-screen bg-page">
      {/* Desktop: sidebar cố định, thu gọn được */}
      <aside
        className={cx(
          "app-ui fixed inset-y-0 left-0 z-30 hidden flex-col border-0 border-r border-solid border-zinc-100 bg-white transition-[width] duration-200 print:!hidden lg:flex",
          collapsed ? "w-[72px]" : "w-sidebar",
        )}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pb-2 pt-4">
            <Brand collapsed />
            {toggleButton}
          </div>
        ) : (
          <div className="flex h-16 items-center justify-between gap-2 pl-7 pr-4">
            <Brand />
            {toggleButton}
          </div>
        )}
        {renderNav(collapsed)}
        {renderAccount(collapsed)}
      </aside>

      {/* Mobile: thanh trên + drawer */}
      <div className="app-ui sticky top-0 z-30 flex h-14 items-center justify-between border-0 border-b border-solid border-zinc-100 bg-white/95 px-4 backdrop-blur print:!hidden lg:hidden">
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
            {renderNav(false)}
            {renderAccount(false)}
          </aside>
        </div>
      )}

      <div className={cx("transition-[padding] duration-200 print:!pl-0", collapsed ? "lg:pl-[72px]" : "lg:pl-sidebar")}>
        {children}
      </div>
    </div>
  );
}
