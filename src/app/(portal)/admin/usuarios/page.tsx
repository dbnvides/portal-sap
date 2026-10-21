import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, DataTable, PageHeader, type Column } from "@/components/ui";
import { requireAdmin } from "@/lib/dal";
import { formatDate } from "@/lib/format";
import { listUsersRaw } from "@/lib/users";

type Row = ReturnType<typeof listUsersRaw>[number];

const columns: Column<Row>[] = [
  { header: "Nome", cell: (u) => u.name },
  { header: "E-mail", cell: (u) => u.email },
  { header: "Perfil", cell: (u) => (u.role === "admin" ? <Badge tone="primary">Administrador</Badge> : <Badge>Usuário</Badge>) },
  { header: "Status", cell: (u) => (u.active ? <Badge tone="success">Ativo</Badge> : <Badge tone="danger">Inativo</Badge>) },
  // SQLite current_timestamp = "YYYY-MM-DD HH:MM:SS" (UTC)
  { header: "Criado em", cell: (u) => formatDate(u.created_at.replace(" ", "T") + "Z") },
];

export default async function UsersPage() {
  await requireAdmin();
  const users = listUsersRaw();
  return (
    <>
      <PageHeader
        title="Usuários do portal"
        description="Acesso ao portal e perfis"
        actions={<Link href="/admin/usuarios/novo" className="btn-primary"><Plus size={16} /> Novo usuário</Link>}
      />
      <DataTable columns={columns} rows={users} rowKey={(u) => u.id} rowHref={(u) => `/admin/usuarios/${u.id}/editar`} />
    </>
  );
}
