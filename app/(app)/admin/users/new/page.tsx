import Link from "next/link";
import { Card, PageTitle, buttonClass } from "@/components/ui";
import { CreateUserForm } from "./CreateUserForm";

export const metadata = { title: "Thêm tài khoản · Worksheet Generator" };

export default function NewUserPage() {
  return (
    <main className="app-ui mx-auto max-w-xl px-4 py-6">
      <PageTitle title="Thêm tài khoản" actions={<Link href="/admin/users" className={buttonClass("ghost")}>← Danh sách</Link>} />
      <Card>
        <CreateUserForm />
      </Card>
    </main>
  );
}
