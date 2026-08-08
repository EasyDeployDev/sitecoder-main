import Link from "next/link";
import { SignUp } from "@clerk/nextjs";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex w-full flex-col items-center gap-4">
      <Link href="/" className="text-lg font-semibold text-slate-100">
        Sitecoder
      </Link>
      <SignUp
        routing="hash"
        forceRedirectUrl={redirectTo || "/access"}
        signInUrl="/login"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-slate-900 border border-slate-700 shadow-2xl",
          },
        }}
      />
    </div>
  );
}
