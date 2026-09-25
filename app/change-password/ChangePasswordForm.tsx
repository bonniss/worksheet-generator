"use client";
import { useFormState } from "react-dom";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changeInitialPassword, type ChangeState } from "./actions";

export function ChangePasswordForm() {
  const [state, action] = useFormState<ChangeState, FormData>(changeInitialPassword, {});
  const f = state.fields ?? {};
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Mật khẩu mới" error={f.newPassword} hint="Tối thiểu 8 ký tự.">
        <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required autoFocus invalid={!!f.newPassword} />
      </Field>
      <Field label="Nhập lại mật khẩu mới" error={f.confirmPassword}>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required invalid={!!f.confirmPassword} />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Đang lưu..." navigates>Đổi mật khẩu và tiếp tục</SubmitButton>
    </form>
  );
}
