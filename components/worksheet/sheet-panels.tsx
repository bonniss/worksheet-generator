"use client";
/* Các khối của màn hình worksheet: hộp từ, nhãn level từ, quét từ vựng, gen lại theo phạm vi, đổi chủ điểm, sắp xếp */
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { subToMeta, type TaxSub } from "@/lib/worksheet/taxonomy";
import { LEVELS, STAGE_VI, TYPE_META, stagesForLevel, typesForStage } from "@/lib/worksheet/themes";
import type { Cfg, Exercise, Level, Stage, Theme, TopicMeta } from "@/lib/worksheet/types";
import { hasOptionItems, parseWordBox, shuffleRandom, type ReorderMode } from "@/lib/worksheet/utils";
import type { Lexicon, ScanResult } from "@/lib/worksheet/vocab";
import { TopicSuggest, topicLevels } from "./setup-panels";
import { AutoTextarea, Chip, Spinner, ToolBtn } from "./ui";

/* ===== HỘP TỪ ===== */
export function WordBox({ words, theme }: { words?: string[]; theme: Theme }) {
  const list = (words || []).map((w) => String(w).trim()).filter(Boolean);
  if (!list.length) return null;
  return (
    <div style={{
      border: `2px solid ${theme.line}`, borderRadius: 12, padding: "7px 14px", margin: "0 0 12px",
      display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 22px",
      fontSize: theme.itemFont - 1, fontWeight: 700, color: theme.pillText,
    }}>
      {list.map((w, i) => <span key={i}>{w}</span>)}
    </div>
  );
}

/** Từ để dựng hộp từ từ đáp án của bài (mỗi chỗ trống 1 từ; answer có nhiều chỗ trống thì tách theo dấu phẩy) */
export function wordsFromAnswers(ex: Exercise): string[] {
  const out: string[] = [];
  ex.items.forEach((it) => {
    if (ex.type === "transform_table") (it.cells || []).forEach((c, i) => { if ((it.blanks || [])[i] && c.trim()) out.push(c.trim()); });
    else String(it.answer || "").split(/,(?![^(]*\))/).map((x) => x.trim()).filter(Boolean).forEach((x) => out.push(x));
  });
  return shuffleRandom([...new Set(out)]);
}

export function WordBoxEditor({ draft, setDraft, theme, inp }: {
  draft: Exercise; setDraft: (fn: (d: Exercise) => Exercise) => void; theme: Theme; inp: CSSProperties;
}) {
  const has = Array.isArray(draft.wordBox);
  const [raw, setRaw] = useState((draft.wordBox || []).join(", "));
  const btn: CSSProperties = {
    border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.accent, borderRadius: 999,
    padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
  };
  const setWords = (arr: string[]) => { setRaw(arr.join(", ")); setDraft((d) => ({ ...d, wordBox: arr })); };
  if (!has) {
    return (
      <button type="button" onClick={() => { setRaw(""); setDraft((d) => ({ ...d, wordBox: [] })); }} style={{ ...btn, borderStyle: "dashed", alignSelf: "flex-start" }}>
        + Thêm hộp từ (từ cho sẵn)
      </button>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, border: `1.5px dashed ${theme.line}`, borderRadius: 10, padding: 8, background: "#fff" }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Hộp từ — các từ ngăn bởi dấu phẩy hoặc xuống dòng</label>
      <AutoTextarea style={inp} value={raw} placeholder="vd: happy, sad, a lot of, tired"
        onChange={(e) => { setRaw(e.target.value); setDraft((d) => ({ ...d, wordBox: parseWordBox(e.target.value) })); }} />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => setWords(shuffleRandom(draft.wordBox || []))} style={btn}>🔀 Xáo thứ tự</button>
        <button type="button" onClick={() => setWords([...(draft.wordBox || [])].sort((a, b) => a.localeCompare(b)))} style={btn}>A→Z</button>
        <button type="button" onClick={() => setWords(wordsFromAnswers(draft))} style={btn}>↻ Lấy từ đáp án</button>
        <button type="button" onClick={() => { setRaw(""); setDraft((d) => { const n = { ...d }; delete n.wordBox; return n; }); }} style={{ ...btn, border: "none", color: "#c04040" }}>✕ Xoá hộp từ</button>
        <span style={{ fontSize: 11, color: "#8ea3b5" }}>{(draft.wordBox || []).length} từ</span>
      </div>
    </div>
  );
}

