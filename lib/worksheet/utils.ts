import type { Grammar, GrammarBlock } from "./types";

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
