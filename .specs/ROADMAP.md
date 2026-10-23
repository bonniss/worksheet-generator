# Roadmap — những gì còn dự định

Đối chiếu với [`user-request/REQUEST_LIST_2026-Oct-23.md`](user-request/REQUEST_LIST_2026-Oct-23.md). Mã mục (A1, D, E3…) theo request list; mã setting (#1–#7) theo đề xuất "setting hoá" đã chốt.

Cập nhật: 2026-10-23

---

## Đã xong (v2.6, đang test trên prod)

- **A** Home: level từ vựng riêng, chip chủ điểm từ taxonomy, tổng số câu, gợi ý prompt.
- **B** Luật sinh: từ vựng là luật cứng (gửi wordlist cho Pre A1/A1), Core Vocabulary khớp bài tập, Reading theo ngữ pháp, plain text, không đánh số tiêu đề.
- **C** Màn worksheet: ★ cho phần Learn, nhãn level từ, quét từ vựng, đổi chủ điểm, gen lại theo phạm vi (giữ câu / đổi dạng bài), sắp xếp, undo/redo, textarea tự cao, hộp từ.
- **E2** Lưu bản nháp AI (`worksheets.ai_draft`), gen lại từng phần chỉ thay phần đó.
- **E4** Quét level ngay khi gen, tự gen lại bài vượt band (client-side, không phải server như request ghi; kết quả tương đương).
- Settings **#4** (model nhẹ cho việc phụ), **#5** (bật/tắt auto-retry, số lần retry, gửi wordlist), **#7** (quota riêng cho việc phụ).

Cần theo dõi sau khi chạy thật:
- Chi phí E4 và wordlist: xem `ai_calls` (purpose `exercise` tăng bao nhiêu khi bật auto-retry) rồi chỉnh #5.
- Tỷ lệ báo đỏ oan của bộ quét (tên riêng, từ ghép, từ không có trong EVP).

---

## Đợt 2 — Example bank và tránh lặp

Làm theo thứ tự dưới đây; D là nền cho E1 và E5.

### 1. D — Example bank (+ setting #3)
- **Luật:** worksheet `public` = đã soát → làm ví dụ. Về `private` → rút khỏi bank.
- **DB (migration mới):**
  - `published_at` — lần cuối chuyển sang Công khai; dùng cho mốc "chỉ tính bài công khai từ ngày X".
  - `duplicated_from` — id bài gốc khi "Nhân bản"; để bài nhân bản chỉ tính 1 lần.
  - `exclude_from_bank boolean` — cho E5.
- **Chọn ví dụ** khi gen/gen lại 1 bài: tối đa 2 bài cùng `type`, level bằng hoặc lân cận (±1), ưu tiên cùng stage và chủ điểm gần. Mỗi ví dụ lấy từ một worksheet khác nhau, xoay vòng (random có trọng số), bỏ bài `_failed` hoặc thiếu câu, không gửi tên chủ sở hữu.
- **Prompt:** khối "VÍ DỤ THAM KHẢO — học văn phong, cách ra đề, độ khó, distractor; KHÔNG chép nội dung". Không có ví dụ thì gen như cũ.
- **Setting #3:** bật/tắt bank, số ví dụ (mặc định 2), biên độ level (±1), ngày bắt đầu tính.
- **UI thư viện:** đổi tooltip Riêng tư/Công khai và thêm hộp xác nhận 1 lần (câu chữ có trong request list mục D). Tooltip "Công khai" đã bị gỡ ở v2.6 vì bank chưa có, khi làm D thì thêm lại.
- Cần quyết: các bài đã Công khai trước khi có bank có được tính không (đề xuất: không, dùng `published_at` ≥ ngày bật bank).

### 2. E5 — Admin loại 1 bài khỏi bank
- Cờ `exclude_from_bank` trên từng worksheet (không phải setting). Nút cho admin ở thư viện/trang worksheet. Bài vẫn Công khai và mọi người vẫn thấy.

### 3. E1 — Ví dụ cho phần Learn
- Dùng chung nguồn với D: bài Công khai, level bằng/lân cận, cùng `focusType` (grammar/vocabulary). Gửi `learn` của tối đa 2 bài (rút gọn: danh sách từ, khối ngữ pháp, 1–2 ví dụ mỗi khối) để không tốn token.

### 4. E3 — Tránh lặp từ và nhân vật (+ setting #6)
- Tuỳ chọn trong phần "Level từ vựng": "Tránh từ và nhân vật đã dùng gần đây".
- Lấy N worksheet gần nhất của giáo viên (setting #6, mặc định 5): gom Core Vocabulary và tên nhân vật (dùng `Lexicon.isName` + chữ hoa giữa câu trong passage/câu hỏi) thành danh sách "avoid" gửi cho Learn và bài tập.
- Có thể làm thêm: cho giáo viên đặt mặc định bật/tắt trong Profile.

---

## Đợt 3 — Trang "Dữ liệu tham chiếu" (settings #1, #2)

Hiện tại `lib/worksheet/data/*.json` được build sẵn bằng `npm run data:build`, mỗi lần đổi taxonomy hoặc wordlist phải nhờ dev chạy lại.
- **#1 Upload taxonomy CSV** (Grammar, Vocabulary) trên admin: parse bằng logic của `scripts/build-reference-data.ts`, lưu DB, có version để quay lại bản cũ.
- **#2 Override level của từ** (vd `pancake → A1`, `tom → bỏ qua`): bảng nhỏ trong DB, áp lên lexicon cả lúc quét lẫn lúc gửi wordlist.
- Khi có trang này, JSON build sẵn chỉ còn là dữ liệu mặc định.

---

## Để sau

- **E6** Xuất Google Drive (nice-to-have).
- Gom mặc định số câu theo level (đang hardcode ở 3 chỗ) về một chỗ.
- Ô "quy tắc bổ sung" cho prompt theo từng loại (Learn / Exercise / Reading), nối vào cuối prompt, có lịch sử sửa. **Không** cho sửa nguyên prompt template.

---

## Vấn đề dữ liệu cần team xử lý

- **Taxonomy thiếu chủ điểm C2:** chọn C2 thì Vocabulary có 0 chip, Grammar có 5 chip. Team cần bổ sung cột "CEFR to" hoặc thêm sub-topic C2 trong 2 file CSV ở `resources/`, rồi dev build lại.
- **Tài liệu có bản quyền** (EVP `evp.csv`, wordlist Cambridge YLE PDF) nằm ở `resources/ext/` và không commit. Ai cần build lại dữ liệu thì xin file từ team rồi đặt vào thư mục đó.
