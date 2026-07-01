"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatusBadge from "@/components/crm/status-badge";
import type { CrmRecord } from "@/lib/crm-types";
import { MessageSquare } from "lucide-react";

export default function GalleryView({ records }: { records: CrmRecord[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record) => (
        <Link key={record.id} href={`/chats/${record.id}`}>
          <Card className="flex h-full flex-col justify-between bg-slate-900/80 transition hover:border-slate-600">
            <CardHeader>
              <div className="flex items-center justify-between">
                <span className="text-2xl">{record.icon ?? "💬"}</span>
                <StatusBadge status={record.status} />
              </div>
              <p className="line-clamp-2 text-sm font-medium text-slate-100">
                {record.title}
              </p>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-1">
                {record.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px]">
                    {tag}
                  </Badge>
                ))}
              </div>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {record.messageCount}
              </span>
            </CardContent>
          </Card>
        </Link>
      ))}
      {records.length === 0 && (
        <div className="col-span-full py-10 text-center text-muted-foreground">
          No records yet. Create a chat to get started.
        </div>
      )}
    </div>
  );
}
