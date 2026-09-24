import type { Level, PlanRow, Stage, Theme } from "./types";

/* ================= THEMES THEO CEFR — màu lấy từ template thiết kế người dùng cung cấp =================
   Pre A1: xanh dương đậm + hồng | A1: hồng pastel | A2: cam đào | B1: xanh lá
   B2: tím lavender | C1: xanh dương (Language Note) | C2: chưa có mẫu — tự chọn xám than + vàng đồng
*/
export const THEMES: Record<Level, Theme> = {
  "Pre A1": {
    pageBg: "#69A8E4", ink: "#1B4F82", accent: "#3E8FD8", accent2: "#E85BA0",
    pillBg: "#E3F1FE", pillText: "#2A6DB0", softBg: "#E3F1FE", line: "#C7E2FA",
    badgeText: "#3E8FD8", mascot: "🦊", radius: 26, itemFont: 18, baseFont: 16,
    gap: 26, showImages: true, vocabStyle: "cards", learnTitle: "Learn",
    display: "'Baloo 2', 'Comic Sans MS', cursive", body: "'Nunito', 'Segoe UI', sans-serif",
  },
  A1: {
    pageBg: "#F7CDD0", ink: "#B23A48", accent: "#F7838D", accent2: "#E85F6B",
    pillBg: "#FCE6E8", pillText: "#D0505C", softBg: "#FCEAEB", line: "#F3CBD0",
    badgeText: "#F7838D", mascot: "🐰", radius: 24, itemFont: 17, baseFont: 15.5,
    gap: 24, showImages: true, vocabStyle: "cards", learnTitle: "Learn",
    display: "'Baloo 2', 'Comic Sans MS', cursive", body: "'Nunito', 'Segoe UI', sans-serif",
  },
  A2: {
    pageBg: "#FFE4BD", ink: "#A65A28", accent: "#FBAC7E", accent2: "#F08A50",
    pillBg: "#FFEEDA", pillText: "#D07B45", softBg: "#FFF2E3", line: "#FADFC2",
    badgeText: "#FBAC7E", mascot: "🐯", radius: 20, itemFont: 16, baseFont: 15,
    gap: 20, showImages: true, vocabStyle: "cards", learnTitle: "Learn",
    display: "'Baloo 2', sans-serif", body: "'Nunito', 'Segoe UI', sans-serif",
  },
  B1: {
    pageBg: "#ABD7AB", ink: "#356B35", accent: "#89C689", accent2: "#5CA85C",
    pillBg: "#E4F2E4", pillText: "#4E924E", softBg: "#EBF6EB", line: "#CDE8CD",
    badgeText: "#89C689", mascot: "🦉", radius: 16, itemFont: 15, baseFont: 14.5,
    gap: 16, showImages: false, vocabStyle: "list", learnTitle: "Language Focus",
    display: "'Nunito Sans', 'Segoe UI', sans-serif", body: "'Nunito Sans', 'Segoe UI', sans-serif",
  },
  B2: {
    pageBg: "#E6D1F2", ink: "#5B3E86", accent: "#B19CD8", accent2: "#8E6FC0",
    pillBg: "#F0E7F8", pillText: "#7A5CAE", softBg: "#F4EEFA", line: "#E1D4EF",
    badgeText: "#B19CD8", mascot: "🦅", radius: 14, itemFont: 14.5, baseFont: 14,
    gap: 15, showImages: false, vocabStyle: "list", learnTitle: "Language Focus",
    display: "'Nunito Sans', 'Segoe UI', sans-serif", body: "'Nunito Sans', 'Segoe UI', sans-serif",
  },
  C1: {
    pageBg: "#6C90B5", ink: "#25384B", accent: "#6485A8", accent2: "#E0913A",
    pillBg: "#E5ECF3", pillText: "#3F5D7A", softBg: "#EDF1F6", line: "#D2DDE9",
    badgeText: "#6485A8", mascot: "🦁", radius: 12, itemFont: 14.5, baseFont: 14,
    gap: 14, showImages: false, vocabStyle: "list", learnTitle: "Language Note",
    display: "'Nunito Sans', 'Segoe UI', sans-serif", body: "'Nunito Sans', 'Segoe UI', sans-serif",
  },
  C2: {
    pageBg: "#94A7B0", ink: "#243139", accent: "#2C6E78", accent2: "#B26A12",
    pillBg: "#E6EDF0", pillText: "#2A3B44", softBg: "#F1F5F7", line: "#CBD8DE",
    badgeText: "#2C6E78", mascot: "🐉", radius: 10, itemFont: 14.5, baseFont: 14,
    gap: 13, showImages: false, vocabStyle: "list", learnTitle: "Language Note",
    display: "'Nunito Sans', 'Segoe UI', sans-serif", body: "'Nunito Sans', 'Segoe UI', sans-serif",
  },
};
export const LEVELS = Object.keys(THEMES) as Level[];
export const AGE_BY_LEVEL: Record<Level, string> = { "Pre A1": "6–8", A1: "7–10", A2: "9–12", B1: "12–15", B2: "15–18", C1: "16–18+", C2: "17+" };

