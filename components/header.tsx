import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";
import { canManageWaitlist } from "@/lib/rbac";
import { pendingWaitlistCount } from "@/lib/waitlist";

export default async function Header() {
  const user = await getCurrentUser();
  const showWaitlistLink = canManageWaitlist(user);
  const pendingCount = showWaitlistLink
    ? await pendingWaitlistCount().catch(() => 0)
    : 0;

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <span className="text-xl font-semibold text-slate-100">Sitecoder</span>
      </Link>
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {showWaitlistLink && (
          <Link
            href="/admin/waitlist"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
          >
            Waitlist
            {pendingCount > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500/20 px-1 text-xs font-semibold text-blue-400">
                {pendingCount}
              </span>
            )}
          </Link>
        )}
        <Link
          href="/chats"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
        >
          My apps
        </Link>
        {user ? (
          <form action={signOutAction}>
            <button
              type="submit"
              title={user.email}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-100"
            >
              Sign out
            </button>
          </form>
        ) : (
          <Link
            href="/login"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
          >
            Sign in
          </Link>
        )}
      </div>
    </header>
  );
}
