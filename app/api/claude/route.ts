// Proxy phía server: nhận request từ trình duyệt và chuyển tới Anthropic API.
// API key + model lấy từ cấu hình hệ thống (trang /admin/settings), dự phòng bằng biến môi trường.
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic";
import { apiUser, jsonError } from "@/lib/auth/api";
import { getAiConfig } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60; // cho phép tối đa 60s (worksheet dài có thể mất thời gian)

// 424: lỗi cấu hình phía server — tránh 401/403 vì client hiểu đó là "phiên đăng nhập hết hạn"
const CONFIG_ERROR = 424;

export async function POST(req: NextRequest) {
  const { error } = await apiUser();
  if (error) return error;

  const body: unknown = await req.json().catch(() => null);
  const messages = body && typeof body === "object" && "messages" in body ? body.messages : null;
  if (!Array.isArray(messages)) return jsonError(400, "Thiếu messages");

  const cfg = await getAiConfig();
  if (!cfg.apiKey) {
    return jsonError(CONFIG_ERROR, "Chưa cấu hình Anthropic API key. Quản trị viên vào Cấu hình AI để thiết lập.");
  }

  try {
    const message = await anthropicClient(cfg.apiKey).messages.create({
      model: cfg.model,
      max_tokens: 1024,
      messages: messages as Anthropic.MessageParam[],
    });
    return NextResponse.json(message);
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
      return jsonError(CONFIG_ERROR, "Anthropic API key không hợp lệ hoặc hết quyền. Quản trị viên kiểm tra lại ở Cấu hình AI.");
    }
    if (e instanceof Anthropic.NotFoundError) {
      return jsonError(CONFIG_ERROR, `Model "${cfg.model}" không tồn tại hoặc key không được dùng. Quản trị viên chọn model khác ở Cấu hình AI.`);
    }
    if (e instanceof Anthropic.APIError && e.status) {
      // Giữ nguyên thân lỗi của Anthropic để client phân loại (rate limit, overloaded...)
      return NextResponse.json(e.error ?? { type: "error", error: { message: e.message } }, { status: e.status });
    }
    if (e instanceof Anthropic.APIConnectionError) return jsonError(502, "Không kết nối được tới Anthropic API.");
    throw e;
  }
}
