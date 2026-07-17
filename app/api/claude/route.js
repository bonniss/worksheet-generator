// Serverless proxy: nhận request từ trình duyệt và chuyển tiếp tới Anthropic API.
// API key được giữ ở phía server (biến môi trường ANTHROPIC_API_KEY), KHÔNG lộ ra client.

export const runtime = "nodejs";
export const maxDuration = 60; // cho phép tối đa 60s (worksheet dài có thể mất thời gian)

export async function POST(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Thiếu ANTHROPIC_API_KEY. Hãy thêm biến môi trường này trong Vercel." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Body không hợp lệ." }, { status: 400 });
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    const data = await upstream.json();
    return Response.json(data, { status: upstream.status });
  } catch (err) {
    return Response.json(
      { error: "Lỗi khi gọi Anthropic API.", detail: String(err) },
      { status: 502 }
    );
  }
}
