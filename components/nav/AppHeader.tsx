import Link from "next/link";
import { logout } from "@/app/auth-actions";
import type { SessionUser } from "@/lib/auth/session";
import { NavLinks } from "./NavLinks";

export function AppHeader({ user }: { user: SessionUser }) {
  const links = [
    { href: "/", label: "Tạo worksheet" },
    { href: "/worksheets", label: user.role === "admin" ? "Worksheet (hệ thống)" : "Worksheet của tôi" },
    ...(user.role === "admin" ? [{ href: "/admin/users", label: "Tài khoản" }] : []),
  ];
  return (
    <header className="app-ui sticky top-0 z-20 h-14 border-0 border-b border-solid border-slate-200 bg-white">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-4 px-4">
        <Link href="/" className="whitespace-nowrap font-bold text-sky-700">📝 Worksheet</Link>
        <NavLinks links={links} />
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/profile" className="hidden rounded-lg px-2 py-1 hover:bg-slate-100 sm:block" title={user.email}>
            {user.name}
            {user.role === "admin" && <span className="ml-1 rounded bg-amber-100 px-1.5 text-xs font-semibold text-amber-800">admin</span>}
          </Link>
          <form action={logout}>
            <button className="cursor-pointer rounded-lg border-0 bg-transparent px-2 py-1 text-slate-600 hover:bg-slate-100">Đăng xuất</button>
          </form>
        </div>
      </div>
    </header>
  );
}
