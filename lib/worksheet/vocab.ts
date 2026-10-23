/* ===== TRA CỨU LEVEL TỪ VỰNG — dữ liệu từ lib/worksheet/data/lexicon.json (npm run data:build) =====
   Pre A1 = wordlist Cambridge Starters; A1+ = English Vocabulary Profile (Movers → A1, Flyers → A2 lấp từ EVP chưa có).
   Dùng chung client (quét, nhãn level) và server (danh sách từ được phép gửi cho AI). */
import { LEVELS } from "./themes";
import type { Cfg, Exercise, Level, Worksheet } from "./types";
import { grammarBlocks } from "./utils";

export type LexiconData = { levels: string[]; lemmas: string[]; forms: string[]; names: string[] };

/** Level từ vựng đang áp dụng (rỗng = theo level chính), theo thứ tự tăng dần */
export function effVocabLevels(cfg: Pick<Cfg, "level" | "vocabLevels">): Level[] {
  const v = (cfg.vocabLevels || []).filter((x) => LEVELS.includes(x));
  return v.length ? LEVELS.filter((x) => v.includes(x)) : [cfg.level];
}
/** Chỉ số (0–6) của level từ vựng cao nhất được phép */
export function maxVocabIdx(cfg: Pick<Cfg, "level" | "vocabLevels">): number {
  return Math.max(...effVocabLevels(cfg).map((x) => LEVELS.indexOf(x)));
}

