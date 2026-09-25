import { Cpu, KeyRound } from "lucide-react";
import { Alert, Badge, Card, CardTitle, IconTile, Page, PageHeader } from "@/components/ui";
import { listModels, type ModelOption } from "@/lib/anthropic";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_MODEL, getAiSettingsView, type Source } from "@/lib/settings";
import { ApiKeyForm, ModelForm } from "./forms";

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

export default async function SettingsPage() {
  await requireAdmin();
  const { config, view } = await getAiSettingsView();

  // Danh sách model lấy trực tiếp từ Models API bằng key hiện hành
  let models: ModelOption[] = [];
  let modelsError = false;
  if (config.apiKey) {
    try {
      models = await listModels(config.apiKey);
    } catch {
      modelsError = true;
    }
  }

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
          {modelsError && <div className="mb-5"><Alert kind="warning">Không tải được danh sách model. Có thể nhập model id thủ công.</Alert></div>}
          <ModelForm
            current={view.model}
            models={models}
            fallbackModel={view.envModel || DEFAULT_MODEL}
            hasDbModel={view.modelSource === "db"}
          />
        </Card>
      </div>
    </Page>
  );
}
