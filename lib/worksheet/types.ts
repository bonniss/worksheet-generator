export type Level = "Pre A1" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Stage = "Awareness" | "Controlled" | "Semi-controlled" | "Production";
export type FocusType = "grammar" | "vocabulary";

export interface Theme {
  pageBg: string;
  ink: string;
  accent: string;
  accent2: string;
  pillBg: string;
  pillText: string;
  softBg: string;
  line: string;
  badgeText: string;
  mascot: string;
  radius: number;
  itemFont: number;
  baseFont: number;
  gap: number;
  showImages: boolean;
  vocabStyle: "cards" | "list";
  learnTitle: string;
  display: string;
  body: string;
}

/** Một dòng kế hoạch khi giáo viên tự chọn stage + dạng bài */
export interface PlanRow {
  stage: Stage;
  type: string;
}

/** Chủ điểm chọn từ taxonomy (chip gợi ý) — gửi phạm vi + ví dụ cho AI */
export interface TopicMeta {
  id: string;
  en: string;
  vi: string;
  scope: string;
  examples: string;
}

export interface Cfg {
  type: FocusType;
  topic: string;
  level: Level;
  numEx: number;
  notes: string;
  autoMode: boolean;
  plan: PlanRow[];
  /** Level từ vựng (chọn nhiều); rỗng/thiếu = theo level chính */
  vocabLevels?: Level[];
  /** Tổng số câu cả worksheet; thiếu/null = AI tự quyết */
  totalQ?: number | null;
  /** Có khi chủ điểm lấy từ chip taxonomy; sửa tay chủ điểm thì bỏ */
  topicMeta?: TopicMeta | null;
}

/** Kế hoạch 1 bài do AI trả về ở bước lập khung */
export interface ExercisePlan {
  stage: Stage;
  type: string;
  title: string;
  count: number;
}

export interface StructurePlan {
  title: string;
  brief: string;
  plan: ExercisePlan[];
}

export interface Item {
  n?: number;
  prompt?: string;
  options?: string[];
  answer?: string;
  imageDesc?: string;
  img?: string | null;
  hasImg?: boolean;
  // transform_table
  cells?: string[];
  blanks?: boolean[];
}

export interface Exercise {
  /** id ổn định để đối chiếu với bản nháp AI (E2); worksheet cũ không có */
  id?: string;
  stage: Stage;
  type: string;
  title: string;
  instruction: string;
  passage?: string;
  columns?: string[];
  examples?: string[][];
  items: Item[];
  /** Hộp từ cho sẵn, hiện dưới instruction */
  wordBox?: string[];
  count?: number;
  _failed?: boolean;
  /** Đang được AI viết (stream) — chỉ tồn tại trên màn hình, không lưu */
  _streaming?: boolean;
}

export interface VocabItem {
  word: string;
  pos?: string;
  imageDesc?: string;
  img?: string | null;
}

export interface RuleBlock {
  kind: "rule";
  point: string;
  examples: string[];
}

export interface TableBlock {
  kind: "table";
  headers: string[];
  rows: string[][];
}

export type GrammarBlock = RuleBlock | TableBlock;

export interface Grammar {
  heading?: string;
  blocks?: GrammarBlock[];
  // Định dạng cũ — vẫn đọc được qua grammarBlocks()
  rules?: { point?: string; examples?: string[] }[];
  table?: { headers?: string[]; rows?: string[][] };
  points?: string[];
  examples?: string[];
}

export interface Learn {
  vocab: VocabItem[];
  grammar: Grammar;
}

export interface Worksheet {
  title: string;
  brief: string;
  learn: Learn | null;
  /** null = bài đang được soạn */
  exercises: (Exercise | null)[];
}

/**
 * Bản nháp gốc AI sinh ra — lưu ở cột riêng (worksheets.ai_draft), chỉ AI ghi, sửa tay không ghi đè.
 * Dùng để so với bản giáo viên chốt (phần nào hay bị viết lại → cải thiện prompt).
 */
export interface AiDraft {
  v: 1;
  createdAt: string;
  updatedAt: string;
  title?: string;
  brief?: string;
  learn?: { data: Partial<Learn>; at: string } | null;
  /** theo Exercise.id */
  exercises: Record<string, { data: Exercise; at: string; /** gen lại "chỉ các câu": vị trí các câu giáo viên giữ nguyên */ keptItems?: number[] }>;
}

/** Phần nháp AI mới phát sinh, gửi kèm lần lưu kế tiếp rồi server gộp vào AiDraft */
export interface AiDraftPatch {
  /** tạo worksheet mới / đổi chủ điểm: bỏ bản nháp cũ */
  reset?: boolean;
  title?: string;
  brief?: string;
  /** gộp nông vào learn cũ (gen lại chỉ ngữ pháp / chỉ từ vựng) */
  learn?: Partial<Learn>;
  exercises?: Record<string, { data: Exercise; keptItems?: number[] }>;
}

export interface SavedProject {
  _type: "flyer-worksheet";
  version: 1;
  savedAt: string;
  cfg: Cfg;
  themeOverride: Level | null;
  ws: Worksheet;
}

export function isSavedProject(x: unknown): x is SavedProject {
  if (!x || typeof x !== "object") return false;
  const d = x as Record<string, unknown>;
  return d._type === "flyer-worksheet" && !!d.ws && typeof d.ws === "object";
}
