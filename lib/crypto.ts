import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

// Mã hoá bí mật lưu trong DB (AES-256-GCM). Khoá lấy từ SETTINGS_SECRET;
// nếu chưa đặt thì suy ra từ DATABASE_URL — vẫn tốt hơn lưu thô, nhưng nên đặt SETTINGS_SECRET riêng.
function key(): Buffer {
  const secret = process.env.SETTINGS_SECRET || process.env.DATABASE_URL;
  if (!secret) throw new Error("Thiếu SETTINGS_SECRET (hoặc DATABASE_URL) để mã hoá cấu hình");
  return createHash("sha256").update("worksheet-settings:" + secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), data.toString("base64")].join(":");
}

/** Trả null nếu không giải mã được (sai khoá — ví dụ SETTINGS_SECRET đã đổi). */
export function decryptSecret(stored: string): string | null {
  const [v, iv, tag, data] = stored.split(":");
  if (v !== "v1" || !iv || !tag || !data) return null;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(iv, "base64"));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return Buffer.concat([decipher.update(Buffer.from(data, "base64")), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** sk-ant-api03-…AbCd — chỉ để hiển thị. */
export function maskSecret(s: string): string {
  if (s.length <= 12) return "•".repeat(s.length);
  return `${s.slice(0, 10)}…${s.slice(-4)}`;
}
