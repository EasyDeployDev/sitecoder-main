"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signUp, destroySession } from "@/lib/auth";
import { authRateLimit } from "@/lib/rate-limit";

export type AuthFormState = {
  error?: string;
} | null;

async function getRateLimitKey(): Promise<string> {
  // Prefer the forwarded IP so the limit follows the user behind a
  // load balancer / proxy. Falls back to a generic key if headers are
  // missing, which still bounds total abuse from an anonymous source.
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const realIp = headerStore.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp || "anonymous";
  return `auth:${ip}`;
}

async function checkRateLimit(): Promise<AuthFormState> {
  const limit = authRateLimit(await getRateLimitKey());
  if (!limit.ok) {
    return {
      error: `Too many attempts. Please try again in ${limit.retryAfterSeconds}s.`,
    };
  }
  return null;
}

export async function signUpAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const rateLimitError = await checkRateLimit();
  if (rateLimitError) return rateLimitError;

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
  const rateLimitError = await checkRateLimit();
  if (rateLimitError) return rateLimitError;

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
