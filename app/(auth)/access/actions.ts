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

export async function refreshPrivyAccessAction() {
  const { userId } = await auth();
  if (!userId) redirect("/login?redirectTo=/access");

  try {
    const synced = await syncPrivyBilling().catch(() =>
      loadPrivyBillingStatus(),
    );
    await mirrorAccess(synced.hasAccess);
    if (synced.hasAccess) redirect("/chats");
    return synced;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Billing sync failed",
    };
  }
}

export async function choosePrivyPlanAction(formData: FormData) {
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
    return { error: "Checkout did not return a URL" };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Checkout failed",
    };
  }
}
