import type { SessionUser } from "./session";

export function canAccessWorksheet(user: SessionUser, ws: { ownerId: string }): boolean {
  return user.role === "admin" || ws.ownerId === user.id;
}
