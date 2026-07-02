import { cn } from "@/lib/utils";

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const toneClasses: Record<string, string> = {
    default: "bg-blue-500/15 text-blue-400",
    warning: "bg-amber-500/15 text-amber-400",
    danger: "bg-rose-500/15 text-rose-400",
    success: "bg-emerald-500/15 text-emerald-400",
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800/80 bg-[#0E1420] p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        {Icon && (
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md",
              toneClasses[tone],
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <span className="text-2xl font-semibold text-slate-100">{value}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </div>
  );
}
