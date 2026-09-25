import { AppShell } from "@/components/nav/AppShell";
import { requireUser } from "@/lib/auth/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // requireUser tự chuyển tới /change-password nếu mật khẩu do admin đặt chưa được đổi
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}
