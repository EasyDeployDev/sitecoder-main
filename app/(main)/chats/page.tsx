import Header from "@/components/header";
import CrmDashboard from "@/components/crm/crm-dashboard";
import { listPropertyDefs, listRecords } from "@/lib/crm";

export const dynamic = "force-dynamic";

export default async function ChatsDashboardPage() {
  const [records, propertyDefs] = await Promise.all([
    listRecords(),
    listPropertyDefs(),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <CrmDashboard records={records} propertyDefs={propertyDefs} />
    </div>
  );
}
