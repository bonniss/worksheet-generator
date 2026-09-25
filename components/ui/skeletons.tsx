import { LoadingSignal } from "@/components/nav/LoadingSignal";
import { Card, Page, Skeleton, cx } from ".";

// Khung giữ chỗ khi trang đang tải — kích thước khớp component thật (PageHeader, FilterBar, Th h-10, Td h-14, Input h-10)
// để khi dữ liệu về, bố cục không nhảy.

export function PageHeaderSkeleton({ actions = 0, back, sub = true, titleWidth = "w-56" }: {
  actions?: number; back?: boolean; sub?: boolean; titleWidth?: string;
}) {
  return (
    <div className="mb-8">
      {back && <Skeleton className="mb-3 h-4 w-24" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Skeleton className={cx("h-9", titleWidth)} />
          {sub && <Skeleton className="mt-2.5 h-4 w-32" />}
        </div>
        {actions > 0 && (
          <div className="flex gap-2">
            {Array.from({ length: actions }, (_, i) => <Skeleton key={i} className={cx("h-[38px] rounded-lg", i === actions - 1 ? "w-40" : "w-28")} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export function FilterBarSkeleton({ selects = 2 }: { selects?: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <Skeleton className="h-10 min-w-[220px] flex-1 rounded-lg" />
      {Array.from({ length: selects }, (_, i) => <Skeleton key={i} className="h-10 w-40 rounded-lg" />)}
      <Skeleton className="h-10 w-14 rounded-lg" />
    </div>
  );
}

// Độ rộng thay đổi theo cột/dòng để trông tự nhiên hơn một lưới đều
const CELL_WIDTHS = ["w-3/4", "w-1/2", "w-2/3", "w-2/5", "w-3/5"];

export function TableSkeleton({ columns, rows = 6, avatar }: { columns: number; rows?: number; avatar?: boolean }) {
  return (
    <Card flush className="overflow-hidden">
      <div className="flex h-10 items-center gap-6 border-0 border-b border-solid border-zinc-100 px-6">
        {Array.from({ length: columns }, (_, c) => <Skeleton key={c} className={cx("h-3", c === 0 ? "w-24" : "w-16", c === 0 && "flex-[2]", c > 0 && "flex-1")} />)}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-14 items-center gap-6 border-0 border-b border-solid border-zinc-100 px-6 last:border-b-0">
          <div className="flex flex-[2] items-center gap-3">
            {avatar && <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
            <div className="flex-1 space-y-1.5">
              <Skeleton className={cx("h-3.5", CELL_WIDTHS[r % CELL_WIDTHS.length])} />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
          {Array.from({ length: columns - 1 }, (_, c) => (
            <div key={c} className="flex-1">
              <Skeleton className={cx("h-3.5", CELL_WIDTHS[(r + c + 1) % CELL_WIDTHS.length])} />
            </div>
          ))}
        </div>
      ))}
    </Card>
  );
}

/** Một ô form: nhãn + input. */
export function FieldSkeleton() {
  return (
    <div>
      <Skeleton className="mb-2 h-3.5 w-20" />
      <Skeleton className="h-10 rounded-lg" />
    </div>
  );
}

export function FormCardSkeleton({ fields = 3, twoCol, title = true, icon }: { fields?: number; twoCol?: boolean; title?: boolean; icon?: boolean }) {
  return (
    <Card>
      {title && (
        <div className="mb-5 flex items-start gap-3">
          {icon && <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />}
          <div className="flex-1">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="mt-2 h-3.5 w-56 max-w-full" />
          </div>
        </div>
      )}
      <div className={cx("grid gap-5", twoCol && "sm:grid-cols-2")}>
        {Array.from({ length: fields }, (_, i) => <FieldSkeleton key={i} />)}
      </div>
      <div className="mt-5 flex justify-end border-0 border-t border-solid border-zinc-100 pt-5">
        <Skeleton className="h-[38px] w-32 rounded-lg" />
      </div>
    </Card>
  );
}

/** Trang danh sách: header + bộ lọc + bảng. */
export function ListPageSkeleton({ actions, selects, columns, avatar }: { actions: number; selects: number; columns: number; avatar?: boolean }) {
  return (
    <Page>
      <LoadingSignal />
      <PageHeaderSkeleton actions={actions} />
      <FilterBarSkeleton selects={selects} />
      <TableSkeleton columns={columns} avatar={avatar} />
    </Page>
  );
}
