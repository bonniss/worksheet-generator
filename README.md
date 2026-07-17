# Worksheet Generator

Ứng dụng Next.js tạo worksheet tiếng Anh theo trình độ CEFR (Pre A1 → C2), dùng Claude qua Anthropic API.

Component gốc gọi thẳng Anthropic API — chỉ chạy được trong môi trường artifact của Claude. Bản này đã thêm một **serverless proxy** (`app/api/claude/route.js`) để giữ API key ở phía server, nên chạy được như một web bình thường trên Vercel.

## Chạy thử ở máy

```bash
npm install
cp .env.example .env.local   # rồi mở .env.local, điền key thật
npm run dev                  # mở http://localhost:3000
```

Lấy API key tại https://console.anthropic.com → API Keys. Tài khoản cần có credit thì mới sinh được worksheet.

## Deploy lên Vercel

**Cách A — qua GitHub (khuyên dùng):**
1. Đẩy thư mục này lên một repo GitHub.
2. Vào https://vercel.com → **Add New… → Project** → chọn repo. Vercel tự nhận diện Next.js.
3. Ở bước cấu hình (hoặc sau này trong **Settings → Environment Variables**), thêm:
   - Name: `ANTHROPIC_API_KEY`
   - Value: key thật của bạn
4. Bấm **Deploy**.

**Cách B — qua Vercel CLI:**
```bash
npm i -g vercel
vercel                                   # deploy lần đầu, làm theo hướng dẫn đăng nhập
vercel env add ANTHROPIC_API_KEY         # dán key khi được hỏi (chọn cả Production/Preview/Development)
vercel --prod                            # deploy bản chính thức
```

Sau khi thêm hoặc đổi biến môi trường, cần **redeploy** để có hiệu lực.

## Ghi chú về model

Component đang gửi model `claude-sonnet-4-6`. Nếu API trả lỗi model không tồn tại, mở
`components/WorksheetGenerator.jsx`, tìm `model:` trong hàm `callClaudeRaw` và đổi sang một
model string hợp lệ trong tài khoản của bạn (xem danh sách tại https://docs.claude.com).

## Bảo mật

- Không commit `.env.local` (đã có trong `.gitignore`).
- API key chỉ nằm ở server; trình duyệt chỉ gọi tới `/api/claude`.
