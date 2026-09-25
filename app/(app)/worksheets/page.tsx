import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Copy, Globe, Lock, Plus, Trash2 } from "lucide-react";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import {
  Badge, Card, EmptyRow, Page, PageHeader, SearchInput, Select, Td, Th, buttonClass,
} from "@/components/ui";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { likePattern } from "@/lib/sql";
import { isUuid } from "@/lib/validators";
import { deleteWorksheet, duplicateWorksheet, setVisibility } from "./actions";

export const metadata = { title: "Worksheet" };

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
  const filtered = !!(q || searchParams.level || (isAdmin && searchParams.owner));

  const [rows, [{ total }], owners] = await Promise.all([
    db
      .select({
        id: worksheets.id, title: worksheets.title, level: worksheets.level, type: worksheets.type,
        topic: worksheets.topic, updatedAt: worksheets.updatedAt, visibility: worksheets.visibility, ownerName: users.name, ownerUsername: users.username,
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
  const cols = isAdmin ? 7 : 6;

  return (
    <Page>
      <PageHeader
        title={isAdmin ? "Tất cả worksheet" : "Worksheet của tôi"}
        sub={`${total} worksheet${filtered ? " khớp bộ lọc" : ""}`}
        actions={<Link href="/" className={buttonClass()}><Plus size={16} strokeWidth={2.5} /> Tạo worksheet</Link>}
      />

      <FilterBar filtered={filtered}>
        <SearchInput name="q" placeholder="Tìm theo tiêu đề hoặc chủ điểm" defaultValue={q} />
        <Select name="level" defaultValue={searchParams.level ?? ""} className="w-40">
          <option value="">Mọi trình độ</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
        {isAdmin && (
          <Select name="owner" defaultValue={searchParams.owner ?? ""} className="w-56">
            <option value="">Mọi người dùng</option>
            {owners.map((o) => <option key={o.id} value={o.id}>{o.name} (@{o.username})</option>)}
          </Select>
        )}
      </FilterBar>

      <Card flush className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Tiêu đề</Th>
                <Th>Trình độ</Th>
                <Th>Loại</Th>
                {isAdmin && <Th>Người tạo</Th>}
                <Th>Chia sẻ</Th>
                <Th>Cập nhật</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <EmptyRow colSpan={cols}>
                  {filtered ? "Không có worksheet khớp bộ lọc." : (
                    <>Chưa có worksheet nào. <Link href="/" className="font-medium text-primary hover:underline">Tạo worksheet đầu tiên →</Link></>
                  )}
                </EmptyRow>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="group transition-colors hover:bg-zinc-50">
                  <Td className="max-w-[360px]">
                    <Link href={`/worksheets/${r.id}`} className="block truncate font-medium text-zinc-900 group-hover:text-primary">{r.title}</Link>
                    {r.topic && <div className="truncate text-xs text-zinc-500">{r.topic}</div>}
                  </Td>
                  <Td><Badge tone="primary" mono>{r.level}</Badge></Td>
                  <Td className="text-zinc-600">{r.type === "grammar" ? "Ngữ pháp" : r.type === "vocabulary" ? "Từ vựng" : r.type}</Td>
                  {isAdmin && (
                    <Td>
                      <div className="text-zinc-900">{r.ownerName}</div>
                      <div className="font-mono text-xs text-zinc-500">@{r.ownerUsername}</div>
                    </Td>
                  )}
                  <Td>
                    <form action={setVisibility} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <input type="hidden" name="visibility" value={r.visibility === "public" ? "private" : "public"} />
                      <SubmitButton
                        variant="ghost" size="sm" pendingText="..."
                        title={r.visibility === "public" ? "Đang công khai — bấm để chuyển về riêng tư" : "Riêng tư — bấm để chia sẻ cho mọi người trong hệ thống"}
                        icon={r.visibility === "public" ? <Globe size={14} className="text-success" /> : <Lock size={14} className="text-zinc-400" />}
                        className={r.visibility === "public" ? "!text-success" : "!text-zinc-500"}
                      >
                        {r.visibility === "public" ? "Công khai" : "Riêng tư"}
                      </SubmitButton>
                    </form>
                  </Td>
                  <Td className="whitespace-nowrap text-zinc-500">{r.updatedAt.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</Td>
                  <Td>
                    <div className="flex justify-end gap-1 opacity-70 transition-opacity group-hover:opacity-100">
                      <Link href={`/worksheets/${r.id}`} className={buttonClass("ghost", "sm")}>Mở</Link>
                      <form action={duplicateWorksheet}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton variant="ghost" size="sm" pendingText="" title="Nhân bản" icon={<Copy size={14} />}>{null}</SubmitButton>
                      </form>
                      <form action={deleteWorksheet}>
                        <input type="hidden" name="id" value={r.id} />
                        <SubmitButton
                          variant="ghost" size="sm" pendingText="" title="Xoá" icon={<Trash2 size={14} className="text-danger" />}
                          confirm={`Xoá worksheet "${r.title}"?`}
                        >
                          {null}
                        </SubmitButton>
                      </form>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} total={total} pageSize={PAGE_SIZE} searchParams={searchParams} />
      </Card>
    </Page>
  );
}
