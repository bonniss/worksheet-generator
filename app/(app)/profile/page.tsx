import { count, eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheets } from "@/db/schema";
import { Badge, Card, Field, Input, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { ChangePasswordForm, ProfileForm } from "./forms";

export const metadata = { title: "Hồ sơ · Worksheet Generator" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ n }] = await db.select({ n: count() }).from(worksheets).where(eq(worksheets.ownerId, user.id));
  return (
    <main className="app-ui mx-auto max-w-xl space-y-4 px-4 py-6">
      <PageTitle title="Hồ sơ cá nhân" sub={`${n} worksheet`} />
      <Card className="space-y-4">
        <h2 className="text-base font-semibold">Thông tin tài khoản</h2>
        <Field label="Username">
          <Input value={user.username} disabled readOnly />
        </Field>
        <Field label="Email" hint="Liên hệ quản trị viên để thay đổi email.">
          <Input value={user.email ?? ""} placeholder="Chưa có" disabled readOnly />
        </Field>
        <div className="text-sm">
          Vai trò: {user.role === "admin" ? <Badge tone="amber">admin</Badge> : <Badge>user</Badge>}
        </div>
        <ProfileForm name={user.name} />
      </Card>
      <Card>
        <h2 className="mb-4 text-base font-semibold">Đổi mật khẩu</h2>
        <ChangePasswordForm />
      </Card>
    </main>
  );
}
