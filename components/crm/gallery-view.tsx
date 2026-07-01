"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import StatusBadge from "@/components/crm/status-badge";
import type { CrmRecord } from "@/lib/crm-types";
import { ArrowUpRight, Database, MessageSquare, Sparkles } from "lucide-react";

function timeAgo(date: Date) {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// Each record is rendered as its own micro app / sub-app tile — a small,
// self-contained app generated from a single chat — rather than a generic
// CRM row. This is the primary/default view for the workspace.
export default function GalleryView({ records }: { records: CrmRecord[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record) => (
        <Link key={record.id} href={`/chats/${record.id}`} className="group">
          <Card className="relative flex h-full flex-col justify-between overflow-hidden border-slate-700/50 bg-slate-900/80 transition hover:-translate-y-0.5 hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-lg">
                  {record.icon ?? "✨"}
                </span>
                <StatusBadge status={record.status} />
              </div>
              <p className="line-clamp-2 pt-1 text-sm font-medium text-slate-100">
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
                {record.tags.length === 0 && (
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <Sparkles className="h-3 w-3" />
                    micro app
                  </span>
                )}
              </div>
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {record.messageCount}
              </span>
            </CardContent>
            <div className="flex items-center justify-between border-t border-slate-800 px-6 py-2.5 text-[11px] text-slate-500">
              <span>{timeAgo(record.updatedAt)}</span>
              <span className="flex items-center gap-3 opacity-0 transition group-hover:opacity-100">
                <Link
                  href={`/chats/${record.id}/data`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-blue-400"
                  title="Open data record"
                >
                  <Database className="h-3 w-3" />
                  Data
                </Link>
                <span className="inline-flex items-center gap-1 font-medium text-slate-400">
                  Open app
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </span>
            </div>
          </Card>
        </Link>
      ))}
      {records.length === 0 && (
        <div className="col-span-full flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
          <Sparkles className="h-5 w-5 text-slate-500" />
          <p>No apps yet. Create a chat to generate your first micro app.</p>
        </div>
      )}
    </div>
  );
}
