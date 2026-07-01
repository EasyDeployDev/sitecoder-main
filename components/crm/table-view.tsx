"use client";

import Link from "next/link";
import { useTransition } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import StatusSelect from "@/components/crm/status-select";
import StatusBadgeReadOnly from "@/components/crm/status-badge";
import type { CrmRecord, PropertyDefRecord } from "@/lib/crm-types";
import { setArchived } from "@/lib/crm";
import { MessageSquare, Archive, Database } from "lucide-react";

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

function renderPropertyValue(def: PropertyDefRecord, value: unknown) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground">—</span>;
  }
  if (def.type === "checkbox") {
    return <Checkbox checked={Boolean(value)} disabled />;
  }
  if (def.type === "multiSelect" && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v) => (
          <Badge key={String(v)} variant="secondary">
            {String(v)}
          </Badge>
        ))}
      </div>
    );
  }
  if (def.type === "select") {
    const opt = def.options.find((o) => o.id === value);
    return (
      <Badge
        variant="outline"
        style={{ borderColor: opt?.color, color: opt?.color }}
      >
        {opt?.label ?? String(value)}
      </Badge>
    );
  }
  if (def.type === "url") {
    return (
      <a
        href={String(value)}
        target="_blank"
        rel="noreferrer"
        className="text-blue-400 underline underline-offset-2"
        onClick={(e) => e.stopPropagation()}
      >
        {String(value)}
      </a>
    );
  }
  return <span>{String(value)}</span>;
}

export default function TableView({
  records,
  propertyDefs,
}: {
  records: CrmRecord[];
  propertyDefs: PropertyDefRecord[];
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tags</TableHead>
            {propertyDefs.map((def) => (
              <TableHead key={def.id}>{def.name}</TableHead>
            ))}
            <TableHead>Messages</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead className="w-9" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} className="group">
              <TableCell className="max-w-[280px]">
                <Link
                  href={`/chats/${record.id}`}
                  className="line-clamp-1 font-medium text-slate-100 hover:underline"
                >
                  {record.icon ? `${record.icon} ` : ""}
                  {record.title}
                </Link>
              </TableCell>
              <TableCell>
                {record.viewerRole === "VIEWER" ? (
                  <StatusBadgeReadOnly status={record.status} />
                ) : (
                  <StatusSelect chatId={record.id} status={record.status} />
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {record.tags.length === 0 && (
                    <span className="text-muted-foreground">—</span>
                  )}
                  {record.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              {propertyDefs.map((def) => (
                <TableCell key={def.id}>
                  {renderPropertyValue(def, record.properties[def.id])}
                </TableCell>
              ))}
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {record.messageCount}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {timeAgo(record.updatedAt)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                  <Link href={`/chats/${record.id}/data`} title="Open data record">
                    <Database className="h-4 w-4 text-muted-foreground hover:text-blue-400" />
                  </Link>
                  {record.viewerRole !== "VIEWER" && (
                    <button
                      title="Archive"
                      onClick={() =>
                        startTransition(() => setArchived(record.id, true))
                      }
                    >
                      <Archive className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5 + propertyDefs.length}
                className="py-10 text-center text-muted-foreground"
              >
                No records yet. Create a chat to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
