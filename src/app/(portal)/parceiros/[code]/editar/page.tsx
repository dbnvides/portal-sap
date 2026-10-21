import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { decodeParam } from "@/lib/format";
import { getPartner, listPartnerGroups } from "@/lib/sap/business-partners";
import { updatePartnerAction } from "../../actions";
import { PartnerForm } from "../../partner-form";

export default async function EditPartnerPage({ params }: PageProps<"/parceiros/[code]/editar">) {
  await getUser();
  const code = decodeParam((await params).code);
  const [p, groups] = await Promise.all([getPartner(code), listPartnerGroups()]);
  if (!p) notFound();

  const initial = {
    CardCode: p.CardCode,
    CardName: p.CardName,
    CardType: p.CardType,
    FederalTaxID: p.FederalTaxID ?? "",
    Phone1: p.Phone1 ?? "",
    EmailAddress: p.EmailAddress ?? "",
    GroupCode: p.GroupCode == null ? "" : String(p.GroupCode),
  };
  const href = `/parceiros/${encodeURIComponent(p.CardCode)}`;
  return (
    <>
      <PageHeader title={`Editar ${p.CardName}`} description={p.CardCode} />
      <PartnerForm action={updatePartnerAction.bind(null, p.CardCode)} initial={initial} groups={groups} cancelHref={href} />
    </>
  );
}
