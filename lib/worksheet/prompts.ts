import { AGE_BY_LEVEL, PROGRESSION_RULE, TYPE_BANK, TYPE_META } from "./themes";
import type { Cfg, ExercisePlan, Worksheet } from "./types";

export const TYPE_RULES = `Các type cho phép và quy ước JSON. Với dạng KHÔNG nằm trong danh sách render riêng, coi như "gapfill/rewrite dạng viết" — luôn có prompt, answer, options rỗng.
- "circle": chọn 1 trong 2 từ. prompt là câu có "___", options gồm ĐÚNG 2 lựa chọn.
- "mcq": trắc nghiệm. prompt là câu/câu hỏi (có thể có "___" trong câu); options gồm 4 lựa chọn (MẶC ĐỊNH ưu tiên đủ 4 phương án; chỉ dùng 3 khi thực sự không thể tạo distractor thứ 4 hợp lý). Distractor sai nhưng "có lý", cùng loại lỗi/cùng trường nghĩa. answer là 1 lựa chọn đúng. Ở level cao có thể kiểm tra nghĩa từ trong ngữ cảnh, collocation, sắc thái — không chỉ ngữ pháp.
- "tick": options gồm ĐÚNG 2 câu gần giống nhau (khác đúng 1 điểm ngữ pháp), answer là câu đúng, prompt để chuỗi rỗng "".
- "gapfill": prompt chứa "___", có thể kèm gợi ý trong ngoặc. options rỗng, answer là từ cần điền.
- "verbform": như gapfill nhưng prompt LUÔN có động từ trong ngoặc cần chia, vd "She ___ (go) to school every day." answer là dạng đúng.
- "complete_text": prompt là 1 đoạn văn/hội thoại ngắn liền mạch có NHIỀU "___"; answer là các từ điền THEO THỨ TỰ, cách nhau bởi ", ". options rỗng.
- "dialogue": prompt là hội thoại 2-5 dòng, mỗi dòng bắt đầu "A: "/"B: ", dùng \\n xuống dòng và "___"; answer là các từ điền theo thứ tự cách nhau bởi ", ". options rỗng.
- "match": prompt là vế trái, answer là vế phải tương ứng. options rỗng.
- "reorder": prompt là các từ xáo trộn cách nhau bởi " / ", answer là câu đúng. options rỗng.
- "picture_write": nhìn tranh viết/hoàn thành câu. prompt là câu có "___" hoặc gợi ý, imageDesc mô tả hình (EN), answer là đáp án.
- "question_write": prompt là câu trần thuật có phần IN ĐẬM (đặt trong **...**); yêu cầu đặt câu hỏi cho phần đó. answer là câu hỏi đúng. options rỗng.
- "rewrite": prompt gồm 2 dòng cách nhau bởi \\n — dòng 1 là câu gốc, dòng 2 là câu cần viết lại có sẵn "___" HOẶC phần mở đầu cho sẵn + "___" (vd "Every product ___."). answer là câu/cụm hoàn chỉnh. options rỗng. KHÔNG lặp lại hướng dẫn (như "(passive)") ở cuối mỗi câu nếu instruction đã nói rõ — chỉ thêm gợi ý trong ngoặc khi nó bổ sung dữ kiện MỚI.
- "error_correction": prompt là câu CÓ 1 lỗi. answer là câu đã sửa. options rỗng.
- "error_choice": mỗi câu có 4 phần được đánh dấu A-B-C-D, MỘT phần sai. prompt là câu với 4 cụm đặt trong dấu **...** (đúng 4 cụm, theo thứ tự A B C D). "answer" ghi "X | sửa" với X là chữ cái phần sai và phần sau dấu | là cách sửa đúng. options rỗng. Vd prompt: "**If** Daniel **will review** his notes tonight, he **will do** **better** on the test." answer: "B | reviews".
- "error_passage": exercise có THÊM trường "passage" là đoạn văn 6-12 dòng chứa đúng N lỗi; instruction nêu rõ số lỗi. Mỗi item là 1 lỗi: prompt là cụm/từ SAI (nguyên văn trong đoạn), answer là cách sửa. options rỗng.
- "keyword_transform": prompt gồm 2 dòng cách nhau bởi \\n — dòng 1 là câu gốc; dòng 2 bắt đầu bằng TỪ KHOÁ in hoa đặt trong **...** rồi đến câu thứ hai có "___" phải điền. answer là cụm điền vào chỗ trống (KHÔNG đổi từ khoá). options rỗng. Từ khoá phải nằm TÁCH khỏi câu gốc, không dính liền.
- "word_formation": prompt là câu có "___" + từ gốc trong ngoặc, vd "She is very ___ (BEAUTY)." answer là từ đã biến đổi. options rỗng.
- "reading": exercise có THÊM trường "passage" (B1/B2 ≤90 từ, C1/C2 ≤130 từ); mỗi item là câu hỏi đọc hiểu/ngôn ngữ với options 4 lựa chọn.
- "transform_table": BẢNG BIẾN ĐỔI TỪ (luyện công thức biến đổi + chính tả, HỌC SINH VIẾT, không trắc nghiệm).
  Exercise có THÊM: "columns" (mảng 2 HOẶC 3 tiêu đề cột, đặt theo chủ điểm, vd ["Singular","Plural"] hoặc ["Base form","Past simple","Past participle"]);
  "examples" (mảng 1-2 dòng MẪU đã điền ĐẦY ĐỦ, vd [["car","cars"]]).
  Mỗi item là 1 dòng: {"n":1,"cells":["leaf","leaves"],"blanks":[false,true]} — "cells" là nội dung ĐẦY ĐỦ mọi cột (số phần tử = số cột), "blanks" đánh dấu ô nào để TRỐNG cho học sinh viết (true = trống).
  BẮT BUỘC: mỗi dòng có ít nhất 1 ô KHÔNG trống làm căn cứ; đổi CHIỀU giữa các dòng (dòng thì trống cột phải, dòng thì trống cột trái, bảng 3 cột có thể trống 2 ô);
  TRỘN đủ các trường hợp biến đổi của chủ điểm (vd số nhiều: thêm -s, thêm -es, đổi -y→-ies, -f→-ves, và vài từ BẤT QUY TẮC), mỗi loại vài từ.
  KHÔNG dùng options; KHÔNG cần prompt/answer cho dạng này.
- "writing": prompt là đề bài viết ngắn, options rỗng, answer là sample answer.`;