export const PROGRESSION_RULE: Record<Level, string> = {
  "Pre A1": "Chỉ dùng stage Awareness và Controlled. Câu rất ngắn, từ cực kỳ cơ bản.",
  A1: "Chỉ dùng stage Awareness và Controlled. Câu ngắn, đơn giản.",
  A2: "Dùng Awareness → Controlled → Semi-controlled. Không Production.",
  B1: "Dùng Controlled → Semi-controlled → Production (guided).",
  B2: "Dùng Controlled → Semi-controlled → Production. Ngữ cảnh trưởng thành hơn.",
  C1: "Trọng tâm Semi-controlled → Production. Vẫn dùng Controlled cho các bài luyện hình thái/chính tả (vd bảng biến đổi). Ngôn ngữ tinh tế: register, collocation, sắc thái nghĩa; ngữ cảnh học thuật/công việc.",
  C2: "Trọng tâm Production và phân biệt sắc thái tinh vi (nuance, style, register). Vẫn dùng Controlled cho bài luyện hình thái/chính tả. Văn bản phức tạp, gần trình độ bản xứ cao.",
};

/* Kho dạng bài theo level — chắt lọc từ phân tích bộ New Round Up (Starter→5),
   chỉ giữ các dạng LÀM ĐƯỢC TRÊN WORKSHEET IN (bỏ audio, game nói, memory game).
   Mỗi level liệt kê theo thứ tự ưu tiên (dạng chủ lực xếp trước). */
