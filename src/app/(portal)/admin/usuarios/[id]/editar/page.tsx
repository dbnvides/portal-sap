import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/dal";
import { findUserById } from "@/lib/users";
import { updateUserAction } from "../../actions";
import { UserForm } from "../../user-form";

export default async function EditUserPage({ params }: PageProps<"/admin/usuarios/[id]/editar">) {
  await requireAdmin();
  const id = Number((await params).id);
  const u = Number.isInteger(id) ? findUserById(id) : undefined;
  if (!u) notFound();
  return (
    <>
      <PageHeader title={`Editar ${u.name}`} description={u.email} />
      <UserForm
        action={updateUserAction.bind(null, u.id)}
        initial={{ name: u.name, email: u.email, role: u.role, active: !!u.active }}
      />
    </>
  );
}