// BƯỚC 1a: chỉ lấy khung worksheet (title, brief, kế hoạch các bài) — output ngắn
export function buildStructurePrompt(cfg: Cfg): string {
  const manual = !cfg.autoMode && cfg.plan && cfg.plan.length;
  const planRule = manual
    ? `- Giáo viên ĐÃ CHỈ ĐỊNH kế hoạch từng bài. PHẢI tuân theo ĐÚNG stage và type sau, ĐÚNG THỨ TỰ, không đổi:
${cfg.plan.map((p, i) => `  Bài ${i + 1}: stage=${p.stage}, type=${p.type} (${TYPE_META[p.type]?.label || p.type})`).join("\n")}
  Chỉ đặt "title" phù hợp cho mỗi bài; giữ nguyên stage và type như trên.`
    : `- Lập kế hoạch ${cfg.numEx} bài tập đi từ dễ đến khó, mỗi bài một dạng khác nhau. Chọn type trong kho dạng bài của level ${cfg.level} (ưu tiên các dạng đứng trước): ${TYPE_BANK[cfg.level].types}.
  Đặc điểm dạng bài level này: ${TYPE_BANK[cfg.level].note}`;
  const planShape = manual
    ? cfg.plan.map((p) => `{"stage":"${p.stage}","type":"${p.type}","title":"...","count":${["Pre A1", "A1"].includes(cfg.level) ? 3 : 4}}`).join(",")
    : `{"stage":"Awareness|Controlled|Semi-controlled|Production","type":"...","title":"tên bài kiểu 'Look and circle'","count":3}`;
  return `Bạn là chuyên gia soạn worksheet tiếng Anh, theo framework: Alignment → Scope (đúng level) → Progression (Awareness → Controlled → Semi-controlled → Production).

THÔNG TIN: Trọng tâm ${cfg.type === "grammar" ? "Ngữ pháp" : "Từ vựng"} | Chủ điểm: ${cfg.topic} | CEFR ${cfg.level} (~${AGE_BY_LEVEL[cfg.level]} tuổi)
${cfg.notes ? "Yêu cầu thêm của giáo viên: " + cfg.notes : ""}

QUY TẮC:
- ${PROGRESSION_RULE[cfg.level]}
${planRule}
- Cả worksheet xoay quanh MỘT chủ đề thống nhất.

Trả về CHỈ JSON compact, không markdown, không giải thích, PHẢI đóng đủ ngoặc:
{"title":"tên worksheet (EN, ngắn)","brief":"mục tiêu can-do 1 câu (EN)","plan":[${planShape}]}
Mỗi bài có count ${["Pre A1", "A1"].includes(cfg.level) ? "3-4" : "4-5"} câu (reading: 4 câu hỏi). RIÊNG transform_table: count = số DÒNG (không tính 1-2 dòng mẫu) = ${["Pre A1", "A1"].includes(cfg.level) ? "6" : ["A2", "B1"].includes(cfg.level) ? "8" : "10"}.`;
}

