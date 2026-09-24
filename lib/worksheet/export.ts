import type { Cfg, Exercise, Item, Learn, Level, SavedProject, Theme, Worksheet } from "./types";
import { cleanOpt, esc, grammarBlocks } from "./utils";

// markup **đậm** *nghiêng* ==tô sáng== và ___ -> gạch chân, cho Word
export function richToHtml(s: unknown): string {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/==([^=]+)==/g, '<span style="background:#FFF29A">$1</span>')
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  t = t.replace(/___/g, "________");
  return t.replace(/\n/g, "<br>");
}

export function exerciseToHtml(ex: Exercise, idx: number, showAnswers: boolean, theme: Theme): string {
  const A = (n: number) => String.fromCharCode(65 + n);
  const a = (n: number) => String.fromCharCode(97 + n);
  let body = "";
  const instr = `<div style="color:#333;font-size:11pt;margin:2px 0 8px">${esc(ex.instruction || "")}</div>`;

  if (ex.passage) {
    body += `<div style="border:1px solid #999;background:#f5f5f5;padding:8px;margin-bottom:8px;font-size:11pt">${richToHtml(ex.passage)}</div>`;
  }

  if (ex.type === "transform_table") {
    const cols = (ex.columns && ex.columns.length) ? ex.columns : ["", ""];
    body += `<table style="border-collapse:collapse;width:100%;font-size:11pt">`;
    body += `<tr><th style="border:1px solid #999;background:#e9e9e9;padding:5px;width:28px"></th>` +
      cols.map((c) => `<th style="border:1px solid #999;background:#e9e9e9;padding:5px;text-align:left">${esc(c)}</th>`).join("") + `</tr>`;
    (ex.examples || []).forEach((row) => {
      body += `<tr><td style="border:1px solid #999;padding:5px;text-align:center;font-size:9pt;color:#666">e.g.</td>` +
        cols.map((_, ci) => `<td style="border:1px solid #999;padding:5px;background:#f5f5f5;font-style:italic">${esc(row[ci] || "")}</td>`).join("") + `</tr>`;
    });
    ex.items.forEach((it, ri) => {
      const cells = it.cells || [], blanks = it.blanks || [];
      body += `<tr><td style="border:1px solid #999;padding:5px;text-align:center">${ri + 1}</td>` +
        cols.map((_, ci) => {
          const isBlank = !!blanks[ci];
          const val = isBlank ? (showAnswers ? `<span style="color:#c0392b;font-weight:bold">${esc(cells[ci] || "")}</span>` : "&nbsp;") : esc(cells[ci] || "");
          return `<td style="border:1px solid #999;padding:5px">${val}</td>`;
        }).join("") + `</tr>`;
    });
    body += `</table>`;
  } else if (ex.type === "match") {
    const rights = ex.items.map((it, i) => ({ text: it.answer, orig: i }));
    body += `<table style="width:100%;border-collapse:collapse"><tr><td style="width:50%;vertical-align:top">`;
    body += ex.items.map((it, i) => `<div style="margin:4px 0">${showAnswers ? "<b>[" + a(i) + "]</b> " : "___ "}${i + 1}. ${esc(it.prompt)}</div>`).join("");
    body += `</td><td style="width:50%;vertical-align:top">`;
    body += rights.map((r, i) => `<div style="margin:4px 0"><b>${a(i)}.</b> ${esc(r.text)}</div>`).join("");
    body += `</td></tr></table>`;
  } else if (ex.type === "tick") {
    body += ex.items.map((it, i) => {
      const opts = (it.options || []).map((op, oi) => {
        const correct = cleanOpt(op) === cleanOpt(it.answer);
        return `<div style="margin-left:16px">${showAnswers && correct ? "☑" : "☐"} ${a(oi)}. ${esc(cleanOpt(op))}</div>`;
      }).join("");
      return `<div style="margin:6px 0"><b>${i + 1}.</b>${opts}</div>`;
    }).join("");
  } else if (ex.type === "error_passage") {
    body += `<table style="width:100%;border-collapse:collapse;font-size:11pt"><tr><th style="border:1px solid #999;background:#eee;padding:4px">#</th><th style="border:1px solid #999;background:#eee;padding:4px">Từ/cụm sai</th><th style="border:1px solid #999;background:#eee;padding:4px">Sửa lại</th></tr>`;
    body += ex.items.map((it, i) => `<tr><td style="border:1px solid #999;padding:4px">${i + 1}</td><td style="border:1px solid #999;padding:4px">${showAnswers ? esc(it.prompt) : "&nbsp;"}</td><td style="border:1px solid #999;padding:4px">${showAnswers ? esc(it.answer) : "&nbsp;"}</td></tr>`).join("");
    body += `</table>`;
  } else if (ex.type === "mcq" || ex.type === "reading" || ex.type === "error_choice") {
    body += ex.items.map((it, i) => {
      let line = `<div style="margin:6px 0"><b>${i + 1}.</b> ${richToHtml(it.prompt)}`;
      if ((it.options || []).length) {
        line += (it.options || []).map((op, oi) => {
          const correct = cleanOpt(op) === cleanOpt(it.answer);
          const mark = showAnswers && correct ? ' style="color:#c0392b;font-weight:bold"' : "";
          return `<div style="margin-left:16px"${mark}>${A(oi)}. ${esc(cleanOpt(op))}</div>`;
        }).join("");
      } else if (showAnswers) {
        line += ` <span style="color:#c0392b">→ ${esc(it.answer)}</span>`;
      }
      return line + `</div>`;
    }).join("");
  } else {
    // gapfill, verbform, complete_text, dialogue, reorder, rewrite, writing, question_write, keyword_transform, word_formation, error_correction, circle, picture_write
    body += ex.items.map((it, i) => {
      let line = `<div style="margin:6px 0"><b>${i + 1}.</b> ${richToHtml(it.prompt)}`;
      if ((it.options || []).length) {
        line += " ( " + (it.options || []).map((o) => esc(cleanOpt(o))).join(" / ") + " )";
      }
      if (showAnswers) line += ` <span style="color:#c0392b">→ ${esc(it.answer)}</span>`;
      else line += `<div style="border-bottom:1px solid #bbb;height:18px;margin-top:2px"></div>`;
      return line + `</div>`;
    }).join("");
  }

  return `<div style="margin:14px 0"><div style="font-size:13pt;font-weight:bold;color:${theme.ink}">${idx}. ${esc(ex.title)}</div>${instr}${body}</div>`;
}

