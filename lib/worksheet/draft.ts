/* Bản nháp AI (lưu ở worksheets.ai_draft): client gom các phần AI vừa sinh thành patch, gửi kèm lần lưu kế tiếp */
import type { AiDraftPatch, Exercise } from "./types";

/** Gộp 2 patch liên tiếp (b mới hơn a) */
export function mergeDraftPatch(a: AiDraftPatch | null, b: AiDraftPatch | null): AiDraftPatch | null {
  if (!a) return b;
  if (!b) return a;
  if (b.reset) return b;
  return {
    ...a, ...b,
    learn: a.learn || b.learn ? { ...(a.learn || {}), ...(b.learn || {}) } : undefined,
    exercises: { ...(a.exercises || {}), ...(b.exercises || {}) },
  };
}

/** Bỏ trường chỉ dùng trên màn hình trước khi đưa vào bản nháp */
export function draftExercise(ex: Exercise): Exercise {
  const { _streaming, _failed, ...rest } = ex;
  void _streaming; void _failed;
  return rest;
}

export const newExerciseId = () => crypto.randomUUID().slice(0, 8);
