"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { changePassword, updateProfile, type ProfileState } from "./actions";

export function ProfileForm({ name }: { name: string }) {
  const [state, action] = useFormState<ProfileState, FormData>(updateProfile, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <Field label="Họ tên" error={state.fields?.name}>
        <Input name="name" defaultValue={name} required invalid={!!state.fields?.name} />
      </Field>
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang lưu...">Lưu</SubmitButton>
      </div>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useFormState<ProfileState, FormData>(changePassword, {});
  const formRef = useRef<HTMLFormElement>(null);
  const f = state.fields ?? {};
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      {state.success && <Alert kind="success">{state.success}</Alert>}
      <Field label="Mật khẩu hiện tại" error={f.currentPassword}>
        <Input name="currentPassword" type="password" autoComplete="current-password" required invalid={!!f.currentPassword} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Mật khẩu mới" error={f.newPassword} hint="Tối thiểu 8 ký tự.">
          <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required invalid={!!f.newPassword} />
        </Field>
        <Field label="Nhập lại mật khẩu mới" error={f.confirmPassword}>
          <Input name="confirmPassword" type="password" autoComplete="new-password" required invalid={!!f.confirmPassword} />
        </Field>
      </div>
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang đổi...">Đổi mật khẩu</SubmitButton>
      </div>
    </form>
  );
}
