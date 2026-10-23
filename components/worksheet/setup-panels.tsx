"use client";
/* Các khối của màn hình thiết lập: level từ vựng, gợi ý chủ điểm (taxonomy), gợi ý prompt */
import { useMemo, useState } from "react";
import { levelRange, taxSubs, taxTopics, type TaxSub } from "@/lib/worksheet/taxonomy";
import { LEVELS, THEMES } from "@/lib/worksheet/themes";
import type { Cfg, FocusType, Level, Theme } from "@/lib/worksheet/types";
import { shuffle } from "@/lib/worksheet/utils";
import type { PromptIdea } from "@/lib/worksheet/prompts";
import { effVocabLevels, maxVocabIdx, type Lexicon } from "@/lib/worksheet/vocab";
import { Chip, Spinner } from "./ui";

/* ===== LEVEL TỪ VỰNG (chọn nhiều) ===== */
export function VocabLevelPicker({ cfg, onChange, theme }: { cfg: Cfg; onChange: (levels: Level[]) => void; theme: Theme }) {
  const sel = cfg.vocabLevels || [];
  const follow = sel.length === 0;
  const toggle = (lv: Level) => onChange(sel.includes(lv) ? sel.filter((x) => x !== lv) : LEVELS.filter((x) => x === lv || sel.includes(x)));
  return (
    <div style={{ display: "flex", gap: 6, margin: "6px 0 4px", flexWrap: "wrap", alignItems: "center" }}>
      <Chip theme={theme} on={follow} onClick={() => onChange([])} title="Dùng đúng level chính ở trên">Theo level chính ({cfg.level})</Chip>
      {LEVELS.map((lv) => (
        <button key={lv} type="button" onClick={() => toggle(lv)} style={{
          borderRadius: 999, padding: "4px 11px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", fontFamily: theme.body,
          border: `2px solid ${sel.includes(lv) ? THEMES[lv].pageBg : "#e3e9ef"}`,
          background: sel.includes(lv) ? THEMES[lv].pageBg : "#fff", color: sel.includes(lv) ? "#fff" : "#7a8a99",
        }}>{lv}</button>
      ))}
    </div>
  );
}

/* ===== GỢI Ý CHỦ ĐIỂM TỪ TAXONOMY ===== */
const BATCH = 8;

