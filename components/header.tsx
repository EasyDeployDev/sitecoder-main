import { memo } from "react";

import Link from "next/link";

function Header() {
  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <span className="text-xl font-semibold text-slate-100">Sitecoder</span>
      </Link>
      <Link
        href="/chats"
        className="absolute right-6 top-1/2 -translate-y-1/2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-slate-100"
      >
        Workspace
      </Link>
    </header>
  );
}

export default memo(Header);
