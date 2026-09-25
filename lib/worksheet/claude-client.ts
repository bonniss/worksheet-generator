/* ================= GỌI API CLAUDE ================= */
// Cố gắng vá JSON bị cắt cuối: đóng nốt chuỗi/ngoặc còn thiếu
export function repairJson(raw: string): string {
  let s = raw.trim();
  const start = s.indexOf("{");
  if (start > 0) s = s.slice(start);
  // bỏ dấu phẩy thừa trước } hoặc ]
  s = s.replace(/,\s*([}\]])/g, "$1");
  // đếm ngoặc/nháy để đóng nốt nếu bị cắt giữa chừng
  let inStr = false, esc = false;
  const stack: string[] = [];
  for (const ch of s) {
    if (esc) { esc = false; continue; }
    if (ch === "\\") { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) s += '"';
  while (stack.length) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }
  s = s.replace(/,\s*([}\]])/g, "$1");
  return s;
}

export function parseLoose(text: string): unknown {
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  const core = end > start ? clean.slice(start, end + 1) : clean.slice(start);
  try { return JSON.parse(core); }
  catch { return JSON.parse(repairJson(core)); }
}

import type { AiPurpose } from "./ai-purposes";

export type ApiErrorKind = "network" | "rate_limit" | "overloaded" | "auth" | "server" | "empty" | "quota";

// Lỗi có kèm nhãn để phân biệt: lỗi máy chủ/hạn mức (không phải do nội dung dài)
export class ApiError extends Error {
  kind: ApiErrorKind;
  retryable: boolean;
  constructor(message: string, kind: ApiErrorKind, retryable?: boolean) {
    super(message);
    this.name = "ApiError";
    this.kind = kind;
    this.retryable = !!retryable;
  }
}

/** Ngữ cảnh của một lượt gọi — server dùng để ghi nhật ký và tính hạn mức. */
export type AiCallContext = {
  purpose: AiPurpose;
  runId: string;
  worksheetId?: string | null;
  meta?: { level?: string; type?: string };
};

type ErrorBody = { type?: string; error?: { type?: string; message?: string } };

function toApiError(status: number, body: ErrorBody | null): ApiError {
  const msg = body?.error?.message || "";
  const type = body?.error?.type || "";
  if (type === "quota_exceeded") return new ApiError(msg || "Đã hết lượt dùng AI hôm nay.", "quota", false);
  if (status === 429 || /rate.?limit|usage limit/i.test(msg)) {
    return new ApiError("Tài khoản AI đang chạm giới hạn tốc độ (rate limit). Chờ ít phút rồi thử lại.", "rate_limit", true);
  }
  if (status === 529 || status === 503 || /overload/i.test(msg) || type === "overloaded_error") {
    return new ApiError("Máy chủ AI đang quá tải. Chờ một lát rồi bấm Thử lại.", "overloaded", true);
  }
  if (status === 401 || status === 403) {
    return new ApiError(msg || "Không có quyền gọi AI (phiên đăng nhập có thể đã hết hạn). Tải lại trang rồi thử lại.", "auth", false);
  }
  return new ApiError("Máy chủ báo lỗi" + (status ? " (" + status + ")" : "") + (msg ? ": " + msg.slice(0, 160) : "") + ".", "server", status >= 500);
}

export type RawResult = { text: string; stop: string | null };

/**
 * Gọi /api/claude và đọc stream NDJSON: {"t":"d","x":"..."} từng đoạn chữ, {"t":"done",...} khi xong,
 * {"t":"error",...} nếu lỗi giữa chừng. `onText` nhận toàn bộ chữ đã có (throttle ~250ms).
 */
export async function callClaudeRaw(prompt: string, ctx: AiCallContext, onText?: (text: string) => void): Promise<RawResult> {
  let res: Response;
  try {
    res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, ...ctx }),
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", "network", true);
  }

  // Lỗi trước khi stream bắt đầu → JSON lỗi
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => null)) as ErrorBody | null;
    throw toApiError(res.status, body);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let text = "";
  let stop: string | null = null;
  let lastEmit = 0;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const ev = JSON.parse(line) as { t: string; x?: string; stop?: string; status?: number; message?: string };
    if (ev.t === "d" && ev.x) {
      text += ev.x;
      const now = Date.now();
      if (onText && now - lastEmit > 250) { lastEmit = now; onText(text); }
    } else if (ev.t === "done") {
      stop = ev.stop ?? null;
    } else if (ev.t === "error") {
      throw toApiError(ev.status ?? 500, { error: { message: ev.message } });
    }
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        handle(buf.slice(0, nl));
        buf = buf.slice(nl + 1);
      }
    }
    handle(buf);
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError("Mất kết nối trong lúc AI đang viết. Bấm Thử lại nhé.", "network", true);
  }
  if (onText) onText(text);
  if (!text.trim()) throw new ApiError("Máy chủ trả về nội dung rỗng. Bấm Thử lại nhé.", "empty", true);
  return { text, stop };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Thử dựng JSON từ chữ đang stream dở (đóng nốt ngoặc) — trả undefined nếu chưa dựng được. */
function tryPartial(text: string): unknown {
  if (text.indexOf("{") < 0) return undefined;
  try { return parseLoose(text); } catch { return undefined; }
}

/**
 * Gọi Claude và parse JSON trả về. T là shape mong đợi (không được kiểm tra lúc chạy).
 * `onPartial` nhận object dựng từ phần đã stream (để hiện dần nội dung).
 */
export async function callClaude<T>(prompt: string, ctx: AiCallContext, onPartial?: (partial: T) => void): Promise<T> {
  const onText = onPartial ? (t: string) => { const p = tryPartial(t); if (p) onPartial(p as T); } : undefined;
  // Lỗi máy chủ/hạn mức: chờ rồi thử lại (tối đa 2 lần), KHÔNG đổi prompt.
  // Lỗi JSON hỏng (kể cả bị cắt vì chạm max_tokens): thử lại 1 lần kèm nhắc trả JSON đầy đủ.
  let lastApiErr: ApiError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return parseLoose((await callClaudeRaw(prompt, ctx, onText)).text) as T;
    } catch (e) {
      if (e instanceof ApiError) {
        lastApiErr = e;
        if (!e.retryable || attempt === 2) throw e;
        await sleep(1200 * (attempt + 1)); // giãn cách tăng dần
        continue;
      }
      try {
        const retryPrompt = prompt + "\n\nLƯU Ý QUAN TRỌNG: chỉ trả JSON HỢP LỆ, ĐẦY ĐỦ (đóng đủ ngoặc), KHÔNG markdown, KHÔNG cắt giữa chừng. Nếu nội dung dài, rút gọn cho vừa nhưng phải đóng đủ JSON.";
        return parseLoose((await callClaudeRaw(retryPrompt, ctx, onText)).text) as T;
      } catch (e2) {
        if (e2 instanceof ApiError) { lastApiErr = e2; if (!e2.retryable || attempt === 2) throw e2; await sleep(1200 * (attempt + 1)); continue; }
        throw e2;
      }
    }
  }
  throw lastApiErr || new Error("Không tạo được nội dung.");
}
