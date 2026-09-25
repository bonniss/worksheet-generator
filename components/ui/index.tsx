import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Loader2, Search, XCircle } from "lucide-react";
import type {
  ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TdHTMLAttributes, ThHTMLAttributes,
} from "react";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Layout ---------- */

export function Page({ children, width = "wide" }: { children: ReactNode; width?: "wide" | "form" }) {
  return (
    <main className={cx("app-ui mx-auto px-4 pb-16 pt-8 sm:px-8 lg:pt-12", width === "form" ? "max-w-[640px]" : "max-w-[1120px]")}>
      {children}
    </main>
  );
}

export function PageHeader({
  title, sub, actions, back,
}: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-8">
      {back && (
        <Link href={back.href} className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-zinc-500 transition-colors hover:text-primary">
          <ArrowLeft size={14} strokeWidth={2.25} /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-[0.01em] text-zinc-900 sm:text-headline">{title}</h1>
          {sub && <p className="mt-1.5 text-sm text-zinc-500">{sub}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Card({ children, className, flush }: { children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={cx("rounded-lg border border-solid border-zinc-100 bg-white shadow-subtle", !flush && "p-6", className)}>
      {children}
    </section>
  );
}

export function CardTitle({ title, sub, tone, icon }: { title: string; sub?: ReactNode; tone?: "danger"; icon?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <h2 className={cx("font-display text-base font-semibold", tone === "danger" ? "text-danger" : "text-zinc-900")}>{title}</h2>
        {sub && <p className="mt-1 text-sm text-zinc-500">{sub}</p>}
      </div>
    </div>
  );
}

/** Ô icon vuông 36px dùng cạnh tiêu đề card. */
export function IconTile({ children, tone = "primary" }: { children: ReactNode; tone?: "primary" | "accent" }) {
  return (
    <span className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", tone === "primary" ? "bg-primary-soft text-primary" : "bg-accent-soft text-accent")}>
      {children}
    </span>
  );
}

/* ---------- Loading ---------- */

const SPINNER_PX = { sm: 13, md: 15, lg: 17, xl: 24 } as const;
export type SpinnerSize = keyof typeof SPINNER_PX;

/** Spinner cỡ theo ngữ cảnh: sm/md/lg khớp nút cùng cỡ, xl cho khối nội dung đang tải. */
export function Spinner({ size = "md", label, className }: { size?: SpinnerSize; label?: string; className?: string }) {
  const icon = <Loader2 size={SPINNER_PX[size]} className={cx("shrink-0 animate-spin", className)} aria-hidden="true" />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center gap-2">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

/** Khối giữ chỗ khi đang tải. */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cx("block rounded-md bg-zinc-200/70 animate-pulse motion-reduce:animate-none", className)} />;
}

/* ---------- Buttons ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";
const variants: Record<Variant, string> = {
  primary: "border-transparent bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-white text-primary border-primary hover:bg-primary-soft",
  ghost: "border-transparent bg-transparent text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger: "border-transparent bg-danger text-white hover:bg-danger-hover",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3.5 text-[13px] gap-1.5",
  md: "h-[38px] px-5 text-sm gap-2",
  lg: "h-[46px] px-7 text-[15px] gap-2",
};

export const buttonClass = (variant: Variant = "primary", size: Size = "md") =>
  cx(
    "inline-flex shrink-0 cursor-pointer select-none items-center justify-center whitespace-nowrap rounded-lg border border-solid font-semibold leading-none transition-colors duration-150",
    "disabled:pointer-events-none disabled:opacity-40",
    sizes[size],
    variants[variant],
  );

export function Button({
  variant = "primary", size = "md", className, loading, icon, disabled, children, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode }) {
  // Đang chạy: spinner thay chỗ icon, nút khoá nhưng không mờ đi (vẫn đọc được chữ)
  return (
    <button {...props} disabled={disabled || loading} aria-busy={loading || undefined} className={cx(buttonClass(variant, size), loading && "!opacity-100", className)}>
      {loading ? <Spinner size={size} /> : icon}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */

const fieldBase =
  "h-10 rounded-lg border border-solid bg-white px-3.5 text-sm text-zinc-900 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-zinc-400 " +
  "disabled:cursor-not-allowed disabled:border-zinc-100 disabled:bg-page disabled:text-zinc-500";
const fieldState = (invalid?: boolean) =>
  invalid
    ? "border-danger shadow-focus-danger"
    : "border-zinc-200 hover:border-zinc-300 focus:border-primary focus:shadow-focus";
// Mặc định full width, trừ khi className tự đặt width (w-auto, w-40...)
const width = (className?: string) => (/(^|\s)w-/.test(className ?? "") ? undefined : "w-full");

export function Input({ invalid, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} {...props} className={cx(fieldBase, fieldState(invalid), width(className), className)} />;
}

export function Select({ invalid, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return <select aria-invalid={invalid || undefined} {...props} className={cx(fieldBase, "cursor-pointer pr-9", fieldState(invalid), width(className), className)} />;
}

export function SearchInput(props: Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return (
    <div className="relative min-w-[220px] flex-1">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
      <input
        type="search"
        {...props}
        className={cx(fieldBase, "w-full border-transparent bg-zinc-100 pl-9 hover:bg-zinc-200/60 focus:border-primary focus:bg-white focus:shadow-focus")}
      />
    </div>
  );
}

export function Field({
  label, error, hint, optional, children,
}: { label: string; error?: string; hint?: ReactNode; optional?: boolean; children: ReactNode }) {
  return (
    <label className="group block">
      <span className={cx("mb-1.5 flex items-baseline gap-1.5 text-sm font-medium", error ? "text-danger" : "text-zinc-600 group-focus-within:text-primary")}>
        {label}
        {optional && <span className="text-xs font-normal text-zinc-400">(không bắt buộc)</span>}
      </span>
      {children}
      {error ? <span className="mt-1.5 block text-xs text-danger">{error}</span>
        : hint ? <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span> : null}
    </label>
  );
}

export function Checkbox({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className={cx("flex items-start gap-2", props.disabled ? "cursor-not-allowed text-zinc-400" : "cursor-pointer")}>
      <input type="checkbox" {...props} className="mt-[3px]" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

/* ---------- Feedback ---------- */

const alertStyles = {
  error: { box: "bg-danger-soft text-red-800", icon: XCircle, iconColor: "text-danger" },
  success: { box: "bg-success-soft text-green-800", icon: CheckCircle2, iconColor: "text-success" },
  info: { box: "bg-primary-soft text-blue-900", icon: Info, iconColor: "text-primary" },
  warning: { box: "bg-warning-soft text-amber-900", icon: AlertTriangle, iconColor: "text-warning" },
};

export function Alert({ kind = "error", children }: { kind?: keyof typeof alertStyles; children: ReactNode }) {
  const s = alertStyles[kind];
  const Icon = s.icon;
  return (
    <div role={kind === "error" ? "alert" : "status"} className={cx("flex gap-3 rounded-xl px-4 py-3 text-sm leading-relaxed", s.box)}>
      <Icon size={18} className={cx("mt-[1px] shrink-0", s.iconColor)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

type Tone = "neutral" | "primary" | "accent" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-zinc-100 text-zinc-600",
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};

/** Chip trạng thái: 4px radius, không viền. `mono` cho giá trị kiểu mã (role, level). */
export function Badge({ children, tone = "neutral", mono, dot }: { children: ReactNode; tone?: Tone; mono?: boolean; dot?: boolean }) {
  return (
    <span className={cx("inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded px-2 text-xs font-medium", mono && "font-mono", tones[tone])}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function RoleBadge({ role }: { role: "admin" | "user" }) {
  return <Badge tone={role === "admin" ? "accent" : "neutral"} mono>{role}</Badge>;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-display font-bold text-primary"
    >
      {initials}
    </span>
  );
}

/* ---------- Table ---------- */

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cx("h-10 whitespace-nowrap border-0 border-b border-solid border-zinc-100 px-4 text-left text-overline uppercase text-zinc-500 first:pl-6 last:pr-6", className)} />;
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cx("h-14 border-0 border-b border-solid border-zinc-100 px-4 align-middle first:pl-6 last:pr-6", className)} />;
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14 text-center text-sm text-zinc-500">{children}</td>
    </tr>
  );
}
