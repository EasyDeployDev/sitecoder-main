"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { canManageWaitlist, ForbiddenError } from "@/lib/rbac";
import type { GlobalRole, WaitlistStatus } from "@/lib/rbac";

// Admin-facing waitlist management, layered on top of the credential
// accounts created by lib/auth.ts#signUp. Every account already exists as
// a User row the moment someone signs up (email reserved, password
// hashed); this module only ever flips `status` and never issues/creates
// sessions itself — approval just clears the way for lib/auth.ts#signIn to
// create one on the user's next successful login.

export type WaitlistEntry = {
  id: string;
  email: string;
  name: string | null;
  role: GlobalRole;
  status: WaitlistStatus;
  createdAt: Date;
  reviewedAt: Date | null;
};

function toEntry(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  createdAt: Date;
  reviewedAt: Date | null;
}): WaitlistEntry {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as GlobalRole,
    status: row.status as WaitlistStatus,
    createdAt: row.createdAt,
    reviewedAt: row.reviewedAt,
  };
}

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const user = await requireUser();
  if (!canManageWaitlist(user)) {
    throw new ForbiddenError("Only workspace admins can view the waitlist.");
  }

  const prisma = getPrisma();
  const rows = await prisma.user.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      createdAt: true,
      reviewedAt: true,
    },
  });
  return rows.map(toEntry);
}

export async function approveUser(userId: string): Promise<void> {
  const admin = await requireUser();
  if (!canManageWaitlist(admin)) {
    throw new ForbiddenError("Only workspace admins can approve accounts.");
  }

  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "APPROVED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });
  revalidatePath("/admin/waitlist");
}

export async function rejectUser(userId: string): Promise<void> {
  const admin = await requireUser();
  if (!canManageWaitlist(admin)) {
    throw new ForbiddenError("Only workspace admins can reject accounts.");
  }

  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });
  revalidatePath("/admin/waitlist");
}

// Move a rejected/approved account back onto the waitlist, e.g. to
// reconsider a rejection.
export async function resetToPending(userId: string): Promise<void> {
  const admin = await requireUser();
  if (!canManageWaitlist(admin)) {
    throw new ForbiddenError("Only workspace admins can edit the waitlist.");
  }

  const prisma = getPrisma();
  await prisma.user.update({
    where: { id: userId },
    data: { status: "PENDING", reviewedAt: null, reviewedById: null },
  });
  revalidatePath("/admin/waitlist");
}

export async function pendingWaitlistCount(): Promise<number> {
  const user = await requireUser();
  if (!canManageWaitlist(user)) return 0;

  const prisma = getPrisma();
  return prisma.user.count({ where: { status: "PENDING" } });
}
