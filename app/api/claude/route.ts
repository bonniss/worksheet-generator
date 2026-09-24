// Serverless proxy: nhận request từ trình duyệt và chuyển tiếp tới Anthropic API.
// API key được giữ ở phía server (biến môi trường ANTHROPIC_API_KEY), KHÔNG lộ ra client.
import { NextRequest, NextResponse } from "next/server";
import { apiUser, jsonError } from "@/lib/auth/api";

export const runtime = "nodejs";
export const maxDuration = 60; // cho phép tối đa 60s (worksheet dài có thể mất thời gian)

export async function POST(req: NextRequest) {
  const { error } = await apiUser();
  if (error) return error;

  const body: unknown = await req.json().catch(() => null);
  const messages = body && typeof body === "object" && "messages" in body ? body.messages : null;
  if (!Array.isArray(messages)) return jsonError(400, "Thiếu messages");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!, // đọc từ env, không hardcode
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
      max_tokens: 1024,
      messages,
    }),
  });

  const data: unknown = await response.json();
  return NextResponse.json(data, { status: response.status });
}