/* ===== NHÃN LEVEL CỦA TỪ (chỉ trên màn hình, không in) ===== */
export function CefrTag({ word, lex, maxI }: { word: string; lex: Lexicon | null; maxI: number }) {
  if (!lex) return null;
  const lv = lex.levelOf(word);
  const [bg, fg, text, tip] = lv < 0
    ? ["#eef1f4", "#8ea3b5", "?", "Không có trong danh sách tham chiếu"]
    : lv > maxI
      ? ["#fde4e4", "#c04040", LEVELS[lv], `Vượt level từ vựng (${LEVELS[maxI]})`]
      : ["#e2f5e6", "#2e8b57", LEVELS[lv], "Trong level từ vựng"];
  return (
    <span className="ws-noprint" title={tip} style={{
      background: bg, color: fg, borderRadius: 6, padding: "0 5px", fontSize: 10, fontWeight: 800,
      marginLeft: 4, verticalAlign: "middle", fontStyle: "normal", fontFamily: "'Nunito Sans', sans-serif",
    }}>{text}</span>
  );
}

/* ===== SẮP XẾP CÂU ===== */
export function ReorderMenu({ ex, theme, onMode }: { ex: Exercise; theme: Theme; onMode: (m: ReorderMode) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const item = (m: ReorderMode, label: string) => (
    <button type="button" onClick={() => { onMode(m); setOpen(false); }} style={{
      display: "block", width: "100%", textAlign: "left", border: "none", background: "#fff", padding: "6px 12px",
      fontSize: 12.5, fontWeight: 700, color: theme.accent, cursor: "pointer", whiteSpace: "nowrap", fontFamily: theme.body,
    }}>{label}</button>
  );
  return (
    <span ref={ref} style={{ position: "relative" }}>
      <ToolBtn theme={theme} onClick={() => setOpen(!open)} title="Sắp xếp câu" active={open}>⇅ Sắp xếp</ToolBtn>
      {open ? (
        <div className="ws-noprint" style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 20, background: "#fff", borderRadius: 10,
          border: `1.5px solid ${theme.line}`, boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: "4px 0", minWidth: 190,
        }}>
          {item("shuffle", "🔀 Xáo thứ tự câu")}
          {item("reverse", "↕ Đảo ngược thứ tự câu")}
          {hasOptionItems(ex) ? item("options", "🔤 Xáo thứ tự đáp án") : null}
        </div>
      ) : null}
    </span>
  );
}

/** Thanh sắp xếp trong trình sửa bài */
export function ReorderBar({ ex, theme, onMode }: { ex: Exercise; theme: Theme; onMode: (m: ReorderMode) => void }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ fontSize: 11.5, color: "#8ea3b5", fontWeight: 700 }}>Sắp xếp câu:</span>
      <Chip theme={theme} onClick={() => onMode("shuffle")} style={{ fontSize: 11.5, padding: "2px 9px" }}>🔀 Xáo</Chip>
      <Chip theme={theme} onClick={() => onMode("reverse")} style={{ fontSize: 11.5, padding: "2px 9px" }}>↕ Đảo ngược</Chip>
      {hasOptionItems(ex) ? <Chip theme={theme} onClick={() => onMode("options")} style={{ fontSize: 11.5, padding: "2px 9px" }}>🔤 Xáo đáp án</Chip> : null}
    </div>
  );
}