export function TopicSuggest({ kind, levels, topic, onPick, theme }: {
  kind: FocusType; levels: Level[]; topic: string; onPick: (s: TaxSub) => void; theme: Theme;
}) {
  const subs = useMemo(() => taxSubs(kind, levels), [kind, levels]);
  // Thứ tự xáo cố định theo kind + level để "Gợi ý khác" đi lần lượt, không lặp tới khi hết vòng
  const order = useMemo(() => shuffle(subs, kind.length * 31 + levels.join().length * 7 + subs.length), [subs, kind, levels]);
  const [batch, setBatch] = useState(0);
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);
  if (!subs.length) {
    return <div style={{ fontSize: 12, color: "#9aa9b8", margin: "-8px 0 12px" }}>Chưa có chủ điểm gợi ý cho level này — nhập tay ở trên.</div>;
  }
  const start = (batch * BATCH) % order.length;
  const shown = [...order, ...order].slice(start, start + Math.min(BATCH, order.length));
  const tip = (s: TaxSub) => `${s.vi}\nPhạm vi: ${s.scope}\nVí dụ: ${s.examples}\nLevel: ${levelRange(s)}`;
  const chip = (s: TaxSub) => (
    <Chip key={s.id} theme={theme} on={topic === s.en} onClick={() => onPick(s)} title={tip(s)} style={{ fontSize: 12, padding: "3px 10px" }}>{s.en}</Chip>
  );
  const topics = taxTopics(kind).filter((t) => subs.some((s) => s.topicId === t.id));
  return (
    <div style={{ margin: "-6px 0 14px" }}>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
        {(all ? [] : shown).map(chip)}
        {!all && order.length > BATCH ? (
          <button type="button" onClick={() => setBatch((b) => b + 1)} style={linkBtn(theme)}>🔀 Gợi ý khác</button>
        ) : null}
        <button type="button" onClick={() => setAll(!all)} style={linkBtn(theme)}>{all ? "Thu gọn" : `Xem thêm (${subs.length})`}</button>
      </div>
      {all ? (
        <div style={{ marginTop: 8, border: `1.5px solid ${theme.line}`, borderRadius: 12, padding: 10, maxHeight: 320, overflowY: "auto", background: "#fff" }}>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            <Chip theme={theme} on={!filter} onClick={() => setFilter(null)} style={{ fontSize: 11.5, padding: "2px 9px" }}>Tất cả</Chip>
            {topics.map((t) => (
              <Chip key={t.id} theme={theme} on={filter === t.id} onClick={() => setFilter(t.id)} title={t.vi} style={{ fontSize: 11.5, padding: "2px 9px" }}>{t.en}</Chip>
            ))}
          </div>
          {topics.filter((t) => !filter || t.id === filter).map((t) => (
            <div key={t.id} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: theme.ink, marginBottom: 4 }}>{t.en} <span style={{ fontWeight: 500, color: "#9aa9b8" }}>· {t.vi}</span></div>
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{subs.filter((s) => s.topicId === t.id).map(chip)}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const linkBtn = (theme: Theme) => ({
  border: "none", background: "transparent", color: theme.accent, fontWeight: 700, fontSize: 12, cursor: "pointer", padding: "2px 4px", fontFamily: theme.body,
});

/** Level dùng để lọc chip: worksheet ngữ pháp theo level chính, từ vựng theo level từ vựng */
export const topicLevels = (cfg: Cfg): Level[] => (cfg.type === "grammar" ? [cfg.level] : effVocabLevels(cfg));

/* ===== GỢI Ý PROMPT ===== */
export function PromptIdeas({ cfg, theme, lex, fetchIdeas, onToggle }: {
  cfg: Cfg; theme: Theme; lex: Lexicon | null;
  /** Gọi AI lấy thẻ gợi ý; cùng 1 lần bấm thì dùng chung runId (thử lại không tính thêm lượt) */
  fetchIdeas: (seen: string[], avoid: string[], runId: string) => Promise<PromptIdea[]>;
  onToggle: (text: string) => void;
}) {
  const [ideas, setIdeas] = useState<PromptIdea[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [seen, setSeen] = useState<string[]>([]);

  async function load() {
    if (!cfg.topic.trim()) { setErr("Hãy nhập chủ điểm trước, rồi bấm Gợi ý prompt nhé."); return; }
    setBusy(true); setErr("");
    try {
      const maxI = maxVocabIdx(cfg);
      const runId = crypto.randomUUID();
      // Chỉ xét câu ví dụ + từ gợi ý của thẻ: phần còn lại là lời dặn người soạn (tiếng Anh), không phải nội dung cho học sinh
      const tooHard = (x: PromptIdea) => (lex ? [...(x.samples || []), ...(x.words || [])].flatMap((t) => lex.aboveBand(t, maxI).map((h) => h.word)) : []);
      let list: PromptIdea[] = [];
      let firstBatch: PromptIdea[] = [];
      let avoid: string[] = [];
      for (let attempt = 0; attempt < 2 && list.length < 3; attempt++) {
        const cand = (await fetchIdeas(seen, avoid, runId)).filter((x) => x && x.title && x.text).slice(0, 3);
        if (!attempt) firstBatch = cand;
        const bad = cand.map(tooHard);
        list = [...list, ...cand.filter((_, k) => !bad[k].length)].slice(0, 3);
        avoid = [...new Set([...avoid, ...bad.flat()])].slice(0, 20);
      }
      if (!list.length) list = firstBatch; // vẫn hiện để không trống
      if (!list.length) throw new Error("empty");
      setIdeas(list);
      setSeen((t) => [...t, ...list.map((x) => x.title)].slice(-12));
    } catch (e) {
      setErr(e instanceof Error && e.name === "ApiError" ? e.message : "Chưa lấy được gợi ý, bấm lại để thử nhé.");
    }
    setBusy(false);
  }

  return (
    <>
      <button type="button" onClick={() => { void load(); }} disabled={busy} style={{
        border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.accent, borderRadius: 999,
        padding: "3px 11px", fontSize: 12, fontWeight: 800, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1,
        display: "inline-flex", alignItems: "center", gap: 6, fontFamily: theme.body, marginLeft: 8,
      }}>{busy ? <Spinner color={theme.accent} /> : ideas.length ? "↻" : "💡"} {ideas.length ? "3 gợi ý khác" : "Gợi ý prompt"}</button>
      {err ? <div style={{ color: "#d64545", fontSize: 12.5, fontWeight: 700, margin: "4px 0" }}>{err}</div> : null}
      {ideas.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0 4px" }}>
          <div style={{ fontSize: 11.5, color: "#7a8a99" }}>Bấm thẻ để thêm vào ô prompt (chọn được nhiều thẻ, bấm lần nữa để bỏ).</div>
          {ideas.map((idea, i) => {
            const on = cfg.notes.includes(idea.text);
            return (
              <button key={i} type="button" onClick={() => onToggle(idea.text)} style={{
                textAlign: "left", border: `1.5px solid ${on ? theme.accent : theme.line}`, background: on ? theme.softBg : "#fff",
                borderRadius: 12, padding: "8px 11px", cursor: "pointer", fontFamily: theme.body,
              }}>
                <div style={{ fontWeight: 800, color: theme.ink, fontSize: 13, marginBottom: 2 }}>{on ? "✓ " : ""}{idea.title}</div>
                <div style={{ fontSize: 12.5, color: "#4a5b6a", lineHeight: 1.45 }}>{idea.text}</div>
              </button>
            );
          })}
        </div>
      ) : null}
    </>
  );
}
