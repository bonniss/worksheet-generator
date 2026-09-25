"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { PlugZap, RotateCcw, Save, Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ModelOption } from "@/lib/anthropic";
import { clearApiKey, resetModel, saveApiKey, saveModel, testApiKey, type SettingsState } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.warning) return <Alert kind="warning">{state.warning}</Alert>;
  if (state.success) return <Alert kind="success">{state.success}</Alert>;
  return null;
}

/** Chạy server action không cần form (xoá, kiểm tra), gom kết quả vào cùng một chỗ hiển thị. */
function useAction() {
  const [state, setState] = useState<SettingsState>({});
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<SettingsState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => setState(await fn()));
  };
  return { state, setState, pending, run };
}

export function ApiKeyForm({ hasDbKey, hasAnyKey }: { hasDbKey: boolean; hasAnyKey: boolean }) {
  const [formState, action] = useFormState<SettingsState, FormData>(saveApiKey, {});
  const extra = useAction();
  const formRef = useRef<HTMLFormElement>(null);
  const [shown, setShown] = useState<SettingsState>({});

  useEffect(() => {
    setShown(formState);
    if (formState.success || formState.warning) formRef.current?.reset();
  }, [formState]);
  useEffect(() => setShown(extra.state), [extra.state]);

  return (
    <div className="space-y-5">
      <Feedback state={shown} />
      <form ref={formRef} action={action} className="space-y-5">
        <Field label={hasAnyKey ? "Thay bằng key mới" : "API key"} hint="Lấy tại console.anthropic.com → API Keys. Key được kiểm tra trước khi lưu.">
          <Input name="apiKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-api03-..." className="font-mono" required />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-zinc-100 pt-5">
          <div className="flex flex-wrap gap-1">
            {hasAnyKey && (
              <Button type="button" variant="ghost" disabled={extra.pending} onClick={() => extra.run(testApiKey)}>
                <PlugZap size={16} /> Kiểm tra kết nối
              </Button>
            )}
            {hasDbKey && (
              <Button
                type="button" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" disabled={extra.pending}
                onClick={() => extra.run(clearApiKey, "Xoá key đã cấu hình? Hệ thống sẽ quay về key mặc định (nếu có).")}
              >
                <Trash2 size={16} /> Xoá key
              </Button>
            )}
          </div>
          <SubmitButton pendingText="Đang kiểm tra & lưu..." icon={<Save size={16} />}>Lưu key</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function ModelForm({
  current, models, fallbackModel, hasDbModel,
}: { current: string; models: ModelOption[]; fallbackModel: string; hasDbModel: boolean }) {
  const [formState, action] = useFormState<SettingsState, FormData>(saveModel, {});
  const extra = useAction();
  const [shown, setShown] = useState<SettingsState>({});
  const inList = models.some((m) => m.id === current);
  // Model hiện tại không có trong danh sách → mở sẵn ô nhập tay để không vô tình đổi model
  const [mode, setMode] = useState<"list" | "custom">(models.length > 0 && inList ? "list" : "custom");

  useEffect(() => setShown(formState), [formState]);
  useEffect(() => setShown(extra.state), [extra.state]);

  return (
    <div className="space-y-5">
      <Feedback state={shown} />
      <form action={action} className="space-y-5">
        {mode === "list" && models.length > 0 ? (
          <Field
            label="Chọn model"
            hint={<>Các model khả dụng với key hiện tại. <button type="button" onClick={() => setMode("custom")} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary hover:underline">Nhập model id thủ công</button></>}
          >
            <Select name="model" defaultValue={inList ? current : models[0].id} className="font-mono">
              {models.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {m.id}</option>
              ))}
            </Select>
          </Field>
        ) : (
          <Field
            label="Model id"
            hint={models.length > 0
              ? <button type="button" onClick={() => setMode("list")} className="cursor-pointer border-0 bg-transparent p-0 text-xs font-medium text-primary hover:underline">Chọn từ danh sách</button>
              : "Ví dụ: claude-haiku-4-5, claude-sonnet-5, claude-opus-5"}
          >
            <Input name="customModel" defaultValue={current} spellCheck={false} autoCapitalize="none" className="font-mono" required />
          </Field>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-zinc-100 pt-5">
          <div>
            {hasDbModel && (
              <Button type="button" variant="ghost" disabled={extra.pending} onClick={() => extra.run(resetModel, `Quay về model mặc định của hệ thống (${fallbackModel})?`)}>
                <RotateCcw size={16} /> Dùng mặc định
              </Button>
            )}
          </div>
          <SubmitButton pendingText="Đang lưu..." icon={<Save size={16} />}>Lưu model</SubmitButton>
        </div>
      </form>
    </div>
  );
}
