"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { updateRecordProperty } from "@/lib/crm";
import type { PropertyDefRecord } from "@/lib/crm-types";
import { ChevronDown } from "lucide-react";

export default function PropertyField({
  chatId,
  def,
  value,
  readOnly,
}: {
  chatId: string;
  def: PropertyDefRecord;
  value: unknown;
  readOnly: boolean;
}) {
  const [, startTransition] = useTransition();
  const [local, setLocal] = useState(value);

  function commit(next: unknown) {
    setLocal(next);
    startTransition(() => {
      updateRecordProperty(chatId, def.id, next);
    });
  }

  if (def.type === "checkbox") {
    return (
      <Checkbox
        checked={Boolean(local)}
        disabled={readOnly}
        onCheckedChange={(checked) => commit(Boolean(checked))}
      />
    );
  }

  if (def.type === "select") {
    if (readOnly) {
      const opt = def.options.find((o) => o.id === local);
      return opt ? (
        <Badge variant="outline" style={{ borderColor: opt.color, color: opt.color }}>
          {opt.label}
        </Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between gap-2">
            {(() => {
              const opt = def.options.find((o) => o.id === local);
              return opt ? (
                <span style={{ color: opt.color }}>{opt.label}</span>
              ) : (
                <span className="text-muted-foreground">Set {def.name}</span>
              );
            })()}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {def.options.map((opt) => (
            <button
              key={opt.id}
              onClick={() => commit(opt.id)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent/40"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
              {opt.label}
            </button>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (def.type === "multiSelect") {
    const selected = Array.isArray(local) ? (local as string[]) : [];
    if (readOnly) {
      return (
        <div className="flex flex-wrap gap-1">
          {selected.length === 0 && (
            <span className="text-muted-foreground">—</span>
          )}
          {selected.map((id) => {
            const opt = def.options.find((o) => o.id === id);
            return (
              <Badge key={id} variant="secondary">
                {opt?.label ?? id}
              </Badge>
            );
          })}
        </div>
      );
    }
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="justify-between gap-2">
            <span className="flex flex-wrap gap-1">
              {selected.length === 0 ? (
                <span className="text-muted-foreground">Set {def.name}</span>
              ) : (
                selected.map((id) => (
                  <Badge key={id} variant="secondary" className="text-[10px]">
                    {def.options.find((o) => o.id === id)?.label ?? id}
                  </Badge>
                ))
              )}
            </span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {def.options.map((opt) => (
            <DropdownMenuCheckboxItem
              key={opt.id}
              checked={selected.includes(opt.id)}
              onCheckedChange={(checked) => {
                const next = checked
                  ? [...selected, opt.id]
                  : selected.filter((id) => id !== opt.id);
                commit(next);
              }}
            >
              {opt.label}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (def.type === "url") {
    if (readOnly) {
      return local ? (
        <a
          href={String(local)}
          target="_blank"
          rel="noreferrer"
          className="text-blue-400 underline underline-offset-2"
        >
          {String(local)}
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    }
    return (
      <Input
        type="url"
        defaultValue={typeof local === "string" ? local : ""}
        placeholder="https://…"
        onBlur={(e) => commit(e.target.value)}
      />
    );
  }

  if (def.type === "number") {
    if (readOnly) {
      return (
        <span>{typeof local === "number" ? local : (local as string) || "—"}</span>
      );
    }
    return (
      <Input
        type="number"
        defaultValue={typeof local === "number" ? local : ""}
        onBlur={(e) =>
          commit(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    );
  }

  if (def.type === "date") {
    if (readOnly) {
      return (
        <span>
          {local ? new Date(String(local)).toLocaleDateString() : "—"}
        </span>
      );
    }
    return (
      <Input
        type="date"
        defaultValue={typeof local === "string" ? local : ""}
        onChange={(e) => commit(e.target.value)}
      />
    );
  }

  // text (default)
  if (readOnly) {
    return <span>{typeof local === "string" && local ? local : "—"}</span>;
  }
  return (
    <Input
      defaultValue={typeof local === "string" ? local : ""}
      placeholder={`Set ${def.name}`}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}
