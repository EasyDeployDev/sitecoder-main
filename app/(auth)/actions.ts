"use server";

import { redirect } from "next/navigation";
import { signIn, signUp, destroySession } from "@/lib/auth";

export type AuthFormState = {
  error?: string;
} | null;

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const name = String(formData.get("name") || "");
  const redirectTo = String(formData.get("redirectTo") || "/chats");

  const result = await signUp(email, password, name);
  if (!result.ok) {
    return { error: result.error };
  }

  if (result.waitlisted) {
    redirect(`/waitlist?email=${encodeURIComponent(result.user.email)}`);
  }

  redirect(redirectTo);
}

export async function signInAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/chats");

  const result = await signIn(email, password);
  if (!result.ok) {
    if ("waitlisted" in result && result.waitlisted) {
      redirect(`/waitlist?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    }
    return { error: result.error };
  }

  redirect(redirectTo);
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}
