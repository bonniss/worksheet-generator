"use client";
import Papa from "papaparse";
import { useRef, useState, useTransition, type DragEvent } from "react";
import { Download, FileSpreadsheet, RotateCcw, UploadCloud } from "lucide-react";
import { Alert, Badge, Button, Card, CardTitle, RoleBadge, Td, Th, cx } from "@/components/ui";
import { IMPORT_COLUMNS, IMPORT_REQUIRED } from "@/lib/import-template";
import { USERNAME_HINT, USERNAME_RE } from "@/lib/username";
import { importUsers, type ImportResult } from "../actions";

type Row = { line: number; username: string; name: string; email: string; role: string; password: string };
type Preview = { row: Row; problem?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLUMN_HELP: Record<(typeof IMPORT_COLUMNS)[number], string> = {
  username: USERNAME_HINT,
  name: "Họ tên hiển thị",
  email: "Để trống nếu không có",
  role: "admin hoặc user — trống = user",
  password: "Tối thiểu 8 ký tự — trống = tự sinh",
};

function download(filename: string, content: string) {
  // BOM để Excel đọc đúng tiếng Việt
  const url = URL.createObjectURL(new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Kiểm tra sơ bộ để xem trước; server vẫn validate lại toàn bộ.
function checkRow(r: Row): string | undefined {
  if (!USERNAME_RE.test(r.username)) return `Username không hợp lệ (${USERNAME_HINT})`;
  if (!r.name) return "Thiếu tên";
  if (r.email && !EMAIL_RE.test(r.email)) return "Email không hợp lệ";
  if (r.role && r.role !== "admin" && r.role !== "user") return "Role phải là admin hoặc user";
  if (r.password && r.password.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  return undefined;
}

export function ImportUsers({ maxRows }: { maxRows: number }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [dragging, setDragging] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setFileName("");
    setPreview(null);
    setParseError("");
    setResult(null);
  }

  function readFile(file: File) {
    reset();
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, meta, errors }) => {
        const fields = meta.fields ?? [];
        const missing = IMPORT_REQUIRED.filter((c) => !fields.includes(c));
        if (missing.length) {
          setParseError(`Thiếu cột bắt buộc: ${missing.join(", ")}. Dòng đầu tiên phải là tiêu đề: ${IMPORT_COLUMNS.join(",")}`);
          return;
        }
        if (errors.length) {
          setParseError(`Lỗi đọc CSV ở dòng ${(errors[0].row ?? 0) + 2}: ${errors[0].message}`);
          return;
        }
        if (data.length === 0) return setParseError("File không có dòng dữ liệu nào.");
        if (data.length > maxRows) return setParseError(`File có ${data.length} dòng, tối đa ${maxRows} dòng mỗi lần.`);
        const rows = data.map<Preview>((d, i) => {
          const row: Row = {
            line: i + 2, // +1 tiêu đề, +1 vì đếm từ 1
            username: (d.username ?? "").trim().toLowerCase(),
            name: (d.name ?? "").trim(),
            email: (d.email ?? "").trim().toLowerCase(),
            role: (d.role ?? "").trim().toLowerCase(),
            password: (d.password ?? "").trim(),
          };
          return { row, problem: checkRow(row) };
        });
        // Giống server: giữ lần xuất hiện đầu tiên, các dòng trùng sau đó bị bỏ qua
        const seenUsernames = new Set<string>();
        const seenEmails = new Set<string>();
        for (const p of rows) {
          if (p.problem) continue;
          const { username, email } = p.row;
          if (seenUsernames.has(username)) p.problem = "Trùng username trong file";
          else if (email && seenEmails.has(email)) p.problem = "Trùng email trong file";
          else {
            seenUsernames.add(username);
            if (email) seenEmails.add(email);
          }
        }
        setPreview(rows);
      },
      error: (err) => setParseError(err.message),
    });
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  }

  function submit() {
    if (!preview) return;
    startTransition(async () => {
      try {
        setResult(await importUsers(preview.map((p) => p.row)));
        setPreview(null);
      } catch {
        setResult({ error: "Import thất bại (máy chủ lỗi hoặc quá thời gian). Thử lại với file nhỏ hơn.", created: [], skipped: [], errors: [] });
      }
    });
  }

  function downloadCredentials() {
    if (!result) return;
    const csv = Papa.unparse(result.created.map((c) => ({
      username: c.username, name: c.name, email: c.email ?? "", role: c.role,
      password: c.password ?? "(mật khẩu trong file)",
    })));
    download("tai-khoan-da-tao.csv", csv);
  }

  const problems = preview?.filter((p) => p.problem).length ?? 0;
  const generatedCount = result?.created.filter((c) => c.password).length ?? 0;
  const issues = result
    ? [
        ...result.skipped.map((s) => ({ line: s.line, username: s.username, message: s.reason, kind: "skip" as const })),
        ...result.errors.map((e) => ({ line: e.line, username: e.username, message: e.message, kind: "error" as const })),
      ].sort((a, b) => a.line - b.line)
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        {/* Bước 1: chọn file */}
        {!preview && !result && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors",
              dragging ? "border-primary bg-primary-soft" : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
            )}
          >
            <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
              <UploadCloud size={22} />
            </span>
            <div className="font-display text-base font-semibold text-zinc-900">Kéo thả file CSV vào đây</div>
            <div className="mt-1 text-sm text-zinc-500">hoặc <span className="font-medium text-primary">chọn file từ máy</span> · UTF-8, tối đa {maxRows} dòng</div>
            {fileName && <div className="mt-3 text-xs text-zinc-400">{fileName}</div>}
            <input
              ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" disabled={pending}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) readFile(f); }}
            />
          </div>
        )}

        {parseError && <Alert>{parseError}</Alert>}

        {/* Bước 2: xem trước */}
        {preview && (
          <Card flush className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <FileSpreadsheet size={20} className="shrink-0 text-zinc-400" />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-zinc-900">{fileName}</div>
                  <div className="text-xs text-zinc-500">
                    {preview.length} dòng
                    {problems > 0 ? <> · <span className="text-danger">{problems} dòng lỗi sẽ bị bỏ qua</span></> : " · tất cả hợp lệ"}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" onClick={reset} disabled={pending}>Chọn file khác</Button>
                <Button type="button" onClick={submit} disabled={pending || problems === preview.length}>
                  {pending ? "Đang import..." : `Import ${preview.length - problems} tài khoản`}
                </Button>
              </div>
            </div>
            <div className="max-h-[480px] overflow-auto border-0 border-t border-solid border-zinc-100">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr><Th className="w-14">Dòng</Th><Th>Username</Th><Th>Họ tên</Th><Th>Email</Th><Th>Role</Th><Th>Mật khẩu</Th><Th>Kiểm tra</Th></tr>
                </thead>
                <tbody>
                  {preview.map(({ row, problem }) => (
                    <tr key={row.line} className={problem ? "bg-danger-soft/60" : "hover:bg-zinc-50"}>
                      <Td className="h-11 font-mono text-xs text-zinc-400">{row.line}</Td>
                      <Td className="h-11 font-mono">{row.username}</Td>
                      <Td className="h-11">{row.name}</Td>
                      <Td className="h-11 text-zinc-600">{row.email || <span className="text-zinc-300">—</span>}</Td>
                      <Td className="h-11">{row.role === "admin" || row.role === "user" || !row.role ? <RoleBadge role={(row.role || "user") as "admin" | "user"} /> : <Badge mono>{row.role}</Badge>}</Td>
                      <Td className="h-11 text-zinc-500">{row.password ? "••••••••" : <span className="text-xs">tự sinh</span>}</Td>
                      <Td className="h-11">{problem ? <span className="text-[13px] text-danger">{problem}</span> : <Badge tone="success">OK</Badge>}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Bước 3: kết quả */}
        {result && (
          <Card className="space-y-5">
            {result.error ? <Alert>{result.error}</Alert> : (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Đã tạo", value: result.created.length, color: "text-success" },
                  { label: "Bỏ qua", value: result.skipped.length, color: "text-warning" },
                  { label: "Lỗi", value: result.errors.length, color: "text-danger" },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-page px-4 py-3">
                    <div className="text-caption text-zinc-500">{s.label}</div>
                    <div className={cx("font-display text-2xl font-bold tabular-nums", s.value ? s.color : "text-zinc-300")}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}
            {result.created.length > 0 && (
              <Alert kind={generatedCount ? "warning" : "success"}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span>
                    {generatedCount > 0
                      ? <><b>{generatedCount} mật khẩu được tự sinh</b> — tải danh sách ngay, sau khi rời trang sẽ không xem lại được.</>
                      : "Đã tạo tài khoản với mật khẩu trong file."}
                  </span>
                  <Button type="button" size="sm" onClick={downloadCredentials}>
                    <Download size={14} /> Tải danh sách tài khoản
                  </Button>
                </div>
              </Alert>
            )}
            {issues.length > 0 && (
              <div className="overflow-hidden rounded-lg border border-solid border-zinc-100">
                <table className="w-full text-sm">
                  <thead><tr><Th className="w-14">Dòng</Th><Th>Username</Th><Th>Kết quả</Th></tr></thead>
                  <tbody>
                    {issues.map((x) => (
                      <tr key={`${x.kind}-${x.line}`}>
                        <Td className="h-11 font-mono text-xs text-zinc-400">{x.line}</Td>
                        <Td className="h-11 font-mono">{x.username || "—"}</Td>
                        <Td className="h-11">
                          <span className="flex items-center gap-2">
                            <Badge tone={x.kind === "error" ? "danger" : "warning"}>{x.kind === "error" ? "Lỗi" : "Bỏ qua"}</Badge>
                            <span className="text-zinc-600">{x.message}</span>
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Button type="button" variant="ghost" onClick={reset}><RotateCcw size={15} /> Import file khác</Button>
          </Card>
        )}
      </div>

      {/* Hướng dẫn định dạng */}
      <aside className="space-y-4">
        <Card>
          <CardTitle title="Định dạng file" sub="Dòng đầu tiên là tiêu đề cột. Thứ tự cột không quan trọng." />
          <dl className="m-0 space-y-3">
            {IMPORT_COLUMNS.map((c) => (
              <div key={c}>
                <dt className="flex items-center gap-2">
                  <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-[13px] text-accent">{c}</code>
                  {(IMPORT_REQUIRED as readonly string[]).includes(c)
                    ? <span className="text-overline uppercase text-danger">bắt buộc</span>
                    : <span className="text-overline uppercase text-zinc-400">tuỳ chọn</span>}
                </dt>
                <dd className="m-0 mt-1 text-[13px] text-zinc-500">{COLUMN_HELP[c]}</dd>
              </div>
            ))}
          </dl>
          <a
            href="/admin/users/import/template"
            download
            className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-zinc-100 py-2.5 text-[13px] font-semibold text-zinc-700 transition-colors hover:bg-zinc-200"
          >
            <Download size={15} /> Tải file mẫu (.csv)
          </a>
        </Card>
      </aside>
    </div>
  );
}
