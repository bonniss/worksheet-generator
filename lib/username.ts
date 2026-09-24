// Tách riêng (không kèm zod) để component client import được mà không kéo zod vào bundle.
export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const USERNAME_HINT = "3–32 ký tự: chữ thường a-z, số, dấu . _ -";
