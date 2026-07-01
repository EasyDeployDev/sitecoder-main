"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type {
  CrmRecord,
  PropertyDefRecord,
  PropertyOption,
  PropertyType,
} from "@/lib/crm-types";

// --- Notion-style CRM data layer over the Chat model ---
//
// Every Chat acts as a "record" in a database. Built-in columns (status,
// tags, archived, icon) live directly on the Chat model; ad-hoc custom
// columns are stored as key/value pairs inside `properties` (Json) and
// described by PropertyDef rows (the "database schema").
//
// NOTE: constants/types live in lib/crm-types.ts because this file is a
// "use server" module, which may only export async functions.

const PALETTE = [
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
  "#94a3b8",
];

function pickColor(seed: number) {
  return PALETTE[seed % PALETTE.length];
}

function toPropertyDefRecord(row: {
  id: string;
  name: string;
  type: string;
  options: unknown;
  order: number;
}): PropertyDefRecord {
  return {
    id: row.id,
    name: row.name,
    type: row.type as PropertyType,
    options: Array.isArray(row.options) ? (row.options as PropertyOption[]) : [],
    order: row.order,
  };
}

function toCrmRecord(row: {
  id: string;
  title: string;
  prompt: string;
  status: string;
  tags: string[];
  archived: boolean;
  icon: string | null;
  properties: unknown;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  _count?: { messages: number };
}): CrmRecord {
  return {
    id: row.id,
    title: row.title || row.prompt.slice(0, 60) || "Untitled",
    prompt: row.prompt,
    status: row.status,
    tags: row.tags ?? [],
    archived: row.archived,
    icon: row.icon,
    properties: (row.properties as Record<string, unknown>) ?? {},
    order: row.order,
    messageCount: row._count?.messages ?? 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listRecords(
  opts: { includeArchived?: boolean } = {},
): Promise<CrmRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.chat.findMany({
    where: opts.includeArchived ? {} : { archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { messages: true } } },
  });
  return rows.map(toCrmRecord);
}

export async function listPropertyDefs(): Promise<PropertyDefRecord[]> {
  const prisma = getPrisma();
  const rows = await prisma.propertyDef.findMany({
    orderBy: { order: "asc" },
  });
  return rows.map(toPropertyDefRecord);
}

export async function createPropertyDef(input: {
  name: string;
  type: PropertyType;
  options?: string[];
}): Promise<PropertyDefRecord> {
  const prisma = getPrisma();
  const count = await prisma.propertyDef.count();
  const options: PropertyOption[] = (input.options ?? []).map((label, i) => ({
    id: label.toLowerCase().replace(/\s+/g, "-"),
    label,
    color: pickColor(i),
  }));

  const row = await prisma.propertyDef.create({
    data: {
      name: input.name,
      type: input.type,
      options: options as unknown as object,
      order: count,
    },
  });

  revalidatePath("/chats");
  return toPropertyDefRecord(row);
}

export async function deletePropertyDef(id: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.propertyDef.delete({ where: { id } });
  revalidatePath("/chats");
}

export async function updateRecordStatus(
  id: string,
  status: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { status } });
  revalidatePath("/chats");
}

export async function updateRecordOrder(
  id: string,
  order: number,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { order } });
  revalidatePath("/chats");
}

export async function updateRecordTags(
  id: string,
  tags: string[],
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { tags } });
  revalidatePath("/chats");
}

export async function updateRecordTitle(
  id: string,
  title: string,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { title } });
  revalidatePath("/chats");
}

export async function updateRecordProperty(
  id: string,
  key: string,
  value: unknown,
): Promise<void> {
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id },
    select: { properties: true },
  });
  const existing = (chat?.properties as Record<string, unknown>) ?? {};
  const next = { ...existing, [key]: value };
  await prisma.chat.update({
    where: { id },
    data: { properties: next as unknown as object },
  });
  revalidatePath("/chats");
}

export async function setArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { archived } });
  revalidatePath("/chats");
}

export async function deleteRecord(id: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.chat.delete({ where: { id } });
  revalidatePath("/chats");
}
