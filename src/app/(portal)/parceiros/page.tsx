import Link from "next/link";
import { Plus } from "lucide-react";
import { Badge, DataTable, PageHeader, Pagination, SearchForm, type Column } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { formatMoney, listParams } from "@/lib/format";
import { CARD_TYPES, listPartners, type PartnerRow } from "@/lib/sap/business-partners";

const TONE = { cCustomer: "primary", cSupplier: "warning", cLid: "muted" } as const;

const columns: Column<PartnerRow>[] = [
  { header: "Código", cell: (r) => r.CardCode },
  { header: "Nome", cell: (r) => r.CardName },
  { header: "Tipo", cell: (r) => <Badge tone={TONE[r.CardType]}>{CARD_TYPES[r.CardType] ?? r.CardType}</Badge> },
  { header: "CNPJ/CPF", cell: (r) => r.FederalTaxID || "—" },
  { header: "Telefone", cell: (r) => r.Phone1 || "—" },
  { header: "E-mail", cell: (r) => r.EmailAddress || "—" },
  { header: "Saldo", cell: (r) => formatMoney(r.CurrentAccountBalance), className: "text-right" },
];

export default async function PartnersPage({ searchParams }: PageProps<"/parceiros">) {
  await getUser();
  const { page, q, one } = listParams(await searchParams);
  const tipo = one("tipo") ?? "";
  const data = await listPartners({ q, tipo, page });
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (tipo) params.tipo = tipo;

  return (
    <>
      <PageHeader
        title="Parceiros de negócio"
        description="Clientes, fornecedores e leads"
        actions={<Link href="/parceiros/novo" className="btn-primary"><Plus size={16} /> Novo parceiro</Link>}
      />
      <SearchForm q={q} placeholder="Buscar por código ou nome...">
        <select name="tipo" defaultValue={tipo} aria-label="Tipo" className="input w-auto">
          <option value="">Todos os tipos</option>
          {Object.entries(CARD_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </SearchForm>
      <DataTable columns={columns} rows={data.rows} rowKey={(r) => r.CardCode} rowHref={(r) => `/parceiros/${encodeURIComponent(r.CardCode)}`} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} params={params} />
    </>
  );
}
