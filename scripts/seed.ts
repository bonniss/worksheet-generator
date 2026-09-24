// Tạo (hoặc nâng quyền) admin đầu tiên từ ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME.
// Chạy: npm run db:seed
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  // import động để dotenv chạy trước khi db/index.ts đọc DATABASE_URL
  const { eq } = await import("drizzle-orm");
  const { db } = await import("../db");
  const { users } = await import("../db/schema");
  const { hashPassword } = await import("../lib/auth/password");

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || "Administrator";
  if (!email || !password) throw new Error("Cần đặt ADMIN_EMAIL và ADMIN_PASSWORD trong .env.local");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD tối thiểu 8 ký tự");

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) {
    // Không ghi đè mật khẩu của tài khoản đã có
    await db.update(users).set({ role: "admin", isActive: true, updatedAt: new Date() }).where(eq(users.id, existing.id));
    console.log(`✔ ${email} đã tồn tại — đảm bảo role=admin, đang hoạt động.`);
  } else {
    await db.insert(users).values({ email, name, role: "admin", passwordHash: await hashPassword(password) });
    console.log(`✔ Đã tạo admin ${email}.`);
  }
}

main().catch((e) => {
  console.error("✖", e instanceof Error ? e.message : e);
  process.exit(1);
});
