/** Escape ký tự đặc biệt của LIKE/ILIKE trong input người dùng. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}
