"use client";

import { useState, useTransition } from "react";
import { updateRecordTitle } from "@/lib/crm";

export default function TitleField({
  chatId,
  title,
  readOnly,
}: {
  chatId: string;
  title: string;
  readOnly: boolean;
}) {
  const [value, setValue] = useState(title);
  const [, startTransition] = useTransition();

  if (readOnly) {
    return (
      <h1 className="text-2xl font-semibold text-slate-100">{title}</h1>
    );
  }

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const next = value.trim() || "Untitled";
        setValue(next);
        if (next !== title) {
          startTransition(() => {
            updateRecordTitle(chatId, next);
          });
        }
      }}
      className="w-full bg-transparent text-2xl font-semibold text-slate-100 outline-none focus:border-b focus:border-blue-500/40"
    />
  );
}
