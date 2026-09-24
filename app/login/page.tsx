import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Đăng nhập · Worksheet Generator" };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="app-ui flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-lg">
        <h1 className="text-xl font-bold">Worksheet Generator</h1>
        <p className="mb-6 mt-1 text-sm text-slate-500">Đăng nhập để tiếp tục</p>
        <LoginForm next={searchParams.next} />
        <p className="mt-5 text-center text-xs text-slate-400">Chưa có tài khoản? Liên hệ quản trị viên.</p>
      </div>
    </main>
  );
}
