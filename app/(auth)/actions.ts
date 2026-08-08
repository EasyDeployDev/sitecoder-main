"use server";

import { redirect } from "next/navigation";

export async function signOutAction(): Promise<void> {
  // Clerk client sign-out is handled via <SignOutButton /> / clerk.signOut().
  // This keeps the server action import stable for forms that still call it.
  redirect("/login");
}
