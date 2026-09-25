"use client";
import { useFormState } from "react-dom";
import { Alert, Field, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useFormState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      {state.error && <Alert>{state.error}</Alert>}
      <Field label="Tên đăng nhập hoặc email">
        <Input
          name="identifier" autoComplete="username" autoCapitalize="none" spellCheck={false} required autoFocus
          defaultValue={state.identifier}
        />
      </Field>
      <Field label="Mật khẩu">
        <Input name="password" type="password" autoComplete="current-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingText="Đang đăng nhập...">Đăng nhập</SubmitButton>
      <input type="hidden" name="next" value={next ?? ""} />
    </form>
  );
}
