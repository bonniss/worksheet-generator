import { redirect } from "next/navigation";
import { logout } from "@/app/auth-actions";
import { LogoMark } from "@/components/brand/Logo";
import { Alert } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await requireUser({ allowPendingPasswordChange: true });
  if (!user.mustChangePassword) redirect("/");
  return (
    <main className="app-ui flex min-h-screen flex-col items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={52} className="mb-5 drop-shadow-md" />
          <h1 className="font-display text-subhead text-zinc-900">Đặt mật khẩu của bạn</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Xin chào <b className="text-zinc-700">{user.name}</b> <span className="font-mono">@{user.username}</span>
          </p>
        </div>
        <div className="rounded-xl border border-solid border-zinc-100 bg-white p-8 shadow-medium">
          <div className="mb-5">
            <Alert kind="info">Bạn đang dùng mật khẩu tạm do quản trị viên cấp. Hãy đặt mật khẩu riêng để tiếp tục.</Alert>
          </div>
          <ChangePasswordForm />
        </div>
        <form action={logout} className="mt-6 text-center">
          <button className="cursor-pointer border-0 bg-transparent text-[13px] text-zinc-400 hover:text-primary">Đăng xuất</button>
        </form>
      </div>
    </main>
  );
}
