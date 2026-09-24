ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" text;--> statement-breakpoint
-- Điền username cho tài khoản cũ từ phần trước @ của email (chuẩn hoá theo quy tắc a-z0-9._- , 3–32 ký tự),
-- trùng thì thêm hậu tố _2, _3...
-- (rpad cắt chuỗi dài hơn độ dài đích, nên chỉ pad khi ngắn hơn 3)
WITH cleaned AS (
	SELECT "id", "created_at",
		left(regexp_replace(lower(split_part("email", '@', 1)), '[^a-z0-9._-]', '_', 'g'), 28) AS c
	FROM "users"
), base AS (
	SELECT "id", "created_at", CASE WHEN length(c) < 3 THEN rpad(c, 3, '_') ELSE c END AS b FROM cleaned
), ranked AS (
	SELECT "id", b, row_number() OVER (PARTITION BY b ORDER BY "created_at", "id") AS n FROM base
)
UPDATE "users" u
SET "username" = CASE WHEN r.n = 1 THEN r.b ELSE r.b || '_' || r.n END
FROM ranked r
WHERE u."id" = r."id";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");
