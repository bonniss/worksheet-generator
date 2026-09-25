# Worksheet Generator

Ứng dụng Next.js (TypeScript) tạo worksheet tiếng Anh theo trình độ CEFR (Pre A1 → C2), dùng Claude qua Anthropic API.
Có đăng nhập (username hoặc email), phân quyền `admin` / `user`, lưu worksheet vào Neon Postgres.

## Tính năng

| Module | Ai dùng | Đường dẫn |
| --- | --- | --- |
| Tạo / sửa worksheet (AI) | mọi người | `/`, `/worksheets/[id]` |
| Quản lý worksheet | admin: toàn hệ thống · user: của mình | `/worksheets` |
| Hồ sơ cá nhân (đổi tên, đổi mật khẩu) | mọi người | `/profile` |
| Quản lý tài khoản (tạo, sửa role, khoá, reset mật khẩu, xoá) | admin | `/admin/users` |
| Import tài khoản từ CSV | admin | `/admin/users/import` |
| Cấu hình AI (Anthropic API key, model) — đổi lúc chạy, không cần deploy lại | admin | `/admin/settings` |

Không có trang đăng ký công khai — admin tạo hoặc import tài khoản. Admin đầu tiên được tạo bằng `npm run db:seed`.

Mỗi tài khoản có **username** bắt buộc (3–32 ký tự: chữ thường a-z, số, `.` `_` `-`), không đổi được sau khi tạo.
**Email** không bắt buộc; nếu có thì đăng nhập bằng email cũng được.

## Chạy thử ở máy

1. Tạo project trên https://console.neon.tech, copy connection string.
2. Cấu hình:
   ```bash
   npm install
   cp .env.example .env.local   # điền DATABASE_URL, SETTINGS_SECRET, ADMIN_USERNAME, ADMIN_PASSWORD
   ```
3. Tạo bảng và admin đầu tiên:
   ```bash
   npm run db:migrate
   npm run db:seed
   ```
4. `npm run dev` → mở http://localhost:3000 và đăng nhập bằng tài khoản admin.

5. Vào **Quản trị → Cấu hình AI**, dán Anthropic API key (lấy tại https://console.anthropic.com → API Keys) và chọn model.
   Key được kiểm tra trước khi lưu và mã hoá (AES-256-GCM) trong DB. Tài khoản Anthropic cần có credit thì mới sinh được worksheet.

Thứ tự ưu tiên: cấu hình trong app → biến môi trường `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` → model mặc định `claude-haiku-4-5`.

### Scripts

| Lệnh | Việc |
| --- | --- |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:generate` | sinh migration mới sau khi sửa `db/schema.ts` |
| `npm run db:migrate` | áp migration lên `DATABASE_URL` |
| `npm run db:seed` | tạo admin từ `ADMIN_*` (nếu username đã có: chỉ đảm bảo role admin, không đổi mật khẩu) |
| `npm run db:studio` | Drizzle Studio xem dữ liệu |

## Import CSV

Tải file mẫu ở trang **Tài khoản → File mẫu** (hoặc `/admin/users/import/template`). Dòng đầu là tiêu đề `username,name,email,role,password`. `username` và `name` bắt buộc; `email` tuỳ chọn;
`role` trống = `user`; `password` trống = tự sinh.
Sau khi import có nút tải danh sách tài khoản kèm mật khẩu đã sinh (chỉ tải được ngay lúc đó). Username/email trùng bị bỏ qua. Tối đa 500 dòng/lần.

## Deploy lên Vercel

1. Đẩy repo lên GitHub, import vào Vercel (tự nhận diện Next.js). Có thể dùng Neon integration của Vercel để tự thêm `DATABASE_URL`.
2. Thêm Environment Variables: `DATABASE_URL`, `SETTINGS_SECRET`. (`ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` không bắt buộc — đặt trong app được.)
3. Chạy `npm run db:migrate` và `npm run db:seed` một lần từ máy (trỏ `DATABASE_URL` tới DB production).
4. Deploy. Sau khi đổi biến môi trường cần **redeploy**.

## Bảo mật

- Không commit `.env.local` (đã có trong `.gitignore`).
- API key chỉ nằm ở server (mã hoá trong DB, trang cấu hình chỉ hiện bản che); `/api/claude` chỉ cho phép người đã đăng nhập.
- Session lưu trong DB (cookie httpOnly, DB chỉ lưu sha256 của token). Khoá tài khoản, đổi role hoặc reset mật khẩu sẽ đăng xuất người đó khỏi mọi thiết bị.
- Mật khẩu hash bằng bcrypt.
