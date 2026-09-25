import type { SessionUser } from "./session";

type WorksheetAccess = { ownerId: string; visibility?: "private" | "public" };

/** Xem / in / nhân bản: chủ sở hữu, admin, hoặc worksheet công khai. */
export function canViewWorksheet(user: SessionUser, ws: WorksheetAccess): boolean {
  return canEditWorksheet(user, ws) || ws.visibility === "public";
}

/** Sửa / xoá / đổi chế độ chia sẻ: chủ sở hữu hoặc admin. */
export function canEditWorksheet(user: SessionUser, ws: WorksheetAccess): boolean {
  return user.role === "admin" || ws.ownerId === user.id;
}

