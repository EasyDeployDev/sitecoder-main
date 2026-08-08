import "server-only";

import { cache } from "react";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPrisma } from "@/lib/prisma";
import type { AuthUser, GlobalRole, WaitlistStatus } from "@/lib/rbac";

function toAuthUser(row: {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  hasAccessPass?: boolean;
}): AuthUser & { hasAccessPass: boolean } {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as GlobalRole,
    status: row.status as WaitlistStatus,
    hasAccessPass: Boolean(row.hasAccessPass),
  };
}

/**
 * Resolve the signed-in Clerk user to a local Prisma User.
 * Waitlist is skipped — users are always APPROVED on upsert.
 */
export const getCurrentUser = cache(async (): Promise<
  (AuthUser & { hasAccessPass: boolean }) | null
> => {
  const { userId } = await auth();
  if (!userId) return null;

  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ||
    clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    null;

  const prisma = getPrisma();

  const existingByClerk = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (existingByClerk) {
    if (
      existingByClerk.email !== email.toLowerCase() ||
      existingByClerk.name !== name
    ) {
      const updated = await prisma.user.update({
        where: { id: existingByClerk.id },
        data: {
          email: email.toLowerCase(),
          name,
          status: "APPROVED",
        },
      });
      return toAuthUser(updated);
    }
    return toAuthUser(existingByClerk);
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (existingByEmail) {
    const updated = await prisma.user.update({
      where: { id: existingByEmail.id },
      data: {
        clerkId: userId,
        name: name ?? existingByEmail.name,
        status: "APPROVED",
      },
    });
    return toAuthUser(updated);
  }

  const created = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      clerkId: userId,
      name,
      role: "MEMBER",
      status: "APPROVED",
      passwordHash: null,
    },
  });
  return toAuthUser(created);
});

export async function requireUser(): Promise<
  AuthUser & { hasAccessPass: boolean }
> {
  const user = await getCurrentUser();
  if (!user) {
    const { UnauthorizedError } = await import("@/lib/rbac");
    throw new UnauthorizedError();
  }
  return user;
}

export async function requireAccessPass(): Promise<
  AuthUser & { hasAccessPass: boolean }
> {
  const user = await requireUser();
  if (isAccessBypassed(user)) return user;
  if (user.hasAccessPass) return user;

  // Fall back to Privy Elysia billing (preview.useprivy.app).
  try {
    const { loadPrivyBillingStatus } = await import("@/lib/privy-billing");
    const billing = await loadPrivyBillingStatus();
    if (billing.hasAccess) {
      await grantAccessPass(user.id);
      return { ...user, hasAccessPass: true };
    }
  } catch {
    // Privy unreachable — keep local gate.
  }

  const { ForbiddenError } = await import("@/lib/rbac");
  throw new ForbiddenError("Privy Access Pass required.");
}

function isAccessBypassed(
  user: AuthUser & { hasAccessPass: boolean },
): boolean {
  // Workspace admins always get through (ops / support).
  return user.role === "OWNER" || user.role === "ADMIN";
}

export async function grantAccessPass(userId: string, polarCustomerId?: string) {
  const prisma = getPrisma();
  return prisma.user.update({
    where: { id: userId },
    data: {
      hasAccessPass: true,
      status: "APPROVED",
      ...(polarCustomerId ? { polarCustomerId } : {}),
    },
  });
}

// Legacy no-ops kept so older imports don't break during transition.
export async function destroySession(): Promise<void> {}
export async function createSession(_userId: string): Promise<string> {
  return "";
}
export async function deleteExpiredSessions(): Promise<number> {
  return 0;
}
export async function deleteUserSessions(_userId: string): Promise<number> {
  return 0;
}
