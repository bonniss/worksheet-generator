import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { Avatar, Card, CardTitle, Field, Input, Page, PageHeader, RoleBadge } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "Hồ sơ" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ n }] = await db.select({ n: count() }).from(worksheets).where(eq(worksheets.ownerId, user.id));
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
