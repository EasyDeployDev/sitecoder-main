import Link from "next/link";
import { Clock3 } from "lucide-react";

// Central "you're on the list" screen for the waitlist-gated auth flow.
// Reached after signUpAction/signInAction detect an account that exists
// but hasn't been approved yet (status === PENDING). No session exists at
// this point — approval (lib/waitlist.ts) only flips the row's status;
// the user still has to come back and sign in once approved.
export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 text-center shadow-2xl shadow-black/20 backdrop-blur-md">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
        <Clock3 className="h-6 w-6" />
      </div>

      <h1 className="text-xl font-semibold text-slate-100">
        You&apos;re on the waitlist
      </h1>

      <p className="mt-2 text-sm text-slate-400">
        {email ? (
          <>
            We saved your spot for <span className="text-slate-300">{email}</span>.
          </>
        ) : (
          "We saved your spot."
        )}{" "}
        An admin needs to approve your account before you can sign in —
        we&apos;ll be quick.
      </p>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href="/login"
          className="rounded-md bg-blue-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
        >
          Back to sign in
        </Link>
        <Link
          href="/"
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
