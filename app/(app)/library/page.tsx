import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { Copy } from "lucide-react";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { Badge, Card, EmptyRow, Page, PageHeader, SearchInput, Select, Td, Th, buttonClass } from "@/components/ui";
import { FilterBar } from "@/components/ui/FilterBar";
import { Pagination } from "@/components/ui/Pagination";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUser } from "@/lib/auth/session";
import { likePattern } from "@/lib/sql";
import { isUuid } from "@/lib/validators";
import { duplicateWorksheet } from "../worksheets/actions";

export const metadata = { title: "Thư viện chung" };

const PAGE_SIZE = 20;
const LEVELS = ["Pre A1", "A1", "A2", "B1", "B2", "C1", "C2"];
type Search = { q?: string; level?: string; type?: string; owner?: string; page?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Search }) {
  const me = await requireUser();
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const filters: (SQL | undefined)[] = [eq(worksheets.visibility, "public")];
  if (searchParams.level && LEVELS.includes(searchParams.level)) filters.push(eq(worksheets.level, searchParams.level));
  if (searchParams.type === "grammar" || searchParams.type === "vocabulary") filters.push(eq(worksheets.type, searchParams.type));
  if (searchParams.owner && isUuid(searchParams.owner)) filters.push(eq(worksheets.ownerId, searchParams.owner));
  if (q) filters.push(or(ilike(worksheets.title, likePattern(q)), ilike(worksheets.topic, likePattern(q))));
  const where = and(...filters);
  const filtered = !!(q || searchParams.level || searchParams.type || searchParams.owner);

  const [rows, [{ total }], owners] = await Promise.all([
    db
      .select({
        id: worksheets.id, title: worksheets.title, level: worksheets.level, type: worksheets.type, topic: worksheets.topic,
        updatedAt: worksheets.updatedAt, ownerId: worksheets.ownerId, ownerName: users.name, ownerUsername: users.username,
      })
      .from(worksheets)
      .innerJoin(users, eq(worksheets.ownerId, users.id))
      .where(where)
      .orderBy(desc(worksheets.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(worksheets).where(where),
    // Chỉ những người có worksheet công khai
    db
      .selectDistinct({ id: users.id, name: users.name, username: users.username })
      .from(users)
      .innerJoin(worksheets, and(eq(worksheets.ownerId, users.id), eq(worksheets.visibility, "public")))
      .orderBy(users.name),
  ]);

  return (
    <Page>
      <PageHeader
        title="Thư viện chung"
        sub={`${total} worksheet được chia sẻ trong hệ thống${filtered ? " khớp bộ lọc" : ""}. Mở để xem, in hoặc nhân bản về để sửa.`}
      />

      <FilterBar filtered={filtered}>
        <SearchInput name="q" placeholder="Tìm theo tiêu đề hoặc chủ điểm" defaultValue={q} />
        <Select name="level" defaultValue={searchParams.level ?? ""} className="w-36">
          <option value="">Mọi trình độ</option>
          {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
        </Select>
        <Select name="type" defaultValue={searchParams.type ?? ""} className="w-36">
          <option value="">Mọi loại</option>
          <option value="grammar">Ngữ pháp</option>
          <option value="vocabulary">Từ vựng</option>
        </Select>
        <Select name="owner" defaultValue={searchParams.owner ?? ""} className="w-52">
          <option value="">Mọi người chia sẻ</option>
          {owners.map((o) => <option key={o.id} value={o.id}>{o.name} (@{o.username})</option>)}
        </Select>
      </FilterBar>

      <Card flush className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr><Th>Tiêu đề</Th><Th>Trình độ</Th><Th>Loại</Th><Th>Người chia sẻ</Th><Th>Cập nhật</Th><Th /></tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <EmptyRow colSpan={6}>
                  {filtered ? "Không có worksheet khớp bộ lọc." : (
                    <>Chưa có worksheet nào được chia sẻ. Mở một worksheet của bạn và bấm <b>🔒 Riêng tư</b> để chuyển sang công khai.</>
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
                  <Td>
                    <div className="text-zinc-900">{r.ownerName}{r.ownerId === me.id && <span className="ml-1.5 text-xs text-zinc-400">(bạn)</span>}</div>
                    <div className="font-mono text-xs text-zinc-500">@{r.ownerUsername}</div>
                  </Td>
                  <Td className="whitespace-nowrap text-zinc-500">{r.updatedAt.toLocaleDateString("vi-VN")}</Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Link href={`/worksheets/${r.id}`} className={buttonClass("ghost", "sm")}>Mở</Link>
                      {r.ownerId !== me.id && (
                        <form action={duplicateWorksheet}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="open" value="1" />
                          <SubmitButton variant="secondary" size="sm" pendingText="Đang nhân bản..." icon={<Copy size={14} />} navigates>
                            Nhân bản về
                          </SubmitButton>
                        </form>
                      )}
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
