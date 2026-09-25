"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { KeyRound } from "lucide-react";
import { Alert, Checkbox, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Role } from "@/db/schema";
import { resetPassword, updateUser, updateUserLimits, type FormState } from "../actions";
import { PasswordReveal } from "../PasswordReveal";

type EditableUser = { id: string; username: string; email: string | null; name: string; role: Role; isActive: boolean };

export function EditUserForm({ user, isSelf }: { user: EditableUser; isSelf: boolean }) {
  const [state, action] = useFormState<FormState, FormData>(updateUser, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Username" hint="Dùng để đăng nhập, không đổi được.">
          <Input value={user.username} disabled readOnly className="font-mono" />
        </Field>
        <Field label="Họ tên" error={f.name}>
          <Input name="name" defaultValue={user.name} required invalid={!!f.name} />
        </Field>
      </div>
      <Field label="Email" optional error={f.email} hint="Nếu có, người dùng đăng nhập bằng email cũng được.">
        <Input name="email" type="email" defaultValue={user.email ?? ""} autoComplete="off" invalid={!!f.email} />
      </Field>
      <Field label="Vai trò" error={f.role} hint={isSelf ? "Bạn không thể tự hạ quyền của mình." : undefined}>
        {/* select disabled không gửi giá trị → dùng hidden input khi là chính mình */}
        <Select name={isSelf ? undefined : "role"} defaultValue={user.role} disabled={isSelf} className="sm:w-1/2">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
        {isSelf && <input type="hidden" name="role" value={user.role} />}
      </Field>
      <Checkbox
        name="isActive"
        defaultChecked={user.isActive}
        disabled={isSelf}
        label="Đang hoạt động"
        hint={isSelf ? "Bạn không thể tự khoá tài khoản của mình." : "Bỏ chọn để khoá — người dùng sẽ bị đăng xuất ngay."}
      />
      {isSelf && <input type="hidden" name="isActive" value="on" />}
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang lưu...">Lưu thay đổi</SubmitButton>
      </div>
      <input type="hidden" name="id" value={user.id} />
    </form>
  );
}

export function ResetPasswordForm({ id, username }: { id: string; username: string }) {
  const [state, action] = useFormState<FormState, FormData>(resetPassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state.success) formRef.current?.reset(); }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.generatedPassword && <PasswordReveal username={username} password={state.generatedPassword} />}
      {state.success && !state.generatedPassword && <Alert kind="success">{state.success}</Alert>}
      <Field label="Mật khẩu mới" optional hint="Để trống để hệ thống tự sinh. Người dùng sẽ phải đổi lại ở lần đăng nhập tới.">
        <Input name="password" type="text" autoComplete="new-password" minLength={8} className="font-mono sm:w-1/2" />
      </Field>
      <div>
        <SubmitButton
          variant="secondary" pendingText="Đang đặt lại..." icon={<KeyRound size={16} />}
          confirm={`Đặt lại mật khẩu cho @${username}? Người này sẽ bị đăng xuất khỏi mọi thiết bị và phải đổi mật khẩu khi đăng nhập lại.`}
        >
          Đặt lại mật khẩu
        </SubmitButton>
      </div>
      <input type="hidden" name="id" value={id} />
    </form>
  );
}

export function UserLimitsForm({ id, runs, regens, defaults }: {
  id: string; runs: number | null; regens: number | null; defaults: { runs: number; regens: number };
}) {
  const [state, action] = useFormState<FormState, FormData>(updateUserLimits, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Lượt tạo / ngày" optional hint={`Để trống = mặc định (${defaults.runs}).`}>
          <Input name="runs" type="number" min={0} max={5000} defaultValue={runs ?? ""} placeholder={String(defaults.runs)} />
        </Field>
        <Field label="Lượt gen lại / ngày" optional hint={`Để trống = mặc định (${defaults.regens}).`}>
          <Input name="regens" type="number" min={0} max={5000} defaultValue={regens ?? ""} placeholder={String(defaults.regens)} />
        </Field>
      </div>
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang lưu...">Lưu hạn mức</SubmitButton>
      </div>
      <input type="hidden" name="id" value={id} />
    </form>
  );
}
