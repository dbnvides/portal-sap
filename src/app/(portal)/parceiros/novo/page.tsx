import { PageHeader } from "@/components/ui";
import { getUser } from "@/lib/dal";
import { listPartnerGroups } from "@/lib/sap/business-partners";
import { createPartnerAction } from "../actions";
import { PartnerForm } from "../partner-form";

export default async function NewPartnerPage() {
  await getUser();
  const groups = await listPartnerGroups();
  return (
    <>
      <PageHeader title="Novo parceiro de negócio" />
      <PartnerForm action={createPartnerAction} groups={groups} cancelHref="/parceiros" />
    </>
  );
}
