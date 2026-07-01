"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createPropertyDef } from "@/lib/crm";
import type { PropertyType } from "@/lib/crm-types";
import { Plus } from "lucide-react";

const TYPE_LABELS: Record<PropertyType, string> = {
  text: "Text",
  number: "Number",
  select: "Select",
  multiSelect: "Multi-select",
  date: "Date",
  checkbox: "Checkbox",
  url: "URL",
};

export default function AddPropertyDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<PropertyType>("text");
  const [optionsInput, setOptionsInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const needsOptions = type === "select" || type === "multiSelect";

  function handleSubmit() {
    if (!name.trim()) return;
    const options = optionsInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    startTransition(async () => {
      await createPropertyDef({ name: name.trim(), type, options });
      setOpen(false);
      setName("");
      setOptionsInput("");
      setType("text");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" />
          Property
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New property</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="prop-name">Name</Label>
            <Input
              id="prop-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priority, Owner, Due date"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Select
              value={type}
              onValueChange={(v) => setType(v as PropertyType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {needsOptions && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prop-options">Options (comma separated)</Label>
              <Input
                id="prop-options"
                value={optionsInput}
                onChange={(e) => setOptionsInput(e.target.value)}
                placeholder="Low, Medium, High"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !name.trim()}
          >
            {isPending ? "Adding…" : "Add property"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
