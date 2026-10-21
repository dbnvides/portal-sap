import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { DataTable, Detail, PageHeader, type Column } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { decodeParam, formatMoney } from "@/lib/format";
import { CARD_TYPES, getPartner, type PartnerAddress, type PartnerContact } from "@/lib/sap/business-partners";

const addressColumns: Column<PartnerAddress>[] = [
  { header: "Nome", cell: (a) => a.AddressName },
  { header: "Tipo", cell: (a) => (a.AddressType === "bo_BillTo" ? "Cobrança" : "Entrega") },
  { header: "Endereço", cell: (a) => [a.Street, a.StreetNo, a.Block].filter(Boolean).join(", ") || "—" },
  { header: "Cidade/UF", cell: (a) => [a.City, a.State].filter(Boolean).join(" / ") || "—" },
  { header: "CEP", cell: (a) => a.ZipCode || "—" },
  { header: "País", cell: (a) => a.Country || "—" },
];

const contactColumns: Column<PartnerContact>[] = [
  { header: "Nome", cell: (c) => c.Name },
  { header: "Cargo", cell: (c) => c.Position || "—" },
  { header: "Telefone", cell: (c) => c.Phone1 || "—" },
  { header: "Celular", cell: (c) => c.MobilePhone || "—" },
  { header: "E-mail", cell: (c) => c.E_Mail || "—" },
];

export default async function PartnerPage({ params }: PageProps<"/parceiros/[code]">) {
  await getUser();
  const code = decodeParam((await params).code);
  const p = await getPartner(code);
  if (!p) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.CardName}
        description={p.CardCode}
        actions={
          <>
            <Link href="/parceiros" className="btn-secondary">Voltar</Link>
            <Link href={`/parceiros/${encodeURIComponent(p.CardCode)}/editar`} className="btn-primary"><Pencil size={16} /> Editar</Link>
          </>
        }
      />
      <dl className="card grid gap-4 md:grid-cols-3">
        <Detail label="Tipo">{CARD_TYPES[p.CardType] ?? p.CardType}</Detail>
        <Detail label="CNPJ/CPF">{p.FederalTaxID || null}</Detail>
        <Detail label="Telefone">{p.Phone1 || null}</Detail>
        <Detail label="E-mail">{p.EmailAddress || null}</Detail>
        <Detail label="Saldo">{formatMoney(p.CurrentAccountBalance)}</Detail>
      </dl>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Endereços</h2>
        <DataTable columns={addressColumns} rows={p.BPAddresses ?? []} rowKey={(a) => `${a.AddressType}-${a.AddressName}`} empty="Nenhum endereço cadastrado." />
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Contatos</h2>
        <DataTable columns={contactColumns} rows={p.ContactEmployees ?? []} rowKey={(c) => c.InternalCode} empty="Nenhum contato cadastrado." />
      </section>
    </div>
  );
}
