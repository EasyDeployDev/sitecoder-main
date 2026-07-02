"use server";

import { getPrisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { canManageWorkspace, ForbiddenError } from "@/lib/rbac";

// Lightweight workspace-wide counters for the admin center overview page.
// Intentionally uncached (admin-only, low traffic) so numbers are always
// fresh right after an approve/reject/archive action.
export type AdminStats = {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  rejectedUsers: number;
  totalRecords: number;
  archivedRecords: number;
  adminCount: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const user = await requireUser();
  if (!canManageWorkspace(user)) {
    throw new ForbiddenError("Only workspace admins can view admin stats.");
  }

  const prisma = getPrisma();
  const [
    totalUsers,
    approvedUsers,
    pendingUsers,
    rejectedUsers,
    totalRecords,
    archivedRecords,
    adminCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "APPROVED" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { status: "REJECTED" } }),
    prisma.chat.count(),
    prisma.chat.count({ where: { archived: true } }),
    prisma.user.count({ where: { role: { in: ["OWNER", "ADMIN"] } } }),
  ]);

  return {
    totalUsers,
    approvedUsers,
    pendingUsers,
    rejectedUsers,
    totalRecords,
    archivedRecords,
    adminCount,
  };
}
