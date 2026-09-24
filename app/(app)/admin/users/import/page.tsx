import Link from "next/link";
import { PageTitle, buttonClass } from "@/components/ui";
import { MAX_IMPORT_ROWS } from "@/lib/validators";
import { ImportUsers } from "./ImportUsers";

export const metadata = { title: "Import tài khoản · Worksheet Generator" };
// Hash mật khẩu cho nhiều dòng có thể mất vài chục giây
export const maxDuration = 60;

export default function ImportUsersPage() {
  return (
    <main className="app-ui mx-auto max-w-4xl px-4 py-6">
      <PageTitle
        title="Import tài khoản từ CSV"
        sub={`Tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần. Email đã tồn tại sẽ được bỏ qua.`}
        actions={<Link href="/admin/users" className={buttonClass("ghost")}>← Danh sách</Link>}
      />
      <ImportUsers maxRows={MAX_IMPORT_ROWS} />
    </main>
  );
}
