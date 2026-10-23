// Dựng dữ liệu tham chiếu tĩnh (taxonomy chủ điểm + bảng level từ vựng) từ .specs/resources → lib/worksheet/data/*.json
// Chạy: npm run data:build   (cần `pdftotext` — có sẵn trong Git for Windows / poppler-utils)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Papa from "papaparse";

const SRC = join(process.cwd(), ".specs", "resources");
const OUT = join(process.cwd(), "lib", "worksheet", "data");
const LEVELS = ["Pre A1", "A1", "A2", "B1", "B2", "C1", "C2"] as const;

const readCsv = (file: string) =>
  Papa.parse<string[]>(readFileSync(join(SRC, file), "utf8").replace(/^﻿/, ""), { skipEmptyLines: true }).data;

const levelIdx = (raw: string): number | null => {
  const i = LEVELS.indexOf(raw.trim().replace(/^Pre-A1$/i, "Pre A1") as (typeof LEVELS)[number]);
  return i >= 0 ? i : null;
};

/* ===== TAXONOMY ===== */
// Bảng bắt đầu ở dòng tiêu đề "Topic ID"; các dòng trên là ghi chú của file
function buildTaxonomy(file: string, prefix: string) {
  const rows = readCsv(file);
  const head = rows.findIndex((r) => r[0] === "Topic ID");
  if (head < 0) throw new Error(`${file}: không thấy dòng tiêu đề "Topic ID"`);
  const topics = new Map<string, { id: string; en: string; vi: string; definition: string }>();
  const subs = [];
  for (const r of rows.slice(head + 1)) {
    const [topicId, topicEn, topicVi, topicDef, id, en, vi, scope, examples, from, to, status] = r.map((c) => (c || "").trim());
    if (!topicId.startsWith(prefix) || !id) continue;
    if (status && status !== "Active") continue;
    if (!topics.has(topicId)) topics.set(topicId, { id: topicId, en: topicEn, vi: topicVi, definition: topicDef });
    const fromI = levelIdx(from);
    if (fromI === null) throw new Error(`${file}: ${id} có "CEFR from" không hợp lệ: "${from}"`);
    // "CEFR to" để trống = không giới hạn trên
    const toI = to ? levelIdx(to) : LEVELS.length - 1;
    if (toI === null) throw new Error(`${file}: ${id} có "CEFR to" không hợp lệ: "${to}"`);
    subs.push({ id, topicId, en, vi, scope, examples, from: fromI, to: toI });
  }
  return { topics: [...topics.values()], subs };
}

/* ===== TỪ VỰNG ===== */
// lemmas[level] = từ gốc (và cụm từ) có level thấp nhất là level đó; forms[level] = dạng biến đổi (went, children...)
const lemmaLevel = new Map<string, number>();
const formLemmas = new Map<string, Set<string>>(); // dạng biến đổi → các từ gốc của nó (level tính sau cùng)
const setMin = (m: Map<string, number>, w: string, lv: number) => {
  if (!w) return;
  const cur = m.get(w);
  if (cur === undefined || lv < cur) m.set(w, lv);
};
const clean = (w: string) => w.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const CLEAN_RE = /^[a-z][a-z' -]*$/;

// "(all) in one" → ["all in one", "in one"]; "(at) any minute; any minute now" → tách theo ";"
function expandPhrase(raw: string): string[] {
  const out: string[] = [];
  for (const part of raw.split(";")) {
    const withOpt = clean(part.replace(/[()]/g, ""));
    const withoutOpt = clean(part.replace(/\([^)]*\)/g, ""));
    for (const p of [withOpt, withoutOpt]) if (CLEAN_RE.test(p) && !out.includes(p)) out.push(p);
  }
  return out;
}

function addEvp() {
  const rows = Papa.parse<Record<string, string>>(readFileSync(join(SRC, "evp.csv"), "utf8").replace(/^﻿/, ""), {
    header: true,
    skipEmptyLines: true,
  }).data;
  for (const r of rows) {
    const lv = levelIdx(r.level || "");
    if (lv === null) continue;
    const pos = (r.part_of_speech || "").trim();
    if (pos === "phrase" || pos === "phrasal verb") {
      expandPhrase(r.base_word || "").forEach((p) => setMin(lemmaLevel, p, lv));
      continue;
    }
    const head = clean(r.headword || "");
    if (!CLEAN_RE.test(head)) continue;
    setMin(lemmaLevel, head, lv);
    for (const f of (r.search_terms || "").split(";").map(clean)) {
      if (!f || f === head || !CLEAN_RE.test(f)) continue;
      if (!formLemmas.has(f)) formLemmas.set(f, new Set());
      formLemmas.get(f)!.add(head);
    }
  }
}

// Wordlist Cambridge: Starters → Pre A1; Movers → A1, Flyers → A2 chỉ để lấp từ EVP chưa có
const POS = new Set(["n", "v", "adj", "adv", "prep", "pron", "det", "conj", "int", "excl", "dis", "poss"]);
const YLE = [
  { header: "Pre A1 Starters", level: 0, override: true },
  { header: "A1 Movers", level: 1, override: false },
  { header: "A2 Flyers", level: 2, override: false },
];

