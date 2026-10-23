import "server-only";
import type { z } from "zod";
import type { worksheetPayloadSchema } from "./validators";
import type { AiDraft, AiDraftPatch, SavedProject } from "./worksheet/types";

type Payload = z.infer<typeof worksheetPayloadSchema>["data"];

/** Các cột tách ra từ payload để liệt kê/tìm kiếm. */
export function worksheetColumns(data: Payload) {
  return {
    title: (data.ws.title || "").trim() || "Untitled worksheet",
    level: data.cfg.level,
    type: data.cfg.type,
    topic: data.cfg.topic,
    data: data as unknown as SavedProject,
  };
}

/** Gộp phần nháp AI mới vào bản nháp đã lưu. Không có patch → giữ nguyên (sửa tay không đụng tới bản nháp). */
export function mergeAiDraft(prev: AiDraft | null, patch: AiDraftPatch | undefined): AiDraft | null {
  if (!patch) return prev;
  const now = new Date().toISOString();
  const base: AiDraft = !prev || patch.reset ? { v: 1, createdAt: now, updatedAt: now, exercises: {} } : { ...prev, exercises: { ...prev.exercises } };
  if (patch.title !== undefined) base.title = patch.title;
  if (patch.brief !== undefined) base.brief = patch.brief;
  if (patch.learn) base.learn = { data: { ...(base.learn?.data || {}), ...patch.learn }, at: now };
  for (const [id, e] of Object.entries(patch.exercises || {})) {
    base.exercises[id] = { data: e.data, at: now, ...(e.keptItems?.length ? { keptItems: e.keptItems } : {}) };
  }
  base.updatedAt = now;
  return base;
}
