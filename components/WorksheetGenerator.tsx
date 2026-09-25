"use client";
/* eslint-disable @next/next/no-img-element -- ảnh là data URI (base64) người dùng tải lên, next/image không phù hợp */
import { useState, useMemo, useRef, type ChangeEvent, type CSSProperties, type ReactNode } from "react";
import { LOGO_SRC, MASCOT_SRC } from "@/lib/worksheet/assets";
import { ApiError, callClaude } from "@/lib/worksheet/claude-client";
import { buildSavedProject, downloadDoc, printWorksheet, saveProject } from "@/lib/worksheet/export";
import { buildExercisePrompt, buildLearnPrompt, buildStructurePrompt } from "@/lib/worksheet/prompts";
import {
  AGE_BY_LEVEL, LEVELS, STAGE_VI, THEMES, TYPE_META, stagesForLevel, syncPlan, typesForStage,
} from "@/lib/worksheet/themes";
import {
  isSavedProject,
  type Cfg, type Exercise, type GrammarBlock, type Item, type Learn, type Level, type RuleBlock,
  type SavedProject, type Stage, type StructurePlan, type TableBlock, type Theme, type VocabItem, type Worksheet,
} from "@/lib/worksheet/types";
import { cleanOpt, grammarBlocks, makeFiller, shuffle, tableToText, textToTable, type Filler } from "@/lib/worksheet/utils";

function Spinner({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 14, height: 14, border: `2px solid ${color}`,
      borderTopColor: "transparent", borderRadius: "50%", animation: "wsspin 0.8s linear infinite",
    }} />
  );
}

function ImageSlot({ desc, size, src }: { desc?: string; size: number; src?: string | null }) {
  if (src) {
    return (
      <img src={src} alt={desc || ""} style={{
        width: size, height: size * 0.72, borderRadius: 10, flexShrink: 0,
        objectFit: "cover", border: "none", boxShadow: "none",
        imageRendering: "auto", display: "block",
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size * 0.72, borderRadius: 12, flexShrink: 0,
      background: "linear-gradient(180deg,#BFE3FA 0%,#DFF2FD 55%,#A8D97C 55%,#8CCB5E 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "2px solid #ffffff", boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
      position: "relative", overflow: "hidden",
    }}>
      <span style={{ fontSize: size * 0.3 }}>🖼️</span>
      {desc ? (
        <span style={{
          position: "absolute", bottom: 2, left: 4, right: 4, fontSize: 8.5,
          color: "#2A6DB0", background: "rgba(255,255,255,0.85)", borderRadius: 6,
          padding: "1px 3px", textAlign: "center", whiteSpace: "nowrap",
          overflow: "hidden", textOverflow: "ellipsis",
        }}>{desc}</span>
      ) : null}
    </div>
  );
}

function SectionHeader({ num, title, sub, theme, right }: { num: number; title: ReactNode; sub?: ReactNode; theme: Theme; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10 }}>
      <div style={{
        width: 30, height: 30, borderRadius: "50%", background: theme.ink, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800,
        fontFamily: theme.display, fontSize: 15, flexShrink: 0, marginTop: 1,
      }}>{num}</div>
      <div style={{ flex: 1 }}>
        <div style={{ color: theme.ink, fontWeight: 800, fontFamily: theme.display, fontSize: theme.itemFont + 2 }}>{title}</div>
        {sub ? <div style={{ color: "#4a5b6a", fontSize: theme.baseFont - 1, marginTop: 1 }}>{sub}</div> : null}
      </div>
      {right}
    </div>
  );
}

function ToolBtn({ onClick, children, theme, disabled }: { onClick: () => void; children: ReactNode; theme: Theme; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="ws-noprint" style={{
      border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.accent,
      borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700,
      cursor: disabled ? "default" : "pointer", fontFamily: theme.body, opacity: disabled ? 0.5 : 1,
      display: "inline-flex", alignItems: "center", gap: 5,
    }}>{children}</button>
  );
}

/* Ô nhập yêu cầu khi Gen lại: trống = gen mới hoàn toàn; có chữ = gen theo chỉ dẫn */
function RegenBox({ theme, onRun, onClose, busy }: { theme: Theme; onRun: (instruction: string) => void; onClose: () => void; busy: boolean }) {
  const [txt, setTxt] = useState("");
  return (
    <div className="ws-noprint" style={{
      background: theme.softBg, border: `1.5px solid ${theme.line}`, borderRadius: 12,
      padding: 10, marginBottom: 10,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, marginBottom: 6 }}>
        Gen lại phần này — mô tả yêu cầu (để trống nếu muốn tạo mới hoàn toàn):
      </div>
      <textarea value={txt} onChange={(e) => setTxt(e.target.value)} autoFocus
        placeholder="vd: giữ nguyên phần grammar, chỉ đổi 2 từ vựng sang chủ đề châu Á; hoặc: làm câu dễ hơn, thêm gợi ý trong ngoặc..."
        style={{
          width: "100%", minHeight: 54, border: `1.5px solid ${theme.line}`, borderRadius: 8,
          padding: "6px 8px", fontSize: 13, fontFamily: theme.body, boxSizing: "border-box", resize: "vertical",
        }} />
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <button onClick={() => onRun(txt)} disabled={busy} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 999,
          padding: "5px 16px", fontWeight: 700, cursor: busy ? "default" : "pointer", fontSize: 13,
          opacity: busy ? 0.6 : 1, display: "inline-flex", alignItems: "center", gap: 6,
        }}>{busy ? <Spinner color="#fff" /> : "🔄"} Gen lại</button>
        <button onClick={onClose} disabled={busy} style={{
          background: "#fff", color: "#7a8a99", border: `1.5px solid ${theme.line}`,
          borderRadius: 999, padding: "5px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Huỷ</button>
      </div>
    </div>
  );
}

/* ================= RENDER TỪNG DẠNG BÀI ================= */
function Pill({ text, correct, showAnswers, theme }: { text: string; correct: boolean; showAnswers: boolean; theme: Theme }) {
  return (
    <span style={{
      background: showAnswers && correct ? theme.accent2 : theme.pillBg,
      color: showAnswers && correct ? "#fff" : theme.pillText,
      borderRadius: 999, padding: "3px 12px", fontWeight: 700,
      fontSize: theme.itemFont - 1, display: "inline-block",
    }}>{text}</span>
  );
}

