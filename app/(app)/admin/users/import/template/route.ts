import { jsonError } from "@/lib/auth/api";
import { getCurrentUser } from "@/lib/auth/session";
import { IMPORT_TEMPLATE_CSV, IMPORT_TEMPLATE_FILENAME } from "@/lib/import-template";

// Route handler không đi qua admin/layout.tsx nên phải tự kiểm tra quyền.
export async function GET() {
  const user = await getCurrentUser();
  if (user?.role !== "admin") return jsonError(404, "Not found");
  // BOM để Excel mở đúng tiếng Việt
  return new Response("﻿" + IMPORT_TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${IMPORT_TEMPLATE_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
