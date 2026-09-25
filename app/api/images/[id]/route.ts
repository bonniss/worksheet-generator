import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { worksheetImages } from "@/db/schema";
import { apiUser, jsonError } from "@/lib/auth/api";
import { isUuid } from "@/lib/validators";

export const runtime = "nodejs";

// Ảnh được tham chiếu từ worksheet (có thể của người khác khi admin xem) — mọi người đã đăng nhập đều xem được;
// id là uuid ngẫu nhiên nên không đoán được. Nội dung ảnh không đổi theo id → cache lâu.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiUser();
  if (error) return error;
  if (!isUuid(params.id)) return jsonError(404, "Không tìm thấy ảnh");

  const [img] = await db
    .select({ mime: worksheetImages.mime, bytes: worksheetImages.bytes })
    .from(worksheetImages)
    .where(eq(worksheetImages.id, params.id))
    .limit(1);
  if (!img) return jsonError(404, "Không tìm thấy ảnh");

  return new Response(new Uint8Array(img.bytes), {
    headers: {
      "Content-Type": img.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
