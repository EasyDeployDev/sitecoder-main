import { Webhooks } from "@polar-sh/nextjs";
import { getPrisma } from "@/lib/prisma";
import { grantAccessPass } from "@/lib/auth";
import { POLAR_PRODUCT_ID } from "@/lib/polar";

async function unlockFromCustomer(payload: {
  externalId?: string | null;
  email?: string | null;
  id?: string | null;
}) {
  const prisma = getPrisma();
  const externalId = payload.externalId || undefined;
  const email = payload.email?.toLowerCase();

  let user =
    (externalId
      ? await prisma.user.findFirst({
          where: { OR: [{ id: externalId }, { clerkId: externalId }] },
        })
      : null) ||
    (email ? await prisma.user.findUnique({ where: { email } }) : null);

  if (!user) return;

  await grantAccessPass(user.id, payload.id || undefined);
}

function orderIncludesAccessPass(order: {
  product?: { id?: string } | null;
  productId?: string | null;
  items?: Array<{ product?: { id?: string } | null; productId?: string | null }>;
}): boolean {
  if (order.productId === POLAR_PRODUCT_ID) return true;
  if (order.product?.id === POLAR_PRODUCT_ID) return true;
  return Boolean(
    order.items?.some(
      (item) =>
        item.productId === POLAR_PRODUCT_ID ||
        item.product?.id === POLAR_PRODUCT_ID,
    ),
  );
}

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET || "unset",
  onOrderPaid: async (payload) => {
    const order = payload.data as any;
    if (!orderIncludesAccessPass(order)) return;
    await unlockFromCustomer({
      externalId:
        order.customer?.externalId ||
        order.externalCustomerId ||
        order.customerExternalId ||
        order.metadata?.clerkUserId,
      email: order.customer?.email || order.user?.email,
      id: order.customer?.id || order.customerId,
    });
  },
  onBenefitGrantCreated: async (payload) => {
    const grant = payload.data as any;
    await unlockFromCustomer({
      externalId: grant.customer?.externalId,
      email: grant.customer?.email,
      id: grant.customer?.id,
    });
  },
});
