"use client";
import { useFormState } from "react-dom";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Role } from "@/db/schema";
import { resetPassword, updateUser, type FormState } from "../actions";
import { PasswordReveal } from "../PasswordReveal";

type EditableUser = { id: string; username: string; email: string | null; name: string; role: Role; isActive: boolean };

export function EditUserForm({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const [state, action] = useFormState<FormState, FormData>(updateUser, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <input type="hidden" name="id" value={user.id} />
      <Field label="Username" hint="Username dùng để đăng nhập, không thể thay đổi.">
        <Input value={user.username} disabled readOnly />
      </Field>
      <Field label="Email" error={state.fields?.email} hint="Không bắt buộc. Nếu có, người dùng đăng nhập bằng email cũng được.">
        <Input name="email" type="email" defaultValue={user.email ?? ""} autoComplete="off" />
      </Field>
      <Field label="Họ tên" error={state.fields?.name}>
        <Input name="name" defaultValue={user.name} required />
      </Field>
      <Field label="Vai trò" error={state.fields?.role} hint={isSelf ? "Bạn không thể tự hạ quyền của mình." : undefined}>
        {/* select disabled không gửi giá trị → dùng hidden input khi là chính mình */}
        <Select name={isSelf ? undefined : "role"} defaultValue={user.role} disabled={isSelf}>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        {isSelf && <input type="hidden" name="role" value={user.role} />}
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isActive" defaultChecked={user.isActive} disabled={isSelf} />
        Đang hoạt động (bỏ chọn để khoá tài khoản)
        {isSelf && <input type="hidden" name="isActive" value="on" />}
      </label>
      <SubmitButton pendingText="Đang lưu...">Lưu thay đổi</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ id, username }: { id: string; username: string }) {
  const [state, action] = useFormState<FormState, FormData>(resetPassword, {});
  return (
    <form action={action} className="space-y-3">
      {state.error && <Alert>{state.error}</Alert>}
      {state.generatedPassword && <PasswordReveal username={username} password={state.generatedPassword} />}
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" pendingText="Đang đặt lại..." confirm={`Đặt lại mật khẩu cho ${username}?`}>
        Đặt lại mật khẩu
      </SubmitButton>
    </form>
  );
}
