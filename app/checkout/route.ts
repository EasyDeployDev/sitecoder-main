import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { isPlanId, type PlanId } from "@/lib/billing-shared";
import { startPrivyCheckout } from "@/lib/privy-billing";

/** Proxy Access Pass checkout to Privy Elysia on preview.useprivy.app */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login?redirectTo=/access", request.url),
    );
  }

  const planParam = request.nextUrl.searchParams.get("plan");
  const plan: PlanId = isPlanId(planParam) ? planParam : "pro";

  try {
    const result = await startPrivyCheckout({ plan });
    if (result.activated) {
      return NextResponse.redirect(new URL("/chats", request.url));
    }
    if (result.url) {
      return NextResponse.redirect(result.url);
    }
  } catch (error) {
    console.error("[checkout→privy]", error);
  }

  return NextResponse.redirect(new URL("/access", request.url));
}
