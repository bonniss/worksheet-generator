import Link from "next/link";
import { count, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { Avatar, Badge, Card, CardTitle, Page, PageHeader, RoleBadge } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireAdmin } from "@/lib/auth/session";
import { isUuid } from "@/lib/validators";
import { deleteUser } from "../actions";
import { formatUsd, userTotals, userUsageToday } from "@/lib/usage";
import { EditUserForm, ResetPasswordForm, UserLimitsForm } from "./forms";

export const metadata = { title: "Chi tiết tài khoản" };

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const me = await requireAdmin();
  if (!isUuid(params.id)) notFound();
  const [[user], [{ n }]] = await Promise.all([
    db
      .select({
        id: users.id, username: users.username, email: users.email, name: users.name, role: users.role,
        isActive: users.isActive, createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, params.id))
      .limit(1),
    db.select({ n: count() }).from(worksheets).where(eq(worksheets.ownerId, params.id)),
  ]);
  if (!user) notFound();
  const isSelf = user.id === me.id;
  const [usage, totals] = await Promise.all([userUsageToday(user.id), userTotals(user.id, 30)]);
  const isAdmin = user.role === "admin";

  return (
    <Page width="form">
      <PageHeader
        back={{ href: "/admin/users", label: "Tài khoản" }}
        title={
          <span className="flex items-center gap-4">
            <Avatar name={user.name} size={48} />
            <span className="min-w-0">{user.name}</span>
          </span>
        }
      />
      <div className="-mt-4 mb-8 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
        <span className="font-mono text-zinc-700">@{user.username}</span>
        {user.email && <span>· {user.email}</span>}
        <span className="mx-1 h-3.5 w-px bg-zinc-200" />
        <RoleBadge role={user.role} />
        {user.isActive ? <Badge tone="success" dot>Hoạt động</Badge> : <Badge tone="danger" dot>Đã khoá</Badge>}
        <span className="mx-1 h-3.5 w-px bg-zinc-200" />
        <span>Tạo ngày {user.createdAt.toLocaleDateString("vi-VN")}</span>
        <span>·</span>
        {n > 0
          ? <Link href={`/worksheets?owner=${user.id}`} className="text-primary hover:underline">{n} worksheet</Link>
          : <span>0 worksheet</span>}
      </div>

      <div className="space-y-6">
        <Card>
          <CardTitle title="Thông tin tài khoản" />
          <EditUserForm user={user} isSelf={isSelf} />
        </Card>

        <Card>
          <CardTitle title="Sử dụng AI" sub={isAdmin ? "Admin không bị giới hạn lượt dùng." : "Hạn mức làm mới lúc 0h mỗi ngày."} />
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Tạo hôm nay", value: isAdmin ? String(usage.runs) : `${usage.runs} / ${usage.runsPerDay}` },
              { label: "Gen lại hôm nay", value: isAdmin ? String(usage.regens) : `${usage.regens} / ${usage.regensPerDay}` },
              { label: "Lượt gọi 30 ngày", value: totals.calls.toLocaleString("vi-VN") },
              { label: "Chi phí 30 ngày", value: formatUsd(totals.usd) },
            ].map((t) => (
              <div key={t.label} className="rounded-lg bg-page px-4 py-3">
                <div className="text-caption text-zinc-500">{t.label}</div>
                <div className="mt-0.5 font-display text-lg font-bold text-zinc-900">{t.value}</div>
              </div>
            ))}
          </div>
          {!isAdmin && (
            <UserLimitsForm id={user.id} runs={usage.custom.runs} regens={usage.custom.regens} defaults={usage.defaults} />
          )}
          <Link href={`/admin/usage?user=${user.id}`} className="mt-4 inline-block text-[13px] font-medium text-primary hover:underline">Xem chi tiết các lượt gọi →</Link>
        </Card>

        {!isSelf && (
          <>
            <Card>
              <CardTitle title="Đặt lại mật khẩu" sub="Sinh mật khẩu ngẫu nhiên mới và đăng xuất người dùng khỏi mọi thiết bị." />
              <ResetPasswordForm id={user.id} username={user.username} />
            </Card>

            <Card className="border-red-100">
              <CardTitle
                title="Xoá tài khoản"
                tone="danger"
                sub={<>Xoá vĩnh viễn tài khoản và toàn bộ <b className="text-zinc-700">{n} worksheet</b> của người dùng này. Không thể hoàn tác.</>}
              />
              <form action={deleteUser}>
                <input type="hidden" name="id" value={user.id} />
                <SubmitButton
                  variant="danger" pendingText="Đang xoá..." icon={<Trash2 size={16} />} navigates
                  confirm={`Xoá vĩnh viễn @${user.username} và ${n} worksheet?`}
                >
                  Xoá tài khoản
                </SubmitButton>
              </form>
            </Card>
          </>
        )}
      </div>
    </Page>
  );
}
