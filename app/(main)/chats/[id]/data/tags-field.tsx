"use client";

import { useState, useTransition, type KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { updateRecordTags } from "@/lib/crm";

export default function TagsField({
  chatId,
  tags,
  readOnly,
}: {
  chatId: string;
  tags: string[];
  readOnly: boolean;
}) {
  const [local, setLocal] = useState(tags);
  const [draft, setDraft] = useState("");
  const [, startTransition] = useTransition();

  function commit(next: string[]) {
    setLocal(next);
    startTransition(() => {
      updateRecordTags(chatId, next);
    });
  }

  function addTag() {
    const value = draft.trim();
    if (!value || local.includes(value)) {
      setDraft("");
      return;
    }
    commit([...local, value]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && local.length > 0) {
      commit(local.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {local.length === 0 && readOnly && (
        <span className="text-muted-foreground">—</span>
      )}
      {local.map((tag) => (
        <Badge key={tag} variant="secondary" className="gap-1">
          {tag}
          {!readOnly && (
            <button
              onClick={() => commit(local.filter((t) => t !== tag))}
              className="ml-0.5 rounded-full hover:text-destructive"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </Badge>
      ))}
      {!readOnly && (
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addTag}
          placeholder="Add tag…"
          className="h-7 w-28 border-none bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0"
        />
      )}
    </div>
  );
}
