// Mục đích của một lượt gọi AI — dùng chung giữa client (gửi đi) và server (validate, ghi log, tính hạn mức).
export const AI_PURPOSES = ["structure", "learn", "exercise", "regen_exercise", "regen_learn"] as const;
export type AiPurpose = (typeof AI_PURPOSES)[number];
