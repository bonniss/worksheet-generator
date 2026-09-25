import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { FileDown, Plus, Upload } from "lucide-react";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import {
  Avatar, Badge, Card, EmptyRow, FilterBar, Page, PageHeader, RoleBadge, SearchInput, Select, Td, Th, buttonClass,
} from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern } from "@/lib/sql";

export const metadata = { title: "Tài khoản" };

const PAGE_SIZE = 25;
type Search = { q?: string; role?: string; status?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireAdmin();
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const filters: (SQL | undefined)[] = [];
  if (q) filters.push(or(ilike(users.username, likePattern(q)), ilike(users.email, likePattern(q)), ilike(users.name, likePattern(q))));
  if (searchParams.role === "admin" || searchParams.role === "user") filters.push(eq(users.role, searchParams.role));
  if (searchParams.status === "active") filters.push(eq(users.isActive, true));
  if (searchParams.status === "locked") filters.push(eq(users.isActive, false));
  const where = and(...filters);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id, username: users.username, email: users.email, name: users.name, role: users.role, isActive: users.isActive,
        createdAt: users.createdAt, worksheetCount: count(worksheets.id),
      })
      .from(users)
      .leftJoin(worksheets, eq(worksheets.ownerId, users.id))
      .where(where)
      .groupBy(users.id)
      .orderBy(desc(users.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(users).where(where),
  ]);
  const filtered = !!(q || searchParams.role || searchParams.status);

  return (
    <Page>
      <PageHeader
        title="Tài khoản"
        sub={`${total} tài khoản${filtered ? " khớp bộ lọc" : ""}`}
        actions={
          <>
            <a href="/admin/users/import/template" className={buttonClass("ghost")} download>
              <FileDown size={16} /> File mẫu
            </a>
            <Link href="/admin/users/import" className={buttonClass("secondary")}>
              <Upload size={16} /> Import CSV
            </Link>
            <Link href="/admin/users/new" className={buttonClass("primary")}>
              <Plus size={16} strokeWidth={2.5} /> Thêm tài khoản
            </Link>
          </>
        }
      />

      <FilterBar>
        <SearchInput name="q" placeholder="Tìm theo username, email hoặc tên" defaultValue={q} />
        <Select name="role" defaultValue={searchParams.role ?? ""} className="w-40">
          <option value="">Mọi vai trò</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </Select>
        <Select name="status" defaultValue={searchParams.status ?? ""} className="w-44">
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="locked">Đã khoá</option>
        </Select>
        <button className={buttonClass("ghost")}>Lọc</button>
        {filtered && <Link href="/admin/users" className="text-[13px] text-zinc-500 hover:text-primary">Xoá lọc</Link>}
      </FilterBar>

      <Card flush className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <Th>Tài khoản</Th>
                <Th>Vai trò</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Worksheet</Th>
                <Th>Ngày tạo</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={6}>Không có tài khoản phù hợp.</EmptyRow>}
              {rows.map((u) => (
                <tr key={u.id} className="group transition-colors hover:bg-zinc-50">
                  <Td>
                    <Link href={`/admin/users/${u.id}`} className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <span className="min-w-0">
                        <span className="block font-medium text-zinc-900 group-hover:text-primary">
                          {u.name}
                          {u.id === me.id && <span className="ml-1.5 text-xs font-normal text-zinc-400">(bạn)</span>}
                        </span>
                        <span className="block truncate text-xs text-zinc-500">
                          <span className="font-mono">@{u.username}</span>
                          {u.email && <> · {u.email}</>}
                        </span>
                      </span>
                    </Link>
                  </Td>
                  <Td><RoleBadge role={u.role} /></Td>
                  <Td>{u.isActive ? <Badge tone="success" dot>Hoạt động</Badge> : <Badge tone="danger" dot>Đã khoá</Badge>}</Td>
                  <Td className="text-right tabular-nums">
                    {u.worksheetCount > 0
                      ? <Link href={`/worksheets?owner=${u.id}`} className="font-medium text-primary hover:underline">{u.worksheetCount}</Link>
                      : <span className="text-zinc-400">0</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-zinc-500">{u.createdAt.toLocaleDateString("vi-VN")}</Td>
                  <Td className="text-right">
                    <Link href={`/admin/users/${u.id}`} className={buttonClass("ghost", "sm")}>Chi tiết</Link>
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
