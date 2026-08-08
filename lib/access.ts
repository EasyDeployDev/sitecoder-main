import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser, grantAccessPass } from "@/lib/auth";
import { loadPrivyBillingStatus } from "@/lib/privy-billing";

/** Redirect signed-in users without Access Pass to /access. */
export async function requireAccessOrRedirect() {
  let user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/access");
  if (user.role === "OWNER" || user.role === "ADMIN") return user;
  if (user.hasAccessPass) return user;

  try {
    const billing = await loadPrivyBillingStatus();
    if (billing.hasAccess) {
      await grantAccessPass(user.id);
      user = (await getCurrentUser()) || { ...user, hasAccessPass: true };
      return user;
    }
  } catch {
    // Privy billing unavailable — fall through to /access.
  }

  redirect("/access");
}
