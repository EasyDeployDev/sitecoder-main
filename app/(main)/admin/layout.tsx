import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canManageWorkspace } from "@/lib/rbac";
import { pendingWaitlistCount } from "@/lib/waitlist";
import AdminShell from "@/components/admin/admin-shell";

// Every /admin/* route is gated here: only workspace admins/owners get
// past this layout. Individual pages can still add their own narrower
// checks (e.g. canManageWaitlist) but this is the outer perimeter.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/admin");
  if (!canManageWorkspace(user)) redirect("/chats");

  const pendingCount = await pendingWaitlistCount().catch(() => 0);

  return (
    <AdminShell pendingCount={pendingCount} currentUserEmail={user.email}>
      {children}
    </AdminShell>
  );
}
