/* ===== TAXONOMY CHỦ ĐIỂM — Grammar G01–G17 / Vocabulary V01–V24 (lib/worksheet/data/taxonomy.json, npm run data:build) ===== */
import data from "./data/taxonomy.json";
import { LEVELS } from "./themes";
import type { FocusType, Level, TopicMeta } from "./types";

export type TaxTopic = { id: string; en: string; vi: string; definition: string };
export type TaxSub = { id: string; topicId: string; en: string; vi: string; scope: string; examples: string; from: number; to: number };
type Taxonomy = { topics: TaxTopic[]; subs: TaxSub[] };

const TAX: Record<FocusType, Taxonomy> = { grammar: data.grammar, vocabulary: data.vocabulary };

export function taxTopics(kind: FocusType): TaxTopic[] {
  return TAX[kind].topics;
}

/** Chủ điểm hợp với BẤT KỲ level nào được chọn (from ≤ level ≤ to) — level cao gồm cả chủ điểm level thấp còn hiệu lực */
export function taxSubs(kind: FocusType, levels: Level[]): TaxSub[] {
  const idxs = levels.map((x) => LEVELS.indexOf(x)).filter((x) => x >= 0);
  return TAX[kind].subs.filter((s) => idxs.some((i) => s.from <= i && i <= s.to));
}

export function subToMeta(s: TaxSub): TopicMeta {
  return { id: s.id, en: s.en, vi: s.vi, scope: s.scope, examples: s.examples };
}

export function levelRange(s: TaxSub): string {
  return s.from === s.to ? LEVELS[s.from] : `${LEVELS[s.from]}–${LEVELS[s.to]}`;
}
