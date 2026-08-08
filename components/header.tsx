import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceAdmin } from "@/lib/rbac";

export default async function Header() {
  const user = await getCurrentUser();
  const showAdmin = isWorkspaceAdmin(user);

  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <span className="text-xl font-semibold text-slate-100">Sitecoder</span>
      </Link>
      <div className="absolute right-6 top-1/2 flex -translate-y-1/2 items-center gap-2">
        {showAdmin && (
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
          >
            Admin
          </Link>
        )}
        <Link
          href="/chats"
          className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
        >
          My apps
        </Link>
        {user ? (
          <>
            {!user.hasAccessPass &&
              user.role !== "OWNER" &&
              user.role !== "ADMIN" && (
                <Link
                  href="/access"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-amber-300 transition hover:bg-white/5"
                >
                  Get Access
                </Link>
              )}
            <UserButton />
          </>
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
