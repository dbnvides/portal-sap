import { Suspense, type ReactNode } from "react";
import { unstable_rethrow } from "next/navigation";
import { DataTable, DocStatus, PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import {
  countActiveCustomers, countOpenOrders, countOverdueInvoices, getRecentOrders, getUpcomingDue, openReceivablesSummary,
} from "@/lib/sap/finance";

export default async function DashboardPage() {
  await getUser();
  return (
    <>
      <PageHeader title="Dashboard" description="Visão geral de vendas e contas a receber" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Pedidos de venda abertos"><Stat load={async () => formatNumber(await countOpenOrders())} /></Card>
        <Card title="Notas a receber em aberto"><ReceivablesStat /></Card>
        <Card title="Notas vencidas"><Stat load={async () => formatNumber(await countOverdueInvoices())} tone="text-danger" /></Card>
        <Card title="Clientes ativos"><Stat load={async () => formatNumber(await countActiveCustomers())} /></Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Últimos pedidos"><RecentOrders /></Section>
        <Section title="Próximos vencimentos"><UpcomingDue /></Section>
      </div>
    </>
  );
}

/** Erro do SL fica só no bloco que falhou; redirect/prerender continuam propagando. */
async function attempt<T>(load: () => Promise<T>): Promise<{ data: T } | { error: string }> {
  try {
    return { data: await load() };
  } catch (e) {
    unstable_rethrow(e);
    return { error: e instanceof Error ? e.message : "Erro ao consultar o SAP" };
  }
}

const Fail = ({ error }: { error: string }) => <p role="alert" className="text-sm text-danger">{error}</p>;

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="card">
      <p className="text-xs uppercase text-muted">{title}</p>
      <Suspense fallback={<div className="mt-2 h-8 w-24 animate-pulse rounded bg-border" />}>{children}</Suspense>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-theme bg-border/60" />}>{children}</Suspense>
    </section>
  );
}

async function Stat({ load, tone = "text-foreground" }: { load: () => Promise<string>; tone?: string }) {
  const r = await attempt(load);
  if ("error" in r) return <Fail error={r.error} />;
  return <p className={`mt-2 text-3xl font-semibold ${tone}`}>{r.data}</p>;
}

async function ReceivablesStat() {
  const r = await attempt(openReceivablesSummary);
  if ("error" in r) return <Fail error={r.error} />;
  return (
    <>
      <p className="mt-2 text-3xl font-semibold">{formatNumber(r.data.count)}</p>
      <p className="mt-1 text-sm text-muted">Saldo: <span className="font-medium text-foreground">{formatMoney(r.data.balance)}</span></p>
    </>
  );
}

async function RecentOrders() {
  const r = await attempt(getRecentOrders);
  if ("error" in r) return <Fail error={r.error} />;
  return (
    <DataTable
      rows={r.data}
      rowKey={(o) => o.DocEntry}
      rowHref={(o) => `/vendas/pedidos/${o.DocEntry}`}
      columns={[
        { header: "Nº", cell: (o) => o.DocNum },
        { header: "Cliente", cell: (o) => o.CardName },
        { header: "Data", cell: (o) => formatDate(o.DocDate) },
        { header: "Total", cell: (o) => formatMoney(o.DocTotal), className: "text-right" },
        { header: "Status", cell: (o) => <DocStatus status={o.DocumentStatus} cancelled={o.Cancelled} /> },
      ]}
    />
  );
}

async function UpcomingDue() {
  const r = await attempt(getUpcomingDue);
  if ("error" in r) return <Fail error={r.error} />;
  return (
    <DataTable
      rows={r.data}
      rowKey={(i) => i.DocEntry}
      rowHref={(i) => `/financeiro/recebimentos/novo?${new URLSearchParams({ cliente: i.CardCode, nota: String(i.DocEntry) })}`}
      empty="Nenhuma nota a vencer."
      columns={[
        { header: "Nº", cell: (i) => i.DocNum },
        { header: "Cliente", cell: (i) => i.CardName },
        { header: "Vencimento", cell: (i) => formatDate(i.DocDueDate) },
        { header: "Saldo", cell: (i) => formatMoney(i.balance), className: "text-right" },
      ]}
    />
  );
}
