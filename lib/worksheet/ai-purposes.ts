// Mục đích của một lượt gọi AI — dùng chung giữa client (gửi đi) và server (validate, ghi log, tính hạn mức).
export const AI_PURPOSES = ["structure", "learn", "exercise", "regen_exercise", "regen_learn", "prompt_ideas", "sync_vocab"] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];

/** Tác vụ phụ (gợi ý prompt, đồng bộ từ vựng): hạn mức riêng, có thể chạy bằng model rẻ hơn */
export const HELPER_PURPOSES: readonly AiPurpose[] = ["prompt_ideas", "sync_vocab"];
