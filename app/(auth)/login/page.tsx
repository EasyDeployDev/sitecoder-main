import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const user = await getCurrentUser();
  const { redirectTo } = await searchParams;
  if (user) redirect(redirectTo || "/chats");

  return (
    <div className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
      <div className="mb-6 text-center">
        <Link href="/" className="text-lg font-semibold text-slate-100">
          Sitecoder
        </Link>
        <h1 className="mt-3 text-xl font-semibold text-slate-100">
          Welcome back
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Sign in to access your workspace.
        </p>
      </div>

      <LoginForm redirectTo={redirectTo || "/chats"} />

      <p className="mt-6 text-center text-sm text-slate-400">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-blue-400 hover:text-blue-300"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
