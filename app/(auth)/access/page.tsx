import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getCurrentUser, grantAccessPass } from "@/lib/auth";
import { getPolar, POLAR_PRODUCT_ID } from "@/lib/polar";

async function syncAccessFromCheckout(checkoutId: string, userId: string) {
  try {
    const polar = getPolar();
    const checkout = await polar.checkouts.get({ id: checkoutId });
    const status = (checkout as any).status as string | undefined;
    if (status !== "succeeded" && status !== "confirmed" && status !== "complete") {
      return false;
    }
    const products: string[] =
      (checkout as any).products?.map((p: any) => p.id || p) ||
      ((checkout as any).productId ? [(checkout as any).productId] : []);
    if (products.length && !products.includes(POLAR_PRODUCT_ID)) {
      return false;
    }
    await grantAccessPass(
      userId,
      (checkout as any).customerId || (checkout as any).customer?.id,
    );
    return true;
  } catch {
    return false;
  }
}

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id?: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/login?redirectTo=/access");

  let user = await getCurrentUser();
  const { checkout_id } = await searchParams;

  if (checkout_id && user && !user.hasAccessPass) {
    const ok = await syncAccessFromCheckout(checkout_id, user.id);
    if (ok) {
      user = await getCurrentUser();
    }
  }

  if (user?.hasAccessPass || user?.role === "OWNER" || user?.role === "ADMIN") {
    redirect("/chats");
  }

  const checkoutHref = `/checkout?products=${encodeURIComponent(POLAR_PRODUCT_ID)}`;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-2xl shadow-black/20 backdrop-blur-md">
      <div className="mb-6 text-center">
        <Link href="/" className="text-lg font-semibold text-slate-100">
          Sitecoder
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-100">
          Access Pass required
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Waitlist is closed. Get the{" "}
          <a
            href="https://polar.sh/dashboard/molabs-solutions/products/cff6aec9-5a46-44bc-a62e-f021a3fb5567"
            className="text-blue-400 hover:text-blue-300"
            target="_blank"
            rel="noreferrer"
          >
            Polar Access Pass
          </a>{" "}
          to unlock the workspace.
        </p>
        {checkout_id && (
          <p className="mt-3 text-xs text-amber-300/90">
            Payment received — confirming Access Pass. Refresh if this page
            doesn&apos;t unlock automatically.
          </p>
        )}
      </div>

      <a
        href={checkoutHref}
        className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-500"
      >
        Buy Access Pass
      </a>

      <p className="mt-4 text-center text-xs text-slate-500">
        Signed in as {user?.email}
      </p>
    </div>
  );
}
