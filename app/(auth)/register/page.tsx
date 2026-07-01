import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import RegisterForm from "./register-form";

export default async function RegisterPage({
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
          Create your account
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          The first account created becomes the workspace owner.
        </p>
      </div>

      <RegisterForm redirectTo={redirectTo || "/chats"} />

      <p className="mt-6 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link
          href={`/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`}
          className="font-medium text-blue-400 hover:text-blue-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
