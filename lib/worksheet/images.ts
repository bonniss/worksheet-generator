// Ảnh trong worksheet: lúc soạn giữ dạng data URL (xem trước tức thì); khi lưu vào DB thì upload từng ảnh
// lên /api/images và thay bằng đường dẫn, để payload worksheet nhỏ (Vercel giới hạn request 4.5MB).
// Khi xuất file (.json, bản in) thì làm ngược lại: nhúng ảnh về data URL để file dùng được ở nơi khác.

const DATA_IMAGE = /^data:image\//;
const REMOTE_IMAGE = /^\/api\/images\/[0-9a-f-]{36}$/i;

/** Duyệt sâu và thay mọi chuỗi thoả điều kiện; trả về bản sao (không sửa object gốc). */
function mapStrings<T>(value: T, fn: (s: string) => string): T {
  if (typeof value === "string") return fn(value) as T;
  if (Array.isArray(value)) return value.map((v) => mapStrings(v, fn)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = mapStrings(v, fn);
    return out as T;
  }
  return value;
}

function collect(value: unknown, test: RegExp, into = new Set<string>()): Set<string> {
  if (typeof value === "string") { if (test.test(value)) into.add(value); }
  else if (Array.isArray(value)) value.forEach((v) => collect(v, test, into));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collect(v, test, into));
  return into;
}

export function hasInlineImages(value: unknown): boolean {
  return collect(value, DATA_IMAGE).size > 0;
}

const TARGET_BYTES = 1024 * 1024; // server nhận tối đa 3MB/ảnh; nhắm ≤ 1MB cho nhẹ

/** Ảnh quá nặng (vd. từ file .worksheet.json cũ, chưa qua nén) → vẽ lại lên canvas, hạ chất lượng rồi kích thước dần. */
async function shrink(blob: Blob): Promise<Blob> {
  if (blob.size <= TARGET_BYTES || blob.type === "image/gif") return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return blob;
  let best = blob;
  for (const maxSide of [900, 700, 500]) {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      // WebP giữ được nền trong suốt; trình duyệt không hỗ trợ sẽ trả PNG
      const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
      if (out && out.size < best.size) best = out;
      if (best.size <= TARGET_BYTES) return best;
    }
  }
  return best;
}

async function uploadOne(dataUrl: string): Promise<string> {
  const blob = await shrink(await (await fetch(dataUrl)).blob());
  const res = await fetch("/api/images", { method: "POST", headers: { "Content-Type": blob.type || "application/octet-stream" }, body: blob });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = (body as { error?: { message?: unknown } } | null)?.error?.message;
    throw new Error(typeof msg === "string" ? msg : `Tải ảnh lên lỗi (${res.status}).`);
  }
  const url = (body as { url?: unknown } | null)?.url;
  if (typeof url !== "string") throw new Error("Máy chủ không trả về đường dẫn ảnh.");
  return url;
}

/** Upload mọi ảnh data URL (song song, bỏ trùng) rồi trả bản sao đã thay bằng /api/images/<id>. */
export async function uploadInlineImages<T>(value: T): Promise<T> {
  const pending = [...collect(value, DATA_IMAGE)];
  if (!pending.length) return value;
  const urls = await Promise.all(pending.map(uploadOne));
  const map = new Map(pending.map((d, i) => [d, urls[i]]));
  return mapStrings(value, (s) => map.get(s) ?? s);
}

async function toDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Không tải được ảnh (${res.status}).`);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Nhúng ngược ảnh /api/images/<id> thành data URL (cho file xuất ra). Ảnh lỗi thì giữ nguyên đường dẫn. */
export async function inlineRemoteImages<T>(value: T): Promise<T> {
  const urls = [...collect(value, REMOTE_IMAGE)];
  if (!urls.length) return value;
  const data = await Promise.all(urls.map((u) => toDataUrl(u).catch(() => u)));
  const map = new Map(urls.map((u, i) => [u, data[i]]));
  return mapStrings(value, (s) => map.get(s) ?? s);
}

/** Như trên nhưng cho cây DOM (bản in được tạo bằng cách clone khối worksheet đang hiển thị). */
export async function inlineImagesInDom(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll("img")].filter((img) => REMOTE_IMAGE.test(img.getAttribute("src") || ""));
  await Promise.all(imgs.map(async (img) => {
    try { img.setAttribute("src", await toDataUrl(img.getAttribute("src")!)); } catch { /* giữ nguyên */ }
  }));
}
