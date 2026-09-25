import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Client theo key hiện hành (key có thể đổi lúc chạy qua trang cấu hình, nên không dùng singleton).
// maxRetries: 0 — phía trình duyệt (callClaude) đã tự thử lại khi gặp 429/5xx.
export function anthropicClient(apiKey: string, opts?: { timeout?: number }) {
  return new Anthropic({ apiKey, maxRetries: 0, timeout: opts?.timeout ?? 60_000 });
}

export type ModelOption = { id: string; name: string; createdAt: string };

/** Danh sách model mà key được dùng (Models API), mới nhất trước. */
export async function listModels(apiKey: string): Promise<ModelOption[]> {
  const client = anthropicClient(apiKey, { timeout: 15_000 });
  const out: ModelOption[] = [];
  for await (const m of client.models.list({ limit: 100 })) {
    out.push({ id: m.id, name: m.display_name, createdAt: m.created_at });
  }
  return out;
}

export type VerifyResult = { ok: true; models: ModelOption[] } | { ok: false; auth: boolean; message: string };

/** Kiểm tra key bằng Models API. `auth: true` = key sai hoặc không có quyền. */
export async function verifyApiKey(apiKey: string): Promise<VerifyResult> {
  try {
    return { ok: true, models: await listModels(apiKey) };
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, auth: true, message: "API key không hợp lệ hoặc không có quyền." };
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return { ok: false, auth: false, message: "Không kết nối được tới Anthropic API." };
    }
    if (e instanceof Anthropic.APIError) {
      return { ok: false, auth: false, message: `Anthropic API báo lỗi ${e.status ?? ""}: ${e.message}`.trim() };
    }
    return { ok: false, auth: false, message: "Không kiểm tra được API key." };
  }
}