/* ===== GEN LẠI THEO PHẠM VI ===== */
export type RegenOpts =
  | { kind: "learn"; scope: "all" | "grammar" | "vocab" }
  | { kind: "exercise"; scope: "all"; stage: Stage; type: string }
  | { kind: "exercise"; scope: "items"; keep: number[] };

/* Ô gen lại: chọn phạm vi + yêu cầu (trống = gen mới hoàn toàn; có chữ = gen theo chỉ dẫn) */
export function RegenBox({ theme, onRun, onClose, busy, ex, level, learnTitle }: {
  theme: Theme; onRun: (instruction: string, opts: RegenOpts) => void; onClose: () => void; busy: boolean;
  /** có = gen lại 1 bài; không = phần Learn */
  ex?: Exercise; level: Level; learnTitle?: string;
}) {
  const [txt, setTxt] = useState("");
  const [learnScope, setLearnScope] = useState<"all" | "grammar" | "vocab">("all");
  const [exScope, setExScope] = useState<"all" | "items">("all");
  const [keep, setKeep] = useState<number[]>([]);
  const [stage, setStage] = useState<Stage>(ex?.stage ?? "Controlled");
  const [type, setType] = useState(ex?.type ?? "");
  const itemsAllowed = !!ex && ex.type !== "error_passage" && ex.items.length > 0;
  const stages = stagesForLevel(level);
  const types = typesForStage(level, stage);
  const typeChanged = !!ex && (stage !== ex.stage || type !== ex.type);
  const sel: CSSProperties = {
    flex: 1, minWidth: 140, border: `1.5px solid ${theme.line}`, borderRadius: 8, padding: "5px 8px",
    fontSize: 12.5, fontWeight: 700, color: theme.accent, fontFamily: theme.body,
  };
  const run = () => {
    if (!ex) return onRun(txt, { kind: "learn", scope: learnScope });
    if (exScope === "items") return onRun(txt, { kind: "exercise", scope: "items", keep });
    onRun(txt, { kind: "exercise", scope: "all", stage, type: type || ex.type });
  };
  const noneFree = exScope === "items" && !!ex && keep.length >= ex.items.length;
  return (
    <div className="ws-noprint" style={{ background: theme.softBg, border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: 10, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {!ex ? (
          <>
            <Chip theme={theme} on={learnScope === "all"} onClick={() => setLearnScope("all")}>Cả phần {learnTitle}</Chip>
            <Chip theme={theme} on={learnScope === "grammar"} onClick={() => setLearnScope("grammar")}>Chỉ ngữ pháp (giữ từ vựng)</Chip>
            <Chip theme={theme} on={learnScope === "vocab"} onClick={() => setLearnScope("vocab")}>Chỉ từ vựng (giữ ngữ pháp)</Chip>
          </>
        ) : (
          <>
            <Chip theme={theme} on={exScope === "all"} onClick={() => setExScope("all")}>Cả bài</Chip>
            {itemsAllowed ? <Chip theme={theme} on={exScope === "items"} onClick={() => setExScope("items")}>Chỉ các câu (giữ tiêu đề, đề bài, đoạn văn)</Chip> : null}
          </>
        )}
      </div>

      {ex && exScope === "all" ? (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          <select value={stage} style={sel} onChange={(e) => {
            const st = e.target.value as Stage;
            const opts = typesForStage(level, st);
            setStage(st);
            if (!opts.includes(type)) setType(opts[0] || type);
          }}>
            {(stages.includes(ex.stage) ? stages : [ex.stage, ...stages]).map((st) => <option key={st} value={st}>{STAGE_VI[st]}</option>)}
          </select>
          <select value={type} style={sel} onChange={(e) => setType(e.target.value)}>
            {(types.includes(type) ? types : [type, ...types]).map((tp) => <option key={tp} value={tp}>{TYPE_META[tp]?.label || tp}</option>)}
          </select>
          {typeChanged ? <div style={{ width: "100%", fontSize: 11.5, color: "#b07a00", fontWeight: 700 }}>⚠ Đổi stage/dạng bài: nội dung bài sẽ được viết mới theo dạng mới.</div> : null}
        </div>
      ) : null}

      {ex && exScope === "items" ? (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 11.5, color: "#5a6b7a", marginBottom: 4 }}>Tick <b>giữ</b> ở những câu muốn giữ nguyên — các câu còn lại sẽ được viết mới{ex.wordBox?.length ? " (hộp từ được giữ)" : ""}.</div>
          {ex.items.map((it, k) => (
            <label key={k} style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 12.5, padding: "2px 0", cursor: "pointer" }}>
              <input type="checkbox" checked={keep.includes(k)} onChange={() => setKeep((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))} style={{ marginTop: 3 }} />
              <span style={{ fontWeight: 800, color: theme.accent, minWidth: 34 }}>giữ {k + 1}.</span>
              <span style={{ color: "#3b4a58" }}>{(it.prompt || (it.cells || []).join(" → ")).slice(0, 120)}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>Yêu cầu thêm (để trống nếu muốn tạo mới tự do):</div>
      <AutoTextarea value={txt} onChange={(e) => setTxt(e.target.value)} autoFocus minRows={2}
        placeholder="vd: làm câu dễ hơn, thêm gợi ý trong ngoặc; hoặc: dùng hộp từ cho sẵn..."
        style={{ width: "100%", border: `1.5px solid ${theme.line}`, borderRadius: 8, padding: "6px 8px", fontSize: 13, fontFamily: theme.body, boxSizing: "border-box" }} />
      <div style={{ display: "flex", gap: 8, marginTop: 6, alignItems: "center" }}>
        <button onClick={run} disabled={busy || noneFree} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 999,
          padding: "5px 16px", fontWeight: 700, cursor: busy || noneFree ? "default" : "pointer", fontSize: 13,
          opacity: busy || noneFree ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
        }}>{busy ? <Spinner color="#fff" /> : "🔄"} Gen lại</button>
        <button onClick={onClose} disabled={busy} style={{
          background: "#fff", color: "#7a8a99", border: `1.5px solid ${theme.line}`,
          borderRadius: 999, padding: "5px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Huỷ</button>
        {noneFree ? <span style={{ fontSize: 11.5, color: "#c04040", fontWeight: 700 }}>Bỏ tick ít nhất 1 câu để gen lại.</span> : null}
      </div>
    </div>
  );
}

/* ===== QUÉT TỪ VỰNG ===== */
export function ScanPanel({ scan, unused, maxLevel, theme, onClose, onRegenEx, regenIdx, onSyncVocab, syncing }: {
  scan: ScanResult | null; unused: string[]; maxLevel: Level; theme: Theme; onClose: () => void;
  onRegenEx: (i: number, words: string[]) => void; regenIdx: number | null;
  onSyncVocab: () => void; syncing: boolean;
}) {
  const box: CSSProperties = { maxWidth: 640, margin: "0 auto 12px", background: "#fff", borderRadius: 14, padding: "12px 16px", border: `1.5px solid ${theme.line}`, fontSize: 13 };
  if (!scan) return <div className="ws-noprint" style={box}><Spinner color={theme.accent} /> Đang tải bảng từ vựng...</div>;
  return (
    <div className="ws-noprint" style={box}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <b style={{ color: theme.ink, flex: 1 }}>🔍 Quét từ vựng — level từ vựng tối đa {maxLevel}</b>
        <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#7a8a99", cursor: "pointer", fontWeight: 800 }}>✕</button>
      </div>
      {scan.hits.length ? (
        <>
          <div style={{ color: "#7a8a99", fontSize: 12, marginBottom: 6 }}>Từ vượt level (không tính instruction, tiêu đề, lời giải thích ngữ pháp, tên riêng):</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
            {scan.hits.map((h) => (
              <div key={h.word} style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                <b style={{ color: "#c04040", minWidth: 90 }}>{h.word}</b>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#c04040", background: "#fde4e4", borderRadius: 6, padding: "0 5px" }}>{LEVELS[h.levelIdx]}</span>
                <span style={{ color: "#5a6b7a", fontSize: 12 }}>{h.where.join(" · ")}</span>
              </div>
            ))}
          </div>
          {scan.byExercise.size ? (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {[...scan.byExercise].map(([i, words]) => (
                <ToolBtn key={i} theme={theme} disabled={regenIdx !== null} onClick={() => onRegenEx(i, words)}>
                  {regenIdx === i ? <Spinner color={theme.accent} /> : "🔄"} Gen lại bài {i + 1} (thay: {words.slice(0, 4).join(", ")}{words.length > 4 ? "…" : ""})
                </ToolBtn>
              ))}
            </div>
          ) : null}
          {scan.learnWords.length ? <div style={{ fontSize: 12, color: "#7a8a99" }}>Từ vượt level ở phần Learn: sửa tay hoặc bấm 🔄 Gen lại ở phần đó.</div> : null}
        </>
      ) : (
        <div style={{ color: "#2e8b57", fontWeight: 700, marginBottom: 6 }}>✓ Không thấy từ nào vượt level {maxLevel}.</div>
      )}
      {unused.length ? (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${theme.line}` }}>
          <div style={{ marginBottom: 6 }}>Từ vựng trọng tâm <b>chưa xuất hiện</b> trong bài tập: <b style={{ color: "#b07a00" }}>{unused.join(", ")}</b></div>
          <ToolBtn theme={theme} disabled={syncing} onClick={onSyncVocab}>{syncing ? <Spinner color={theme.accent} /> : "🔁"} Đồng bộ từ vựng theo bài tập</ToolBtn>
        </div>
      ) : null}
    </div>
  );
}

/* ===== ĐỔI CHỦ ĐIỂM ===== */
export function ChangeTopicPanel({ cfg, theme, busy, onRun, onClose }: {
  cfg: Cfg; theme: Theme; busy: boolean; onRun: (topic: string, meta: TopicMeta | null) => void; onClose: () => void;
}) {
  const [topic, setTopic] = useState(cfg.topic);
  const [meta, setMeta] = useState<TopicMeta | null>(cfg.topicMeta ?? null);
  const pick = (s: TaxSub) => { setTopic(s.en); setMeta(subToMeta(s)); };
  return (
    <div className="ws-noprint" style={{ maxWidth: 640, margin: "0 auto 12px", background: "#fff", borderRadius: 14, padding: "12px 16px", border: `1.5px solid ${theme.line}` }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <b style={{ color: theme.ink, flex: 1, fontSize: 13 }}>🎯 Đổi chủ điểm</b>
        <button onClick={onClose} style={{ border: "none", background: "transparent", color: "#7a8a99", cursor: "pointer", fontWeight: 800 }}>✕</button>
      </div>
      <input value={topic} onChange={(e) => { setTopic(e.target.value); setMeta(null); }} style={{
        width: "100%", border: `2px solid ${theme.line}`, borderRadius: 10, padding: "7px 10px", fontSize: 14, fontFamily: theme.body, boxSizing: "border-box", marginBottom: 12,
      }} />
      <TopicSuggest kind={cfg.type} levels={topicLevels(cfg)} topic={topic} onPick={pick} theme={theme} />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button disabled={busy || !topic.trim()} onClick={() => onRun(topic.trim(), meta && meta.en === topic.trim() ? meta : null)} style={{
          background: theme.accent2, color: "#fff", border: "none", borderRadius: 999, padding: "6px 16px", fontWeight: 800,
          cursor: busy ? "default" : "pointer", fontSize: 13, opacity: busy || !topic.trim() ? 0.6 : 1,
        }}>✨ Tạo lại worksheet với chủ điểm này</button>
        <span style={{ fontSize: 11.5, color: "#7a8a99" }}>Bản hiện tại vẫn giữ trong lịch sử — bấm ↶ Hoàn tác để quay lại.</span>
      </div>
    </div>
  );
}
