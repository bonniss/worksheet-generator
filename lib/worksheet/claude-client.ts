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

export type ApiErrorKind = "network" | "rate_limit" | "overloaded" | "auth" | "server" | "empty";

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

interface AnthropicResponse {
  type?: string;
  error?: { message?: string };
  content?: { type: string; text?: string }[];
}

export async function callClaudeRaw(prompt: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/claude", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
      }),
    });
  } catch {
    throw new ApiError("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", "network", true);
  }

  let data: AnthropicResponse | null = null;
  try { data = (await res.json()) as AnthropicResponse; } catch { data = null; }

  // Máy chủ trả lỗi -> báo đúng nguyên nhân thay vì đổ cho "nội dung dài"
  if (!res.ok || (data && data.type === "error")) {
    const msg = (data && data.error && data.error.message) || "";
    const status = res.status;
    if (status === 429 || /rate.?limit|quota|usage limit/i.test(msg)) {
      throw new ApiError("Tài khoản đã chạm giới hạn sử dụng (rate limit). Chờ ít phút rồi thử lại, hoặc dùng tài khoản khác.", "rate_limit", true);
    }
    if (status === 529 || status === 503 || /overload/i.test(msg)) {
      throw new ApiError("Máy chủ đang quá tải. Chờ một lát rồi bấm Thử lại.", "overloaded", true);
    }
    if (status === 401 || status === 403) {
      throw new ApiError("Không có quyền gọi AI (phiên đăng nhập có thể đã hết hạn). Tải lại trang rồi thử lại.", "auth", false);
    }
    throw new ApiError("Máy chủ báo lỗi" + (status ? " (" + status + ")" : "") + (msg ? ": " + msg.slice(0, 120) : "") + ".", "server", status >= 500);
  }

  const text = (data && data.content ? data.content : []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
  if (!text.trim()) throw new ApiError("Máy chủ trả về nội dung rỗng. Bấm Thử lại nhé.", "empty", true);
  return text;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Gọi Claude và parse JSON trả về. T là shape mong đợi (không được kiểm tra lúc chạy). */
export async function callClaude<T>(prompt: string): Promise<T> {
  // Lỗi máy chủ/hạn mức: chờ rồi thử lại (tối đa 2 lần), KHÔNG đổi prompt.
  // Lỗi JSON hỏng: thử lại 1 lần kèm nhắc trả JSON đầy đủ.
  let lastApiErr: ApiError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return parseLoose(await callClaudeRaw(prompt)) as T;
    } catch (e) {
      if (e instanceof ApiError) {
        lastApiErr = e;
        if (!e.retryable || attempt === 2) throw e;
        await sleep(1200 * (attempt + 1)); // giãn cách tăng dần
        continue;
      }
      // JSON hỏng -> thử lại một lần với lời nhắc rõ hơn
      try {
        const retryPrompt = prompt + "\n\nLƯU Ý QUAN TRỌNG: chỉ trả JSON HỢP LỆ, ĐẦY ĐỦ (đóng đủ ngoặc), KHÔNG markdown, KHÔNG cắt giữa chừng. Nếu nội dung dài, rút gọn cho vừa nhưng phải đóng đủ JSON.";
        return parseLoose(await callClaudeRaw(retryPrompt)) as T;
      } catch (e2) {
        if (e2 instanceof ApiError) { lastApiErr = e2; if (!e2.retryable || attempt === 2) throw e2; await sleep(1200 * (attempt + 1)); continue; }
        throw e2;
      }
    }
  }
  throw lastApiErr || new Error("Không tạo được nội dung.");
}
