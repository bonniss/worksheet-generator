"use client";
import { useFormState } from "react-dom";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="space-y-4">
      {state.error && <Alert>{state.error}</Alert>}
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email">
        <Input name="email" type="email" autoComplete="email" required autoFocus defaultValue={state.email} />
      </Field>
      <Field label="Mật khẩu">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton className="w-full" pendingText="Đang đăng nhập...">Đăng nhập</SubmitButton>
    </form>
  );
}
