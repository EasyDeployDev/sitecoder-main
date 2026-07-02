import Link from "next/link";
import {
  Archive,
  Database,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { getAdminStats } from "@/lib/admin-stats";
import StatCard from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await getAdminStats();

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-100">Overview</h1>
        <p className="text-sm text-muted-foreground">
          Workspace health at a glance.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total accounts"
          value={stats.totalUsers}
          icon={Users}
        />
        <StatCard
          label="Approved"
          value={stats.approvedUsers}
          icon={ShieldCheck}
          tone="success"
        />
        <StatCard
          label="Pending review"
          value={stats.pendingUsers}
          icon={UserCheck}
          tone={stats.pendingUsers > 0 ? "warning" : "default"}
          hint={stats.pendingUsers > 0 ? "Needs attention" : undefined}
        />
        <StatCard
          label="Rejected"
          value={stats.rejectedUsers}
          icon={Users}
          tone={stats.rejectedUsers > 0 ? "danger" : "default"}
        />
        <StatCard
          label="Admins & owners"
          value={stats.adminCount}
          icon={ShieldCheck}
        />
        <StatCard
          label="Total records"
          value={stats.totalRecords}
          icon={Database}
        />
        <StatCard
          label="Archived records"
          value={stats.archivedRecords}
          icon={Archive}
        />
      </div>

      {stats.pendingUsers > 0 && (
        <Link
          href="/admin/waitlist"
          className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 transition hover:bg-amber-500/15"
        >
          <span>
            {stats.pendingUsers}{" "}
            {stats.pendingUsers === 1 ? "account is" : "accounts are"}{" "}
            waiting for review.
          </span>
          <span className="font-medium underline">Review waitlist →</span>
        </Link>
      )}
    </div>
  );
}