export const TYPE_BANK: Record<Level, { types: string; note: string }> = {
  "Pre A1": {
    types: "circle, mcq, match, picture_write, gapfill, transform_table",
    note: "Chủ lực: circle (khoanh a/an, odd-one-out), match (nối từ–tranh, cột A–B), picture_write (nhìn tranh viết/hoàn thành câu). gapfill phạm vi CỰC hẹp (cho sẵn 2-3 lựa chọn: am/is/are, a/an). 100% Awareness→Controlled, luôn có câu mẫu.",
  },
  A1: {
    types: "circle, mcq, gapfill, transform_table, reorder, verbform, complete_text, match, picture_write",
    note: "Thêm so với Pre A1: reorder (sắp xếp từ thành câu), verbform (chia động từ trong ngoặc present simple/continuous), complete_text (điền đoạn văn ngắn liền mạch). mcq (trắc nghiệm 3-4 phương án) dùng được ở nhiều dạng câu. Vẫn thuần Controlled, có mẫu.",
  },
  A2: {
    types: "circle, mcq, gapfill, verbform, transform_table, complete_text, dialogue, tick, reorder, question_write, writing",
    note: "Chủ lực: gapfill (giới từ, a lot of/many/much, mạo từ), verbform (present vs past simple), complete_text/dialogue (cloze đoạn/hội thoại). Mới: question_write (đặt câu hỏi cho từ in đậm), writing có kiểm soát (viết note/email ngắn theo mẫu). Bắt đầu Semi-controlled nhưng khung mẫu chặt.",
  },
  B1: {
    types: "verbform, gapfill, mcq, transform_table, rewrite, error_correction, error_choice, error_passage, reading, question_write, reorder, writing",
    note: "Chủ lực: verbform (đối chiếu 2-3 thì trong đoạn), gapfill (giới từ, liên từ so/such/used to), rewrite (bị động, câu ước, so sánh). Mới: error_correction (sửa lỗi/gạch từ thừa), reading tích hợp ngữ pháp, mcq (trắc nghiệm 3-4 phương án). Semi-controlled ổn định, Production dạng guided (viết theo khung).",
  },
  B2: {
    types: "rewrite, verbform, gapfill, mcq, transform_table, reading, error_correction, error_choice, error_passage, keyword_transform, question_write, writing",
    note: "Chủ lực: rewrite (bị động nhiều cách, câu tường thuật, điều kiện), verbform (perfect forms, 3 thì/đoạn), keyword_transform (viết lại giữ nghĩa dùng từ cho sẵn — tiền thân format thi). reading dài hơn, mcq (trắc nghiệm 3-4 phương án kiểm tra ngữ pháp/nghĩa). Production: situational writing.",
  },
  C1: {
    types: "reading, mcq, keyword_transform, rewrite, word_formation, transform_table, gapfill, error_passage, writing",
    note: "Chủ lực: reading học thuật + câu hỏi ngôn ngữ (nghĩa từ, suy luận), keyword_transform và rewrite (reported speech với introductory verb, mixed conditional, inversion), word_formation (điền từ tạo từ gốc — đúng format thi Cambridge). gapfill và mcq tập trung collocation, phrasal verb particles, nghĩa từ trong ngữ cảnh, although/despite. Trọng tâm Semi-controlled→Production, register & sắc thái.",
  },
  C2: {
    types: "reading, mcq, keyword_transform, rewrite, word_formation, transform_table, writing",
    note: "Như C1 nhưng văn bản phức tạp hơn, nhấn phân biệt sắc thái tinh vi (nuance, style, register), collocation nâng cao, mcq kiểm tra sắc thái nghĩa, cấu trúc gần trình độ bản xứ cao. Trọng tâm Production.",
  },
};

export const STAGES: Stage[] = ["Awareness", "Controlled", "Semi-controlled", "Production"];
export const STAGE_VI: Record<Stage, string> = {
  Awareness: "Awareness — Nhận biết",
  Controlled: "Controlled — Luyện có kiểm soát",
  "Semi-controlled": "Semi-controlled — Bán kiểm soát",
  Production: "Production — Vận dụng/sản sinh",
};

/* Nhãn tiếng Việt + stage phù hợp cho từng dạng bài (một dạng có thể hợp nhiều stage). */
export const TYPE_META: Record<string, { label: string; stages: Stage[] } | undefined> = {
  circle: { label: "Khoanh đáp án đúng (2 lựa chọn)", stages: ["Awareness", "Controlled"] },
  match: { label: "Nối cột (từ–tranh / A–B)", stages: ["Awareness", "Controlled"] },
  picture_write: { label: "Nhìn tranh viết/hoàn thành câu", stages: ["Controlled", "Semi-controlled"] },
  mcq: { label: "Trắc nghiệm nhiều lựa chọn (3-4 phương án)", stages: ["Awareness", "Controlled", "Semi-controlled", "Production"] },
  tick: { label: "Tick câu đúng (a/b)", stages: ["Awareness", "Controlled"] },
  gapfill: { label: "Điền vào chỗ trống", stages: ["Controlled", "Semi-controlled"] },
  verbform: { label: "Chia dạng động từ", stages: ["Controlled", "Semi-controlled"] },
  complete_text: { label: "Hoàn thành đoạn văn (cloze)", stages: ["Controlled", "Semi-controlled"] },
  dialogue: { label: "Hoàn thành hội thoại", stages: ["Controlled", "Semi-controlled"] },
  reorder: { label: "Sắp xếp từ thành câu", stages: ["Controlled", "Semi-controlled"] },
  question_write: { label: "Đặt câu hỏi cho từ in đậm", stages: ["Semi-controlled", "Production"] },
  rewrite: { label: "Viết lại câu", stages: ["Semi-controlled", "Production"] },
  error_correction: { label: "Phát hiện & sửa lỗi (cả câu)", stages: ["Semi-controlled", "Production"] },
  error_choice: { label: "Chọn lỗi A-B-C-D & sửa", stages: ["Semi-controlled", "Production"] },
  error_passage: { label: "Sửa lỗi trong đoạn văn", stages: ["Semi-controlled", "Production"] },
  keyword_transform: { label: "Viết lại dùng từ khoá cho sẵn", stages: ["Controlled", "Semi-controlled"] },
  word_formation: { label: "Tạo từ (word formation)", stages: ["Semi-controlled", "Production"] },
  reading: { label: "Đọc hiểu + câu hỏi", stages: ["Semi-controlled", "Production"] },
  transform_table: { label: "Bảng biến đổi (Transformation Table)", stages: ["Controlled"] },
  writing: { label: "Viết theo đề", stages: ["Production"] },
};