export function buildDocHtml(ws: Worksheet, cfg: Cfg, theme: Theme, showAnswers: boolean): string {
  const learn: Partial<Learn> = ws.learn || {};
  let learnHtml = `<div style="font-size:14pt;font-weight:bold;color:${theme.ink};margin-top:10px">${esc(theme.learnTitle)}</div>`;
  // vocab
  if ((learn.vocab || []).length) {
    learnHtml += `<div style="margin:6px 0"><b>Vocabulary:</b> ` +
      (learn.vocab || []).map((v) => `${esc(v.word)}${v.pos ? " <i>(" + esc(v.pos) + ")</i>" : ""}`).join(" &nbsp;•&nbsp; ") + `</div>`;
  }
  // grammar
  const g = learn.grammar || {};
  if (g.heading) learnHtml += `<div style="font-weight:bold;margin-top:6px">${richToHtml(g.heading)}</div>`;
  grammarBlocks(g).forEach((b) => {
    if (b.kind === "table" && (b.headers || []).length) {
      learnHtml += `<table style="border-collapse:collapse;margin:6px 0">`;
      learnHtml += `<tr>` + b.headers.map((h) => `<th style="border:1px solid #999;background:#eee;padding:4px">${richToHtml(h)}</th>`).join("") + `</tr>`;
      (b.rows || []).forEach((row) => {
        learnHtml += `<tr>` + row.map((c) => `<td style="border:1px solid #999;padding:4px">${richToHtml(c)}</td>`).join("") + `</tr>`;
      });
      learnHtml += `</table>`;
    } else if (b.kind === "rule") {
      learnHtml += `<div style="margin-left:8px">• ${richToHtml(b.point)}</div>`;
      (b.examples || []).forEach((e) => { learnHtml += `<div style="margin-left:20px;font-style:italic;color:#555">“${richToHtml(e)}”</div>`; });
    }
  });

  const exHtml = (ws.exercises || []).filter((e): e is Exercise => !!e && !e._failed).map((ex, i) => exerciseToHtml(ex, i + 1, showAnswers, theme)).join("");

  const head = `<div style="border-bottom:3px solid ${theme.pageBg};padding-bottom:8px;margin-bottom:10px">
    <table style="width:100%"><tr>
      <td style="font-size:16pt;font-weight:bold;color:${theme.ink}">${esc(ws.title)}</td>
      <td style="text-align:right;font-size:11pt">Name: __________  Class: ______  <b>[${esc(cfg.level)}]</b></td>
    </tr></table></div>`;

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>${esc(ws.title)}</title></head>
<body style="font-family:Arial,sans-serif;font-size:12pt;color:#222">
${head}${learnHtml}<hr style="border:none;border-top:1px solid #ddd;margin:12px 0">${exHtml}
</body></html>`;
}

export function downloadDoc(ws: Worksheet, cfg: Cfg, theme: Theme, showAnswers: boolean): void {
  const html = buildDocHtml(ws, cfg, theme, showAnswers);
  const blob = new Blob(["\ufeff", html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = (ws.title || "worksheet").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") + (showAnswers ? "_answers" : "") + ".doc";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ===== IN / PDF — dựng trang HTML màu độc lập, mở cửa sổ mới rồi in
   (window.print() trực tiếp bị chặn khi artifact nằm trong iframe) ===== */
export function buildPrintHtml(ws: Worksheet, cfg: Cfg, theme: Theme, showAnswers: boolean, logo?: string, mascot?: string): string {
  const learn: Partial<Learn> = ws.learn || {};
  const g = learn.grammar || {};
  const vocabHtml = (learn.vocab || []).length
    ? `<div style="text-align:center;margin:6px 0"><span style="background:${theme.ink};color:#fff;border-radius:20px;padding:3px 16px;font-weight:bold">${esc(theme.vocabStyle === "cards" ? "Vocabulary" : "Core Vocabulary")}</span></div>
       <div style="text-align:center;margin-bottom:10px">${(learn.vocab || []).map((v) => `<span style="display:inline-block;background:${theme.pillBg};color:${theme.pillText};border-radius:20px;padding:4px 12px;margin:3px;font-weight:bold">${v.img ? `<img src="${v.img}" style="height:34px;vertical-align:middle;border-radius:4px;margin-right:4px">` : ""}${esc(v.word)}${v.pos ? ` <i style="opacity:.7">(${esc(v.pos)})</i>` : ""}</span>`).join("")}</div>`
    : "";
  let rulesHtml = g.heading ? `<div style="font-weight:bold;color:${theme.ink};margin-bottom:6px">${richToHtmlColor(g.heading)}</div>` : "";
  grammarBlocks(g).forEach((b) => {
    if (b.kind === "table" && (b.headers || []).length) {
      rulesHtml += `<table style="border-collapse:collapse;margin:6px 0;font-size:11pt"><tr>${b.headers.map((h) => `<th style="border:1px solid ${theme.line};background:${theme.pillBg};color:${theme.ink};padding:4px 8px">${richToHtmlColor(h)}</th>`).join("")}</tr>${(b.rows || []).map((row) => `<tr>${row.map((c) => `<td style="border:1px solid ${theme.line};padding:4px 8px">${richToHtmlColor(c)}</td>`).join("")}</tr>`).join("")}</table>`;
    } else if (b.kind === "rule") {
      rulesHtml += `<div style="margin-bottom:6px">• ${richToHtmlColor(b.point)}`;
      (b.examples || []).forEach((e) => { rulesHtml += `<div style="margin-left:16px;font-style:italic;color:${theme.pillText}">“${richToHtmlColor(e)}”</div>`; });
      rulesHtml += `</div>`;
    }
  });
  const learnBlock = `<div class="sec" style="border:2px solid ${theme.line};border-radius:14px;padding:14px;margin-bottom:14px">
    <div style="font-weight:bold;color:${theme.ink};font-size:15pt;margin-bottom:8px">${esc(theme.learnTitle)}</div>
    ${vocabHtml}
    <div style="background:${theme.softBg};border-radius:10px;padding:12px 14px;position:relative">${rulesHtml}${mascot ? `<img src="${mascot}" style="position:absolute;right:6px;bottom:0;height:80px">` : ""}</div>
  </div>`;

  const exBlocks = (ws.exercises || []).filter((e): e is Exercise => !!e && !e._failed)
    .map((ex, i) => `<div class="sec" style="border:2px solid ${theme.line};border-radius:14px;padding:14px;margin-bottom:14px">${exerciseToHtmlColor(ex, i + 1, showAnswers, theme)}</div>`).join("");

  const header = `<div style="background:${theme.pageBg};border-radius:14px;padding:14px 16px;margin-bottom:14px">
    <table style="width:100%"><tr>
      <td style="width:60px">${logo ? `<img src="${logo}" style="height:46px">` : ""}</td>
      <td style="color:${theme.ink};font-weight:bold">Name: ______________________ &nbsp; Class: __________</td>
      <td style="text-align:right"><span style="background:#fff;color:${theme.badgeText};border-radius:20px;padding:3px 12px;font-weight:bold">${esc(cfg.level)}</span></td>
    </tr></table>
    <div style="margin-top:8px"><span style="background:#fff;color:${theme.ink};border-radius:8px;padding:3px 12px;font-weight:bold;font-size:14pt">${esc(ws.title)}</span></div>
  </div>`;

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(ws.title)}</title>
  <style>
    @page { size:A4; margin:12mm; }
    body { font-family:'Nunito',Arial,sans-serif; color:#222; margin:0; padding:16px; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
    .sec { break-inside:avoid; page-break-inside:avoid; }
    @media print { .noprint{display:none} }
  </style></head>
  <body>
    <div class="noprint" style="text-align:center;margin-bottom:12px">
      <button onclick="window.print()" style="background:${theme.ink};color:#fff;border:none;border-radius:20px;padding:8px 20px;font-weight:bold;font-size:14px;cursor:pointer">🖨 In / Lưu PDF</button>
      <span style="color:#888;font-size:12px;margin-left:8px">Nếu hộp thoại in không tự mở, bấm nút này.</span>
    </div>
    ${header}${learnBlock}${exBlocks}
    <script>window.onload=function(){setTimeout(function(){window.print()},400)}</script>
  </body></html>`;
}

