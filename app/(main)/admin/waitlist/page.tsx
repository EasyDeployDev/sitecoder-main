import { redirect } from "next/navigation";
import Header from "@/components/header";
import { getCurrentUser } from "@/lib/auth";
import { canManageWaitlist } from "@/lib/rbac";
import { listWaitlist } from "@/lib/waitlist";
import WaitlistTable from "./waitlist-table";

export const dynamic = "force-dynamic";

// Central admin surface for the waitlist-gated auth flow: every account is
// created at signup time (see lib/auth.ts#signUp) but stays PENDING until
// an admin/owner approves it here. This is the "approve-before-access"
// control point sitting in front of session issuance.
export default async function WaitlistAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/admin/waitlist");
  if (!canManageWaitlist(user)) redirect("/chats");

  const entries = await listWaitlist();

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-4 px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Waitlist</h1>
          <p className="text-sm text-muted-foreground">
            Review and approve accounts before they can sign in.
          </p>
        </div>
        <WaitlistTable entries={entries} currentUserId={user.id} />
      </div>
    </div>
  );
}
