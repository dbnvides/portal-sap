import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { listParams } from "@/lib/format";
import { getOpenInvoicesByCustomer } from "@/lib/sap/finance";
import { today } from "@/lib/today";
import { PaymentForm } from "./payment-form";

export default async function NewPaymentPage({ searchParams }: PageProps<"/financeiro/recebimentos/novo">) {
  await getUser();
  const { one } = listParams(await searchParams);
  const cliente = one("cliente")?.trim() ?? "";
  const [invoices, date] = await Promise.all([cliente ? getOpenInvoicesByCustomer(cliente) : [], today()]);

  return (
    <>
      <PageHeader title="Novo recebimento" description="Baixa de notas fiscais de saída em aberto" />
      <form className="card mb-6 flex flex-wrap items-end gap-2">
        <div className="min-w-64 flex-1">
          <label htmlFor="cliente" className="label">Cliente (código)</label>
          <input id="cliente" name="cliente" defaultValue={cliente} required className="input" placeholder="Ex.: C00001" />
        </div>
        <button className="btn-secondary">Carregar notas</button>
      </form>
      {cliente && (
        <PaymentForm
          key={cliente}
          cardCode={cliente}
          invoices={invoices.map(({ DocEntry, DocNum, DocDueDate, balance }) => ({ DocEntry, DocNum, DocDueDate, balance }))}
          preselected={Number(one("nota")) || undefined}
          defaults={{ date, transfer: process.env.SAP_TRANSFER_ACCOUNT ?? "", cash: process.env.SAP_CASH_ACCOUNT ?? "" }}
        />
      )}
    </>
  );
}
