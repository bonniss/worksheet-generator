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
    version: "2.6",
    date: "2026-10-23",
    title: "Từ vựng vừa sức học sinh, sửa bài nhẹ tay hơn",
    summary: "Bạn chọn level từ vựng riêng và AI sẽ giữ từ trong level đó. Gen lại, sắp xếp, hoàn tác đều linh hoạt hơn trước.",
    changes: [
      { tag: "new", text: "Chọn level từ vựng riêng với level ngữ pháp, chọn được nhiều level cùng lúc (ví dụ ngữ pháp A1 nhưng từ vựng A1 + A2). Cả worksheet chỉ dùng từ trong các level bạn chọn." },
      { tag: "new", text: "Gợi ý chủ điểm ngay dưới ô Chủ điểm, đúng với level đang chọn. Bấm để chọn, bấm 🔀 Gợi ý khác để xem thêm, rê chuột lên để xem chủ điểm đó gồm những gì." },
      { tag: "new", text: "Nút 💡 Gợi ý prompt: đưa ra 3 tình huống cụ thể, vừa sức học sinh. Thích cái nào thì bấm vào để thêm vào ô mô tả." },
      { tag: "new", text: "Nhập Tổng số câu cho cả worksheet, hệ thống tự chia đều cho các bài." },
      { tag: "new", text: "Nút 🔍 Quét từ vựng: chỉ ra từ nào khó hơn level, nằm ở bài nào câu nào, và cho gen lại đúng bài đó. Nếu còn từ khó, worksheet hiện cảnh báo màu vàng ngay sau khi tạo xong." },
      { tag: "new", text: "Mỗi từ vựng trọng tâm có nhãn level nhỏ bên cạnh (xanh là vừa, đỏ là khó hơn). Nhãn này chỉ hiện trên màn hình, không in ra." },
      { tag: "new", text: "Nếu từ vựng trọng tâm chưa có trong bài tập nào, bấm 🔁 Đồng bộ từ vựng theo bài tập để chọn lại cho khớp." },
      { tag: "new", text: "Hộp từ cho sẵn dùng được ở mọi dạng bài: gõ tay hoặc bấm lấy từ đáp án, xáo trộn hay xếp A→Z tuỳ ý. Hộp từ có cả khi in và khi tải Word." },
      { tag: "new", text: "Gen lại chọn được phạm vi: phần Learn có thể chỉ làm lại ngữ pháp hoặc chỉ từ vựng (ảnh đã chèn vẫn giữ). Ở từng bài, có thể tick giữ những câu ưng ý và chỉ làm lại các câu còn lại, hoặc đổi sang dạng bài khác." },
      { tag: "new", text: "Nút 🎯 Đổi chủ điểm: tạo lại worksheet với chủ điểm mới mà không phải quay về màn hình đầu." },
      { tag: "new", text: "Hoàn tác / Làm lại bao nhiêu bước cũng được (Ctrl/⌘ + Z, Ctrl/⌘ + Shift + Z). Lỡ tay tạo lại cả worksheet vẫn lấy lại được bản cũ." },
      { tag: "new", text: "Đổi thứ tự các bài bằng nút ↑ ↓. Nút ⇅ Sắp xếp để xáo hoặc đảo thứ tự câu, xáo thứ tự đáp án." },
      { tag: "improved", text: "Phần Learn không đánh số nữa mà có ngôi sao ★, bài tập đánh số từ 1. Tên bài không còn bị lặp số kiểu “1. Exercise 1”." },
      { tag: "improved", text: "Ô nhập trong khung sửa tự dài ra theo nội dung, không phải kéo mới đọc hết. Bảng biến đổi hiện đủ cả câu." },
      { tag: "improved", text: "AI viết chữ thường, không tự in đậm lung tung; bạn tự tô đậm chỗ cần nhấn." },
      { tag: "improved", text: "Từ vựng trọng tâm là những từ bài tập thật sự dùng, không còn liệt kê thuật ngữ ngữ pháp. Bài đọc trong worksheet ngữ pháp hỏi đúng cấu trúc đang học thay vì hỏi nội dung chung chung." },
      { tag: "admin", text: "Trang Cấu hình AI có thêm: bật/tắt việc tự làm lại bài có từ khó hơn level và số lần làm lại; chọn model riêng (rẻ hơn) và đặt hạn mức riêng cho Gợi ý prompt và Đồng bộ từ vựng." },
    ],
  },
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