// Danh sách dạng bài của 1 level (mảng, theo thứ tự ưu tiên trong TYPE_BANK)
export function levelTypes(level: Level): string[] {
  return TYPE_BANK[level].types.split(",").map((s) => s.trim());
}
// Dạng bài của level HỢP với 1 stage (giữ thứ tự ưu tiên)
export function typesForStage(level: Level, stage: Stage): string[] {
  return levelTypes(level).filter((t) => (TYPE_META[t]?.stages || []).includes(stage));
}
// Stage mà level cho phép (giao giữa progression của level và các stage có dạng bài)
export function stagesForLevel(level: Level): Stage[] {
  const allowed = ({
    "Pre A1": ["Awareness", "Controlled"],
    A1: ["Awareness", "Controlled"],
    A2: ["Awareness", "Controlled", "Semi-controlled"],
    B1: ["Controlled", "Semi-controlled", "Production"],
    B2: ["Controlled", "Semi-controlled", "Production"],
    C1: ["Controlled", "Semi-controlled", "Production"],
    C2: ["Controlled", "Semi-controlled", "Production"],
  } as Record<Level, Stage[]>)[level] || STAGES;
  return allowed.filter((st) => typesForStage(level, st).length > 0);
}
// Gợi ý trình tự stage cho n bài: trải đều theo các stage cho phép, tăng dần độ khó
export function suggestStages(level: Level, n: number): Stage[] {
  const allowed = stagesForLevel(level);
  const out: Stage[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.min(allowed.length - 1, Math.floor((i * allowed.length) / n));
    out.push(allowed[idx]);
  }
  return out;
}
// Gợi ý dạng bài mặc định cho 1 stage ở 1 level, tránh trùng dạng đã dùng
// Tạo/đồng bộ kế hoạch từng bài: giữ lựa chọn cũ nếu còn hợp lệ, phần thiếu điền theo gợi ý
export function syncPlan(oldPlan: PlanRow[] | undefined, n: number, level: Level): PlanRow[] {
  const sug = suggestStages(level, n);
  const used: string[] = [];
  const out: PlanRow[] = [];
  for (let i = 0; i < n; i++) {
    const prev = oldPlan && oldPlan[i];
    const stageOk = prev && stagesForLevel(level).includes(prev.stage);
    const stage = stageOk ? prev.stage : sug[i];
    const typeOk = prev && typesForStage(level, stage).includes(prev.type);
    const type = typeOk ? prev.type : suggestType(level, stage, used);
    used.push(type);
    out.push({ stage, type });
  }
  return out;
}

export function suggestType(level: Level, stage: Stage, used: string[]): string {
  const cands = typesForStage(level, stage);
  return cands.find((t) => !used.includes(t)) || cands[0] || levelTypes(level)[0];
}

