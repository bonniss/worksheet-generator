# Worksheet Generator — request list for the latest version

Plain list of what the content team wants, feature by feature. Each item says what the user sees and does, and any decision already agreed. Items marked **[web only]** need the database or server, not just the interface (the prototype can only show the interface part). Wording in quotes is the on-screen text (Vietnamese) agreed so far.

Source: team feedback sheet ("Đề xuất cải tiến" and the test feedback), plus decisions made while reviewing the prototype.

---

## A. Home screen (setup)

**A1. Two separate levels**
- *CEFR level — ngữ pháp & bài tập*: single choice (Pre A1 … C2). Drives the colour theme, the exercise types offered and the grammar scope.
- *Level từ vựng*: multi-select (Pre A1 … C2), plus "Theo level chính" (default = same as the main level). A worksheet can use, for example, A1 + A2 vocabulary.
- Vocabulary reference: English Vocabulary Profile for A1–C2. Pre A1 is not a CEFR level in that list, so Pre A1 uses the Cambridge Starters wordlist (Movers → A1 and Flyers → A2 fill gaps).

**A2. Visible topic suggestions (under "Chủ điểm")**
- Clickable chips built from the two taxonomy files (Grammar G01–G17, Vocabulary V01–V24), filtered by each sub-topic's CEFR from–to range. A higher level also shows lower-level topics that are still valid.
- Grammar worksheets use the grammar level; vocabulary worksheets use the vocab level(s).
- Buttons: "🔀 Gợi ý khác" (new batch of 8) and "Xem thêm (n)" (full list, grouped by topic with filter chips). Hovering a chip shows the Vietnamese name, scope and examples.
- Clicking a chip fills the topic and passes the taxonomy scope and examples to the AI. Editing the topic text by hand removes that link.

**A3. Total number of questions**
- Optional field "Tổng số câu" (empty = AI decides, about 3–5 per exercise). The total is split evenly across exercises (e.g. 15 over 3 = 5 + 5 + 5). Transformation tables keep their own row count.

**A4. "💡 Gợi ý prompt" button (next to "Prompt mô tả thêm")**
- Shows 3 suggestion cards at a time, written in English. Each card = a short scenario title + about 50–65 words: a concrete situation with named characters, 2–3 sample sentences using the target topic, a teaching angle (what learners confuse / what to avoid) and a few fitting vocabulary items.
- Cards must **not** repeat the topic, level or what the teacher already typed. The three cards must differ in setting.
- **Level fit comes first:** suggestions must be doable with vocabulary at or below the chosen vocab level (e.g. no "stir / pour / batter" at A1). Cards containing words above the level are dropped and regenerated once.
- Click a card to add its text to the prompt box (several cards allowed; click again to remove). Button then reads "↻ 3 gợi ý khác" and avoids repeating titles already shown. Needs a topic first.

---

## B. Generation rules (what the AI is told)

**B1. Vocabulary level is a hard rule.** Every part of the worksheet uses vocabulary within the chosen band. If a context (e.g. making pancakes) needs harder words, the situation is simplified rather than using harder words. For Pre A1 / A1 the AI is given the allowed word list.

**B2. Core Vocabulary must match the exercises.**
- Core words are everyday content words the exercises will actually use. Never grammar terms (gerund, past participle, tense…).
- Exercises must use those words. If some Core words never appear in the exercises, the tool says so and offers "🔁 Đồng bộ từ vựng theo bài tập" to re-pick them.

**B3. Reading exercise**
- *Grammar worksheet:* questions test the target grammar as used in the passage — quote a sentence from the passage, then identify the structure, choose the correct form, or rewrite it (rewriting only from B1 up). Not general comprehension questions.
- *Vocabulary worksheet:* keeps content-comprehension questions.

**B4. Plain text by default.** The AI writes normal text; bold only where the exercise format needs it (e.g. the underlined part in question-writing, keyword transformation). Teachers add bold/italic/highlight themselves.

**B5. No numbers in titles.** The AI must not write "Exercise 1" or "1." in exercise titles.

---

## C. Worksheet screen

**C1. Numbering and header**
- The first section (Learn / Language Focus) has **no number**; it shows a small cute star badge instead.
- Exercises are numbered from 1. The same applies in the Word export (Learn heading gets a ★).

**C2. Vocabulary level tags (screen only, never printed or exported)**
- Each Core Vocabulary word shows its CEFR level next to it (green = within the chosen level, red = above, grey "?" = not in the reference list).

**C3. "🔍 Quét từ vựng" (check vocabulary level)**
- Scans the whole worksheet and lists words above the chosen vocab level, with where they appear (Bài / câu). Instructions, titles, grammar explanations and names are not counted.
- For each affected exercise: a button "Gen lại bài n (thay: …)" that regenerates it avoiding those words.
- Also shows Core words missing from the exercises (see B2).
- An amber warning appears automatically after generation when words above the level are found.

**C4. "🎯 Đổi chủ điểm" (change topic from the worksheet screen)**
- Opens a panel with the same suggestion chips. "Tạo lại worksheet với chủ điểm này" regenerates the worksheet; the old version stays in undo history.

**C5. Gen lại — choose what to regenerate (applies to every Gen lại button)**
- *Learn section:* "Cả phần" / "Chỉ ngữ pháp (giữ từ vựng)" / "Chỉ từ vựng (giữ ngữ pháp)". Choosing "only grammar" must keep the chosen vocabulary, including uploaded images.
- *Each exercise:* "Cả bài" or "Chỉ các câu (giữ tiêu đề, đề bài, đoạn văn)". In the second mode each question has a "giữ" tick; ticked questions stay exactly as they are, the rest are rewritten. (Error-in-passage exercises: whole exercise only.)
- *Change exercise type:* in "Cả bài" mode the teacher can change the stage and exercise type before regenerating (instead of creating a whole new worksheet).
- The existing free-text box stays: empty = regenerate freely; text = follow the instruction.

