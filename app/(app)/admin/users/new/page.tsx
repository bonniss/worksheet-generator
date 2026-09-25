import { Card, Page, PageHeader } from "@/components/ui";
import { CreateUserForm } from "./CreateUserForm";

export const metadata = { title: "Thêm tài khoản" };

export default function NewUserPage() {
  return (
    <Page width="form">
      <PageHeader
        title="Thêm tài khoản"
        sub="Người dùng đăng nhập bằng username (hoặc email nếu có)."
        back={{ href: "/admin/users", label: "Tài khoản" }}
      />
      <Card>
        <CreateUserForm />
      </Card>
    </Page>
  );
}
