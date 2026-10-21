import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/dal";
import { createUserAction } from "../actions";
import { UserForm } from "../user-form";

export default async function NewUserPage() {
  await requireAdmin();
  return (
    <>
      <PageHeader title="Novo usuário" />
      <UserForm action={createUserAction} />
    </>
  );
}
