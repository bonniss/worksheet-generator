"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { verifyApiKey } from "@/lib/anthropic";
import { requireAdmin } from "@/lib/auth/session";
import { deleteSetting, getAiConfig, SETTING_KEYS, setSetting } from "@/lib/settings";

export type SettingsState = { error?: string; success?: string; warning?: string };

const apiKeySchema = z.string().trim().min(20, "API key quá ngắn").max(300).regex(/^\S+$/, "API key không được chứa khoảng trắng");
const modelSchema = z.string().trim().min(3, "Nhập model id").max(100).regex(/^[A-Za-z0-9._:@/-]+$/, "Model id không hợp lệ");

export async function saveApiKey(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const me = await requireAdmin();
  const parsed = apiKeySchema.safeParse(formData.get("apiKey") ?? "");
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const check = await verifyApiKey(parsed.data);
  if (!check.ok && check.auth) return { error: check.message };
  await setSetting(SETTING_KEYS.apiKey, parsed.data, me.id);
  revalidatePath("/admin/settings");
  // Lỗi mạng/tạm thời: vẫn lưu nhưng báo để admin biết chưa kiểm tra được
  return check.ok
    ? { success: `Đã lưu API key — key hợp lệ, dùng được ${check.models.length} model.` }
    : { warning: `Đã lưu API key nhưng chưa kiểm tra được: ${check.message}` };
}

export async function clearApiKey(): Promise<SettingsState> {
  await requireAdmin();
  await deleteSetting(SETTING_KEYS.apiKey);
  revalidatePath("/admin/settings");
  return process.env.ANTHROPIC_API_KEY
    ? { success: "Đã xoá key — đang dùng key mặc định của hệ thống." }
    : { warning: "Đã xoá key. Hệ thống chưa có key nào, chức năng tạo worksheet tạm ngừng." };
}

export async function testApiKey(): Promise<SettingsState> {
  await requireAdmin();
  const cfg = await getAiConfig();
  if (!cfg.apiKey) return { error: "Chưa có API key nào để kiểm tra." };
  const check = await verifyApiKey(cfg.apiKey);
  if (!check.ok) return { error: check.message };
  const hasModel = check.models.some((m) => m.id === cfg.model);
  return hasModel
    ? { success: `Key hoạt động. Model đang chọn (${cfg.model}) có trong danh sách.` }
    : { warning: `Key hoạt động, nhưng model "${cfg.model}" không có trong danh sách model của key — nên chọn lại.` };
}

export async function saveModel(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const me = await requireAdmin();
  const raw = formData.get("customModel") || formData.get("model") || "";
  const parsed = modelSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  await setSetting(SETTING_KEYS.model, parsed.data, me.id);
  revalidatePath("/admin/settings");
  return { success: `Đã chuyển sang ${parsed.data}.` };
}

export async function resetModel(): Promise<SettingsState> {
  await requireAdmin();
  await deleteSetting(SETTING_KEYS.model);
  revalidatePath("/admin/settings");
  return { success: "Đã quay về model mặc định." };
}
