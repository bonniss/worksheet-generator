import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { Badge, Card, Input, PageTitle, Select, buttonClass } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { likePattern } from "@/lib/sql";
import { isUuid } from "@/lib/validators";
import { deleteWorksheet, duplicateWorksheet } from "./actions";

export const metadata = { title: "Worksheet · Worksheet Generator" };

const PAGE_SIZE = 20;
const LEVELS = ["Pre A1", "A1", "A2", "B1", "B2", "C1", "C2"];
type Search = { q?: string; owner?: string; level?: string; page?: string };

export default async function WorksheetsPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser();
  const isAdmin = user.role === "admin";
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const filters: (SQL | undefined)[] = [];
  if (!isAdmin) filters.push(eq(worksheets.ownerId, user.id));
  else if (searchParams.owner && isUuid(searchParams.owner)) filters.push(eq(worksheets.ownerId, searchParams.owner));
  if (searchParams.level && LEVELS.includes(searchParams.level)) filters.push(eq(worksheets.level, searchParams.level));
  if (q) filters.push(or(ilike(worksheets.title, likePattern(q)), ilike(worksheets.topic, likePattern(q))));
  const where = and(...filters);

  const [rows, [{ total }], owners] = await Promise.all([
    db
      .select({
        id: worksheets.id, title: worksheets.title, level: worksheets.level, type: worksheets.type,
        topic: worksheets.topic, updatedAt: worksheets.updatedAt, ownerName: users.name, ownerUsername: users.username,
      })
      .from(worksheets)
      .innerJoin(users, eq(worksheets.ownerId, users.id))
      .where(where)
      .orderBy(desc(worksheets.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(worksheets).where(where),
    isAdmin
      ? db.select({ id: users.id, name: users.name, username: users.username }).from(users).orderBy(users.name)
      : Promise.resolve([]),
  ]);

  return (
    <main className="app-ui mx-auto max-w-6xl px-4 py-6">
      <PageTitle
        title={isAdmin ? "Worksheet (toàn hệ thống)" : "Worksheet của tôi"}
        sub={`${total} worksheet`}
        actions={<Link href="/" className={buttonClass()}>+ Tạo worksheet</Link>}
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <Input name="q" placeholder="Tìm theo tiêu đề hoặc chủ điểm..." defaultValue={q} />
          </div>
          <Select name="level" defaultValue={searchParams.level ?? ""} className="w-auto">
            <option value="">Mọi trình độ</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </Select>
          {isAdmin && (
            <Select name="owner" defaultValue={searchParams.owner ?? ""} className="w-auto max-w-[260px]">
              <option value="">Mọi người dùng</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.name} (@{o.username})</option>)}
            </Select>
          )}
          <button className={buttonClass("secondary")}>Lọc</button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tiêu đề</th>
              <th className="px-4 py-3">Trình độ</th>
              <th className="px-4 py-3">Loại</th>
              {isAdmin && <th className="px-4 py-3">Người tạo</th>}
              <th className="px-4 py-3">Cập nhật</th>
              <th className="px-4 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 6 : 5} className="px-4 py-10 text-center text-slate-500">Chưa có worksheet nào.</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-0 border-t border-solid border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/worksheets/${r.id}`} className="font-semibold text-sky-700 hover:underline">{r.title}</Link>
                  {r.topic && <div className="text-xs text-slate-500">{r.topic}</div>}
                </td>
                <td className="px-4 py-3"><Badge tone="sky">{r.level}</Badge></td>
                <td className="px-4 py-3">{r.type === "grammar" ? "Ngữ pháp" : r.type === "vocabulary" ? "Từ vựng" : r.type}</td>
                {isAdmin && (
                  <td className="px-4 py-3">
                    <div>{r.ownerName}</div>
                    <div className="text-xs text-slate-500">@{r.ownerUsername}</div>
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.updatedAt.toLocaleString("vi-VN")}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Link href={`/worksheets/${r.id}`} className={buttonClass("secondary", "sm")}>Mở</Link>
                    <form action={duplicateWorksheet}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="secondary" size="sm" pendingText="...">Nhân bản</SubmitButton>
                    </form>
                    <form action={deleteWorksheet}>
                      <input type="hidden" name="id" value={r.id} />
                      <SubmitButton variant="danger" size="sm" pendingText="..." confirm={`Xoá worksheet "${r.title}"?`}>
                        Xoá
                      </SubmitButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} searchParams={searchParams} />
    </main>
  );
}
