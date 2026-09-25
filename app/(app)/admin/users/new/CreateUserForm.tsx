"use client";
import { useEffect, useRef } from "react";
import { useFormState } from "react-dom";
import { UserPlus } from "lucide-react";
import { Alert, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { USERNAME_HINT } from "@/lib/username";
import { createUser, type FormState } from "../actions";
import { PasswordReveal } from "../PasswordReveal";

export function CreateUserForm() {
  const [state, action] = useFormState<FormState, FormData>(createUser, {});
  const formRef = useRef<HTMLFormElement>(null);
  const f = state.fields ?? {};

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-5">
      {state.error && <Alert>{state.error}</Alert>}
      {state.success && !state.generatedPassword && <Alert kind="success">{state.success}</Alert>}
      {state.generatedPassword && <PasswordReveal username={state.username} password={state.generatedPassword} />}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Username" error={f.username} hint={USERNAME_HINT}>
          <Input
            name="username" required autoComplete="off" autoCapitalize="none" spellCheck={false}
            pattern="[A-Za-z0-9._\-]{3,32}" invalid={!!f.username} className="font-mono"
          />
        </Field>
        <Field label="Họ tên" error={f.name}>
          <Input name="name" required invalid={!!f.name} />
        </Field>
      </div>
      <Field label="Email" optional error={f.email} hint="Nếu có, người dùng đăng nhập bằng email cũng được.">
        <Input name="email" type="email" autoComplete="off" invalid={!!f.email} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Vai trò" error={f.role}>
          <Select name="role" defaultValue="user">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label="Mật khẩu" optional error={f.password} hint="Để trống để hệ thống tự sinh.">
          <Input name="password" type="text" autoComplete="new-password" minLength={8} invalid={!!f.password} className="font-mono" />
        </Field>
      </div>
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang tạo..." icon={<UserPlus size={16} />}>Tạo tài khoản</SubmitButton>
      </div>
    </form>
  );
}