// bản màu của richToHtml (giữ ==tô sáng== màu vàng)
export function richToHtmlColor(s: unknown): string {
  let t = esc(s);
  t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
    .replace(/==([^=]+)==/g, '<span style="background:#FFF29A;padding:0 2px;border-radius:3px">$1</span>')
    .replace(/\*([^*]+)\*/g, "<i>$1</i>");
  return t.replace(/___/g, "________").replace(/\n/g, "<br>");
}

// bản màu của exerciseToHtml — dùng ink cho tiêu đề, accent2 cho đáp án
export function exerciseToHtmlColor(ex: Exercise, idx: number, showAnswers: boolean, theme: Theme): string {
  const A = (n: number) => String.fromCharCode(65 + n);
  const a = (n: number) => String.fromCharCode(97 + n);
  const title = `<div style="font-weight:bold;color:${theme.ink};font-size:13pt">${idx}. ${esc(ex.title)}</div><div style="color:#555;font-size:11pt;margin:2px 0 8px">${esc(ex.instruction || "")}</div>`;
  let body = "";
  if (ex.passage && ex.type !== "error_passage") {
    body += `<div style="background:${theme.softBg};border:1px solid ${theme.line};border-radius:8px;padding:10px;margin-bottom:8px">${richToHtmlColor(ex.passage)}</div>`;
  }
  const imgTag = (it: Item, sz: number) => it.img ? `<img src="${it.img}" style="height:${sz}px;border-radius:6px;vertical-align:middle;margin-right:6px">` : "";

  if (ex.type === "match") {
    const rights = ex.items.map((it, i) => ({ text: it.answer, orig: i }));
    body += `<table style="width:100%"><tr><td style="width:50%;vertical-align:top">` +
      ex.items.map((it, i) => `<div style="margin:5px 0">${showAnswers ? `<b style="color:${theme.accent2}">[${a(i)}]</b> ` : "☐ "}<b>${i + 1}.</b> ${imgTag(it, 30)}${esc(it.prompt)}</div>`).join("") +
      `</td><td style="width:50%;vertical-align:top">` +
      rights.map((r, i) => `<div style="margin:5px 0"><b style="color:${theme.accent2}">${a(i)}.</b> <span style="background:${theme.pillBg};color:${theme.pillText};border-radius:10px;padding:3px 10px">${esc(r.text)}</span></div>`).join("") +
      `</td></tr></table>`;
  } else if (ex.type === "tick") {
    body += ex.items.map((it, i) => `<div style="margin:6px 0"><b>${i + 1}.</b>` +
      (it.options || []).map((op, oi) => { const c = cleanOpt(op) === cleanOpt(it.answer); return `<div style="margin-left:16px${showAnswers && c ? ";color:" + theme.accent2 + ";font-weight:bold" : ""}">${showAnswers && c ? "☑" : "☐"} ${a(oi)}. ${esc(cleanOpt(op))}</div>`; }).join("") +
      `</div>`).join("");
  } else if (ex.type === "error_passage") {
    body += `<div style="background:${theme.softBg};border:1px solid ${theme.line};border-radius:8px;padding:10px;margin-bottom:8px;line-height:2">${richToHtmlColor(ex.passage || "")}</div>`;
    body += `<table style="width:100%;border-collapse:collapse"><tr><th style="border:1px solid ${theme.line};background:${theme.pillBg};padding:4px">#</th><th style="border:1px solid ${theme.line};background:${theme.pillBg};padding:4px">Từ/cụm sai</th><th style="border:1px solid ${theme.line};background:${theme.pillBg};padding:4px">Sửa lại</th></tr>` +
      ex.items.map((it, i) => `<tr><td style="border:1px solid ${theme.line};padding:4px">${i + 1}</td><td style="border:1px solid ${theme.line};padding:4px">${showAnswers ? esc(it.prompt) : "&nbsp;"}</td><td style="border:1px solid ${theme.line};padding:4px;color:${theme.accent2}">${showAnswers ? esc(it.answer) : "&nbsp;"}</td></tr>`).join("") + `</table>`;
  } else if (ex.type === "mcq" || ex.type === "reading" || ex.type === "error_choice") {
    body += ex.items.map((it, i) => {
      let line = `<div style="margin:7px 0"><b>${i + 1}.</b> ${imgTag(it, 40)}${richToHtmlColor(it.prompt)}`;
      if ((it.options || []).length) {
        line += (it.options || []).map((op, oi) => { const c = cleanOpt(op) === cleanOpt(it.answer); return `<div style="margin-left:16px${showAnswers && c ? ";color:" + theme.accent2 + ";font-weight:bold" : ""}">${A(oi)}. ${esc(cleanOpt(op))}</div>`; }).join("");
      } else if (showAnswers) line += ` <span style="color:${theme.accent2}">→ ${esc(it.answer)}</span>`;
      return line + `</div>`;
    }).join("");
  } else {
    body += ex.items.map((it, i) => {
      let line = `<div style="margin:7px 0"><b>${i + 1}.</b> ${imgTag(it, 40)}${richToHtmlColor(it.prompt)}`;
      if ((it.options || []).length) line += " ( " + (it.options || []).map((o) => esc(cleanOpt(o))).join(" / ") + " )";
      if (showAnswers) line += ` <span style="color:${theme.accent2};font-weight:bold">→ ${esc(it.answer)}</span>`;
      else line += `<div style="border-bottom:1px solid ${theme.line};height:18px;margin-top:3px"></div>`;
      return line + `</div>`;
    }).join("");
  }
  return title + body;
}

