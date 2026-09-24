import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { Card, PageTitle, buttonClass } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";
import { deleteUser } from "../actions";
import { EditUserForm, ResetPasswordForm } from "./forms";

export const metadata = { title: "Sửa tài khoản · Worksheet Generator" };

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const me = await requireAdmin();
  if (!isUuid(params.id)) notFound();
  const [[user], [{ n }]] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive, createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1),
    db.select({ n: count() }).from(worksheets).where(eq(worksheets.ownerId, params.id)),
  ]);
  if (!user) notFound();
  const isSelf = user.id === me.id;

  return (
    <main className="app-ui mx-auto max-w-xl space-y-4 px-4 py-6">
      <PageTitle
        title={user.name}
        sub={`${user.email} · tạo ngày ${user.createdAt.toLocaleDateString("vi-VN")} · ${n} worksheet`}
        actions={<Link href="/admin/users" className={buttonClass("ghost")}>← Danh sách</Link>}
      />

      <Card>
        <h2 className="mb-4 text-base font-semibold">Thông tin</h2>
        <EditUserForm user={user} isSelf={isSelf} />
      </Card>

      {!isSelf && (
        <>
          <Card>
            <h2 className="mb-1 text-base font-semibold">Đặt lại mật khẩu</h2>
            <p className="mb-3 text-sm text-slate-500">Sinh mật khẩu ngẫu nhiên mới và đăng xuất người dùng khỏi mọi thiết bị.</p>
            <ResetPasswordForm id={user.id} email={user.email} />
          </Card>

          <Card className="border-red-200">
            <h2 className="mb-1 text-base font-semibold text-red-700">Xoá tài khoản</h2>
            <p className="mb-3 text-sm text-slate-500">Xoá vĩnh viễn tài khoản và toàn bộ {n} worksheet của người dùng này.</p>
            <form action={deleteUser}>
              <input type="hidden" name="id" value={user.id} />
              <SubmitButton variant="danger" pendingText="Đang xoá..." confirm={`Xoá vĩnh viễn ${user.email} và ${n} worksheet?`}>
                Xoá tài khoản
              </SubmitButton>
            </form>
          </Card>
        </>
      )}
    </main>
  );
}
