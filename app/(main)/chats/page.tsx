import Header from "@/components/header";
import CrmDashboard from "@/components/crm/crm-dashboard";
import { listPropertyDefs, listRecords } from "@/lib/crm";
import { getCurrentUser } from "@/lib/auth";
import { canManageWorkspace } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export default async function ChatsDashboardPage() {
  const [records, propertyDefs, user] = await Promise.all([
    listRecords(),
    listPropertyDefs(),
    getCurrentUser(),
  ]);

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <CrmDashboard
        records={records}
        propertyDefs={propertyDefs}
        canManageSchema={canManageWorkspace(user)}
      />
    </div>
  );
}
