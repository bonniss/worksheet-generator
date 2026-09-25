import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { worksheetImages } from "@/db/schema";
import { apiUser, jsonError } from "@/lib/auth/api";

export const runtime = "nodejs";

// Ảnh đã được client thu nhỏ (≤ 900px) nên thường chỉ vài trăm KB; 3MB là trần an toàn dưới giới hạn 4.5MB của Vercel.
const MAX_BYTES = 3 * 1024 * 1024;

// Nhận diện định dạng bằng "magic bytes" thay vì tin Content-Type. Không nhận SVG (có thể chứa script).
function sniffMime(b: Buffer): string | null {
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  if (b.length >= 6 && /^GIF8[79]a$/.test(b.toString("ascii", 0, 6))) return "image/gif";
  return null;
}

/** Upload một ảnh (body là bytes thô). Trả về { id, url }. */
export async function POST(req: NextRequest) {
  const { user, error } = await apiUser();
  if (error) return error;

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > MAX_BYTES) return jsonError(413, "Ảnh quá lớn (tối đa 3MB).");
  const bytes = Buffer.from(await req.arrayBuffer());
  if (bytes.length === 0) return jsonError(400, "Không có dữ liệu ảnh.");
  if (bytes.length > MAX_BYTES) return jsonError(413, "Ảnh quá lớn (tối đa 3MB).");
  const mime = sniffMime(bytes);
  if (!mime) return jsonError(415, "Chỉ nhận ảnh PNG, JPEG, WebP hoặc GIF.");

  const [row] = await db
    .insert(worksheetImages)
    .values({ ownerId: user.id, mime, size: bytes.length, bytes })
    .returning({ id: worksheetImages.id });
  return NextResponse.json({ id: row.id, url: `/api/images/${row.id}` }, { status: 201 });
}
