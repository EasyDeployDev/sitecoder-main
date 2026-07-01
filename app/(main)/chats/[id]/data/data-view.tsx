"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatusSelect from "@/components/crm/status-select";
import StatusBadgeReadOnly from "@/components/crm/status-badge";
import TitleField from "./title-field";
import TagsField from "./tags-field";
import PropertyField from "./property-field";
import type { CrmRecord, PropertyDefRecord } from "@/lib/crm-types";
import { setArchived, deleteRecord } from "@/lib/crm";
import { Archive, ArchiveRestore, MessageSquare, Trash2 } from "lucide-react";

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

export default function DataView({
  record,
  propertyDefs,
}: {
  record: CrmRecord;
  propertyDefs: PropertyDefRecord[];
}) {
  const readOnly = record.viewerRole === "VIEWER";
  const canDelete = record.viewerRole === "OWNER";
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <TitleField
            chatId={record.id}
            title={record.title}
            readOnly={readOnly}
          />
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {record.prompt}
          </p>
        </div>
        <Link
          href={`/chats/${record.id}`}
          className="shrink-0 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
        >
          Open conversation
        </Link>
      </div>

      <Card className="flex flex-col divide-y divide-slate-800 border-slate-800 bg-slate-900/60 p-0">
        <Row label="Status">
          {readOnly ? (
            <StatusBadgeReadOnly status={record.status} />
          ) : (
            <StatusSelect chatId={record.id} status={record.status} />
          )}
        </Row>

        <Row label="Tags">
          <TagsField chatId={record.id} tags={record.tags} readOnly={readOnly} />
        </Row>

        <Row label="Owner">
          <span className="text-sm text-slate-300">
            {record.ownerId ?? "Unowned"}
          </span>
        </Row>

        <Row label="Your access">
          <span className="text-sm text-slate-300">{record.viewerRole}</span>
        </Row>

        <Row label="Messages">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-300">
            <MessageSquare className="h-3.5 w-3.5" />
            {record.messageCount}
          </span>
        </Row>

        <Row label="Updated">
          <span className="text-sm text-slate-300">
            {timeAgo(record.updatedAt)}
          </span>
        </Row>

        {propertyDefs.map((def) => (
          <Row key={def.id} label={def.name}>
            <PropertyField
              chatId={record.id}
              def={def}
              value={record.properties[def.id]}
              readOnly={readOnly}
            />
          </Row>
        ))}
      </Card>

      {!readOnly && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await setArchived(record.id, !record.archived);
                router.refresh();
              })
            }
          >
            {record.archived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" />
                Archive
              </>
            )}
          </Button>
          {canDelete && (
            <Button
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteRecord(record.id);
                  router.push("/chats");
                })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-4 px-5 py-3">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <div>{children}</div>
    </div>
  );
}