// BƯỚC 1b: chỉ lấy phần Learn (từ vựng + ngữ pháp) — tách riêng để output không bị cắt
export function buildLearnPrompt(cfg: Cfg, structure: { title?: string; brief?: string } | null, instruction?: string): string {
  return `Soạn phần "Learn" (giới thiệu kiến thức) cho worksheet "${(structure && structure.title) || cfg.topic}".
Chủ điểm: ${cfg.topic} | CEFR ${cfg.level} (học sinh ~${AGE_BY_LEVEL[cfg.level]} tuổi) | Trọng tâm: ${cfg.type === "grammar" ? "Ngữ pháp" : "Từ vựng"}
${(structure && structure.brief) ? "Mục tiêu: " + structure.brief : ""}
${cfg.notes ? "Yêu cầu thêm của giáo viên: " + cfg.notes : ""}
${instruction ? "YÊU CẦU RIÊNG (bắt buộc tuân theo): " + instruction : ""}

QUY TẮC:
- vocab: 5-6 TỪ TRỌNG TÂM cần giới thiệu, mỗi từ có "pos" (loại từ). Đây KHÔNG phải danh sách đóng cho bài tập.
- Từ vựng và độ dài câu ≤ level ${cfg.level}. Ngữ cảnh gần gũi độ tuổi, không nội dung nhạy cảm/khuôn mẫu.
- imageDesc: mô tả hình minh hoạ RẤT NGẮN bằng tiếng Anh (chỉ cần cho Pre A1–A2, level khác để "").
- grammar.blocks: một CHUỖI khối xếp theo thứ tự hợp lý để dạy. Mỗi khối là 1 trong 2 loại:
    • quy tắc: {"kind":"rule","point":"quy tắc ngắn, rõ","examples":["ví dụ minh hoạ đúng"]} — mỗi quy tắc 1-2 ví dụ RIÊNG.
    • bảng:   {"kind":"table","headers":["Cột 1","Cột 2"],"rows":[["...","..."]]} — dùng khi nội dung hợp trình bày dạng bảng.
  Được đặt bảng ở BẤT KỲ vị trí nào trong chuỗi (đầu, giữa, cuối) và dùng NHIỀU bảng nếu chủ điểm cần. TỐI ĐA 5 khối, tối đa 4 cột/bảng.
  Ví dụ dùng bảng: bảng công thức (Affirmative/Negative/Question), bảng biến đổi đuôi (thêm -s/-es/-ing), bảng bất quy tắc (Base/Superlative). Đặt bảng ngay cạnh phần giải thích liên quan.
- Nếu chủ điểm có cặp dễ nhầm (we/they, a/an, much/many...) phải nêu cách phân biệt (trong 1 khối quy tắc).
- Được dùng **đậm**, *nghiêng*, ==tô sáng== trong mọi text (point, example, ô bảng) để làm nổi từ khoá.

Trả về CHỈ JSON compact, không markdown, PHẢI đóng đủ ngoặc:
{"vocab":[{"word":"...","pos":"n/v/adj/adv...","imageDesc":"..."}],"grammar":{"heading":"cấu trúc chính","blocks":[{"kind":"rule","point":"quy tắc","examples":["ví dụ"]},{"kind":"table","headers":["...","..."],"rows":[["...","..."]]}]}}`;
}

