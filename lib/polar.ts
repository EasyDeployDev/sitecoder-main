import "server-only";

import { Polar } from "@polar-sh/sdk";

export const POLAR_PRODUCT_ID =
  process.env.POLAR_PRODUCT_ID ||
  process.env.NEXT_PUBLIC_POLAR_PRODUCT_ID ||
  "cff6aec9-5a46-44bc-a62e-f021a3fb5567";

export function getPolar() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is not set");
  }

  return new Polar({
    accessToken,
    server:
      process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production",
  });
}

export function siteUrl(path = "") {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";
  return `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
