import { memo } from "react";

import Link from "next/link";

function Header() {
  return (
    <header className="relative mx-auto flex w-full shrink-0 items-center justify-center py-6">
      <Link href="/" className="flex flex-row items-center gap-3">
        <span className="text-xl font-semibold text-gray-900">Sitecoder</span>
      </Link>
    </header>
  );
}

export default memo(Header);
