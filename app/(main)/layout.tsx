import Providers from "@/app/(main)/providers";
import { Toaster } from "@/components/ui/toaster";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Providers>
      <body className="flex min-h-full flex-col bg-[#0B0F19] text-slate-100 antialiased">
        {children}

        <Toaster />
      </body>
    </Providers>
  );
}
