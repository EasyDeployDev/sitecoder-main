import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getPolar, POLAR_PRODUCT_ID, siteUrl } from "@/lib/polar";

export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(
      new URL("/login?redirectTo=/access", request.url),
    );
  }

  const productsParam =
    request.nextUrl.searchParams.get("products") || POLAR_PRODUCT_ID;
  const products = productsParam.split(",").map((p) => p.trim()).filter(Boolean);

  const clerkUser = await currentUser();
  const email =
    clerkUser?.primaryEmailAddress?.emailAddress ||
    clerkUser?.emailAddresses[0]?.emailAddress;

  const polar = getPolar();
  const checkout = await polar.checkouts.create({
    products,
    successUrl: siteUrl("/access?checkout_id={CHECKOUT_ID}"),
    returnUrl: siteUrl("/access"),
    externalCustomerId: userId,
    customerEmail: email || undefined,
    metadata: {
      clerkUserId: userId,
    },
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: "Failed to create Polar checkout" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(checkout.url);
}