function parseYle() {
  const text = execFileSync("pdftotext", ["-layout", "-enc", "UTF-8", join(SRC, "506166-starters-movers-flyers-word-list-2018.pdf"), "-"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const lines = text.replace(/\f/g, "").split(/\r?\n/); // \f = ngắt trang
  const words: Record<number, Set<string>> = { 0: new Set(), 1: new Set(), 2: new Set() };
  const names = new Set<string>();
  let cur: (typeof YLE)[number] | null = null;
  let mode: "key" | "words" | "names" = "key";
  for (const line of lines) {
    // Tiêu đề mục nằm sát lề trái; chân trang (cùng chữ) thì thụt vào và có số trang
    const sec = YLE.find((s) => new RegExp(`^${s.header} A.Z wordlist\\s*$`).test(line));
    if (sec) { cur = sec; mode = "key"; continue; }
    if (!cur) continue;
    if (/^alphabetic vocabulary list/.test(line)) { cur = null; continue; } // hết 3 danh sách A–Z, phần sau là bảng gộp
    if (/wordlist\s+\d+\s*$/.test(line) || /Candidates will be expected/.test(line)) continue;
    if (/^Names\s*$/.test(line)) { mode = "names"; continue; }
    if (/^(Letters & numbers|Numbers)\s*$/.test(line)) { mode = mode === "names" ? "names" : "words"; continue; }
    const chunks = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
    if (mode === "key") {
      if (chunks[0] !== "A") continue; // hết bảng ký hiệu khi gặp đề mục chữ "A"
      mode = "words";
    }
    for (const chunk of chunks) {
      if (mode === "names") {
        chunk.replace(/\(.*?\)/g, "").split("/").map((n) => n.trim()).filter((n) => /^[A-Z][a-z]+$/.test(n)).forEach((n) => names.add(n));
        continue;
      }
      const toks = chunk.split(" ");
      const p = toks.findIndex((t, i) => i > 0 && POS.has(t));
      if (p < 0) continue; // đề mục chữ cái, chú thích...
      const head = toks.slice(0, p).join(" ");
      // bỏ chú thích trong ngoặc: "apartment (UK flat)", "mouse (computer)", "letter (as in alphabet)"
      for (const v of head.replace(/\([^)]*\)/g, "").split("/")) {
        const w = clean(v);
        if (CLEAN_RE.test(w)) words[cur.level].add(w);
      }
    }
  }
  for (const s of YLE) {
    if (words[s.level].size < 150) throw new Error(`Wordlist ${s.header}: chỉ đọc được ${words[s.level].size} từ — kiểm tra lại bố cục PDF`);
    for (const w of words[s.level]) {
      if (s.override) setMin(lemmaLevel, w, s.level);
      else if (!lemmaLevel.has(w) && !formLemmas.has(w)) lemmaLevel.set(w, s.level);
    }
  }
  return { counts: YLE.map((s) => words[s.level].size), names: [...names].sort() };
}

function byLevel(m: Map<string, number>, skip?: Map<string, number>) {
  const out: string[][] = LEVELS.map(() => []);
  for (const [w, lv] of m) if (!skip || !skip.has(w)) out[lv].push(w);
  return out.map((ws) => ws.sort().join("|"));
}

function main() {
  mkdirSync(OUT, { recursive: true });

  const taxonomy = {
    grammar: buildTaxonomy("vocabulary_grammar_taxonomy - Grammar.csv", "G"),
    vocabulary: buildTaxonomy("vocabulary_grammar_taxonomy - Vocabulary (1).csv", "V"),
  };
  writeFileSync(join(OUT, "taxonomy.json"), JSON.stringify(taxonomy));

  addEvp();
  const yle = parseYle();
  // level của dạng biến đổi = level thấp nhất trong các từ gốc (sau khi đã gộp wordlist Starters: be → Pre A1 thì is/was cũng vậy)
  const formLevel = new Map<string, number>();
  for (const [f, heads] of formLemmas) for (const h of heads) setMin(formLevel, f, lemmaLevel.get(h) ?? LEVELS.length - 1);
  const lexicon = {
    levels: LEVELS,
    lemmas: byLevel(lemmaLevel),
    // dạng biến đổi trùng với một từ gốc thì đã có ở lemmas
    forms: byLevel(formLevel, lemmaLevel),
    names: yle.names,
  };
  writeFileSync(join(OUT, "lexicon.json"), JSON.stringify(lexicon));

  const perLevel = (k: "grammar" | "vocabulary") =>
    LEVELS.map((l, i) => `${l}:${taxonomy[k].subs.filter((s) => s.from <= i && i <= s.to).length}`).join(" ");
  console.log(`taxonomy: grammar ${taxonomy.grammar.topics.length}/${taxonomy.grammar.subs.length}, vocabulary ${taxonomy.vocabulary.topics.length}/${taxonomy.vocabulary.subs.length}`);
  console.log(`  chip theo level — grammar  ${perLevel("grammar")}`);
  console.log(`  chip theo level — vocab    ${perLevel("vocabulary")}`);
  console.log(`wordlist YLE: Starters ${yle.counts[0]}, Movers ${yle.counts[1]}, Flyers ${yle.counts[2]}, tên ${yle.names.length}`);
  console.log(`lexicon: ${LEVELS.map((l, i) => `${l}:${lexicon.lemmas[i].split("|").length}`).join(" ")}; forms ${formLevel.size}`);
}

main();