**C6. Order controls**
- Each exercise: ↑ / ↓ to move it, and "⇅ Sắp xếp": shuffle question order, reverse question order, shuffle answer-option order (only for exercises with options).
- In the exercise editor: the same shuffle/reverse buttons plus ↑ / ↓ per question.

**C7. Undo / redo**
- "↶ Hoàn tác" and "↷ Làm lại" buttons, also Ctrl/⌘+Z and Ctrl/⌘+Shift+Z. **No limit** on the number of steps. Every edit, regeneration, topic change and file open is one step; regenerating the whole worksheet can be undone.

**C8. Easier editing**
- Text boxes in all editors grow automatically to show the full text. In the transformation-table editor each cell shows the full sentence.

**C9. Word box ("hộp từ") for every exercise type**
- Many exercises give the words to use first (for example "Fill in the blanks using the describing words from the box"). Every exercise type can have an optional word box: a bordered box shown right under the instruction, above the questions, with the words spread out in a row (wrapping onto more lines if needed).
- In the exercise editor (all types, including the transformation table): a button "+ Thêm hộp từ (từ cho sẵn)" adds the box. The teacher types the words separated by commas or new lines (phrases such as "a lot of" are allowed). Helper buttons: "🔀 Xáo thứ tự" (shuffle), "A→Z" (sort), "↻ Lấy từ đáp án" (build the box from the exercise's answers, shuffled) and "✕ Xoá hộp từ". It shows the word count.
- The box appears on screen, in the printed/PDF version and in the Word export (as a bordered box). It is saved and reopened with the worksheet.
- The AI may fill the box by itself only when the instruction says to use words from a box; it then gives enough words for all blanks (plus 1–2 extra at A2 and above), in a shuffled order and within the allowed vocabulary level. The teacher can also ask for it in the Gen lại text box.
- The vocabulary level scan (C3) also checks the words in the box.
- "Gen lại → Chỉ các câu": the box is kept, and the new questions must use the box words that the kept questions don't already use.

---

## D. Example bank [web only]

- **Rule:** a worksheet whose sharing status is changed from "Riêng tư" to **"Công khai"** counts as reviewed and becomes an example for the AI. There is no separate "reviewed" status. Switching back to "Riêng tư" removes it from the bank.
- **Use:** when generating or regenerating an exercise, the AI receives up to 2 examples of the **same exercise type**, from the **same or a neighbouring level**, preferring the same stage and the same/similar topic. Examples teach style, instruction wording, difficulty, natural sentences and distractors; the AI must **not copy** content.
- Examples rotate (not always the same two) and come from different worksheets. Duplicated worksheets ("Nhân bản") count once. Failed or incomplete exercises are never used. Owner names are never sent to the AI.
- If nothing suitable exists, generation continues normally.
- **Interface wording to update** in the library: tooltip for Riêng tư "Chỉ mình bạn thấy. Bấm để chia sẻ."; tooltip for Công khai "Mọi người thấy được và AI dùng làm ví dụ mẫu. Chỉ công khai khi bạn đã soát kỹ."; one-time confirmation when switching to Công khai: "Worksheet công khai sẽ được dùng làm ví dụ mẫu cho AI. Bạn đã soát kỹ đáp án và câu chữ chưa?"

---

## E. More requests that need the database or server [web only]

**E1. Examples for the Learn section**
- The AI also gets reviewed examples for the Learn section (vocabulary choice, grammar rules, tables, example sentences). They come from Công khai worksheets at the same or a neighbouring level and the same grammar/vocabulary kind, with the same rules as D: the AI learns the wording and does not copy content.

**E2. Keep the AI's first draft next to the final version**
- When a worksheet is first generated, save the AI's original (a copy of the worksheet content) in its own field. Saving later edits must never overwrite it.
- Purpose: compare the AI's draft with the teacher's final version, to see which parts teachers keep rewriting (for example instructions, distractors, example sentences) and to improve the prompts. Worksheets saved before this exists have no draft; that is expected.
- Regenerating one exercise or section replaces only that part of the saved draft, so the draft always reflects what the AI last produced for each part.

**E3. Do not repeat words and characters from earlier worksheets**
- Thư's request: the AI tends to pick the same familiar words and the same character names in every worksheet. The vocabulary level section should include an option so the new worksheet avoids the Core Vocabulary words and the character names used in the teacher's recent worksheets.
- The AI receives the recent words and names as "avoid" lists (last N worksheets, N to be agreed; suggested 5) for the Learn section and the exercises.

**E4. Vocabulary level check during generation**
- The vocabulary level check from C3 also runs on the server while the worksheet is being generated. If an exercise contains words above the chosen vocab level, that exercise is regenerated automatically (one retry), with the offending words listed as words to avoid. If words remain, the worksheet shows the amber warning from C3.

**E5. Exclude a public worksheet from the example bank**
- An administrator can mark a Công khai worksheet as "do not use as an example" (for example if it was shared before being fully reviewed). It stays Công khai and visible to everyone, but the AI no longer uses it.

**E6. Google Drive export**
- Optional: export a worksheet to the teacher's Google Drive as a file, in addition to the existing PDF and Word downloads. (Agreed earlier as a nice-to-have; can be built after the items above.)

## F. Constraints that still apply
- Printing/PDF must look exactly like the screen; vocabulary level tags and numbering changes must not break it.
- Bold / italic / highlight, `___` blanks and line breaks keep working in every editor.
- Old saved worksheet files must still open.
- Add and remove question buttons, image upload and the transformation table behave as before.
