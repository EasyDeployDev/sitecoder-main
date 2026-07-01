import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/(auth)/actions";

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <span className="text-xl font-semibold text-slate-100">Sitecoder</span>
      </Link>
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
        <Link
          href="/chats"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
        >
          Workspace
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
