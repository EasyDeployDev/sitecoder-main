import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** Redirect signed-in users without Access Pass to /access. */
export async function requireAccessOrRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/access");
  if (
    !user.hasAccessPass &&
    user.role !== "OWNER" &&
    user.role !== "ADMIN"
  ) {
    redirect("/access");
  }
  return user;
}
