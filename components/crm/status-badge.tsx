import { STATUS_OPTIONS } from "@/lib/crm-types";
import { cn } from "@/lib/utils";

export function statusColor(status: string): string {
  return STATUS_OPTIONS.find((s) => s.id === status)?.color ?? "#94a3b8";
}

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const color = statusColor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium",
        className,
      )}
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}1a`,
        color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {status}
    </span>
  );
}
