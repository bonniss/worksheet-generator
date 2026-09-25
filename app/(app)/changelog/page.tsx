import { Page, PageHeader, cx } from "@/components/ui";
import { requireUser } from "@/lib/auth/session";
import { CHANGELOG, LATEST_VERSION, type ChangeTag } from "@/lib/changelog";
import { MarkSeen } from "./MarkSeen";

export const metadata = { title: "Có gì mới" };

const TAG: Record<ChangeTag, { label: string; className: string }> = {
  new: { label: "Mới", className: "bg-primary-soft text-primary" },
  improved: { label: "Cải thiện", className: "bg-success-soft text-success" },
  fixed: { label: "Sửa lỗi", className: "bg-warning-soft text-warning" },
  admin: { label: "Quản trị", className: "bg-accent-soft text-accent" },
};

const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" });

export default async function ChangelogPage() {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  // Người dùng thường không cần thấy thay đổi chỉ dành cho quản trị viên
  const releases = CHANGELOG
    .map((r) => ({ ...r, changes: isAdmin ? r.changes : r.changes.filter((c) => c.tag !== "admin") }))
    .filter((r) => r.changes.length);

  return (
    <Page width="form">
      <MarkSeen version={LATEST_VERSION} />
      <PageHeader title="Có gì mới" sub="Các cập nhật của Worksheet Genie." />
      <ol className="m-0 list-none p-0">
        {releases.map((r, i) => (
          <li key={r.version} className="relative pb-10 pl-8 last:pb-0">
            {/* Đường thời gian */}
            {i < releases.length - 1 && <span className="absolute bottom-0 left-[7px] top-5 w-px bg-zinc-200" aria-hidden="true" />}
            <span
              className={cx("absolute left-0 top-1.5 h-[15px] w-[15px] rounded-full border-[3px] border-solid", i === 0 ? "border-primary-soft bg-primary" : "border-page bg-zinc-300")}
              aria-hidden="true"
            />
            <div className="mb-1 flex flex-wrap items-center gap-2 text-[13px] text-zinc-500">
              <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs font-medium text-zinc-700">v{r.version}</span>
              <time dateTime={r.date}>{fmtDate(r.date)}</time>
              {i === 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">Mới nhất</span>}
            </div>
            <h2 className="font-display text-lg font-bold text-zinc-900">{r.title}</h2>
            {r.summary && <p className="mt-1 text-sm text-zinc-600">{r.summary}</p>}
            <ul className="m-0 mt-3 list-none space-y-2 p-0">
              {r.changes.map((c, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm leading-relaxed text-zinc-700">
                  <span className={cx("mt-0.5 inline-flex h-5 w-[68px] shrink-0 items-center justify-center rounded text-[11px] font-semibold", TAG[c.tag].className)}>
                    {TAG[c.tag].label}
                  </span>
                  <span>{c.text}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </Page>
  );
}
