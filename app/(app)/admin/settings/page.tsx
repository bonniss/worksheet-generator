import { KeyRound, Cpu } from "lucide-react";
import { Alert, Badge, Card, CardTitle, IconTile, Page, PageHeader } from "@/components/ui";
import { listModels, type ModelOption } from "@/lib/anthropic";
import { requireAdmin } from "@/lib/auth/session";
import { DEFAULT_MODEL, getAiSettingsView, type Source } from "@/lib/settings";
import { ApiKeyForm, ModelForm } from "./forms";

export const metadata = { title: "Cấu hình AI · Worksheet Generator" };
export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<Source, { text: string; tone: "primary" | "neutral" | "warning" | "danger" }> = {
  db: { text: "Cấu hình trong app", tone: "primary" },
  env: { text: "Biến môi trường", tone: "neutral" },
  default: { text: "Mặc định", tone: "neutral" },
  none: { text: "Chưa cấu hình", tone: "danger" },
};

function Meta({ meta }: { meta: { updatedAt: Date; updatedBy: string | null } | null }) {
  if (!meta) return null;
  return (
    <span className="text-xs text-zinc-400">
      Cập nhật {meta.updatedAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
      {meta.updatedBy && <> bởi <span className="font-mono">@{meta.updatedBy}</span></>}
    </span>
  );
}

export default async function SettingsPage() {
  await requireAdmin();
  const { config, view } = await getAiSettingsView();

  // Danh sách model lấy trực tiếp từ Models API bằng key hiện hành
  let models: ModelOption[] = [];
  let modelsError: string | null = null;
  if (config.apiKey) {
    try {
      models = await listModels(config.apiKey);
    } catch {
      modelsError = "Không tải được danh sách model bằng key hiện tại — có thể nhập model id thủ công.";
    }
  }
  const keySource = SOURCE_LABEL[view.apiKeySource];
  const modelSource = SOURCE_LABEL[view.modelSource];

  return (
    <Page width="form">
      <PageHeader
        title="Cấu hình AI"
        sub="Thay đổi có hiệu lực ngay cho mọi người dùng, không cần deploy lại. Giá trị ở đây ưu tiên hơn biến môi trường."
      />
      <div className="space-y-6">
        {view.apiKeyBroken && (
          <Alert kind="warning">
            Có API key lưu trong DB nhưng không giải mã được (có thể <code>SETTINGS_SECRET</code> đã đổi). Hãy nhập lại key.
          </Alert>
        )}

        <Card>
          <CardTitle
            icon={<IconTile><KeyRound size={18} /></IconTile>}
            title="Anthropic API key"
            sub="Key được mã hoá khi lưu và không bao giờ gửi xuống trình duyệt."
          />
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-page px-4 py-3">
            <span className="text-sm text-zinc-500">Đang dùng:</span>
            {view.apiKeyMasked ? <code className="text-sm text-zinc-900">{view.apiKeyMasked}</code> : <span className="text-sm text-zinc-400">—</span>}
            <Badge tone={keySource.tone}>{keySource.text}</Badge>
            {view.apiKeySource === "db" && <Meta meta={view.apiKeyMeta} />}
          </div>
          <ApiKeyForm hasDbKey={view.apiKeySource === "db" || view.apiKeyBroken} envHasKey={view.envHasKey} hasAnyKey={!!view.apiKeyMasked} />
        </Card>

        <Card>
          <CardTitle icon={<IconTile tone="accent"><Cpu size={18} /></IconTile>} title="Model" sub="Model dùng để sinh worksheet." />
          <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-page px-4 py-3">
            <span className="text-sm text-zinc-500">Đang dùng:</span>
            <code className="text-sm text-zinc-900">{view.model}</code>
            <Badge tone={modelSource.tone}>{modelSource.text}</Badge>
            {view.modelSource === "db" && <Meta meta={view.modelMeta} />}
          </div>
          {!config.apiKey && <div className="mb-4"><Alert kind="info">Thiết lập API key trước để tải danh sách model.</Alert></div>}
          {modelsError && <div className="mb-4"><Alert kind="warning">{modelsError}</Alert></div>}
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
