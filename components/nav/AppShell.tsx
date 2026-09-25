import { logout } from "@/app/auth-actions";
import type { SessionUser } from "@/lib/auth/session";
import { Sidebar, type NavSection } from "./Sidebar";

export function AppShell({ user, children }: { user: SessionUser; children: React.ReactNode }) {
  const sections: NavSection[] = [
    {
      label: "Worksheet",
      items: [
        { href: "/", label: "Tạo worksheet", icon: "sparkles", exact: true },
        { href: "/worksheets", label: user.role === "admin" ? "Tất cả worksheet" : "Worksheet của tôi", icon: "files" },
      ],
    },
    ...(user.role === "admin"
      ? [{
          label: "Quản trị",
          items: [
            { href: "/admin/users", label: "Tài khoản", icon: "users" as const, exact: true },
            { href: "/admin/users/import", label: "Import tài khoản", icon: "upload" as const },
          ],
        }]
      : []),
    { label: "Cá nhân", items: [{ href: "/profile", label: "Hồ sơ cá nhân", icon: "user" }] },
  ];
  return (
    <Sidebar
      sections={sections}
      user={{ name: user.name, username: user.username, role: user.role }}
      logoutAction={logout}
    >
      {children}
    </Sidebar>
  );
}
