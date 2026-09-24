import Link from "next/link";
import { buttonClass } from ".";

export function Pagination({
  page, total, pageSize, searchParams,
}: { page: number; total: number; pageSize: number; searchParams: Record<string, string | undefined> }) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (v && k !== "page") sp.set(k, v);
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `?${s}` : "?";
  };
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className={buttonClass("secondary", "sm")}>← Trước</Link> : null}
      <span className="text-slate-600">Trang {page}/{pages}</span>
      {page < pages ? <Link href={href(page + 1)} className={buttonClass("secondary", "sm")}>Sau →</Link> : null}
    </div>
  );
}
