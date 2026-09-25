// Nhật ký thay đổi hiển thị ở trang /changelog ("Có gì mới"). Bản mới nhất đặt ĐẦU danh sách.
// Thêm bản mới: chèn một mục vào đầu mảng — sidebar tự hiện chấm "mới" cho người chưa xem.

export type ChangeTag = "new" | "improved" | "fixed" | "admin";

export type Release = {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  summary?: string;
  changes: { tag: ChangeTag; text: string }[];
};

export const CHANGELOG: Release[] = [
  {
    version: "2.5",
    date: "2026-09-25",
    title: "Tự lưu, in PDF một chạm, thư viện chung",
    summary: "Không còn mất bài khi quên bấm Lưu, chia sẻ worksheet cho cả trung tâm và theo dõi chi phí AI.",
    changes: [
      { tag: "new", text: "Tự lưu vào tài khoản: sinh xong hoặc sửa gì là tự lưu sau ~2 giây. Nút Lưu giờ cho biết trạng thái (Chưa lưu / Đang lưu / Đã lưu lúc…)." },
      { tag: "new", text: "In / PDF một chạm: bấm là mở hộp thoại in, chọn “Lưu dưới dạng PDF”. Không còn phải tải và mở file trung gian." },
      { tag: "new", text: "Thư viện chung: bật 🌐 Công khai để mọi người trong hệ thống xem, in và nhân bản worksheet của bạn về để sửa." },
      { tag: "new", text: "AI viết đến đâu hiện đến đó: từng câu của bài tập xuất hiện ngay khi AI viết xong." },
      { tag: "improved", text: "Bài tập dài ít bị cắt giữa chừng hơn (tăng giới hạn độ dài mỗi lượt sinh)." },
      { tag: "new", text: "Trang Hồ sơ hiển thị số lượt tạo / gen lại đã dùng hôm nay." },
      { tag: "admin", text: "Thống kê AI: lượt dùng, token, chi phí theo ngày và theo người, nhật ký kỹ thuật từng lượt gọi." },
      { tag: "admin", text: "Hạn mức: giới hạn lượt tạo / gen lại mỗi ngày (chung hoặc riêng từng người) và trần chi phí toàn hệ thống." },
      { tag: "admin", text: "Tài khoản mới, import hoặc được đặt lại mật khẩu phải tự đổi mật khẩu ở lần đăng nhập đầu. Khi đặt lại, admin có thể tự nhập mật khẩu mới." },
    ],
  },
  {
    version: "2.4",
    date: "2026-09-25",
    title: "Chèn ảnh thoải mái",
    changes: [
      { tag: "fixed", text: "Sửa lỗi “Máy chủ báo lỗi (413)” khi lưu worksheet có nhiều ảnh." },
      { tag: "improved", text: "Ảnh được nén gọn hơn (WebP cho ảnh nền trong suốt); file xuất ra vẫn kèm đủ ảnh." },
    ],
  },
  {
    version: "2.3",
    date: "2026-09-25",
    title: "Worksheet Genie — giao diện mới",
    changes: [
      { tag: "new", text: "Tên và logo mới: Worksheet Genie." },
      { tag: "improved", text: "Giao diện mới với thanh bên thu gọn được (Ctrl/⌘ + B)." },
      { tag: "improved", text: "Trang tải có khung chờ và thanh tiến trình; bộ lọc không còn tải lại cả trang." },
      { tag: "admin", text: "Cấu hình AI ngay trong app (API key, model) — áp dụng tức thì, không cần deploy lại." },
      { tag: "admin", text: "Tải file mẫu CSV để import tài khoản." },
    ],
  },
  {
    version: "2.1",
    date: "2026-09-25",
    title: "Đăng nhập bằng tên đăng nhập",
    changes: [
      { tag: "new", text: "Đăng nhập bằng username hoặc email; email không còn bắt buộc." },
    ],
  },
  {
    version: "2.0",
    date: "2026-09-25",
    title: "Tài khoản & lưu worksheet",
    changes: [
      { tag: "new", text: "Đăng nhập, lưu worksheet vào tài khoản và quản lý danh sách worksheet của mình." },
      { tag: "new", text: "Trang hồ sơ: đổi tên, đổi mật khẩu." },
      { tag: "admin", text: "Quản lý tài khoản (tạo, phân quyền, khoá, đặt lại mật khẩu) và import tài khoản từ CSV." },
    ],
  },
  {
    version: "1.0",
    date: "2026-07-17",
    title: "Ra mắt công cụ tạo worksheet",
    changes: [
      { tag: "new", text: "Tạo worksheet tiếng Anh theo CEFR (Pre A1 → C2) bằng AI, sửa từng phần, in và xuất Word." },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;
export const CHANGELOG_SEEN_KEY = "changelog-seen";
