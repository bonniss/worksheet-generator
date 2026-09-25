import { FileDown } from "lucide-react";
import { Page, PageHeader, buttonClass } from "@/components/ui";
import { MAX_IMPORT_ROWS } from "@/lib/validators";
import { ImportUsers } from "./ImportUsers";

export const metadata = { title: "Import tài khoản" };
// Hash mật khẩu cho nhiều dòng có thể mất vài chục giây
export const maxDuration = 60;

export default function ImportUsersPage() {
  return (
    <Page>
      <PageHeader
        back={{ href: "/admin/users", label: "Tài khoản" }}
        title="Import tài khoản"
        sub={`Tạo hàng loạt tài khoản từ file CSV — tối đa ${MAX_IMPORT_ROWS} dòng mỗi lần. Username hoặc email đã tồn tại sẽ được bỏ qua.`}
        actions={
          <a href="/admin/users/import/template" download className={buttonClass("secondary")}>
            <FileDown size={16} /> Tải file mẫu
          </a>
        }
      />
      <ImportUsers maxRows={MAX_IMPORT_ROWS} />
    </Page>
  );
}
