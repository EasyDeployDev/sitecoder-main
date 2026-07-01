// Shared types/constants for the Notion-style CRM data layer.
// Kept out of lib/crm.ts ("use server") because server action files may
// only export async functions — no plain objects/constants.

export const STATUS_OPTIONS = [
  { id: "Not started", label: "Not started", color: "#94a3b8" },
  { id: "In progress", label: "In progress", color: "#3b82f6" },
  { id: "In review", label: "In review", color: "#a855f7" },
  { id: "Done", label: "Done", color: "#22c55e" },
] as const;

export type StatusId = (typeof STATUS_OPTIONS)[number]["id"];

export type PropertyType =
  | "text"
  | "number"
  | "select"
  | "multiSelect"
  | "date"
  | "checkbox"
  | "url";

export type PropertyOption = { id: string; label: string; color: string };

export type PropertyDefRecord = {
  id: string;
  name: string;
  type: PropertyType;
  options: PropertyOption[];
  order: number;
};

export type CrmRecord = {
  id: string;
  title: string;
  prompt: string;
  status: string;
  tags: string[];
  archived: boolean;
  icon: string | null;
  properties: Record<string, unknown>;
  order: number;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string | null;
  // Effective role the current viewer holds on this record, computed at
  // read time by lib/crm.ts (not cached, since it depends on the viewer).
  viewerRole: "OWNER" | "EDITOR" | "VIEWER";
};
