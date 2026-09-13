// Serverless proxy: nhận request từ trình duyệt và chuyển tiếp tới Anthropic API.
// API key được giữ ở phía server (biến môi trường ANTHROPIC_API_KEY), KHÔNG lộ ra client.

export const runtime = "nodejs";
export const maxDuration = 60; // cho phép tối đa 60s (worksheet dài có thể mất thời gian)
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

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

  const data = await response.json();
  return NextResponse.json(data);
}