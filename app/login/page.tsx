import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Đăng nhập · Worksheet Generator" };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getCurrentUser()) redirect("/");
  return (
    <main className="app-ui flex min-h-screen flex-col items-center justify-center bg-page px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary font-display text-xl font-extrabold text-white shadow-medium">W</span>
          <h1 className="font-display text-subhead text-zinc-900">Đăng nhập</h1>
          <p className="mt-1.5 text-sm text-zinc-500">Worksheet Generator — tạo worksheet tiếng Anh theo CEFR</p>
        </div>
        <div className="rounded-xl border border-solid border-zinc-100 bg-white p-8 shadow-medium">
          <LoginForm next={searchParams.next} />
        </div>
        <p className="mt-6 text-center text-[13px] text-zinc-400">Chưa có tài khoản? Liên hệ quản trị viên.</p>
      </div>
    </main>
  );
}
