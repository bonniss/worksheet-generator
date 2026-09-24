"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { USERNAME_HINT } from "@/lib/username";
import { createUser, type FormState } from "../actions";
import { PasswordReveal } from "../PasswordReveal";

export function CreateUserForm() {
  const [state, action] = useFormState<FormState, FormData>(createUser, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {state.generatedPassword && <PasswordReveal username={state.username} password={state.generatedPassword} />}

      <Field label="Username" error={state.fields?.username} hint={USERNAME_HINT}>
        <Input name="username" required autoComplete="off" autoCapitalize="none" spellCheck={false} pattern="[A-Za-z0-9._-]{3,32}" />
      </Field>
      <Field label="Email" error={state.fields?.email} hint="Không bắt buộc. Nếu có, người dùng đăng nhập bằng email cũng được.">
        <Input name="email" type="email" autoComplete="off" />
      </Field>
      <Field label="Họ tên" error={state.fields?.name}>
        <Input name="name" required />
      </Field>
      <Field label="Vai trò" error={state.fields?.role}>
        <Select name="role" defaultValue="user">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
      </Field>
      <Field label="Mật khẩu" error={state.fields?.password} hint="Để trống để hệ thống tự sinh mật khẩu.">
        <Input name="password" type="text" autoComplete="new-password" minLength={8} />
      </Field>
      <SubmitButton pendingText="Đang tạo...">Tạo tài khoản</SubmitButton>
    </form>
  );
}
