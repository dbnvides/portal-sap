import Link from "next/link";
import { Plus } from "lucide-react";
import { DataTable, PageHeader, Pagination, SearchForm, type Column } from "@/components/ui";
import { formatNumber, listParams } from "@/lib/format";
import { listItemGroups, listItems, type ItemRow } from "@/lib/sap/items";
import { getUser } from "@/lib/dal";
import { ItemStatus } from "./item-status";

export default async function ItensPage({ searchParams }: PageProps<"/itens">) {
  await getUser();
  const { page, q, one } = listParams(await searchParams);
  const grupoParam = one("grupo") ?? "";
  const grupo = /^\d+$/.test(grupoParam) ? Number(grupoParam) : undefined;

  const [groups, data] = await Promise.all([listItemGroups(), listItems({ q, grupo, page })]);
  const groupName = new Map(groups.map((g) => [g.Number, g.GroupName]));

  const columns: Column<ItemRow>[] = [
    { header: "Código", cell: (r) => r.ItemCode },
    { header: "Descrição", cell: (r) => r.ItemName },
    { header: "Grupo", cell: (r) => groupName.get(r.ItemsGroupCode) ?? r.ItemsGroupCode },
    { header: "Estoque", cell: (r) => formatNumber(r.QuantityOnStock), className: "text-right" },
    { header: "Status", cell: (r) => <ItemStatus item={r} /> },
  ];

  return (
    <>
      <PageHeader
        title="Itens"
        description="Cadastro de itens do SAP Business One"
        actions={<Link href="/itens/novo" className="btn-primary"><Plus size={16} /> Novo item</Link>}
      />
      <SearchForm q={q} placeholder="Buscar por código ou descrição">
        <select name="grupo" defaultValue={grupoParam} aria-label="Grupo" className="input w-auto">
          <option value="">Todos os grupos</option>
          {groups.map((g) => <option key={g.Number} value={g.Number}>{g.GroupName}</option>)}
        </select>
      </SearchForm>
      <DataTable
        columns={columns}
        rows={data.rows}
        rowKey={(r) => r.ItemCode}
        rowHref={(r) => `/itens/${encodeURIComponent(r.ItemCode)}`}
      />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={{ q, grupo: grupoParam }} />
    </>
  );
}