function BlankLine({ text, theme, fills, short }: { text: unknown; theme: Theme; fills?: Filler | null; short?: boolean }) {
  // Render 1 dòng text, thay "___" bằng gạch trống; nếu fills được truyền thì điền đáp án lần lượt.
  // short=true: blank ngắn cố định (dùng cho mcq/matching — chỗ khuyết mang tính ký hiệu, không viết vào).
  const parts = String(text).split("___");
  return (
    <span>
      {parts.map((p, pi) => (
        <span key={pi}>
          <RichText text={p} />
          {pi < parts.length - 1 ? (
            <span style={{
              borderBottom: `2px solid ${theme.pillText}`, display: "inline-block",
              width: short ? 32 : undefined, minWidth: short ? 32 : 80, textAlign: "center",
              verticalAlign: "middle",
            }}>
              {fills ? <b style={{ color: theme.accent2 }}>{fills.next()}</b> : "\u00A0"}
            </span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

/* Nút tải ảnh: đọc file thành base64 (giữ trong phiên). Có xem trước + thay + xoá. */
function ImageUpload({ img, onChange, theme, label }: { img?: string | null; onChange: (img: string | null) => void; theme: Theme; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { alert("Vui lòng chọn một tệp ảnh."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      // Tự nén/thu nhỏ để ảnh nào cũng dùng được (kể cả ảnh nền dung lượng lớn) mà worksheet vẫn nhẹ.
      const im = new Image();
      im.onload = () => {
        const MAX = 900; // cạnh dài tối đa (px) — đủ nét cho worksheet in
        let { width: w, height: h } = im;
        if (w > MAX || h > MAX) {
          if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        try {
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("no 2d context");
          ctx.drawImage(im, 0, 0, w, h);
          // PNG nếu có alpha (giữ trong suốt), JPEG nếu ảnh nền (nhẹ hơn nhiều)
          const hasAlpha = /image\/(png|gif|webp)/.test(file.type);
          const out = hasAlpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.85);
          onChange(out);
        } catch {
          onChange(reader.result as string); // dự phòng: dùng ảnh gốc nếu nén lỗi
        }
      };
      im.onerror = () => alert("Không đọc được ảnh này, thử ảnh khác nhé.");
      im.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <input type="file" accept="image/*" ref={inputRef} onChange={pick} style={{ display: "none" }} />
      {img ? (
        <>
          <img src={img} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6, border: `1px solid ${theme.line}`, display: "block", imageRendering: "auto" }} />
          <button onClick={() => inputRef.current && inputRef.current.click()} style={{
            border: `1.5px solid ${theme.line}`, background: "#fff", color: theme.accent, borderRadius: 999,
            padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>Đổi ảnh</button>
          <button onClick={() => onChange(null)} style={{
            border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, fontSize: 12, padding: "0 4px",
          }}>Xoá ảnh</button>
        </>
      ) : (
        <button onClick={() => inputRef.current && inputRef.current.click()} style={{
          border: `1.5px dashed ${theme.line}`, background: "#fff", color: theme.accent, borderRadius: 999,
          padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
        }}>🖼️ {label || "Tải ảnh lên"}</button>
      )}
    </div>
  );
}

/* Render text có markup: **đậm**, *nghiêng*, ==highlight== */
function RichText({ text }: { text: unknown }) {
  const lines = String(text).split("\n");
  const renderInline = (str: string, keyPrefix: number) => {
    const parts = str.split(/(\*\*[^*]+\*\*|\*[^*]+\*|==[^=]+==)/g);
    return parts.map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <b key={keyPrefix + "-" + i}>{p.slice(2, -2)}</b>;
      if (p.startsWith("==") && p.endsWith("==")) return <mark key={keyPrefix + "-" + i} style={{ background: "#FFF29A", padding: "0 2px", borderRadius: 3 }}>{p.slice(2, -2)}</mark>;
      if (p.startsWith("*") && p.endsWith("*") && p.length > 2) return <i key={keyPrefix + "-" + i}>{p.slice(1, -1)}</i>;
      return <span key={keyPrefix + "-" + i}>{p}</span>;
    });
  };
  return (
    <span>
      {lines.map((ln, li) => (
        <span key={li}>
          {li > 0 ? <br /> : null}
          {renderInline(ln, li)}
        </span>
      ))}
    </span>
  );
}

function ExerciseItems({ ex, theme, showAnswers }: { ex: Exercise; theme: Theme; showAnswers: boolean }) {
  const seed = useMemo(() => ex.title.length * 7 + ex.items.length * 13, [ex]);
  const rights = useMemo(
    () => (ex.type === "match" ? shuffle(ex.items.map((it, i) => ({ text: it.answer, orig: i })), seed) : []),
    [ex, seed]
  );

  /* Nhóm dạng "câu gốc → viết lại/điền một dòng đáp án": hiển thị prompt + chỗ trống/đáp án bên dưới */
  const WRITE_TYPES = ["rewrite", "error_correction", "keyword_transform", "word_formation", "question_write"];

  /* --- Passage (dạng reading) --- */
  const passage = ex.passage ? (
    <div style={{
      background: theme.softBg, borderRadius: 12, padding: "12px 14px",
      fontSize: theme.itemFont - 1, lineHeight: 1.6, marginBottom: 12, color: "#2c3e50",
      border: `1.5px solid ${theme.line}`,
    }}><RichText text={ex.passage} /></div>
  ) : null;

  /* --- Matching: 2 cột thẳng hàng, ô ghi chữ cái đáp án cạnh số --- */
  if (ex.type === "match") {
    const ROW = 46;
    return (
      <div style={{ display: "flex", gap: 20 }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {ex.items.map((it, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: ROW, fontSize: theme.itemFont }}>
              <span style={{
                width: 22, height: 22, borderRadius: 5, flexShrink: 0, border: `1.5px solid ${theme.line}`,
                background: showAnswers ? theme.accent2 : "#fff", color: showAnswers ? "#fff" : "transparent",
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12,
              }}>{showAnswers ? String.fromCharCode(97 + rights.findIndex((r) => r.orig === i)) : "?"}</span>
              <b style={{ color: theme.ink }}>{i + 1}.</b>
              {(theme.showImages && it.imageDesc) || it.hasImg || it.img || (it.imageDesc && it.imageDesc.length) ? <ImageSlot desc={it.imageDesc} src={it.img} size={42} /> : null}
              <span style={{ flex: 1 }}><BlankLine text={it.prompt} theme={theme} short /></span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {rights.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, minHeight: ROW, fontSize: theme.itemFont }}>
              <b style={{ color: theme.accent2, flexShrink: 0 }}>{String.fromCharCode(97 + i)}.</b>
              <span style={{
                background: theme.pillBg, color: theme.pillText, borderRadius: 12,
                padding: "5px 12px", fontWeight: 700, fontSize: theme.itemFont - 1, flex: 1,
              }}>{r.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* --- Tick a or b (theo template A2) --- */
  if (ex.type === "tick") {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 20px" }}>
        {ex.items.map((it, i) => (
          <div key={i} style={{ fontSize: theme.itemFont - 1 }}>
            <b style={{ color: theme.accent }}>{i + 1}.</b>
            {(it.options || []).map((op, oi) => {
              const clean = cleanOpt(op);
              const correct = clean === cleanOpt(it.answer) || op === it.answer;
              return (
                <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, marginLeft: 14 }}>
                  <span style={{ flex: 1 }}>{String.fromCharCode(97 + oi)}. {clean}</span>
                  <span style={{
                    width: 15, height: 15, borderRadius: 3, flexShrink: 0,
                    background: showAnswers && correct ? theme.accent2 : theme.pillBg,
                    border: `1.5px solid ${theme.line}`, display: "inline-flex",
                    alignItems: "center", justifyContent: "center", color: "#fff",
                    fontSize: 10, fontWeight: 800,
                  }}>{showAnswers && correct ? "✓" : ""}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  /* --- Error choice: câu có 4 cụm A-B-C-D, chọn lỗi + sửa --- */
  if (ex.type === "error_choice") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: theme.gap * 0.6 }}>
        {ex.items.map((it, i) => {
          const segs = String(it.prompt).split(/(\*\*[^*]+\*\*)/g);
          let letterIdx = -1;
          const ansLetter = (String(it.answer).split("|")[0] || "").trim().toUpperCase();
          const ansFix = (String(it.answer).split("|")[1] || "").trim();
          return (
            <div key={i} style={{ fontSize: theme.itemFont, lineHeight: 1.7 }}>
              <b style={{ color: theme.ink, marginRight: 6 }}>{i + 1}.</b>
              {segs.map((s, si) => {
                if (s.startsWith("**") && s.endsWith("**")) {
                  letterIdx++;
                  const L = String.fromCharCode(65 + letterIdx);
                  const isWrong = showAnswers && L === ansLetter;
                  return (
                    <span key={si} style={{
                      borderBottom: `2px solid ${isWrong ? theme.accent2 : theme.pillText}`,
                      color: isWrong ? theme.accent2 : "inherit", fontWeight: isWrong ? 800 : 500,
                      padding: "0 2px", position: "relative", whiteSpace: "nowrap",
                    }}>
                      {s.slice(2, -2)}
                      <sub style={{ fontSize: 9, color: theme.accent, fontWeight: 800 }}> {L}</sub>
                    </span>
                  );
                }
                return <span key={si}>{s}</span>;
              })}
              {showAnswers ? (
                <span style={{ color: theme.accent2, fontWeight: 700, marginLeft: 8, fontSize: theme.itemFont - 2 }}>
                  → {ansLetter}: {ansFix}
                </span>
              ) : (
                <span style={{ marginLeft: 10, color: "#8ea3b5", fontSize: theme.itemFont - 3 }}>
                  Lỗi: ____  Sửa: __________
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* --- Error passage: đoạn văn nhiều lỗi + cột sửa --- */
  if (ex.type === "error_passage") {
    return (
      <div>
        {ex.passage ? (
          <div style={{
            background: theme.softBg, borderRadius: 12, padding: "12px 14px", position: "relative",
            fontSize: theme.itemFont - 1, lineHeight: 2, marginBottom: 12, color: "#2c3e50",
            border: `1.5px solid ${theme.line}`,
          }}>
            <span style={{ position: "absolute", top: 6, right: 10, fontSize: 11, fontWeight: 700, color: theme.accent }}>
              {ex.items.length} lỗi
            </span>
            <RichText text={ex.passage} />
          </div>
        ) : null}
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr 1fr", gap: "6px 12px", fontSize: theme.itemFont - 1 }}>
          <div style={{ fontWeight: 800, color: theme.ink }}>#</div>
          <div style={{ fontWeight: 800, color: theme.ink }}>Từ/cụm sai</div>
          <div style={{ fontWeight: 800, color: theme.ink }}>Sửa lại</div>
          {ex.items.map((it, i) => [
            <div key={"n" + i} style={{ fontWeight: 700, color: theme.accent }}>{i + 1}</div>,
            <div key={"w" + i} style={{ borderBottom: `1.5px solid ${theme.line}`, color: showAnswers ? "#3b4a58" : "#b0bcc7" }}>
              {showAnswers ? it.prompt : "\u00A0"}
            </div>,
            <div key={"f" + i} style={{ borderBottom: `1.5px solid ${theme.line}`, color: theme.accent2, fontWeight: 700 }}>
              {showAnswers ? it.answer : "\u00A0"}
            </div>,
          ])}
        </div>
      </div>
    );
  }

  /* --- Bảng biến đổi: cột tiêu đề + dòng mẫu + ô trống để học sinh viết --- */
  if (ex.type === "transform_table") {
    const cols = ex.columns && ex.columns.length ? ex.columns : ["", ""];
    const examples = ex.examples || [];
    const cellPad = theme.itemFont >= 16 ? "8px 10px" : "6px 9px";
    return (
      <table style={{ borderCollapse: "collapse", width: "100%", fontSize: theme.itemFont }}>
        <thead>
          <tr>
            <th style={{ border: `1.5px solid ${theme.line}`, background: theme.ink, color: "#fff", padding: cellPad, width: 34 }}></th>
            {cols.map((c, i) => (
              <th key={i} style={{
                border: `1.5px solid ${theme.line}`, background: theme.ink, color: "#fff",
                padding: cellPad, textAlign: "left", fontFamily: theme.display, fontWeight: 800,
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {examples.map((row, ri) => (
            <tr key={"ex" + ri}>
              <td style={{ border: `1.5px solid ${theme.line}`, background: theme.softBg, padding: cellPad, fontSize: theme.baseFont - 2, color: theme.accent, fontWeight: 700, textAlign: "center" }}>e.g.</td>
              {cols.map((_, ci) => (
                <td key={ci} style={{
                  border: `1.5px solid ${theme.line}`, background: theme.softBg, padding: cellPad,
                  fontStyle: "italic", color: theme.pillText, fontWeight: 700,
                }}>{row[ci] || ""}</td>
              ))}
            </tr>
          ))}
          {ex.items.map((it, ri) => {
            const cells = it.cells || [];
            const blanks = it.blanks || [];
            return (
              <tr key={ri}>
                <td style={{ border: `1.5px solid ${theme.line}`, padding: cellPad, color: theme.accent, fontWeight: 700, textAlign: "center" }}>{ri + 1}</td>
                {cols.map((_, ci) => {
                  const isBlank = !!blanks[ci];
                  return (
                    <td key={ci} style={{
                      border: `1.5px solid ${theme.line}`, padding: cellPad,
                      background: isBlank && !showAnswers ? "#fff" : "transparent",
                      minWidth: 90,
                    }}>
                      {isBlank
                        ? (showAnswers
                          ? <b style={{ color: theme.accent2 }}>{cells[ci] || ""}</b>
                          : <span style={{ display: "inline-block", minWidth: 80, borderBottom: `1.5px dotted ${theme.line}`, height: theme.itemFont + 4 }} />)
                        : <span>{cells[ci] || ""}</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  }

  /* --- Các dạng còn lại: danh sách item --- */
  return (
    <div>
      {passage}
      <div style={{ display: "flex", flexDirection: "column", gap: theme.gap * 0.55 }}>
        {ex.items.map((it, i) => {
          const isMcq = ex.type === "mcq" || ex.type === "reading";
          const lines = String(it.prompt).split("\n").filter((l) => l !== "");
          const filler = showAnswers ? makeFiller(it.answer) : null;
          return (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: theme.itemFont, lineHeight: 1.55 }}>
              <b style={{ color: theme.accent, minWidth: 18 }}>{i + 1}.</b>
              {(theme.showImages && it.imageDesc) || it.hasImg || it.img || (it.imageDesc && it.imageDesc.length) ? <ImageSlot desc={it.imageDesc} src={it.img} size={64} /> : null}
              <div style={{ flex: 1 }}>
                {ex.type === "circle" ? (
                  <span>
                    <BlankLine text={it.prompt} theme={theme} fills={filler} />
                    <span style={{ marginLeft: 8 }}>
                      {(it.options || []).map((op, oi) => (
                        <span key={oi}>
                          <Pill text={op} correct={op === it.answer} showAnswers={showAnswers} theme={theme} />
                          {oi < (it.options || []).length - 1 ? <span style={{ margin: "0 6px", color: "#8ea3b5" }}>/</span> : null}
                        </span>
                      ))}
                    </span>
                  </span>
                ) : isMcq ? (
                  <div>
                    <div><BlankLine text={it.prompt} theme={theme} short /></div>
                    <div style={{
                      display: "grid", marginTop: 5,
                      gridTemplateColumns: (it.options || []).length === 4 ? "1fr 1fr" : "1fr",
                      gap: "4px 18px",
                    }}>
                      {(it.options || []).map((op, oi) => {
                        const clean = cleanOpt(op);
                        const correct = clean === cleanOpt(it.answer) || op === it.answer;
                        return (
                          <div key={oi} style={{
                            fontSize: theme.itemFont - 1,
                            color: showAnswers && correct ? theme.accent2 : "#3b4a58",
                            fontWeight: showAnswers && correct ? 800 : 500,
                          }}>
                            <b style={{ color: theme.accent }}>{String.fromCharCode(65 + oi)}.</b> {clean}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : ex.type === "writing" ? (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{ lineHeight: 1.5 }}><RichText text={it.prompt} /></div>
                    {showAnswers ? (
                      <div style={{
                        marginTop: 7, padding: "7px 11px",
                        background: theme.softBg, borderRadius: 8,
                        borderLeft: `3px solid ${theme.accent2}`,
                        color: theme.accent2, fontStyle: "italic", fontWeight: 600,
                        fontSize: theme.itemFont - 1, lineHeight: 1.6,
                      }}>e.g. <RichText text={it.answer} /></div>
                    ) : (
                      <>
                        <div style={{ borderBottom: `2px dotted ${theme.line}`, height: 26, marginTop: 8 }} />
                        <div style={{ borderBottom: `2px dotted ${theme.line}`, height: 26 }} />
                      </>
                    )}
                  </div>
                ) : ex.type === "reorder" ? (
                  <div>
                    <div style={{ color: theme.pillText, fontWeight: 700 }}><RichText text={it.prompt} /></div>
                    {showAnswers ? (
                      <div style={{ color: theme.accent2, fontWeight: 700, fontSize: theme.itemFont - 2, marginTop: 3 }}>→ {it.answer}</div>
                    ) : (
                      <div style={{ borderBottom: `2px solid ${theme.line}`, height: 24, marginTop: 4 }} />
                    )}
                  </div>
                ) : WRITE_TYPES.includes(ex.type) ? (
                  <div>
                    {lines.map((ln, li) => (
                      <div key={li} style={{ marginTop: li > 0 ? 5 : 0, color: li === 0 ? "#2c3e50" : theme.pillText, fontWeight: li === 0 ? 500 : 600 }}>
                        {ln.includes("___")
                          ? <BlankLine text={ln} theme={theme} fills={showAnswers ? makeFiller(it.answer) : null} />
                          : <RichText text={ln} />}
                      </div>
                    ))}
                    {/* nếu không có chỗ trống sẵn (dạng rewrite tự do), chừa dòng kẻ để viết */}
                    {!String(it.prompt).includes("___") ? (
                      showAnswers ? (
                        <div style={{ color: theme.accent2, fontWeight: 700, fontSize: theme.itemFont - 1, marginTop: 3 }}>→ {it.answer}</div>
                      ) : (
                        <div style={{ borderBottom: `2px solid ${theme.line}`, height: 24, marginTop: 4 }} />
                      )
                    ) : null}
                  </div>
                ) : (
                  /* gapfill + dialogue: từng dòng có chỗ trống */
                  <div>
                    {lines.map((ln, li) => (
                      <div key={li} style={{ marginTop: li > 0 ? 4 : 0 }}>
                        <BlankLine text={ln} theme={theme} fills={filler} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= EDITOR PHẦN LEARN ================= */
function LearnEditor({ learn, onSave, onCancel, theme, showImg }: { learn: Learn | null; onSave: (learn: Learn) => void; onCancel: () => void; theme: Theme; showImg: boolean }) {
  const [draft, setDraft] = useState<Learn>(JSON.parse(JSON.stringify(learn || { vocab: [], grammar: {} })));
  const inp: CSSProperties = {
    width: "100%", border: `1.5px solid ${theme.line}`, borderRadius: 8,
    padding: "5px 8px", fontSize: 13.5, fontFamily: theme.body, boxSizing: "border-box",
  };
  const lbl: CSSProperties = { fontSize: 12, fontWeight: 700, color: theme.accent };
  const updVocab = <K extends keyof VocabItem>(i: number, field: K, val: VocabItem[K]) =>
    setDraft((d) => ({ ...d, vocab: (d.vocab || []).map((v, vi) => (vi === i ? { ...v, [field]: val } : v)) }));
  const updGram = (field: "heading", val: string) =>
    setDraft((d) => ({ ...d, grammar: { ...(d.grammar || {}), [field]: val } }));
  // Grammar giờ là chuỗi blocks[] (quy tắc/bảng xen kẽ). Gộp mọi thay đổi vào 1 lần setDraft.
  const mutateBlocks = (fn: (cur: GrammarBlock[]) => GrammarBlock[]) =>
    setDraft((d) => {
      const g = { ...(d.grammar || {}) };
      g.blocks = fn(grammarBlocks(d.grammar));
      delete g.rules; delete g.table; delete g.points; delete g.examples;
      return { ...d, grammar: g };
    });
  const blocks = grammarBlocks(draft.grammar);
  const updBlock = (bi: number, patch: Partial<RuleBlock> | Partial<TableBlock>) =>
    mutateBlocks((cur) => cur.map((b, i) => (i === bi ? ({ ...b, ...patch } as GrammarBlock) : b)));
  const moveBlock = (bi: number, dir: number) => mutateBlocks((cur) => {
    const j = bi + dir; if (j < 0 || j >= cur.length) return cur;
    const next = [...cur]; const t = next[bi]; next[bi] = next[j]; next[j] = t; return next;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, background: theme.softBg, borderRadius: 12, padding: 12 }}>
      <label style={lbl}>Vocabulary — từ {showImg ? "+ mô tả hình" : "+ loại từ"}</label>
      {(draft.vocab || []).map((v, i) => (
        <div key={i} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input style={{ ...inp, flex: 1, minWidth: 90 }} value={v.word}
            onChange={(e) => updVocab(i, "word", e.target.value)} placeholder="Từ" />
          <input style={{ ...inp, width: 70 }} value={v.pos || ""}
            onChange={(e) => updVocab(i, "pos", e.target.value)} placeholder="loại từ" />
          {showImg ? (
            <>
              <input style={{ ...inp, flex: 1.2, minWidth: 100 }} value={v.imageDesc || ""}
                onChange={(e) => updVocab(i, "imageDesc", e.target.value)} placeholder="Mô tả hình (EN)" />
              <ImageUpload img={v.img} theme={theme} onChange={(val) => updVocab(i, "img", val)} />
            </>
          ) : null}
          <button onClick={() => setDraft({ ...draft, vocab: draft.vocab.filter((_, vi) => vi !== i) })} style={{
            border: "none", background: "#fff", color: "#c04040", borderRadius: 8,
            cursor: "pointer", fontWeight: 800, padding: "0 10px",
          }}>✕</button>
        </div>
      ))}
      <button onClick={() => setDraft({ ...draft, vocab: [...(draft.vocab || []), { word: "", pos: "", imageDesc: "" }] })} style={{
        alignSelf: "flex-start", border: `1.5px dashed ${theme.line}`, background: "#fff",
        color: theme.accent, borderRadius: 999, padding: "4px 12px", fontSize: 12.5,
        fontWeight: 700, cursor: "pointer",
      }}>+ Thêm từ</button>

      <label style={{ ...lbl, marginTop: 6 }}>Grammar — cấu trúc chính</label>
      <div style={{ fontSize: 10.5, color: "#8ea3b5", marginTop: -2 }}>Định dạng: <b>**đậm**</b>, <i>*nghiêng*</i>, <mark style={{ background: "#FFF29A" }}>==tô sáng==</mark> — dùng được trong mọi ô.</div>
      <input style={inp} value={draft.grammar?.heading || ""}
        onChange={(e) => updGram("heading", e.target.value)} placeholder="Tiêu đề cấu trúc chính (vd: Present Continuous)" />

      <label style={lbl}>Các khối nội dung (quy tắc & bảng — sắp xếp tự do):</label>
      {blocks.map((b, bi) => (
        <div key={bi} style={{ border: `1px solid ${theme.line}`, borderRadius: 8, padding: 8, background: "#fff", display: "flex", flexDirection: "column", gap: 4 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: theme.accent, fontSize: 12 }}>
              {b.kind === "table" ? `▦ Bảng ${bi + 1}` : `• Quy tắc ${bi + 1}`}
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={() => moveBlock(bi, -1)} disabled={bi === 0} title="Lên" style={{
              border: "none", background: "#fff", color: bi === 0 ? "#ccc" : theme.accent, cursor: bi === 0 ? "default" : "pointer", fontWeight: 800, fontSize: 14, padding: "0 4px",
            }}>↑</button>
            <button onClick={() => moveBlock(bi, 1)} disabled={bi === blocks.length - 1} title="Xuống" style={{
              border: "none", background: "#fff", color: bi === blocks.length - 1 ? "#ccc" : theme.accent, cursor: bi === blocks.length - 1 ? "default" : "pointer", fontWeight: 800, fontSize: 14, padding: "0 4px",
            }}>↓</button>
            <button onClick={() => mutateBlocks((cur) => cur.filter((_, i) => i !== bi))} style={{
              border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, fontSize: 12,
            }}>Xoá</button>
          </div>
          {b.kind === "table" ? (
            <textarea style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "monospace", fontSize: 12.5 }}
              value={tableToText(b)}
              onChange={(e) => { const t = textToTable(e.target.value) || { headers: [], rows: [] }; updBlock(bi, { headers: t.headers, rows: t.rows }); }}
              placeholder={"Base | Superlative\ngood / well | the best\nbad / badly | the worst"} />
          ) : (
            <>
              <textarea style={{ ...inp, minHeight: 34, resize: "vertical" }} value={b.point || ""}
                onChange={(e) => updBlock(bi, { point: e.target.value })} placeholder="Nội dung quy tắc" />
              <textarea style={{ ...inp, minHeight: 40, resize: "vertical" }} value={(b.examples || []).join("\n")}
                onChange={(e) => updBlock(bi, { examples: e.target.value.split("\n") })} placeholder="Ví dụ minh hoạ (mỗi dòng 1 câu)" />
            </>
          )}
        </div>
      ))}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => mutateBlocks((cur) => [...cur, { kind: "rule", point: "", examples: [] }])} style={{
          border: `1.5px dashed ${theme.line}`, background: "#fff",
          color: theme.accent, borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>+ Thêm quy tắc</button>
        <button onClick={() => mutateBlocks((cur) => [...cur, { kind: "table", headers: ["", ""], rows: [["", ""]] }])} style={{
          border: `1.5px dashed ${theme.line}`, background: "#fff",
          color: theme.accent, borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>+ Thêm bảng</button>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => onSave({
          ...draft,
          vocab: (draft.vocab || []).filter((v) => v.word && v.word.trim()),
          grammar: {
            heading: draft.grammar?.heading || "",
            blocks: blocks.map((b): GrammarBlock => b.kind === "table"
              ? { kind: "table", headers: (b.headers || []).map((h) => (h || "").trim()), rows: (b.rows || []).map((r) => r.map((c) => (c || "").trim())) }
              : { kind: "rule", point: (b.point || "").trim(), examples: (b.examples || []).map((e) => e.trim()).filter(Boolean) }
            ).filter((b) => b.kind === "table" ? (b.headers || []).some((h) => h) : b.point),
          },
        })} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 999,
          padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Lưu thay đổi</button>
        <button onClick={onCancel} style={{
          background: "#fff", color: "#7a8a99", border: `1.5px solid ${theme.line}`,
          borderRadius: 999, padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Huỷ</button>
      </div>
    </div>
  );
}

/* ================= EDITOR TỪNG BÀI ================= */
function ExerciseEditor({ ex, onSave, onCancel, theme }: { ex: Exercise; onSave: (ex: Exercise) => void; onCancel: () => void; theme: Theme }) {
  const [draft, setDraft] = useState<Exercise>(JSON.parse(JSON.stringify(ex)));
  const inp: CSSProperties = {
    width: "100%", border: `1.5px solid ${theme.line}`, borderRadius: 8,
    padding: "5px 8px", fontSize: 13.5, fontFamily: theme.body, boxSizing: "border-box",
  };
  // Dùng dạng hàm để luôn đọc state MỚI NHẤT (gọi nhiều lần liên tiếp không ghi đè nhau).
  const updMany = (i: number, patch: Partial<Item>) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, ii) => (ii === i ? { ...it, ...patch } : it)) }));
  const upd = <K extends keyof Item>(i: number, field: K, val: Item[K]) => updMany(i, { [field]: val });
  const removeItem = (i: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, ii) => ii !== i).map((it, k) => ({ ...it, n: k + 1 })) }));
  // Tạo câu mới với khung sẵn theo dạng bài, để thêm xong dùng được ngay
  const blankItem = (type: string, n: number): Item => {
    const base: Item = { n, prompt: "", answer: "", options: [] };
    if (["mcq", "reading"].includes(type)) return { ...base, options: ["", "", "", ""] };
    if (type === "circle") return { ...base, options: ["", ""] };
    if (type === "tick") return { ...base, options: ["", ""] };
    if (type === "error_choice") return { ...base, prompt: "**...** **...** **...** **...**", answer: "A | " };
    return base;
  };
  const addItem = () =>
    setDraft((d) => ({ ...d, items: [...d.items, blankItem(d.type, d.items.length + 1)] }));

  /* ----- Editor riêng cho BẢNG BIẾN ĐỔI ----- */
  if (draft.type === "transform_table") {
    const cols = draft.columns && draft.columns.length ? draft.columns : ["", ""];
    const nCol = cols.length;
    const setCols = (c: string[]) => setDraft({ ...draft, columns: c });
    const setExamples = (e: string[][]) => setDraft({ ...draft, examples: e });
    const updCell = (ri: number, ci: number, val: string) => setDraft({
      ...draft,
      items: draft.items.map((it, i) => i === ri ? { ...it, cells: (it.cells || []).map((c, j) => j === ci ? val : c) } : it),
    });
    const toggleBlank = (ri: number, ci: number) => setDraft({
      ...draft,
      items: draft.items.map((it, i) => {
        if (i !== ri) return it;
        const b = [...(it.blanks || [])];
        while (b.length < nCol) b.push(false);
        b[ci] = !b[ci];
        return { ...it, blanks: b };
      }),
    });
    const cellInp = { ...inp, flex: 1, minWidth: 70 };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, background: theme.softBg, borderRadius: 12, padding: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Instruction</label>
        <input style={inp} value={draft.instruction || ""} onChange={(e) => setDraft({ ...draft, instruction: e.target.value })} />

        <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Tiêu đề cột</label>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          {cols.map((c, i) => (
            <input key={i} style={{ ...inp, flex: 1, minWidth: 90 }} value={c}
              onChange={(e) => setCols(cols.map((x, j) => j === i ? e.target.value : x))}
              placeholder={`Cột ${i + 1}`} />
          ))}
          {nCol < 3 ? (
            <button onClick={() => {
              setDraft({
                ...draft, columns: [...cols, ""],
                examples: (draft.examples || []).map((r) => [...r, ""]),
                items: draft.items.map((it) => ({ ...it, cells: [...(it.cells || []), ""], blanks: [...(it.blanks || []), false] })),
              });
            }} style={{ border: `1.5px dashed ${theme.line}`, background: "#fff", color: theme.accent, borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Cột</button>
          ) : null}
          {nCol > 2 ? (
            <button onClick={() => {
              setDraft({
                ...draft, columns: cols.slice(0, -1),
                examples: (draft.examples || []).map((r) => r.slice(0, -1)),
                items: draft.items.map((it) => ({ ...it, cells: (it.cells || []).slice(0, -1), blanks: (it.blanks || []).slice(0, -1) })),
              });
            }} style={{ border: "none", background: "#fff", color: "#c04040", borderRadius: 999, padding: "4px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>− Cột</button>
          ) : null}
        </div>

        <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Dòng mẫu (điền đầy đủ, hiện ở đầu bảng)</label>
        {(draft.examples || []).map((row, ri) => (
          <div key={ri} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#8ea3b5", width: 28 }}>e.g.</span>
            {cols.map((_, ci) => (
              <input key={ci} style={cellInp} value={row[ci] || ""}
                onChange={(e) => setExamples((draft.examples || []).map((r, j) => j === ri ? r.map((c, k) => k === ci ? e.target.value : c) : r))} />
            ))}
            <button onClick={() => setExamples((draft.examples || []).filter((_, j) => j !== ri))} style={{ border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, padding: "0 6px" }}>✕</button>
          </div>
        ))}
        {(draft.examples || []).length < 2 ? (
          <button onClick={() => setExamples([...(draft.examples || []), Array<string>(nCol).fill("")])} style={{
            alignSelf: "flex-start", border: `1.5px dashed ${theme.line}`, background: "#fff", color: theme.accent,
            borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
          }}>+ Thêm dòng mẫu</button>
        ) : null}

        <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent, marginTop: 4 }}>
          Các dòng bài tập — gõ đầy đủ nội dung, rồi tích ô nào để TRỐNG cho học sinh viết
        </label>
        {draft.items.map((it, ri) => (
          <div key={ri} style={{ display: "flex", gap: 6, alignItems: "flex-start", borderTop: `1px dashed ${theme.line}`, paddingTop: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.accent, width: 20, paddingTop: 6 }}>{ri + 1}</span>
            {cols.map((_, ci) => (
              <div key={ci} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                <input style={cellInp} value={(it.cells || [])[ci] || ""} onChange={(e) => updCell(ri, ci, e.target.value)} />
                <label style={{ fontSize: 10.5, color: (it.blanks || [])[ci] ? theme.accent2 : "#8ea3b5", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="checkbox" checked={!!(it.blanks || [])[ci]} onChange={() => toggleBlank(ri, ci)} style={{ margin: 0 }} />
                  để trống
                </label>
              </div>
            ))}
            <button onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== ri) })} style={{ border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, padding: "6px 6px 0" }}>✕</button>
          </div>
        ))}
        <button onClick={() => setDraft({
          ...draft,
          items: [...draft.items, { n: draft.items.length + 1, cells: Array<string>(nCol).fill(""), blanks: Array<boolean>(nCol).fill(false).map((_, i) => i === nCol - 1) }],
        })} style={{
          alignSelf: "flex-start", border: `1.5px dashed ${theme.line}`, background: "#fff", color: theme.accent,
          borderRadius: 999, padding: "4px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
        }}>+ Thêm dòng</button>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={() => onSave(draft)} style={{
            background: theme.accent, color: "#fff", border: "none", borderRadius: 999,
            padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>Lưu thay đổi</button>
          <button onClick={onCancel} style={{
            background: "#fff", color: "#7a8a99", border: `1.5px solid ${theme.line}`,
            borderRadius: 999, padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
          }}>Huỷ</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, background: theme.softBg, borderRadius: 12, padding: 12 }}>
      <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Tiêu đề bài</label>
      <input style={{ ...inp, fontWeight: 700 }} value={draft.title || ""} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Tên bài, vd: Match the Food" />
      <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Instruction</label>
      <textarea style={{ ...inp, minHeight: 34, resize: "vertical" }} value={draft.instruction} onChange={(e) => setDraft({ ...draft, instruction: e.target.value })} />
      {draft.passage !== undefined || draft.type === "reading" || draft.type === "error_passage" ? (
        <>
          <label style={{ fontSize: 12, fontWeight: 700, color: theme.accent }}>Đoạn văn (passage)</label>
          <textarea style={{ ...inp, minHeight: 90, resize: "vertical" }} value={draft.passage || ""}
            onChange={(e) => setDraft({ ...draft, passage: e.target.value })} />
        </>
      ) : null}
      {draft.items.map((it, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", gap: 4, borderTop: `1px dashed ${theme.line}`, paddingTop: 8 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.accent, flex: 1 }}>Câu {i + 1}</div>
            <button onClick={() => removeItem(i)} title="Xoá câu này" style={{
              border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, fontSize: 12, padding: "0 6px",
            }}>✕ Xoá câu</button>
          </div>
          <textarea style={{ ...inp, minHeight: 36, resize: "vertical" }} value={it.prompt}
            onChange={(e) => upd(i, "prompt", e.target.value)}
            placeholder="Prompt (dùng ___ cho chỗ trống, xuống dòng cho hội thoại)" />
          {["circle", "mcq", "tick", "reading"].includes(draft.type) ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ fontSize: 11, color: "#8ea3b5" }}>Các lựa chọn (chấm chọn đáp án đúng):</div>
              {(it.options || []).map((op, oi) => {
                const isAns = cleanOpt(op) === cleanOpt(it.answer) || op === it.answer;
                return (
                  <div key={oi} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button onClick={() => upd(i, "answer", op)} title="Đặt làm đáp án đúng" style={{
                      width: 18, height: 18, borderRadius: "50%", flexShrink: 0, cursor: "pointer",
                      border: `2px solid ${isAns ? theme.accent2 : theme.line}`,
                      background: isAns ? theme.accent2 : "#fff",
                    }} />
                    <span style={{ fontWeight: 700, color: theme.accent, width: 16 }}>{String.fromCharCode(65 + oi)}.</span>
                    <input style={{ ...inp, flex: 1 }} value={op}
                      onChange={(e) => {
                        const opts = [...(it.options || [])];
                        const wasAns = isAns;
                        opts[oi] = e.target.value;
                        updMany(i, wasAns ? { options: opts, answer: e.target.value } : { options: opts });
                      }} />
                    <button onClick={() => upd(i, "options", (it.options || []).filter((_, k) => k !== oi))} style={{
                      border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, padding: "0 6px",
                    }}>✕</button>
                  </div>
                );
              })}
              <button onClick={() => upd(i, "options", [...(it.options || []), ""])} style={{
                alignSelf: "flex-start", border: `1.5px dashed ${theme.line}`, background: "#fff",
                color: theme.accent, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>+ Thêm lựa chọn</button>
            </div>
          ) : (
            <textarea style={{ ...inp, minHeight: 32, resize: "vertical" }} value={it.answer} onChange={(e) => upd(i, "answer", e.target.value)} placeholder="Đáp án" />
          )}
          {/* Điều khiển ô ảnh cho câu này */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2, flexWrap: "wrap" }}>
            {(it.imageDesc && it.imageDesc.length) || it.hasImg || it.img ? (
              <>
                <input style={{ ...inp, flex: 1, minWidth: 140 }} value={it.imageDesc || ""}
                  onChange={(e) => upd(i, "imageDesc", e.target.value)}
                  placeholder="Mô tả ảnh (EN), vd: flag of Vietnam" />
                <ImageUpload img={it.img} theme={theme} onChange={(v) => upd(i, "img", v)} />
                <button onClick={() => updMany(i, { imageDesc: "", hasImg: false, img: null })} title="Bỏ ô ảnh" style={{
                  border: "none", background: "#fff", color: "#c04040", cursor: "pointer", fontWeight: 800, padding: "0 6px", fontSize: 12,
                }}>Bỏ ô ảnh</button>
              </>
            ) : (
              <button onClick={() => upd(i, "hasImg", true)} style={{
                border: `1.5px dashed ${theme.line}`, background: "#fff", color: theme.accent,
                borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer",
              }}>+ Thêm ô ảnh</button>
            )}
          </div>
        </div>
      ))}
      <button onClick={addItem} style={{
        alignSelf: "flex-start", border: `1.5px dashed ${theme.line}`, background: "#fff",
        color: theme.accent, borderRadius: 999, padding: "5px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer",
      }}>+ Thêm câu</button>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button onClick={() => onSave(draft)} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 999,
          padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Lưu thay đổi</button>
        <button onClick={onCancel} style={{
          background: "#fff", color: "#7a8a99", border: `1.5px solid ${theme.line}`,
          borderRadius: 999, padding: "6px 16px", fontWeight: 700, cursor: "pointer", fontSize: 13,
        }}>Huỷ</button>
      </div>
    </div>
  );
}

/* ================= APP CHÍNH ================= */
const DEFAULT_CFG: Cfg = { type: "grammar", topic: "", level: "Pre A1", numEx: 3, notes: "", autoMode: true, plan: [] };

type SaveState = "idle" | "saving" | "saved";

export interface WorksheetGeneratorProps {
  /** Worksheet đã lưu (mở từ DB) — có thì vào thẳng màn hình worksheet */
  initial?: SavedProject;
  /** id bản ghi trong DB; không có = worksheet mới, lần lưu đầu sẽ tạo bản ghi */
  worksheetId?: string;
}

export default function WorksheetGenerator({ initial, worksheetId }: WorksheetGeneratorProps) {
  const [screen, setScreen] = useState<"setup" | "sheet">(initial ? "sheet" : "setup");
  const [cfg, setCfg] = useState<Cfg>(initial?.cfg ?? DEFAULT_CFG);
  const [themeOverride, setThemeOverride] = useState<Level | null>(initial?.themeOverride ?? null);
  const [ws, setWs] = useState<Worksheet | null>(initial?.ws ?? null);
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [regenIdx, setRegenIdx] = useState<number | null>(null);
  const [regenLearn, setRegenLearn] = useState(false);
  const [regenBox, setRegenBox] = useState<"learn" | number | null>(null); // null | "learn" | số index bài
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editLearn, setEditLearn] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);
  const [printHint, setPrintHint] = useState(false);
  const [saveHint, setSaveHint] = useState(false);
  const [dbId, setDbId] = useState<string | null>(worksheetId ?? null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const openInputRef = useRef<HTMLInputElement>(null);

  const theme = THEMES[themeOverride || cfg.level];

  const itemSummary = (it: Item) => it.prompt || (it.cells || []).join(" → ");

  const summaries = (exs: (Exercise | null)[], skip: number) =>
    exs.filter((e, i): e is Exercise => !!e && i !== skip)
      .map((e) => `[${e.title}: ${e.items.slice(0, 2).map(itemSummary).join("; ")}]`)
      .join(" ");

  const prevSum = (exs: (Exercise | null)[], i: number) => {
    const p = i > 0 ? exs[i - 1] : null;
    return p ? `[${p.title}: ${p.items.slice(0, 3).map(itemSummary).join("; ")}]` : "";
  };

  async function generateAll() {
    if (!cfg.topic.trim()) { setError("Hãy nhập chủ điểm trước nhé."); return; }
    setError(""); setLoading(true); setWs(null); setScreen("sheet");
    let planOk = false;
    try {
      setLoadMsg("Đang lập khung worksheet...");
      const plan = await callClaude<StructurePlan>(buildStructurePrompt(cfg));
      planOk = true;
      const base: Worksheet = { title: plan.title, brief: plan.brief, learn: null, exercises: plan.plan.map(() => null) };
      setWs({ ...base });

      // Phần Learn gọi RIÊNG để output mỗi lần không vượt giới hạn độ dài
      setLoadMsg("Đang soạn phần " + THEMES[cfg.level].learnTitle + "...");
      try {
        base.learn = await callClaude<Learn>(buildLearnPrompt(cfg, plan));
      } catch (eL) {
        if (eL instanceof ApiError) throw eL;
        base.learn = null; // Learn lỗi thì vẫn tiếp tục các bài tập
      }
      setWs({ ...base });

      const exs = [...base.exercises];
      let anyFail = false;
      for (let i = 0; i < plan.plan.length; i++) {
        setLoadMsg(`Đang soạn bài ${i + 1}/${plan.plan.length} (${plan.plan[i].stage})...`);
        try {
          exs[i] = await callClaude<Exercise>(buildExercisePrompt(cfg, base, plan.plan[i], summaries(exs, i), i, prevSum(exs, i)));
        } catch (e2) {
          if (e2 instanceof ApiError) throw e2; // lỗi máy chủ -> dừng, báo đúng nguyên nhân
          exs[i] = { ...plan.plan[i], instruction: "", items: [], _failed: true };
          anyFail = true;
        }
        setWs({ ...base, exercises: [...exs] });
      }
      if (anyFail) setError("Một vài bài chưa tạo được — bấm 🔄 Gen lại ở bài đó để thử lại.");
    } catch (e) {
      console.error(e);
      if (e instanceof ApiError) {
        // lỗi từ máy chủ: hiện đúng nguyên nhân (hạn mức, quá tải, mạng...)
        setError(e.message);
      } else {
        setError(planOk
          ? "Có lỗi khi soạn bài. Bấm Gen lại ở từng bài để thử lại nhé."
          : "Chưa tạo được worksheet (nội dung trả về không hợp lệ). Thử giảm số bài hoặc bấm Thử lại.");
      }
    }
    setLoading(false); setLoadMsg("");
  }

  async function regenExercise(i: number, instruction: string) {
    setRegenIdx(i); setError(""); setRegenBox(null);
    try {
      const ex = ws?.exercises[i];
      if (!ws || !ex) throw new Error("Không tìm thấy bài " + (i + 1));
      const plan = { stage: ex.stage, type: ex.type, title: ex.title, count: ex.items.length };
      let extra = "\nLưu ý: tạo NỘI DUNG MỚI, khác hẳn các câu sau: " + ex.items.map(itemSummary).join("; ");
      if (instruction && instruction.trim())
        extra += "\nYÊU CẦU RIÊNG CỦA GIÁO VIÊN (bắt buộc tuân theo): " + instruction.trim();
      const fresh = await callClaude<Exercise>(buildExercisePrompt(cfg, ws, plan, summaries(ws.exercises, i), i, prevSum(ws.exercises, i)) + extra);
      const exs = [...ws.exercises]; exs[i] = fresh;
      setWs({ ...ws, exercises: exs });
    } catch { setError("Regen bài " + (i + 1) + " lỗi, thử lại nhé."); }
    setRegenIdx(null);
  }

  async function regenLearnSection(instruction: string) {
    if (!ws) return;
    setRegenLearn(true); setError(""); setRegenBox(null);
    try {
      const learn = await callClaude<Learn>(buildLearnPrompt(cfg, ws, instruction));
      setWs({ ...ws, learn });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gen lại phần " + theme.learnTitle + " chưa được, thử lại nhé.");
    }
    setRegenLearn(false);
  }

  /* Lưu vào tài khoản (DB): lần đầu tạo bản ghi mới, các lần sau cập nhật */
  async function saveToDb() {
    if (!ws || saveState === "saving") return;
    setSaveState("saving"); setError("");
    try {
      const data = buildSavedProject(ws, cfg, themeOverride);
      const res = await fetch(dbId ? `/api/worksheets/${dbId}` : "/api/worksheets", {
        method: dbId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      const body: unknown = await res.json().catch(() => null);
      const bodyObj = body && typeof body === "object" ? (body as { id?: unknown; error?: { message?: unknown } }) : {};
      if (!res.ok) {
        if (res.status === 401) throw new Error("Phiên đăng nhập đã hết hạn. Đăng nhập lại rồi bấm Lưu.");
        const msg = bodyObj.error?.message;
        throw new Error(typeof msg === "string" ? msg : "Máy chủ báo lỗi (" + res.status + ").");
      }
      if (!dbId) {
        if (typeof bodyObj.id !== "string") throw new Error("Máy chủ không trả về id worksheet.");
        setDbId(bodyObj.id);
        // Đổi URL mà không remount trang (giữ nguyên trạng thái đang sửa)
        window.history.replaceState(null, "", "/worksheets/" + bodyObj.id);
      }
      setSaveState("saved");
      setTimeout(() => setSaveState((s) => (s === "saved" ? "idle" : s)), 4000);
    } catch (e) {
      setSaveState("idle");
      setError("Chưa lưu được: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  /* Nhập file .worksheet.json đã xuất trước đó */
  function onImportFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d: unknown = JSON.parse(r.result as string);
        if (!isSavedProject(d)) throw new Error("sai định dạng");
        setCfg(d.cfg || cfg);
        setThemeOverride(d.themeOverride || null);
        setWs(d.ws);
        setDbId(null); // file nhập vào là worksheet mới — lần Lưu tới sẽ tạo bản ghi mới
        setError(""); setEditIdx(null); setEditLearn(false); setRegenBox(null);
        setScreen("sheet");
      } catch {
        setError("File không hợp lệ. Hãy chọn đúng file .worksheet.json đã lưu từ tool.");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  /* ---------- SETUP SCREEN ---------- */
  if (screen === "setup") {
    const t = THEMES[cfg.level];
    const inp: CSSProperties = {
      width: "100%", border: `2px solid ${t.line}`, borderRadius: 12, padding: "10px 12px",
      fontSize: 15, fontFamily: t.body, boxSizing: "border-box", outline: "none",
    };
    return (
      <div style={{ minHeight: "calc(100vh - var(--app-top, 0px))", background: t.pageBg, fontFamily: t.body, padding: "28px 14px", transition: "background 0.4s" }}>
        <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@500;700;800&family=Nunito+Sans:wght@500;700;800&display=swap'); @keyframes wsspin{to{transform:rotate(360deg)}}` }} />
        <div style={{ maxWidth: 560, margin: "0 auto", background: "#fff", borderRadius: 28, padding: "26px 26px 30px", boxShadow: "0 10px 40px rgba(0,0,0,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <img src={LOGO_SRC} alt="Flyer" style={{ height: 54 }} />
            <div>
              <div style={{ fontFamily: t.display, fontWeight: 800, fontSize: 22, color: t.accent }}>Worksheet Generator</div>
              <div style={{ fontSize: 13, color: "#7a8a99" }}>Prototype — generate theo framework 6 tầng của bạn</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, margin: "16px 0 14px" }}>
            {(["grammar", "vocabulary"] as const).map((tp) => (
              <button key={tp} onClick={() => setCfg({ ...cfg, type: tp })} style={{
                flex: 1, borderRadius: 999, padding: "9px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
                border: `2px solid ${cfg.type === tp ? t.accent : t.line}`,
                background: cfg.type === tp ? t.accent : "#fff", color: cfg.type === tp ? "#fff" : "#7a8a99",
                fontFamily: t.body,
              }}>{tp === "grammar" ? "Ngữ pháp" : "Từ vựng"}</button>
            ))}
          </div>

          <label style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>Chủ điểm *</label>
          <input style={{ ...inp, margin: "5px 0 14px" }} value={cfg.topic}
            placeholder={cfg.type === "grammar" ? "vd: Verb to be with nationalities" : "vd: Countries & nationalities"}
            onChange={(e) => setCfg({ ...cfg, topic: e.target.value })} />

          <label style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>CEFR level <span style={{ color: "#9aa9b8", fontWeight: 500 }}>(theme màu & bố cục đổi theo level)</span></label>
          <div style={{ display: "flex", gap: 6, margin: "6px 0 14px", flexWrap: "wrap" }}>
            {LEVELS.map((lv) => (
              <button key={lv} onClick={() => { setCfg((c) => ({ ...c, level: lv, plan: syncPlan([], c.numEx, lv) })); setThemeOverride(null); }} style={{
                borderRadius: 999, padding: "7px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer",
                border: `2px solid ${cfg.level === lv ? THEMES[lv].pageBg : "#e3e9ef"}`,
                background: cfg.level === lv ? THEMES[lv].pageBg : "#fff",
                color: cfg.level === lv ? "#fff" : "#7a8a99", fontFamily: t.body,
              }}>{lv} <span style={{ fontWeight: 500, fontSize: 11 }}>({AGE_BY_LEVEL[lv]}t)</span></button>
            ))}
          </div>

          <label style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>Số bài tập</label>
          <div style={{ display: "flex", gap: 6, margin: "6px 0 14px" }}>
            {[2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setCfg((c) => ({ ...c, numEx: n, plan: syncPlan(c.plan, n, c.level) }))} style={{
                borderRadius: 999, padding: "7px 18px", fontWeight: 800, fontSize: 13, cursor: "pointer",
                border: `2px solid ${cfg.numEx === n ? t.accent : t.line}`,
                background: cfg.numEx === n ? t.accent : "#fff", color: cfg.numEx === n ? "#fff" : "#7a8a99",
              }}>{n}</button>
            ))}
          </div>

          {/* Chế độ tạo: tự động vs tuỳ chỉnh từng bài */}
          <label style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>Cách tạo bài</label>
          <div style={{ display: "flex", gap: 6, margin: "6px 0 12px" }}>
            <button onClick={() => setCfg((c) => ({ ...c, autoMode: true }))} style={{
              flex: 1, borderRadius: 12, padding: "9px 0", fontWeight: 800, fontSize: 13, cursor: "pointer",
              border: `2px solid ${cfg.autoMode ? t.accent : t.line}`,
              background: cfg.autoMode ? t.accent : "#fff", color: cfg.autoMode ? "#fff" : "#7a8a99", fontFamily: t.body,
            }}>⚡ Để AI tự tạo</button>
            <button onClick={() => setCfg((c) => ({ ...c, autoMode: false, plan: c.plan && c.plan.length === c.numEx ? c.plan : syncPlan([], c.numEx, c.level) }))} style={{
              flex: 1, borderRadius: 12, padding: "9px 0", fontWeight: 800, fontSize: 13, cursor: "pointer",
              border: `2px solid ${!cfg.autoMode ? t.accent : t.line}`,
              background: !cfg.autoMode ? t.accent : "#fff", color: !cfg.autoMode ? "#fff" : "#7a8a99", fontFamily: t.body,
            }}>🎛 Tuỳ chỉnh từng bài</button>
          </div>

          {/* Setting nâng cao: chọn stage + dạng bài cho từng bài */}
          {!cfg.autoMode ? (
            <div style={{ background: t.softBg, borderRadius: 14, padding: 12, marginBottom: 14, border: `1.5px solid ${t.line}` }}>
              <div style={{ fontSize: 12, color: "#5a6b7a", marginBottom: 10 }}>
                Với level <b>{cfg.level}</b>: chọn <b>stage</b> cho mỗi bài, rồi chọn <b>dạng bài</b> hợp với stage đó. Đã gợi ý sẵn trình tự tăng dần độ khó — bạn chỉnh tuỳ ý.
              </div>
              {(cfg.plan || []).map((row, i) => {
                const typeOpts = typesForStage(cfg.level, row.stage);
                return (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, color: t.accent, width: 46, fontSize: 13 }}>Bài {i + 1}</span>
                    <select value={row.stage} onChange={(e) => {
                      const stage = e.target.value as Stage;
                      const opts = typesForStage(cfg.level, stage);
                      const type = opts.includes(row.type) ? row.type : opts[0];
                      setCfg((c) => ({ ...c, plan: c.plan.map((r, ri) => ri === i ? { stage, type } : r) }));
                    }} style={{
                      flex: 1, minWidth: 150, border: `1.5px solid ${t.line}`, borderRadius: 8, padding: "6px 8px",
                      fontSize: 12.5, fontWeight: 700, color: t.accent, fontFamily: t.body,
                    }}>
                      {stagesForLevel(cfg.level).map((st) => <option key={st} value={st}>{STAGE_VI[st]}</option>)}
                    </select>
                    <select value={row.type} onChange={(e) => {
                      const type = e.target.value;
                      setCfg((c) => ({ ...c, plan: c.plan.map((r, ri) => ri === i ? { ...r, type } : r) }));
                    }} style={{
                      flex: 1, minWidth: 150, border: `1.5px solid ${t.line}`, borderRadius: 8, padding: "6px 8px",
                      fontSize: 12.5, fontWeight: 700, color: t.accent, fontFamily: t.body,
                    }}>
                      {typeOpts.map((tp) => <option key={tp} value={tp}>{TYPE_META[tp]?.label || tp}</option>)}
                    </select>
                  </div>
                );
              })}
              <button onClick={() => setCfg((c) => ({ ...c, plan: syncPlan([], c.numEx, c.level) }))} style={{
                border: "none", background: "transparent", color: t.accent, fontWeight: 700, fontSize: 12, cursor: "pointer", marginTop: 2,
              }}>↺ Đặt lại gợi ý mặc định</button>
            </div>
          ) : null}

          <label style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>Prompt mô tả thêm (tuỳ chọn)</label>
          <textarea style={{ ...inp, margin: "5px 0 6px", minHeight: 70, resize: "vertical" }} value={cfg.notes}
            placeholder="vd: bối cảnh lớp học quốc tế, có 1 bài matching với cờ các nước, tránh câu về gia đình..."
            onChange={(e) => setCfg({ ...cfg, notes: e.target.value })} />

          {error ? <div style={{ color: "#d64545", fontSize: 13, fontWeight: 700, margin: "6px 0" }}>{error}</div> : null}

          <button onClick={generateAll} style={{
            width: "100%", marginTop: 12, background: t.accent2, color: "#fff", border: "none",
            borderRadius: 999, padding: "13px 0", fontWeight: 800, fontSize: 16, cursor: "pointer",
            fontFamily: t.display, boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
          }}>✨ Tạo worksheet</button>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button onClick={() => openInputRef.current && openInputRef.current.click()} style={{
              border: "none", background: "transparent", color: t.accent, fontWeight: 700,
              fontSize: 13, cursor: "pointer", textDecoration: "underline",
            }}>📂 Nhập file worksheet đã xuất (.worksheet.json)</button>
          </div>
          <input type="file" accept=".json,application/json" ref={openInputRef} style={{ display: "none" }} onChange={onImportFile} />
        </div>
      </div>
    );
  }

  /* ---------- WORKSHEET SCREEN ---------- */
  let sectionNum = 0;
  return (
    <div style={{ minHeight: "calc(100vh - var(--app-top, 0px))", background: theme.pageBg, fontFamily: theme.body, padding: "18px 10px 60px", transition: "background 0.4s" }}>
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@500;700;800&family=Nunito+Sans:wght@500;700;800&display=swap');
        @keyframes wsspin{to{transform:rotate(360deg)}}
        @media print {
          @page { size: A4; margin: 12mm; }
          .ws-noprint { display: none !important; }
          html, body { background: #fff !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .ws-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; padding: 0 !important; }
          .ws-section { break-inside: avoid; page-break-inside: avoid; }
        }
      ` }} />

      {/* Toolbar */}
      <div className="ws-noprint" style={{
        maxWidth: 640, margin: "0 auto 14px", display: "flex", gap: 8, flexWrap: "wrap",
        alignItems: "center", background: "rgba(255,255,255,0.92)", borderRadius: 16, padding: "10px 14px",
      }}>
        <button onClick={() => setScreen("setup")} style={{ border: "none", background: "transparent", color: theme.accent, fontWeight: 800, cursor: "pointer", fontSize: 13 }}>← Thông tin</button>
        <span style={{ color: "#c3ced8" }}>|</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#7a8a99" }}>Theme màu:</span>
        <select value={themeOverride || cfg.level} onChange={(e) => setThemeOverride(e.target.value as Level)} style={{
          border: `1.5px solid ${theme.line}`, borderRadius: 999, padding: "4px 10px", fontSize: 12.5, fontWeight: 700, color: theme.accent,
        }}>
          {LEVELS.map((lv) => <option key={lv} value={lv}>{lv}</option>)}
        </select>
        <div style={{ flex: 1 }} />
        <ToolBtn theme={theme} onClick={() => setShowAnswers(!showAnswers)}>{showAnswers ? "🙈 Ẩn đáp án" : "✅ Đáp án"}</ToolBtn>
        <ToolBtn theme={theme} onClick={() => { void saveToDb(); }} disabled={!ws || loading || saveState === "saving"}>
          {saveState === "saving" ? <><Spinner color={theme.accent} /> Đang lưu</> : saveState === "saved" ? "✅ Đã lưu" : "💾 Lưu"}
        </ToolBtn>
        <ToolBtn theme={theme} onClick={() => { if (!ws) return; saveProject(ws, cfg, themeOverride); setSaveHint(true); setTimeout(() => setSaveHint(false), 10000); }}>⬇️ Xuất file</ToolBtn>
        <ToolBtn theme={theme} onClick={() => openInputRef.current && openInputRef.current.click()}>📂 Nhập file</ToolBtn>
        <input type="file" accept=".json,application/json" ref={openInputRef} style={{ display: "none" }} onChange={onImportFile} />
        <ToolBtn theme={theme} onClick={() => { printWorksheet(ws, cfg, theme, showAnswers, LOGO_SRC, MASCOT_SRC); setPrintHint(true); setTimeout(() => setPrintHint(false), 12000); }}>🖨 In / PDF</ToolBtn>
        <ToolBtn theme={theme} onClick={() => { if (ws) downloadDoc(ws, cfg, theme, showAnswers); }}>📝 Tải Word</ToolBtn>
      </div>

      {saveHint ? (
        <div className="ws-noprint" style={{ maxWidth: 640, margin: "0 auto 12px", background: "#eef4fb", color: "#2a6db0", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, border: "1.5px solid #cfe4f8" }}>
          ⬇️ Đã xuất file <b>.worksheet.json</b> về máy (kèm cả ảnh bạn đã chèn). Lần sau mở tool, bấm <b>📂 Nhập file</b> chọn lại file này là worksheet hiện ra <b>y hệt</b> để sửa và in tiếp.
        </div>
      ) : null}

      {printHint ? (
        <div className="ws-noprint" style={{ maxWidth: 640, margin: "0 auto 12px", background: "#eef7ee", color: "#2e7d4e", borderRadius: 12, padding: "10px 14px", fontSize: 13, fontWeight: 700, border: "1.5px solid #cde8d1" }}>
          ✅ Đã tải file worksheet để in. Mở file <b>..._print.html</b> vừa tải (thường ở góc dưới trình duyệt hoặc thư mục Downloads) — hộp thoại in sẽ tự bật, chọn <b>“Lưu thành PDF”</b> hoặc in ra giấy.
        </div>
      ) : null}

      {error ? (
        <div className="ws-noprint" style={{ maxWidth: 640, margin: "0 auto 12px", background: "#fff2f2", color: "#c04040", borderRadius: 12, padding: "8px 14px", fontSize: 13, fontWeight: 700 }}>
          {error} {!ws ? <button onClick={generateAll} style={{ marginLeft: 8, cursor: "pointer" }}>Thử lại</button> : null}
        </div>
      ) : null}

      {loading && !ws ? (
        <div style={{ maxWidth: 640, margin: "40px auto", textAlign: "center", color: "#fff", fontWeight: 800, fontFamily: theme.display, fontSize: 18 }}>
          <Spinner color="#fff" /> <div style={{ marginTop: 10 }}>{loadMsg}</div>
        </div>
      ) : null}

      {ws ? (
        <div id="ws-print-root" className="ws-page" style={{
          maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: theme.radius + 6,
          padding: `${theme.gap}px ${theme.gap}px ${theme.gap + 10}px`, boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        }}>
          {/* Header: logo + Name/Class + badge */}
          <div style={{ background: theme.pageBg, borderRadius: theme.radius, padding: "14px 16px", marginBottom: theme.gap * 0.7 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <img src={LOGO_SRC} alt="Flyer" style={{ height: 52, flexShrink: 0 }} />
              <span style={{ color: theme.ink, fontWeight: 800, fontSize: 14 }}>Name :</span>
              <span style={{ background: "#fff", borderRadius: 999, height: 30, flex: 1, minWidth: 110, border: `1.5px solid ${theme.ink}22` }} />
              <span style={{ color: theme.ink, fontWeight: 800, fontSize: 14 }}>Class :</span>
              <span style={{ background: "#fff", borderRadius: 999, height: 30, width: 70, border: `1.5px solid ${theme.ink}22` }} />
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ background: "#fff", color: theme.badgeText, borderRadius: 999, padding: "4px 14px", fontWeight: 800, fontFamily: theme.display, fontSize: 14 }}>{themeOverride || cfg.level}</span>
              {editTitle ? (
                <input autoFocus value={ws.title}
                  onChange={(e) => setWs({ ...ws, title: e.target.value })}
                  onBlur={() => setEditTitle(false)}
                  onKeyDown={(e) => { if (e.key === "Enter") setEditTitle(false); }}
                  style={{
                    flex: 1, minWidth: 180, background: "#fff", color: theme.ink, fontFamily: theme.display,
                    fontWeight: 800, fontSize: 17, borderRadius: 10, padding: "3px 12px",
                    border: `2px solid ${theme.accent2}`, outline: "none",
                  }} />
              ) : (
                <span onClick={() => setEditTitle(true)} title="Bấm để sửa tên worksheet"
                  style={{
                    background: "#fff", color: theme.ink, fontFamily: theme.display, fontWeight: 800,
                    fontSize: 17, borderRadius: 10, padding: "3px 12px", cursor: "text",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                  {ws.title}
                  <span className="ws-noprint" style={{ fontSize: 12, opacity: 0.5 }}>✏️</span>
                </span>
              )}
            </div>
          </div>

          {/* Section 1: Learn / Language Focus / Language Note */}
          {ws.learn ? (
            <div className="ws-section" style={{ border: `2px solid ${theme.line}`, borderRadius: theme.radius, padding: theme.gap * 0.7, marginBottom: theme.gap * 0.8 }}>
              <SectionHeader num={++sectionNum} title={theme.learnTitle} theme={theme}
                right={
                  <span style={{ display: "flex", gap: 6 }}>
                    <ToolBtn theme={theme} onClick={() => { setEditLearn(!editLearn); setRegenBox(null); }}>✏️ Sửa</ToolBtn>
                    <ToolBtn theme={theme} onClick={() => { setRegenBox(regenBox === "learn" ? null : "learn"); setEditLearn(false); }} disabled={regenLearn}>
                      {regenLearn ? <Spinner color={theme.accent} /> : "🔄"} Gen lại
                    </ToolBtn>
                  </span>
                } />

              {regenBox === "learn" ? (
                <RegenBox theme={theme} busy={regenLearn}
                  onRun={(txt) => regenLearnSection(txt)} onClose={() => setRegenBox(null)} />
              ) : null}

              {editLearn ? (
                <LearnEditor learn={ws.learn} theme={theme} showImg={theme.showImages}
                  onSave={(d) => { setWs({ ...ws, learn: d }); setEditLearn(false); }}
                  onCancel={() => setEditLearn(false)} />
              ) : (
                <>
                  {theme.vocabStyle === "cards" ? (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <span style={{ background: theme.ink, color: "#fff", borderRadius: 999, padding: "4px 20px", fontWeight: 800, fontFamily: theme.display, fontSize: 14 }}>Vocabulary</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 14 }}>
                        {(ws.learn.vocab || []).map((v, i) => (
                          <div key={i} style={{ textAlign: "center", width: 92 }}>
                            <ImageSlot desc={v.imageDesc} src={v.img} size={92} />
                            <div style={{ fontWeight: 800, fontSize: theme.baseFont, marginTop: 4, fontFamily: theme.display, color: "#2c3e50" }}>
                              {v.word}{v.pos ? <span style={{ fontWeight: 500, fontStyle: "italic", color: "#8ea3b5", fontSize: theme.baseFont - 3 }}> ({v.pos})</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <span style={{ background: theme.ink, color: "#fff", borderRadius: 999, padding: "4px 20px", fontWeight: 800, fontFamily: theme.display, fontSize: 14 }}>Grammar</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ textAlign: "center", marginBottom: 10 }}>
                        <span style={{ background: theme.ink, color: "#fff", borderRadius: 999, padding: "4px 20px", fontWeight: 800, fontFamily: theme.display, fontSize: 14 }}>Core Vocabulary</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 12 }}>
                        {(ws.learn.vocab || []).map((v, i) => (
                          <span key={i} style={{ background: theme.pillBg, color: theme.pillText, borderRadius: 999, padding: "5px 14px", fontWeight: 700, fontSize: theme.baseFont }}>
                            {v.word}{v.pos ? <span style={{ fontWeight: 500, fontStyle: "italic", opacity: 0.7 }}> ({v.pos})</span> : null}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                  <div style={{ background: theme.softBg, borderRadius: theme.radius * 0.7, padding: "14px 100px 14px 16px", position: "relative", minHeight: 78 }}>
                    <div style={{ fontWeight: 800, color: theme.ink, fontFamily: theme.display, fontSize: theme.itemFont, marginBottom: 8 }}><RichText text={ws.learn.grammar?.heading || ""} /></div>
                    {grammarBlocks(ws.learn.grammar).map((blk, i) => (
                      blk.kind === "table" ? (
                        (blk.headers || []).length ? (
                          <table key={i} style={{ borderCollapse: "collapse", width: "100%", margin: "8px 0", fontSize: theme.baseFont - 0.5 }}>
                            <thead>
                              <tr>{blk.headers.map((h, hi) => (
                                <th key={hi} style={{ border: `1px solid ${theme.line}`, background: theme.pillBg, color: theme.ink, padding: "4px 8px", textAlign: "left", fontWeight: 800 }}><RichText text={h} /></th>
                              ))}</tr>
                            </thead>
                            <tbody>
                              {(blk.rows || []).map((row, ri) => (
                                <tr key={ri}>{row.map((cell, ci) => (
                                  <td key={ci} style={{ border: `1px solid ${theme.line}`, padding: "4px 8px", color: "#3b4a58" }}><RichText text={cell} /></td>
                                ))}</tr>
                              ))}
                            </tbody>
                          </table>
                        ) : null
                      ) : (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: theme.baseFont, color: "#3b4a58" }}>• <RichText text={blk.point} /></div>
                          {(blk.examples || []).map((e, j) => (
                            <div key={j} style={{ fontSize: theme.baseFont - 0.5, color: theme.pillText, fontStyle: "italic", marginLeft: 14, marginTop: 2 }}>“<RichText text={e} />”</div>
                          ))}
                        </div>
                      )
                    ))}
                    <img src={MASCOT_SRC} alt="" style={{ position: "absolute", right: 6, bottom: 0, height: 92 }} />
                  </div>
                </>
              )}
            </div>
          ) : null}

          {/* Exercises */}
          {ws.exercises.map((ex, i) => (
            <div key={i} className="ws-section" style={{ border: `2px solid ${theme.line}`, borderRadius: theme.radius, padding: theme.gap * 0.7, marginBottom: theme.gap * 0.8 }}>
              {ex ? (
                <>
                  <SectionHeader num={++sectionNum} title={ex.title} sub={ex.instruction} theme={theme}
                    right={
                      <span style={{ display: "flex", gap: 6 }}>
                        <span className="ws-noprint" style={{ fontSize: 10.5, fontWeight: 800, color: "#9aa9b8", alignSelf: "center", textTransform: "uppercase" }}>{ex.stage}</span>
                        <ToolBtn theme={theme} onClick={() => { setEditIdx(editIdx === i ? null : i); setRegenBox(null); }}>✏️ Sửa</ToolBtn>
                        <ToolBtn theme={theme} onClick={() => { setRegenBox(regenBox === i ? null : i); setEditIdx(null); }} disabled={regenIdx === i}>
                          {regenIdx === i ? <Spinner color={theme.accent} /> : "🔄"} Gen lại
                        </ToolBtn>
                      </span>
                    } />
                  {regenBox === i ? (
                    <RegenBox theme={theme} busy={regenIdx === i}
                      onRun={(txt) => regenExercise(i, txt)} onClose={() => setRegenBox(null)} />
                  ) : null}
                  {editIdx === i ? (
                    <ExerciseEditor ex={ex} theme={theme}
                      onSave={(d) => { const exs = [...ws.exercises]; exs[i] = d; setWs({ ...ws, exercises: exs }); setEditIdx(null); }}
                      onCancel={() => setEditIdx(null)} />
                  ) : ex._failed ? (
                    <div style={{ textAlign: "center", color: "#c04040", fontSize: 13, fontWeight: 700, padding: "10px 0" }}>
                      Bài này chưa tạo được (nội dung dài hoặc lỗi tạm thời). Bấm 🔄 Gen lại ở trên để thử lại.
                    </div>
                  ) : (
                    <ExerciseItems ex={ex} theme={theme} showAnswers={showAnswers} />
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: theme.accent, fontWeight: 700, padding: 16, fontSize: 14 }}>
                  <Spinner color={theme.accent} /> &nbsp;{loadMsg || "Đang soạn bài này..."}
                </div>
              )}
            </div>
          ))}

          {ws.brief ? (
            <div className="ws-noprint" style={{ fontSize: 12, color: "#9aa9b8", textAlign: "center" }}>
              🎯 Can-do: {ws.brief}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
