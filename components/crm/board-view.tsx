"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import StatusBadge, { statusColor } from "@/components/crm/status-badge";
import { updateRecordStatus } from "@/lib/crm";
import { STATUS_OPTIONS } from "@/lib/crm-types";
import type { CrmRecord } from "@/lib/crm-types";
import { MessageSquare } from "lucide-react";

export default function BoardView({ records }: { records: CrmRecord[] }) {
  const [items, setItems] = useState(records);
  const [dragId, setDragId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function moveTo(id: string, status: string) {
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status } : r)),
    );
    startTransition(() => {
      updateRecordStatus(id, status);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STATUS_OPTIONS.map((col) => {
        const colItems = items.filter((r) => r.status === col.id);
        return (
          <div
            key={col.id}
            className="flex w-72 shrink-0 flex-col gap-2 rounded-lg bg-slate-900/40 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              if (id) moveTo(id, col.id);
              setDragId(null);
            }}
          >
            <div className="flex items-center justify-between px-1 py-1">
              <StatusBadge status={col.id} />
              <span className="text-xs text-muted-foreground">
                {colItems.length}
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {colItems.map((record) => (
                <Card
                  key={record.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", record.id);
                    setDragId(record.id);
                  }}
                  className="cursor-grab bg-slate-900/80 p-3 transition hover:border-slate-600 active:cursor-grabbing"
                >
                  <Link
                    href={`/chats/${record.id}`}
                    className="line-clamp-2 text-sm font-medium text-slate-100 hover:underline"
                  >
                    {record.icon ? `${record.icon} ` : ""}
                    {record.title}
                  </Link>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {record.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {record.messageCount}
                    </span>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: statusColor(record.status) }}
                    />
                  </div>
                </Card>
              ))}
              {colItems.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-700 p-4 text-center text-xs text-muted-foreground">
                  Drop here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
