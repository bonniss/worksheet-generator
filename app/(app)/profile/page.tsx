import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { Avatar, Card, CardTitle, Field, Input, Page, PageHeader, RoleBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { userUsageToday } from "@/lib/usage";
import { ChangePasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [[{ n }], usage] = await Promise.all([
    db.select({ n: count() }).from(worksheets).where(eq(worksheets.ownerId, user.id)),
    userUsageToday(user.id),
  ]);
  const unlimited = user.role === "admin";
  return (
    <Page width="form">
      <PageHeader title="Hồ sơ cá nhân" />
      <div className="space-y-6">
        <Card>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user.name} size={56} />
            <div className="min-w-0">
              <div className="font-display text-lg font-bold text-zinc-900">{user.name}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                <span className="font-mono">@{user.username}</span>
                <RoleBadge role={user.role} />
                <span>· {n} worksheet</span>
              </div>
            </div>
          </div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {[
              { label: "Lượt tạo hôm nay", used: usage.runs, limit: usage.runsPerDay },
              { label: "Lượt gen lại hôm nay", used: usage.regens, limit: usage.regensPerDay },
            ].map((t) => (
              <div key={t.label} className="rounded-lg bg-page px-4 py-3">
                <div className="text-caption text-zinc-500">{t.label}</div>
                <div className="mt-0.5 font-display text-lg font-bold text-zinc-900">
                  {t.used}{!unlimited && <span className="text-sm font-medium text-zinc-400"> / {t.limit}</span>}
                </div>
                {!unlimited && (
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary-soft">
                    <div
                      className={t.used >= t.limit ? "h-full bg-danger" : t.used / Math.max(t.limit, 1) >= 0.8 ? "h-full bg-warning" : "h-full bg-primary"}
                      style={{ width: `${Math.min(100, (t.used / Math.max(t.limit, 1)) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="mb-5 grid gap-5 sm:grid-cols-2">
            <Field label="Username" hint="Dùng để đăng nhập.">
              <Input value={user.username} disabled readOnly className="font-mono" />
            </Field>
            <Field label="Email" hint="Liên hệ quản trị viên để thay đổi.">
              <Input value={user.email ?? ""} placeholder="Chưa có" disabled readOnly />
            </Field>
          </div>
          <ProfileForm name={user.name} />
        </Card>
        <Card>
          <CardTitle title="Đổi mật khẩu" sub="Các thiết bị khác sẽ bị đăng xuất sau khi đổi." />
          <ChangePasswordForm />
        </Card>
      </div>
    </Page>
  );
}
