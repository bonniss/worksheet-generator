import { Suspense } from "react";
import { Cpu, Gauge, KeyRound } from "lucide-react";
import { Alert, Badge, Card, CardTitle, IconTile, Page, PageHeader, Skeleton, Spinner } from "@/components/ui";
import { FieldSkeleton } from "@/components/ui/skeletons";
import { listModels, type ModelOption } from "@/lib/anthropic";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_MODEL, getAiLimits, getAiSettingsView, type Source } from "@/lib/settings";
import { ApiKeyForm, LimitsForm, ModelForm } from "./forms";

export const metadata = { title: "Cấu hình AI" };
export const dynamic = "force-dynamic";

// Nhãn cho admin: không nhắc tới biến môi trường/deploy — đó là chuyện của dev
const SOURCE_LABEL: Record<Source, { text: string; tone: "primary" | "neutral" | "danger" }> = {
  db: { text: "Đã cấu hình", tone: "primary" },
  env: { text: "Mặc định hệ thống", tone: "neutral" },
  default: { text: "Mặc định hệ thống", tone: "neutral" },
  none: { text: "Chưa cấu hình", tone: "danger" },
};

function Current({ value, source, meta }: {
  value: React.ReactNode; source: Source; meta: { updatedAt: Date; updatedBy: string | null } | null;
}) {
  const s = SOURCE_LABEL[source];
  return (
    <div className="mb-5 rounded-lg bg-page px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm text-zinc-500">Đang dùng</span>
        {value}
        <Badge tone={s.tone}>{s.text}</Badge>
      </div>
      {source === "db" && meta && (
        <div className="mt-1 text-xs text-zinc-400">
          Cập nhật {meta.updatedAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
          {meta.updatedBy && <> bởi <span className="font-mono">@{meta.updatedBy}</span></>}
        </div>
      )}
    </div>
  );
}

type ModelPickerProps = { apiKey: string | null; current: string; fallbackModel: string; hasDbModel: boolean };

/** Gọi Models API (có thể mất vài giây) — tách riêng + Suspense để phần còn lại của trang hiện ngay. */
async function ModelPicker({ apiKey, ...rest }: ModelPickerProps) {
  let models: ModelOption[] = [];
  let failed = false;
  if (apiKey) {
    try {
      models = await listModels(apiKey);
    } catch {
      failed = true;
    }
  }
  return (
    <>
      {failed && <div className="mb-5"><Alert kind="warning">Không tải được danh sách model. Có thể nhập model id thủ công.</Alert></div>}
      <ModelForm models={models} {...rest} />
    </>
  );
}

function ModelPickerFallback() {
  return (
    <div>
      <FieldSkeleton />
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
        <Spinner size="sm" /> Đang tải danh sách model...
      </div>
      <div className="mt-5 flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <Skeleton className="h-[38px] w-32 rounded-lg" />
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  await requireAdmin();
  const [{ config, view }, limits] = await Promise.all([getAiSettingsView(), getAiLimits()]);

  return (
    <Page>
      <PageHeader title="Cấu hình AI" sub="Áp dụng cho toàn hệ thống, có hiệu lực ngay." />
      {view.apiKeyBroken && (
        <div className="mb-6">
          <Alert kind="warning">API key đã lưu không còn dùng được. Hãy nhập lại key.</Alert>
        </div>
      )}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle icon={<IconTile><KeyRound size={18} /></IconTile>} title="Anthropic API key" sub="Được mã hoá khi lưu, không hiển thị lại." />
          <Current
            value={view.apiKeyMasked ? <code className="text-sm text-zinc-900">{view.apiKeyMasked}</code> : <span className="text-sm text-zinc-400">—</span>}
            source={view.apiKeySource}
            meta={view.apiKeyMeta}
          />
          <ApiKeyForm hasDbKey={view.apiKeySource === "db" || view.apiKeyBroken} hasAnyKey={!!view.apiKeyMasked} />
        </Card>

        <Card>
          <CardTitle icon={<IconTile tone="accent"><Cpu size={18} /></IconTile>} title="Model" sub="Dùng để sinh worksheet." />
          <Current value={<code className="text-sm text-zinc-900">{view.model}</code>} source={view.modelSource} meta={view.modelMeta} />
          {!config.apiKey && <div className="mb-5"><Alert kind="info">Thiết lập API key trước để chọn model từ danh sách.</Alert></div>}
          <Suspense fallback={<ModelPickerFallback />}>
            <ModelPicker
              apiKey={config.apiKey}
              current={view.model}
              fallbackModel={view.envModel || DEFAULT_MODEL}
              hasDbModel={view.modelSource === "db"}
            />
          </Suspense>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle icon={<IconTile><Gauge size={18} /></IconTile>} title="Hạn mức sử dụng" sub="Giới hạn lượt dùng AI để kiểm soát chi phí." />
          <LimitsForm {...limits} />
        </Card>
      </div>
    </Page>
  );
}
