"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changePassword, updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, action] = useFormState<ProfileState, FormData>(updateProfile, {});
  return (
    <form action={action} className="space-y-4">
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <Field label="Họ tên" error={state.fields?.name}>
        <Input name="name" defaultValue={name} required />
      </Field>
      <SubmitButton pendingText="Đang lưu...">Lưu</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useFormState<ProfileState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <Field label="Mật khẩu hiện tại" error={state.fields?.currentPassword}>
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="Mật khẩu mới" error={state.fields?.newPassword} hint="Tối thiểu 8 ký tự.">
        <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Nhập lại mật khẩu mới" error={state.fields?.confirmPassword}>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton pendingText="Đang đổi...">Đổi mật khẩu</SubmitButton>
    </form>
  );
}
