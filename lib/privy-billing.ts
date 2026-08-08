import "server-only";

import { auth } from "@clerk/nextjs/server";
import {
  DEFAULT_PLAN_ID,
  isPlanId,
  normalizeBillingStatus,
  type BillingStatus,
  type PlanId,
} from "@/lib/billing-shared";

export const PRIVY_BILLING_ORIGIN = (
  process.env.PRIVY_BILLING_ORIGIN ||
  process.env.NEXT_PUBLIC_PRIVY_ORIGIN ||
  "https://preview.useprivy.app"
).replace(/\/$/, "");

export interface PrivyBillingState {
  configured: boolean;
  missing: string[];
  status: BillingStatus;
  hasAccess: boolean;
  plan: PlanId | null;
  seatQuantity: number | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

async function clerkBearer(): Promise<string | null> {
  const session = await auth();
  if (!session.userId) return null;
  try {
    return (await session.getToken()) || null;
  } catch {
    return null;
  }
}

async function privyFetch(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const token = await clerkBearer();
  const headers = new Headers(init?.headers);
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${PRIVY_BILLING_ORIGIN}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}

function toState(payload: Record<string, unknown>): PrivyBillingState {
  return {
    configured: Boolean(payload.configured ?? true),
    missing: Array.isArray(payload.missing)
      ? (payload.missing as string[])
      : [],
    status: normalizeBillingStatus(
      typeof payload.status === "string" ? payload.status : null,
    ),
    hasAccess: Boolean(payload.hasAccess),
    plan: isPlanId(payload.plan) ? payload.plan : null,
    seatQuantity:
      typeof payload.seatQuantity === "number" ? payload.seatQuantity : null,
    currentPeriodEnd:
      typeof payload.currentPeriodEnd === "string"
        ? payload.currentPeriodEnd
        : null,
    cancelAtPeriodEnd: Boolean(payload.cancelAtPeriodEnd),
  };
}

export async function loadPrivyBillingStatus(): Promise<PrivyBillingState> {
  const response = await privyFetch("/api/billing/status");
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Failed to load Privy billing status",
    );
  }

  return toState(payload);
}

export async function syncPrivyBilling(): Promise<PrivyBillingState> {
  const response = await privyFetch("/api/billing/sync", { method: "POST" });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Failed to sync Privy billing",
    );
  }

  return toState(payload);
}

export async function startPrivyCheckout(input: {
  plan?: PlanId;
  seats?: number;
}): Promise<{ activated?: boolean; url?: string | null; plan?: PlanId }> {
  const plan = isPlanId(input.plan) ? input.plan : DEFAULT_PLAN_ID;
  const response = await privyFetch("/api/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan, seats: input.seats }),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok) {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Failed to start checkout",
    );
  }

  return {
    activated: Boolean(payload.activated),
    url: typeof payload.url === "string" ? payload.url : null,
    plan: isPlanId(payload.plan) ? payload.plan : plan,
  };
}

export async function openPrivyBillingPortal(): Promise<{ url: string }> {
  const response = await privyFetch("/api/billing/portal", { method: "POST" });
  const payload = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;

  if (!response.ok || typeof payload.url !== "string") {
    throw new Error(
      typeof payload.error === "string"
        ? payload.error
        : "Failed to open billing portal",
    );
  }

  return { url: payload.url };
}
