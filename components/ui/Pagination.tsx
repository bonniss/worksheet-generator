import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return (
    <div className="flex items-center justify-between gap-3 px-6 py-3 text-[13px] text-zinc-500">
      <span>{from}–{to} / {total}</span>
      <div className="flex gap-1">
        {page > 1
          ? <Link href={href(page - 1)} className={buttonClass("ghost", "sm")} aria-label="Trang trước"><ChevronLeft size={16} /></Link>
          : <span className={buttonClass("ghost", "sm") + " pointer-events-none opacity-40"}><ChevronLeft size={16} /></span>}
        <span className="flex items-center px-2 font-medium text-zinc-700">{page} / {pages}</span>
        {page < pages
          ? <Link href={href(page + 1)} className={buttonClass("ghost", "sm")} aria-label="Trang sau"><ChevronRight size={16} /></Link>
          : <span className={buttonClass("ghost", "sm") + " pointer-events-none opacity-40"}><ChevronRight size={16} /></span>}
      </div>
    </div>
  );
}
