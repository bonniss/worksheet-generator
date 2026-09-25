// Proxy phía server tới Anthropic API: gắn system prompt dùng chung (có cache), stream kết quả về trình duyệt
// dạng NDJSON và ghi nhật ký từng lượt gọi (ai_calls). Key + model lấy từ cấu hình hệ thống (/admin/settings).
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { estimateCost } from "@/lib/ai-pricing";
import { logAiCall, type AiCallRow } from "@/lib/ai-log";
import { anthropicClient } from "@/lib/anthropic";
import { apiUser, jsonError } from "@/lib/auth/api";
import { getAiConfig } from "@/lib/settings";
import { checkQuota } from "@/lib/usage";
import { AI_PURPOSES } from "@/lib/worksheet/ai-purposes";
import { SYSTEM_PROMPT } from "@/lib/worksheet/prompts";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel: tối đa 60s cho một lượt

// Mỗi lượt chỉ sinh 1 phần (khung / Learn / 1 bài tập) nên 4096 là dư; trước đây 1024 hay bị cắt JSON.
const MAX_TOKENS = 4096;
// 424: lỗi cấu hình phía server — tránh 401/403 vì client hiểu đó là "phiên đăng nhập hết hạn"
const CONFIG_ERROR = 424;


const bodySchema = z.object({
  prompt: z.string().min(1).max(30_000),
  purpose: z.enum(AI_PURPOSES),
  runId: z.uuid(),
  worksheetId: z.uuid().nullish(),
  meta: z.object({ level: z.string().max(20).optional(), type: z.string().max(30).optional() }).optional(),
});

/** Chuyển lỗi SDK thành (status, message) cho client + nhãn lỗi để ghi log. */
function describeError(e: unknown, model: string): { status: number; message: string; errorType: string; body?: unknown } {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return { status: CONFIG_ERROR, errorType: "auth", message: "Anthropic API key không hợp lệ hoặc hết quyền. Quản trị viên kiểm tra lại ở Cấu hình AI." };
  }
  if (e instanceof Anthropic.NotFoundError) {
    return { status: CONFIG_ERROR, errorType: "model_not_found", message: `Model "${model}" không tồn tại hoặc key không được dùng. Quản trị viên chọn model khác ở Cấu hình AI.` };
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return { status: 502, errorType: e instanceof Anthropic.APIConnectionTimeoutError ? "timeout" : "connection", message: "Không kết nối được tới Anthropic API." };
  }
  if (e instanceof Anthropic.APIError && e.status) {
    const type = (e.error as { error?: { type?: string } } | undefined)?.error?.type ?? `http_${e.status}`;
    return { status: e.status, errorType: type, message: e.message, body: e.error };
  }
  if (e instanceof Error && e.name === "AbortError") return { status: 499, errorType: "aborted", message: "Đã huỷ." };
  return { status: 500, errorType: "unknown", message: e instanceof Error ? e.message : "Lỗi không xác định." };
}

export async function POST(req: NextRequest) {
  const { user, error } = await apiUser();
  if (error) return error;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError(400, "Yêu cầu không hợp lệ.");
  const { prompt, purpose, runId, worksheetId, meta } = parsed.data;

  const cfg = await getAiConfig();
  if (!cfg.apiKey) {
    return jsonError(CONFIG_ERROR, "Chưa cấu hình Anthropic API key. Quản trị viên vào Cấu hình AI để thiết lập.");
  }

  const started = Date.now();
  const base: AiCallRow = {
    userId: user.id, runId, purpose, worksheetId: worksheetId ?? null,
    level: meta?.level ?? null, type: meta?.type ?? null,
    model: cfg.model, maxTokens: MAX_TOKENS, promptChars: prompt.length, status: "ok",
  };

  // Hạn mức theo người / trần chi phí hệ thống — bị chặn thì không gọi Anthropic
  const quota = await checkQuota(user, purpose, runId);
  if (!quota.ok) {
    void logAiCall({ ...base, status: "blocked", errorType: "quota_exceeded", httpStatus: 429, durationMs: 0 });
    return NextResponse.json({ type: "error", error: { type: "quota_exceeded", message: quota.message } }, { status: 429 });
  }

  const stream = anthropicClient(cfg.apiKey, { timeout: 58_000 }).messages.stream(
    {
      model: cfg.model,
      max_tokens: MAX_TOKENS,
      // Phần cố định dùng chung → cache (model/prefix dưới ngưỡng tối thiểu thì API tự bỏ qua, xem cache_* trong log)
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    },
    { signal: req.signal },
  );

  // Lỗi trước khi có dữ liệu (key sai, model sai, quá tải...) → trả JSON lỗi như trước để client phân loại/thử lại
  try {
    await stream.withResponse();
  } catch (e) {
    const d = describeError(e, cfg.model);
    // Khi lỗi, request id nằm trên object lỗi của SDK (header request-id của Anthropic)
    const requestId = (e instanceof Anthropic.APIError ? e.requestID : null) ?? stream.request_id ?? null;
    void logAiCall({ ...base, status: "error", errorType: d.errorType, httpStatus: d.status, durationMs: Date.now() - started, requestId });
    // Lỗi API thông thường (429, 529...): trả nguyên thân lỗi của Anthropic để client nhận diện loại lỗi
    if (d.body && d.status !== CONFIG_ERROR) return NextResponse.json(d.body, { status: d.status });
    return jsonError(d.status, d.message);
  }

  const encoder = new TextEncoder();
  let ttft: number | null = null;
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      stream.on("text", (delta) => {
        if (ttft === null) ttft = Date.now() - started;
        send({ t: "d", x: delta });
      });
      stream
        .finalMessage()
        .then((msg) => {
          const u = msg.usage;
          send({ t: "done", stop: msg.stop_reason, usage: { in: u.input_tokens, out: u.output_tokens, cr: u.cache_read_input_tokens ?? 0, cw: u.cache_creation_input_tokens ?? 0 } });
          const cost = estimateCost(msg.model, u);
          void logAiCall({
            ...base, model: msg.model,
            inputTokens: u.input_tokens, outputTokens: u.output_tokens,
            cacheReadTokens: u.cache_read_input_tokens ?? 0, cacheWriteTokens: u.cache_creation_input_tokens ?? 0,
            stopReason: msg.stop_reason, durationMs: Date.now() - started, ttftMs: ttft,
            httpStatus: 200, requestId: stream.request_id ?? null, costUsd: cost === null ? null : cost.toFixed(6),
          });
        })
        .catch((e: unknown) => {
          const d = describeError(e, cfg.model);
          send({ t: "error", status: d.status, message: d.message });
          // Lỗi giữa chừng vẫn có thể đã tiêu token — ghi lại phần usage đã biết
          const u = stream.currentMessage?.usage;
          void logAiCall({
            ...base, status: "error", errorType: d.errorType, httpStatus: d.status,
            inputTokens: u?.input_tokens ?? null, outputTokens: u?.output_tokens ?? null,
            durationMs: Date.now() - started, ttftMs: ttft,
            requestId: (e instanceof Anthropic.APIError ? e.requestID : null) ?? stream.request_id ?? null,
            costUsd: u ? (estimateCost(cfg.model, u)?.toFixed(6) ?? null) : null,
          });
        })
        .finally(() => controller.close());
    },
    cancel() {
      stream.abort(); // trình duyệt huỷ (đóng tab) → dừng gọi Anthropic
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}
