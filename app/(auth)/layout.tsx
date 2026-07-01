export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <body className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0B0F19] px-4 text-slate-100 antialiased">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59, 130, 246, 0.18), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(139, 92, 246, 0.10), transparent)",
        }}
      />
      <div className="isolate w-full max-w-sm">{children}</div>
    </body>
  );
}