/* ===== LƯU / MỞ WORKSHEET — để sửa lại sau mà không phải gen lại từ đầu ===== */
export function buildSavedProject(ws: Worksheet, cfg: Cfg, themeOverride: Level | null): SavedProject {
  return { _type: "flyer-worksheet", version: 1, savedAt: new Date().toISOString(), cfg, themeOverride, ws };
}

export function saveProject(ws: Worksheet, cfg: Cfg, themeOverride: Level | null): void {
  const data = buildSavedProject(ws, cfg, themeOverride);
  const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ((ws && ws.title) || "worksheet").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") + ".worksheet.json";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function printWorksheet(ws: Worksheet | null, cfg: Cfg, theme: Theme, showAnswers: boolean, logo?: string, mascot?: string): void {
  // Chụp NGUYÊN khối worksheet đang render (style nội tuyến đã dính sẵn).
  const node = document.getElementById("ws-print-root");
  let inner = "";
  if (node) {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".ws-noprint").forEach((el) => el.remove());
    inner = clone.outerHTML;
  } else {
    inner = "<div>Không tìm thấy nội dung để in.</div>";
  }
  // Ép font-family vào body (vì khối tách khỏi khung cha sẽ mất font thừa kế -> rơi về Times),
  // giữ đúng width 640px như trên màn hình để ngắt dòng y hệt, và CHỜ font tải xong mới in.
  const bodyFont = theme.body.replace(/"/g, "'");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${(ws && ws.title) || "worksheet"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Nunito:wght@500;700;800&family=Nunito+Sans:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 10mm; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-family: ${bodyFont}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    #ws-print-root { width: 640px !important; max-width: 640px !important; margin: 0 auto !important; box-shadow: none !important; }
    .ws-noprint { display: none !important; }
    .ws-section { break-inside: avoid; page-break-inside: avoid; }
    .ws-print-bar { text-align:center; padding:10px; font-family:${bodyFont}; }
    @media print { .ws-print-bar { display:none; } }
    .ws-print-btn { background:${theme.ink}; color:#fff; border:none; border-radius:20px; padding:8px 22px; font-weight:bold; font-size:14px; cursor:pointer; }
  </style></head>
  <body>
    <div class="ws-print-bar">
      <button class="ws-print-btn" onclick="window.print()">🖨 In / Lưu PDF</button>
      <span style="color:#888;font-size:12px;margin-left:8px">Nếu hộp thoại in không tự mở, bấm nút này.</span>
    </div>
    ${inner}
    <script>
      function go(){ try{ window.print(); }catch(e){} }
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function(){ setTimeout(go, 250); });
        setTimeout(go, 2500); // dự phòng nếu font treo
      } else {
        window.onload = function(){ setTimeout(go, 600); };
      }
    <\/script>
  </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ((ws && ws.title) || "worksheet").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_") + (showAnswers ? "_answers" : "") + "_print.html";
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