export function buildExercisePrompt(
  cfg: Cfg,
  ws: Pick<Worksheet, "title" | "brief" | "learn">,
  exPlan: Pick<ExercisePlan, "stage" | "type" | "title" | "count">,
  otherSummaries: string,
  exIndex: number,
  prevSummary: string,
): string {
  const lowLevel = ["Pre A1", "A1", "A2"].includes(cfg.level);
  const repeatRule = lowLevel
    ? `Level thấp: ĐƯỢC PHÉP lặp lại nội dung/câu ví dụ của BÀI LIỀN TRƯỚC (tối đa 2 bài liên tiếp) để học sinh làm quen — cùng câu nhưng dạng bài khác thì tiêu chí đã khác (bài trước nhận diện/khoanh, bài này tự viết). ${exIndex >= 2
      ? "NHƯNG bài này là bài thứ 3 trở đi trong một chuỗi, PHẢI đổi sang nhân vật/câu ví dụ MỚI (vẫn cùng chủ đề), không kéo dài chuỗi lặp."
      : "Nếu tái dùng, chỉ tái dùng nội dung của đúng bài liền trước, không của các bài xa hơn."
    }`
    : "Level này KHÔNG dựa vào lặp: dùng nhân vật/câu ví dụ đa dạng, khác các bài trước ngay từ bài này (vẫn giữ chung chủ đề và vùng từ vựng).";
  return `Soạn 1 bài tập cho worksheet "${ws.title}" (CEFR ${cfg.level}, học sinh ~${AGE_BY_LEVEL[cfg.level]} tuổi, chủ điểm: ${cfg.topic}).
Mục tiêu worksheet: ${ws.brief}
Từ trọng tâm đã giới thiệu ở phần Learn (nên xuất hiện, nhưng KHÔNG bó hẹp — được dùng thêm từ khác cùng chủ đề, trong/dưới level ${cfg.level}): ${(ws.learn?.vocab || []).map((v) => v.word).join(", ")}
${cfg.notes ? "Yêu cầu thêm: " + cfg.notes : ""}

BÀI CẦN SOẠN: đây là BÀI SỐ ${exIndex + 1}, stage ${exPlan.stage}, dạng "${exPlan.type}", tiêu đề "${exPlan.title}", ${exPlan.count} câu.
Bài liền trước: ${prevSummary || "chưa có (đây là bài đầu)"}
Các bài khác trong worksheet: ${otherSummaries || "chưa có"}

NGUYÊN TẮC NGỮ CẢNH & LẶP LẠI:
- Giữ CHUNG chủ đề rộng và vùng từ vựng với cả worksheet (đó là điều nên làm).
- Ràng buộc chỉ ở tầng CÂU VÍ DỤ/NHÂN VẬT CỤ THỂ: ${repeatRule}

${TYPE_RULES}

Quy tắc item: mỗi câu chỉ 1 mục tiêu; chỉ 1 đáp án đúng duy nhất, không ambiguous; distractor sai nhưng "có lý"; câu tự nhiên như người bản xứ nói; từ vựng ≤ ${cfg.level}.
QUY TẮC INSTRUCTION: viết bằng tiếng Anh, TỐI ĐA 2 câu ngắn, rõ, 1 nghĩa, dễ hơn bản thân bài tập. Số ít/nhiều phải khớp thực tế (nhiều câu → "sentences", nhiều tranh → "pictures", nhiều chỗ trống → "blanks"). KHÔNG lặp lại yêu cầu đã nêu ở instruction xuống từng câu (vd đã nói "rewrite in passive" thì KHÔNG thêm "(passive)" sau mỗi câu). Chỉ để gợi ý trong ngoặc ở từng câu khi nó thêm dữ kiện MỚI (từ khác nhau mỗi câu).
QUY TẮC WORDING: dùng động từ hỏi tự nhiên trong giảng dạy (indicate, express, show, "What is the function of..."), tránh cách nói literal/gượng (không "What does X communicate"). Ưu tiên collocation và mẫu câu phổ biến.
${exPlan.type === "reading" ? "QUY TẮC READING: câu hỏi PHẢI khai thác nội dung đoạn văn (thông tin cụ thể, mục đích, quan hệ giữa sự việc, suy luận từ ngữ cảnh, nghĩa từ trong ngữ cảnh) — KHÔNG hỏi lý thuyết ngữ pháp thuần mà học sinh trả lời được dù không đọc bài. Không lặp cùng một ý hỏi ở nhiều câu.\n" : ""}QUY TẮC STAGE: độ khó phải khớp nhãn stage — Controlled = nhiều gợi ý/khung cho sẵn; Semi-controlled = ít gợi ý hơn; Production = tự sản sinh, ít/không gợi ý. Nếu bài có nhiều gợi ý (cho sẵn từ khoá, phần mở đầu câu) thì KHÔNG gắn nhãn Production.

Trả về CHỈ JSON compact: ${exPlan.type === "transform_table"
      ? `{"stage":"${exPlan.stage}","type":"transform_table","title":"${exPlan.title}","instruction":"...","columns":["...","..."],"examples":[["...","..."]],"items":[{"n":1,"cells":["...","..."],"blanks":[false,true]}]}`
      : `{"stage":"${exPlan.stage}","type":"${exPlan.type}","title":"${exPlan.title}","instruction":"..."${exPlan.type === "reading" || exPlan.type === "error_passage" ? ',"passage":"..."' : ""},"items":[{"n":1,"prompt":"...","options":[],"answer":"...","imageDesc":""}]}`}`;
}
