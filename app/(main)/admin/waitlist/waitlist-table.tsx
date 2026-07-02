"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { approveUser, rejectUser, resetToPending } from "@/lib/waitlist";
import type { WaitlistEntry } from "@/lib/waitlist";
import { timeAgo } from "@/lib/utils";
import { Check, RotateCcw, X } from "lucide-react";

function statusVariant(status: WaitlistEntry["status"]) {
  if (status === "APPROVED") return "default" as const;
  if (status === "REJECTED") return "destructive" as const;
  return "secondary" as const;
}

export default function WaitlistTable({
  entries,
  currentUserId,
}: {
  entries: WaitlistEntry[];
  currentUserId: string;
}) {
  const [items, setItems] = useState(entries);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function run(id: string, action: (id: string) => Promise<void>) {
    startTransition(async () => {
      await action(id);
      router.refresh();
    });
  }

  const pending = items.filter((e) => e.status === "PENDING");
  const reviewed = items.filter((e) => e.status !== "PENDING");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-400">
          Pending ({pending.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium text-slate-100">
                    {entry.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {timeAgo(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        disabled={isPending}
                        onClick={() => run(entry.id, approveUser)}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isPending}
                        onClick={() => run(entry.id, rejectUser)}
                      >
                        <X className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pending.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Nobody&apos;s waiting — you&apos;re all caught up.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-slate-400">
          Reviewed ({reviewed.length})
        </h2>
        <div className="overflow-hidden rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reviewed</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium text-slate-100">
                    {entry.email}
                    {entry.id === currentUserId && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (you)
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(entry.status)}>
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.reviewedAt ? timeAgo(entry.reviewedAt) : "—"}
                  </TableCell>
                  <TableCell>
                    <button
                      title="Move back to pending"
                      disabled={isPending}
                      onClick={() => run(entry.id, resetToPending)}
                      className="text-muted-foreground transition hover:text-blue-400"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
              {reviewed.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No reviewed accounts yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
