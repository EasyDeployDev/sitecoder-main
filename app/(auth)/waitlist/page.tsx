import { redirect } from "next/navigation";

/** Waitlist retired — Polar Access Pass replaces it. */
export default function WaitlistPage() {
  redirect("/access");
}