const norm = (raw: unknown) =>
  String(raw ?? "").toLowerCase().replace(/[’]/g, "'").replace(/[^a-z' \-.]/g, " ").replace(/\s+/g, " ").trim();

// Dạng gốc có thể có của 1 từ không nằm trong bảng dạng biến đổi (số nhiều, quá khứ, -ing, so sánh...)
function lemmaCandidates(w: string): string[] {
  const c = [w];
  const add = (x: string) => { if (x.length > 1 && !c.includes(x)) c.push(x); };
  if (w.endsWith("ies")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ves")) { add(w.slice(0, -3) + "f"); add(w.slice(0, -3) + "fe"); }
  if (w.endsWith("es")) add(w.slice(0, -2));
  if (w.endsWith("s")) add(w.slice(0, -1));
  if (w.endsWith("ied")) add(w.slice(0, -3) + "y");
  if (w.endsWith("ed")) { add(w.slice(0, -2)); add(w.slice(0, -1)); if (/(.)\1ed$/.test(w)) add(w.slice(0, -3)); }
  if (w.endsWith("ing")) { add(w.slice(0, -3)); add(w.slice(0, -3) + "e"); if (/(.)\1ing$/.test(w)) add(w.slice(0, -4)); }
  if (w.endsWith("ly")) add(w.slice(0, -2));
  if (w.endsWith("ier") || w.endsWith("iest")) add(w.replace(/ie(r|st)$/, "y"));
  if (w.endsWith("er")) { add(w.slice(0, -2)); add(w.slice(0, -1)); }
  if (w.endsWith("est")) { add(w.slice(0, -3)); add(w.slice(0, -2)); }
  return c;
}

export class Lexicon {
  private map = new Map<string, number>();
  private names: Set<string>;
  constructor(data: LexiconData) {
    // lemmas trước forms: từ vừa là gốc vừa là dạng biến đổi lấy level của từ gốc
    [data.lemmas, data.forms].forEach((byLevel) =>
      byLevel.forEach((s, lv) => s.split("|").forEach((w) => { if (w && !this.map.has(w)) this.map.set(w, lv); })),
    );
    this.names = new Set(data.names.map((n) => n.toLowerCase()));
  }
  isName(raw: string): boolean {
    return this.names.has(norm(raw));
  }
  /** Level (0–6) của 1 từ/cụm; -1 = không có trong danh sách tham chiếu */
  levelOf(raw: unknown): number {
    const w = norm(raw);
    if (!w) return -1;
    // lấy level thấp nhất trong các dạng gốc tìm được: "cooking" (n, A2) nhưng "cook" (v, A1) → A1, tránh báo đỏ oan
    let min = -1;
    for (const k of lemmaCandidates(w)) { const lv = this.map.get(k); if (lv !== undefined && (min < 0 || lv < min)) min = lv; }
    if (min >= 0 || !w.includes(" ")) return min;
    // cụm chưa có trong danh sách: lấy level cao nhất trong các từ đã biết
    let best = -1;
    for (const p of w.split(" ")) {
      if (p.length <= 2) continue;
      for (const k of lemmaCandidates(p)) { const lv = this.map.get(k); if (lv !== undefined) { best = Math.max(best, lv); break; } }
    }
    return best;
  }
  /** Các từ trong đoạn text vượt band (bỏ qua từ < 3 chữ, tên riêng; từ không có trong danh sách thì không tính) */
  aboveBand(text: unknown, maxI: number): { word: string; levelIdx: number }[] {
    const str = String(text ?? "").replace(/\*\*|==|___/g, " ");
    const re = /[A-Za-z][A-Za-z'’-]*/g;
    const out = new Map<string, number>();
    let m: RegExpExecArray | null;
    while ((m = re.exec(str))) {
      const tok = m[0].replace(/['’]s$/i, "");
      if (tok.length < 3) continue;
      const prev = str.slice(0, m.index).replace(/\s+$/, "");
      const sentenceStart = prev === "" || /[.!?:\n"“]$/.test(prev);
      if (/^[A-Z]/.test(tok) && (!sentenceStart || this.isName(tok))) continue; // tên riêng
      const lv = this.levelOf(tok);
      if (lv > maxI) out.set(tok.toLowerCase(), lv);
    }
    return [...out].map(([word, levelIdx]) => ({ word, levelIdx }));
  }
}

let lexPromise: Promise<Lexicon> | null = null;
/** Nạp bảng từ (≈150KB) khi cần — không nằm trong bundle chính */
export function loadLexicon(): Promise<Lexicon> {
  lexPromise ??= import("./data/lexicon.json").then((m) => new Lexicon((m.default ?? m) as LexiconData));
  return lexPromise;
}

/** Danh sách từ nội dung được phép (1 từ, level ≤ maxI) — chỉ gửi khi band thấp (Pre A1/A1) */
export function allowedWords(data: LexiconData, maxI: number): string[] {
  const names = new Set(data.names.map((n) => n.toLowerCase()));
  return data.lemmas
    .slice(0, maxI + 1)
    .flatMap((s) => s.split("|"))
    .filter((w) => w.length > 1 && !w.includes(" ") && !names.has(w))
    .sort();
}

/* ===== QUÉT WORKSHEET ===== */
export type ScanHit = { word: string; levelIdx: number; where: string[] };
export type ScanResult = {
  hits: ScanHit[];
  /** index bài → các từ vượt band trong bài đó */
  byExercise: Map<number, string[]>;
  /** từ vượt band trong phần Learn */
  learnWords: string[];
};

/** Text của 1 bài cần quét: instruction/tiêu đề là ngôn ngữ ra lệnh nên không tính */
export function exerciseTexts(ex: Exercise): { text: string; where: string }[] {
  const out: { text: string; where: string }[] = [];
  (ex.wordBox || []).forEach((w) => out.push({ text: w, where: "hộp từ" }));
  if (ex.passage) out.push({ text: ex.passage, where: "đoạn văn" });
  (ex.examples || []).forEach((r) => r.forEach((c) => out.push({ text: c, where: "dòng mẫu" })));
  ex.items.forEach((it, j) => {
    const where = "câu " + (j + 1);
    [it.prompt, it.answer, ...(it.options || []), ...(it.cells || [])].forEach((t) => { if (t) out.push({ text: t, where }); });
  });
  return out;
}

export function scanWorksheet(lex: Lexicon, ws: Worksheet, maxI: number): ScanResult {
  const found = new Map<string, ScanHit>();
  const byExercise = new Map<number, string[]>();
  const learnWords: string[] = [];
  const check = (text: unknown, where: string, onWord: (w: string) => void) => {
    for (const { word, levelIdx } of lex.aboveBand(text, maxI)) {
      if (!found.has(word)) found.set(word, { word, levelIdx, where: [] });
      const h = found.get(word)!;
      if (!h.where.includes(where)) h.where.push(where);
      onWord(word);
    }
  };
  const addLearn = (w: string) => { if (!learnWords.includes(w)) learnWords.push(w); };
  const learn = ws.learn;
  if (learn) {
    (learn.vocab || []).forEach((v) => check(v.word, "Từ vựng trọng tâm", addLearn));
    // lời giải thích quy tắc (metalanguage) không tính, chỉ quét ví dụ và ô bảng
    grammarBlocks(learn.grammar).forEach((b) => {
      if (b.kind === "table") [b.headers || [], ...(b.rows || [])].forEach((r) => r.forEach((c) => check(c, "Language Focus", addLearn)));
      else (b.examples || []).forEach((e) => check(e, "Language Focus", addLearn));
    });
  }
  ws.exercises.forEach((ex, i) => {
    if (!ex || ex._failed || ex._streaming) return;
    const words: string[] = [];
    exerciseTexts(ex).forEach(({ text, where }) => check(text, `Bài ${i + 1} · ${where}`, (w) => { if (!words.includes(w)) words.push(w); }));
    if (words.length) byExercise.set(i, words);
  });
  const hits = [...found.values()].sort((a, b) => b.levelIdx - a.levelIdx || a.word.localeCompare(b.word));
  return { hits, byExercise, learnWords };
}

/** Từ vựng trọng tâm không xuất hiện trong bài tập nào */
export function unusedVocab(ws: Worksheet): string[] {
  const exs = ws.exercises.filter((e): e is Exercise => !!e && !e._failed && !e._streaming);
  if (!exs.length) return [];
  const text = exs.flatMap((ex) => exerciseTexts(ex).map((t) => t.text)).join(" ").toLowerCase();
  return (ws.learn?.vocab || [])
    .map((v) => String(v.word || "").trim())
    .filter((w) => {
      if (!w) return false;
      const lw = w.toLowerCase();
      // so khớp gốc từ thô: "cook" khớp cooks/cooked/cooking
      const stem = lw.length > 4 ? lw.replace(/(ing|ed|es|s|e|y)$/, "") : lw;
      return !new RegExp("(^|[^a-z])" + stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(text);
    });
}
