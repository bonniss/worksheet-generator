import Link from "next/link";
import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { users, worksheets } from "@/db/schema";
import { Badge, Card, Input, PageTitle, Select, buttonClass } from "@/components/ui";
import { Pagination } from "@/components/ui/Pagination";
import { requireAdmin } from "@/lib/auth/session";
import { likePattern } from "@/lib/sql";

export const metadata = { title: "Tài khoản · Worksheet Generator" };

const PAGE_SIZE = 25;
type Search = { q?: string; role?: string; status?: string; page?: string };

export default async function UsersPage({ searchParams }: { searchParams: Search }) {
  const me = await requireAdmin();
  const q = (searchParams.q ?? "").trim();
  const page = Math.max(1, Number(searchParams.page) || 1);

  const filters: (SQL | undefined)[] = [];
  if (q) filters.push(or(ilike(users.email, likePattern(q)), ilike(users.name, likePattern(q))));
  if (searchParams.role === "admin" || searchParams.role === "user") filters.push(eq(users.role, searchParams.role));
  if (searchParams.status === "active") filters.push(eq(users.isActive, true));
  if (searchParams.status === "locked") filters.push(eq(users.isActive, false));
  const where = and(...filters);

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: users.id, email: users.email, name: users.name, role: users.role, isActive: users.isActive,
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

  return (
    <main className="app-ui mx-auto max-w-6xl px-4 py-6">
      <PageTitle
        title="Quản lý tài khoản"
        sub={`${total} tài khoản`}
        actions={
          <>
            <Link href="/admin/users/import" className={buttonClass("secondary")}>⬆ Import CSV</Link>
            <Link href="/admin/users/new" className={buttonClass()}>+ Thêm tài khoản</Link>
          </>
        }
      />

      <Card className="mb-4">
        <form className="flex flex-wrap items-center gap-3">
          <div className="min-w-[200px] flex-1">
            <Input name="q" placeholder="Tìm theo email hoặc tên..." defaultValue={q} />
          </div>
          <Select name="role" defaultValue={searchParams.role ?? ""} className="w-auto">
            <option value="">Mọi vai trò</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </Select>
          <Select name="status" defaultValue={searchParams.status ?? ""} className="w-auto">
            <option value="">Mọi trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="locked">Đã khoá</option>
          </Select>
          <button className={buttonClass("secondary")}>Lọc</button>
        </form>
      </Card>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Tài khoản</th>
              <th className="px-4 py-3">Vai trò</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Worksheet</th>
              <th className="px-4 py-3">Ngày tạo</th>
              <th className="px-4 py-3 text-right" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Không có tài khoản phù hợp.</td></tr>
            )}
            {rows.map((u) => (
              <tr key={u.id} className="border-0 border-t border-solid border-slate-100 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-semibold">{u.name}{u.id === me.id && <span className="ml-1 text-xs font-normal text-slate-500">(bạn)</span>}</div>
                  <div className="text-xs text-slate-500">{u.email}</div>
                </td>
                <td className="px-4 py-3">{u.role === "admin" ? <Badge tone="amber">admin</Badge> : <Badge>user</Badge>}</td>
                <td className="px-4 py-3">{u.isActive ? <Badge tone="emerald">Hoạt động</Badge> : <Badge tone="red">Đã khoá</Badge>}</td>
                <td className="px-4 py-3">
                  {u.worksheetCount > 0
                    ? <Link href={`/worksheets?owner=${u.id}`} className="text-sky-700 hover:underline">{u.worksheetCount}</Link>
                    : <span className="text-slate-400">0</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">{u.createdAt.toLocaleDateString("vi-VN")}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/users/${u.id}`} className={buttonClass("secondary", "sm")}>Sửa</Link>
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
