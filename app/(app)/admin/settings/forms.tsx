"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useFormState } from "react-dom";
import { PlugZap, RotateCcw, Save, Trash2 } from "lucide-react";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { ModelOption } from "@/lib/anthropic";
import { clearApiKey, resetModel, saveApiKey, saveLimits, saveModel, testApiKey, type SettingsState } from "./actions";

function Feedback({ state }: { state: SettingsState }) {
  if (state.error) return <Alert>{state.error}</Alert>;
  if (state.warning) return <Alert kind="warning">{state.warning}</Alert>;
  if (state.success) return <Alert kind="success">{state.success}</Alert>;
  return null;
}

/** Chạy server action không cần form (xoá, kiểm tra), gom kết quả vào cùng một chỗ hiển thị.
 *  `running` cho biết action nào đang chạy để chỉ nút đó hiện spinner. */
function useAction() {
  const [state, setState] = useState<SettingsState>({});
  const [running, setRunning] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (name: string, fn: () => Promise<SettingsState>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setRunning(name);
    start(async () => {
      setState(await fn());
      setRunning(null);
    });
  };
  const is = (name: string) => pending && running === name;
  return { state, setState, pending, run, is };
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
      <form ref={formRef} action={action} className="flex flex-col gap-5">
        <Field label={hasAnyKey ? "Thay bằng key mới" : "API key"} hint="Lấy tại console.anthropic.com → API Keys. Key được kiểm tra trước khi lưu.">
          <Input name="apiKey" type="password" autoComplete="off" spellCheck={false} placeholder="sk-ant-api03-..." className="font-mono" required />
        </Field>
        <div className="flex flex-wrap items-center justify-between gap-2 border-0 border-t border-solid border-zinc-100 pt-5">
          <div className="flex flex-wrap gap-1">
            {hasAnyKey && (
              <Button
                type="button" variant="ghost" icon={<PlugZap size={16} />}
                loading={extra.is("test")} disabled={extra.pending} onClick={() => extra.run("test", testApiKey)}
              >
                {extra.is("test") ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
              </Button>
            )}
            {hasDbKey && (
              <Button
                type="button" variant="ghost" className="text-danger hover:bg-danger-soft hover:text-danger" icon={<Trash2 size={16} />}
                loading={extra.is("clear")} disabled={extra.pending}
                onClick={() => extra.run("clear", clearApiKey, "Xoá key đã cấu hình? Hệ thống sẽ quay về key mặc định (nếu có).")}
              >
                {extra.is("clear") ? "Đang xoá..." : "Xoá key"}
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
      <form action={action} className="flex flex-col gap-5">
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
              <Button
                type="button" variant="ghost" icon={<RotateCcw size={16} />}
                loading={extra.is("reset")} disabled={extra.pending}
                onClick={() => extra.run("reset", resetModel, `Quay về model mặc định của hệ thống (${fallbackModel})?`)}
              >
                {extra.is("reset") ? "Đang đổi..." : "Dùng mặc định"}
              </Button>
            )}
          </div>
          <SubmitButton pendingText="Đang lưu..." icon={<Save size={16} />}>Lưu model</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function LimitsForm({ runsPerDay, regensPerDay, systemUsdPerDay }: { runsPerDay: number; regensPerDay: number; systemUsdPerDay: number | null }) {
  const [state, action] = useFormState<SettingsState, FormData>(saveLimits, {});
  return (
    <form action={action} className="flex flex-col gap-5">
      <Feedback state={state} />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Lượt tạo worksheet / người / ngày" hint="Mỗi lần bấm Tạo worksheet.">
          <Input name="runsPerDay" type="number" min={0} max={1000} defaultValue={runsPerDay} required />
        </Field>
        <Field label="Lượt gen lại / người / ngày" hint="Gen lại 1 bài hoặc phần Learn.">
          <Input name="regensPerDay" type="number" min={0} max={5000} defaultValue={regensPerDay} required />
        </Field>
        <Field label="Trần chi phí toàn hệ thống / ngày (USD)" optional hint="Để trống = không giới hạn.">
          <Input name="systemUsdPerDay" type="number" min={0.01} step={0.01} defaultValue={systemUsdPerDay ?? ""} placeholder="Không giới hạn" />
        </Field>
      </div>
      <p className="-mt-1 text-xs text-zinc-500">Admin không bị giới hạn. Có thể đặt hạn mức riêng cho từng người ở trang chi tiết tài khoản. Hạn mức làm mới lúc 0h (giờ Việt Nam).</p>
      <div className="flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <SubmitButton pendingText="Đang lưu..." icon={<Save size={16} />}>Lưu hạn mức</SubmitButton>
      </div>
    </form>
  );
}
