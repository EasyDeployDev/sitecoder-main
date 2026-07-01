import Header from "@/components/header";
import HomeForm from "./home-form";

export default function Home() {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0B0F19]">
      {/* Subtle background gradient — no halo image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59, 130, 246, 0.18), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(139, 92, 246, 0.10), transparent)",
        }}
      />

      <div className="isolate flex min-h-dvh flex-col">
        <Header />
        <HomeForm />
      </div>
    </div>
  );
}
