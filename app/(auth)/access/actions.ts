"use server";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  loadPrivyBillingStatus,
  startPrivyCheckout,
  syncPrivyBilling,
} from "@/lib/privy-billing";
import { grantAccessPass, getCurrentUser } from "@/lib/auth";
import { isPlanId, type PlanId } from "@/lib/billing-shared";

async function mirrorAccess(hasAccess: boolean) {
  const user = await getCurrentUser();
  if (!user) return;
  if (hasAccess && !user.hasAccessPass) {
    await grantAccessPass(user.id);
  }
}

export async function refreshPrivyAccessAction(): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/login?redirectTo=/access");

  try {
    const synced = await syncPrivyBilling().catch(() =>
      loadPrivyBillingStatus(),
    );
    await mirrorAccess(synced.hasAccess);
    if (synced.hasAccess) redirect("/chats");
  } catch {
    // Stay on /access; page will show billing error on reload if needed.
  }
  redirect("/access");
}

export async function choosePrivyPlanAction(formData: FormData): Promise<void> {
  const { userId } = await auth();
  if (!userId) redirect("/login?redirectTo=/access");

  const raw = String(formData.get("plan") || "");
  const plan: PlanId = isPlanId(raw) ? raw : "starter";

  try {
    const result = await startPrivyCheckout({ plan });
    if (result.activated) {
      await mirrorAccess(true);
      redirect("/chats");
    }
    if (result.url) {
      redirect(result.url);
    }
  } catch {
    // Fall through to access page.
  }
  redirect("/access?error=checkout");
}
