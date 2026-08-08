import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser, grantAccessPass } from "@/lib/auth";
import { PLAN_ORDER, PLANS } from "@/lib/billing-shared";
import {
  loadPrivyBillingStatus,
  PRIVY_BILLING_ORIGIN,
  syncPrivyBilling,
} from "@/lib/privy-billing";
import {
  choosePrivyPlanAction,
  refreshPrivyAccessAction,
} from "./actions";

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; error?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login?redirectTo=/access");

  let user = await getCurrentUser();
  const { checkout, error } = await searchParams;

  let billingError: string | null = null;
  let billing = null as Awaited<ReturnType<typeof loadPrivyBillingStatus>> | null;

  try {
    billing =
      checkout === "success"
        ? await syncPrivyBilling().catch(() => loadPrivyBillingStatus())
        : await loadPrivyBillingStatus();

    if (billing.hasAccess && user && !user.hasAccessPass) {
      await grantAccessPass(user.id);
      user = await getCurrentUser();
    }
  } catch (error) {
    billingError =
      error instanceof Error ? error.message : "Could not reach Privy billing";
  }

  if (user?.hasAccessPass || user?.role === "OWNER" || user?.role === "ADMIN") {
    redirect("/chats");
  }

  if (billing?.hasAccess) {
    redirect("/chats");
  }

  return (
    <div className="w-full max-w-lg rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
      <div className="mb-6 text-center">
        <Link href="/" className="text-lg font-semibold text-slate-100">
          Sitecoder
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-100">
          Choose a plan
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Auth and billing are powered by{" "}
          <a
            href={PRIVY_BILLING_ORIGIN}
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noreferrer"
          >
            Privy
          </a>{" "}
          (Elysia Access Pass).
        </p>
        {checkout === "success" && (
          <p className="mt-3 text-xs text-amber-300/90">
            Payment received — confirming Access Pass…
          </p>
        )}
        {(billingError || error === "checkout") && (
          <p className="mt-3 text-xs text-rose-300/90">
            {billingError || "Checkout failed. Try again or open Privy billing."}
          </p>
        )}
      </div>

      <div className="space-y-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          return (
            <form
              key={id}
              action={choosePrivyPlanAction}
              className="rounded-xl border border-slate-700/70 bg-slate-950/40 p-4"
            >
              <input type="hidden" name="plan" value={id} />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">
                    {plan.name}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{plan.blurb}</p>
                  <p className="mt-2 text-[11px] text-slate-500">
                    {plan.trialLabel}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-100">
                    {plan.priceLabel}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    / {plan.intervalLabel}
                  </p>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500"
              >
                {plan.isFree ? "Continue free" : `Get ${plan.name}`}
              </button>
            </form>
          );
        })}
      </div>

      <form action={refreshPrivyAccessAction} className="mt-4">
        <button
          type="submit"
          className="w-full text-center text-xs text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
        >
          Already subscribed? Refresh access
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500">
        Signed in as {user?.email}
      </p>
    </div>
  );
}
