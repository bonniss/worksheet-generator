"use client";
import Papa from "papaparse";
import { useState, useTransition, type ChangeEvent } from "react";
import { Alert, Badge, Button, Card } from "@/components/ui";
import { importUsers, type ImportResult } from "../actions";

type Row = { line: number; email: string; name: string; role: string; password: string };
type Preview = { row: Row; problem?: string };

const COLUMNS = ["email", "name", "role", "password"] as const;
const TEMPLATE = "email,name,role,password\nnguyenvana@example.com,Nguyễn Văn A,user,\ntranthib@example.com,Trần Thị B,admin,MatKhau@123\n";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  if (!EMAIL_RE.test(r.email)) return "Email không hợp lệ";
  if (!r.name) return "Thiếu tên";
  if (r.role && r.role !== "admin" && r.role !== "user") return "Role phải là admin hoặc user";
  if (r.password && r.password.length < 8) return "Mật khẩu tối thiểu 8 ký tự";
  return undefined;
}

export function ImportUsers({ maxRows }: { maxRows: number }) {
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [parseError, setParseError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError("");
    setPreview(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: ({ data, meta, errors }) => {
        const fields = meta.fields ?? [];
        const missing = ["email", "name"].filter((c) => !fields.includes(c));
        if (missing.length) {
          setParseError(`Thiếu cột bắt buộc: ${missing.join(", ")}. Dòng đầu tiên phải là tiêu đề: ${COLUMNS.join(",")}`);
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
            email: (d.email ?? "").trim().toLowerCase(),
            name: (d.name ?? "").trim(),
            role: (d.role ?? "").trim().toLowerCase(),
            password: (d.password ?? "").trim(),
          };
          return { row, problem: checkRow(row) };
        });
        // Giống server: giữ lần xuất hiện đầu tiên, các dòng trùng sau đó bị bỏ qua
        const seen = new Set<string>();
        for (const p of rows) {
          if (p.problem) continue;
          if (seen.has(p.row.email)) p.problem = "Trùng email trong file";
          else seen.add(p.row.email);
        }
        setPreview(rows);
      },
      error: (err) => setParseError(err.message),
    });
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
      email: c.email, name: c.name, role: c.role, password: c.password ?? "(mật khẩu trong file)",
    })));
    download("tai-khoan-da-tao.csv", csv);
  }

  const problems = preview?.filter((p) => p.problem).length ?? 0;
  const generatedCount = result?.created.filter((c) => c.password).length ?? 0;

  return (
    <div className="space-y-4">
      <Card>
        <p className="mb-3 text-sm text-slate-600">
          File CSV (UTF-8) với dòng tiêu đề <code className="rounded bg-slate-100 px-1">email,name,role,password</code>.
          {" "}<b>role</b> để trống = <code>user</code>; <b>password</b> để trống = tự sinh (tải về sau khi import).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">
            Chọn file CSV
            <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} disabled={pending} />
          </label>
          <Button variant="secondary" type="button" onClick={() => download("mau-import-tai-khoan.csv", TEMPLATE)}>
            Tải file mẫu
          </Button>
          {fileName && <span className="text-sm text-slate-500">{fileName}</span>}
        </div>
      </Card>

      {parseError && <Alert>{parseError}</Alert>}

      {preview && (
        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="text-sm">
              <b>{preview.length}</b> dòng
              {problems > 0 && <> · <span className="text-red-600">{problems} dòng lỗi sẽ bị bỏ qua</span></>}
            </div>
            <Button type="button" onClick={submit} disabled={pending || problems === preview.length}>
              {pending ? "Đang import..." : `Import ${preview.length - problems} tài khoản`}
            </Button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2">Dòng</th><th className="px-4 py-2">Email</th><th className="px-4 py-2">Tên</th>
                  <th className="px-4 py-2">Role</th><th className="px-4 py-2">Mật khẩu</th><th className="px-4 py-2">Kiểm tra</th>
                </tr>
              </thead>
              <tbody>
                {preview.map(({ row, problem }) => (
                  <tr key={row.line} className={`border-0 border-t border-solid border-slate-100 ${problem ? "bg-red-50" : ""}`}>
                    <td className="px-4 py-2 text-slate-500">{row.line}</td>
                    <td className="px-4 py-2">{row.email}</td>
                    <td className="px-4 py-2">{row.name}</td>
                    <td className="px-4 py-2">{row.role || "user"}</td>
                    <td className="px-4 py-2 text-slate-500">{row.password ? "••••••" : "tự sinh"}</td>
                    <td className="px-4 py-2">{problem ? <span className="text-red-600">{problem}</span> : <Badge tone="emerald">OK</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {result && (
        <Card className="space-y-3">
          {result.error ? <Alert>{result.error}</Alert> : (
            <Alert kind={result.created.length ? "success" : "info"}>
              Đã tạo <b>{result.created.length}</b> tài khoản · bỏ qua <b>{result.skipped.length}</b> · lỗi <b>{result.errors.length}</b>
            </Alert>
          )}
          {result.created.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={downloadCredentials}>⬇ Tải danh sách tài khoản đã tạo</Button>
              {generatedCount > 0 && (
                <span className="text-sm text-amber-700">
                  {generatedCount} mật khẩu được tự sinh — chỉ tải được ngay bây giờ.
                </span>
              )}
            </div>
          )}
          {[...result.skipped.map((s) => ({ ...s, message: s.reason, kind: "Bỏ qua" })), ...result.errors.map((e) => ({ ...e, kind: "Lỗi" }))]
            .sort((a, b) => a.line - b.line)
            .map((x) => (
              <div key={`${x.kind}-${x.line}`} className="text-sm">
                <Badge tone={x.kind === "Lỗi" ? "red" : "amber"}>{x.kind}</Badge>{" "}
                dòng {x.line} <b>{x.email}</b>: {x.message}
              </div>
            ))}
        </Card>
      )}
    </div>
  );
}
