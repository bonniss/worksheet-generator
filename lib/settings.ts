import "server-only";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { appSettings, users } from "@/db/schema";
import { decryptSecret, encryptSecret, maskSecret } from "./crypto";

export const SETTING_KEYS = {
  apiKey: "ai.anthropic_api_key", // đã mã hoá
  model: "ai.model",
} as const;
type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// Mặc định khi cả DB lẫn env đều chưa đặt (giữ như trước đây)
export const DEFAULT_MODEL = "claude-haiku-4-5";

export type Source = "db" | "env" | "default" | "none";

export type AiConfig = {
  apiKey: string | null;
  apiKeySource: Source;
  /** Có key trong DB nhưng không giải mã được (SETTINGS_SECRET đã đổi) */
  apiKeyBroken: boolean;
  model: string;
  modelSource: Source;
};

async function readRows(keys: SettingKey[]) {
  const rows = await db
    .select({ key: appSettings.key, value: appSettings.value, updatedAt: appSettings.updatedAt, updatedBy: users.username })
    .from(appSettings)
    .leftJoin(users, eq(appSettings.updatedBy, users.id))
    .where(inArray(appSettings.key, keys));
  return new Map(rows.map((r) => [r.key, r]));
}

type Rows = Awaited<ReturnType<typeof readRows>>;

function resolve(rows: Rows): AiConfig {
  const storedKey = rows.get(SETTING_KEYS.apiKey)?.value;
  const dbKey = storedKey ? decryptSecret(storedKey) : null;
  const envKey = process.env.ANTHROPIC_API_KEY || null;
  const dbModel = rows.get(SETTING_KEYS.model)?.value;
  const envModel = process.env.ANTHROPIC_MODEL || null;
  return {
    apiKey: dbKey ?? envKey,
    apiKeySource: dbKey ? "db" : envKey ? "env" : "none",
    apiKeyBroken: !!storedKey && !dbKey,
    model: dbModel || envModel || DEFAULT_MODEL,
    modelSource: dbModel ? "db" : envModel ? "env" : "default",
  };
}

/** Cấu hình AI hiệu lực: ưu tiên DB, rồi tới biến môi trường. */
export async function getAiConfig(): Promise<AiConfig> {
  return resolve(await readRows([SETTING_KEYS.apiKey, SETTING_KEYS.model]));
}

/** Thông tin cho trang quản trị — key thật chỉ dùng phía server, trang chỉ nhận bản che. */
export async function getAiSettingsView() {
  const rows = await readRows([SETTING_KEYS.apiKey, SETTING_KEYS.model]);
  const cfg = resolve(rows);
  const meta = (k: SettingKey) => {
    const r = rows.get(k);
    return r ? { updatedAt: r.updatedAt, updatedBy: r.updatedBy } : null;
  };
  return {
    config: cfg,
    view: {
      apiKeyMasked: cfg.apiKey ? maskSecret(cfg.apiKey) : null,
      apiKeySource: cfg.apiKeySource,
      apiKeyBroken: cfg.apiKeyBroken,
      apiKeyMeta: meta(SETTING_KEYS.apiKey),
      envHasKey: !!process.env.ANTHROPIC_API_KEY,
      model: cfg.model,
      modelSource: cfg.modelSource,
      modelMeta: meta(SETTING_KEYS.model),
      envModel: process.env.ANTHROPIC_MODEL || null,
    },
  };
}

export async function setSetting(key: SettingKey, value: string, userId: string) {
  const stored = key === SETTING_KEYS.apiKey ? encryptSecret(value) : value;
  await db
    .insert(appSettings)
    .values({ key, value: stored, updatedBy: userId })
    .onConflictDoUpdate({ target: appSettings.key, set: { value: stored, updatedBy: userId, updatedAt: new Date() } });
}

export async function deleteSetting(key: SettingKey) {
  await db.delete(appSettings).where(eq(appSettings.key, key));
}
