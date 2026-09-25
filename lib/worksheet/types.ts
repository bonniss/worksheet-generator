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

export interface Cfg {
  type: FocusType;
  topic: string;
  level: Level;
  numEx: number;
  notes: string;
  autoMode: boolean;
  plan: PlanRow[];
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
  stage: Stage;
  type: string;
  title: string;
  instruction: string;
  passage?: string;
  columns?: string[];
  examples?: string[][];
  items: Item[];
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
