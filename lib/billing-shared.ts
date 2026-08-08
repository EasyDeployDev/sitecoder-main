/**
 * Privy Access Pass plans — shared with preview.useprivy.app (Elysia billing).
 * Source of truth: privy-dev/lib/billing-shared.ts
 */

export type PlanId = "starter" | "pro" | "team";

export const PLAN_ORDER: PlanId[] = ["starter", "pro", "team"];
export const DEFAULT_PLAN_ID: PlanId = "starter";
export const PRODUCT_ID = "prod_V0WHZD2Vy7kGzP";

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceLabel: string;
  intervalLabel: string;
  blurb: string;
  description: string;
  isFree: boolean;
  trialLabel: string;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  starter: {
    id: "starter",
    name: "Starter",
    priceLabel: "$0",
    intervalLabel: "month",
    blurb: "Chat + coding workspace",
    description: "Free forever for 1 seat. Unlock Sitecoder chat.",
    isFree: true,
    trialLabel: "Free forever",
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$20",
    intervalLabel: "month",
    blurb: "Individual business",
    description: "Pro — $20/month. 1-week free trial (card required).",
    isFree: false,
    trialLabel: "1-week free trial",
  },
  team: {
    id: "team",
    name: "Team",
    priceLabel: "$8",
    intervalLabel: "seat / month",
    blurb: "Scale at $8 per seat",
    description: "Team — $8/seat/mo, 2 seats minimum. 1-week free trial.",
    isFree: false,
    trialLabel: "1-week free trial",
  },
};

export type BillingStatus =
  | "none"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "unpaid"
  | "paused";

export function isPlanId(value: unknown): value is PlanId {
  return value === "starter" || value === "pro" || value === "team";
}

export function getPlan(planId?: unknown): PlanDefinition {
  return isPlanId(planId) ? PLANS[planId] : PLANS[DEFAULT_PLAN_ID];
}

export function normalizeBillingStatus(
  status: string | null | undefined,
): BillingStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "unpaid":
    case "paused":
      return status;
    default:
      return "none";
  }
}
