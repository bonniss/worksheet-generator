// Giá Anthropic API (USD / 1M token) — theo bảng giá công bố (skill claude-api, 2026-06).
// Cache write (TTL 5 phút) = 1.25× giá input, cache read = 0.1× giá input.
// Model id có thể kèm hậu tố ngày → so khớp theo tiền tố dài nhất.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-fable-5-1": { input: 10, output: 50 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-opus-4-7": { input: 5, output: 25 },
  "claude-opus-4-6": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-sonnet-4-6": { input: 3, output: 15 },
  "claude-sonnet-4-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export type Usage = {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
};

export function priceFor(model: string) {
  const key = Object.keys(PRICES)
    .filter((k) => model === k || model.startsWith(k + "-"))
    .sort((a, b) => b.length - a.length)[0];
  return key ? PRICES[key] : null;
}

/** Chi phí ước tính (USD) của một lượt gọi; null nếu không biết giá model. */
export function estimateCost(model: string, u: Usage): number | null {
  const p = priceFor(model);
  if (!p) return null;
  const perTok = (usd: number) => usd / 1_000_000;
  return (
    u.input_tokens * perTok(p.input) +
    u.output_tokens * perTok(p.output) +
    (u.cache_creation_input_tokens ?? 0) * perTok(p.input * 1.25) +
    (u.cache_read_input_tokens ?? 0) * perTok(p.input * 0.1)
  );
}
