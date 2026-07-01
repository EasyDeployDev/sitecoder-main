"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { STATUS_OPTIONS } from "@/lib/crm-types";
import { updateRecordStatus } from "@/lib/crm";
import StatusBadge from "@/components/crm/status-badge";

export default function StatusSelect({
  chatId,
  status,
}: {
  chatId: string;
  status: string;
}) {
  const [current, setCurrent] = useState(status);
  const [, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded transition hover:opacity-80">
          <StatusBadge status={current} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUS_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.id}
            onSelect={() => {
              setCurrent(opt.id);
              startTransition(() => {
                updateRecordStatus(chatId, opt.id);
              });
            }}
          >
            <StatusBadge status={opt.id} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
