import type { Exercise, Grammar, GrammarBlock, Item } from "./types";

export function esc(s: unknown): string {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface Filler {
  next: () => string;
}

export function makeFiller(answer: unknown): Filler {
  const arr = String(answer).split(",").map((s) => s.trim());
  let i = 0;
  return { next: () => arr[Math.min(i++, arr.length - 1)] || "" };
}

/* Bỏ tiền tố nhãn model tự thêm ("A. ", "B) ", "a. ", "1. ") ở đầu option để tránh lặp A.A */
export function cleanOpt(s: unknown): string {
  return String(s).replace(/^\s*[A-Da-d1-4][.)]\s+/, "").trim();
}

/* Chuyển bảng grammar giữa object {headers, rows} và text (mỗi dòng 1 hàng, cột ngăn bởi |) */
export function tableToText(t: { headers?: string[]; rows?: string[][] } | null | undefined): string {
  if (!t || !t.headers || !t.headers.length) return "";
  return [t.headers, ...(t.rows || [])].map((row) => row.join(" | ")).join("\n");
}
export function textToTable(txt: string): { headers: string[]; rows: string[][] } | undefined {
  const lines = String(txt).split("\n").map((l) => l.trim()).filter(Boolean);
  if (!lines.length) return undefined;
  const parse = (l: string) => l.split("|").map((c) => c.trim());
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) };
}

/* Chuẩn hoá grammar về mảng blocks[] thống nhất:
   - {kind:"rule", point, examples[]}  hoặc  {kind:"table", headers[], rows[[]]}
   Tương thích ngược mọi định dạng cũ: blocks[] mới, rules[]+table, points[]+examples[]. */
export function grammarBlocks(g: Grammar | null | undefined): GrammarBlock[] {
  if (!g) return [];
  if (Array.isArray(g.blocks)) return g.blocks;
  const out: GrammarBlock[] = [];
  if (Array.isArray(g.rules)) {
    g.rules.forEach((r) => out.push({ kind: "rule", point: r.point || "", examples: r.examples || [] }));
  } else if (Array.isArray(g.points)) {
    g.points.forEach((p, i) => out.push({ kind: "rule", point: p, examples: g.examples && g.examples[i] ? [g.examples[i]] : [] }));
  }
  if (g.table && g.table.headers && g.table.headers.length) {
    out.push({ kind: "table", headers: g.table.headers, rows: g.table.rows || [] });
  }
  return out;
}

/** Bỏ số thứ tự AI tự thêm vào tiêu đề bài ("Exercise 1: ...", "1. ...", "Bài 2 - ...") — hệ thống tự đánh số */
export function stripNum(t: unknown): string {
  return String(t ?? "").replace(/^\s*(?:(?:exercise|ex\.?|bài|part|task|activity)\s*\d+\s*[.:)\-–—]?|\d+\s*[.:)\-–—])\s*/i, "").trim();
}

/** Chuỗi hộp từ nhập tay → mảng (ngăn bởi dấu phẩy hoặc xuống dòng; cho phép cụm như "a lot of") */
export const parseWordBox = (raw: string): string[] => String(raw || "").split(/[,\n]+/).map((x) => x.trim()).filter(Boolean);

/** Xáo ngẫu nhiên (Fisher–Yates) — khác shuffle() có seed cố định dùng cho hiển thị */
export function shuffleRandom<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===== Sắp xếp câu trong bài ===== */
export type ReorderMode = "shuffle" | "reverse" | "options";

export const renumber = (items: Item[]): Item[] => items.map((it, k) => ({ ...it, n: k + 1 }));

/** Bài có câu trắc nghiệm/lựa chọn để xáo thứ tự phương án */
export function hasOptionItems(ex: Exercise): boolean {
  return ["mcq", "circle", "tick", "reading"].includes(ex.type) && ex.items.some((it) => (it.options || []).length > 1);
}

export function applyReorder(ex: Exercise, mode: ReorderMode): Exercise {
  if (mode === "options") {
    // đáp án lưu theo nội dung nên xáo phương án không làm lệch đáp án
    return { ...ex, items: ex.items.map((it) => ((it.options || []).length > 1 ? { ...it, options: shuffleRandom(it.options || []) } : it)) };
  }
  const items = mode === "reverse" ? [...ex.items].reverse() : shuffleRandom(ex.items);
  return { ...ex, items: renumber(items) };
}

export function moveInArray<T>(arr: T[], i: number, dir: number): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}
