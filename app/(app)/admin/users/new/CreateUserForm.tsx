"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
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
      {state.generatedPassword && <PasswordReveal email={state.email} password={state.generatedPassword} />}

      <Field label="Email" error={state.fields?.email}>
        <Input name="email" type="email" required autoComplete="off" />
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
