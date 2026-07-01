"use server";

import { getPrisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  canDeleteChat,
  canEditChat,
  canManageWorkspace,
  canViewAllRecords,
  effectiveChatRole,
  ForbiddenError,
} from "@/lib/rbac";
import {
  getCachedChatMembersFor,
  getCachedPropertyDefs,
  getCachedWorkspaceRecords,
  invalidateChatCache,
  invalidatePropertyDefCache,
} from "@/lib/cached-db";
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
// Access control: reads/writes are scoped by lib/rbac.ts. Workspace
// admins/owners see and manage every record; regular members only see
// records they own or have been explicitly shared on via ChatMember.
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

async function assertCanEdit(chatId: string) {
  const user = await requireUser();
  if (canViewAllRecords(user)) return user;

  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { ownerId: true },
  });
  if (!chat) throw new ForbiddenError("Record not found.");

  const membership = await prisma.chatMember.findUnique({
    where: { chatId_userId: { chatId, userId: user.id } },
    select: { role: true },
  });

  const ok = canEditChat(user, {
    ownerId: chat.ownerId,
    memberRole: membership?.role,
  });
  if (!ok) throw new ForbiddenError("You don't have edit access to this record.");
  return user;
}

export async function listRecords(
  opts: { includeArchived?: boolean } = {},
): Promise<CrmRecord[]> {
  const user = await requireUser();
  const rows = await getCachedWorkspaceRecords(opts);

  const seeAll = canViewAllRecords(user);
  const sharedRows = rows.filter((r) => r.ownerId !== user.id);

  let memberMap: Record<string, "OWNER" | "EDITOR" | "VIEWER"> = {};
  if (!seeAll && sharedRows.length > 0) {
    memberMap = await getCachedChatMembersFor(
      sharedRows.map((r) => r.id),
      user.id,
    );
  }

  const visible: CrmRecord[] = [];
  for (const row of rows) {
    const role = effectiveChatRole(user, {
      ownerId: row.ownerId,
      memberRole: memberMap[row.id] ?? null,
    });
    if (!seeAll && !role) continue;
    visible.push({ ...row, viewerRole: role ?? "VIEWER" });
  }

  return visible;
}

export async function listPropertyDefs(): Promise<PropertyDefRecord[]> {
  await requireUser();
  return getCachedPropertyDefs();
}

export async function createPropertyDef(input: {
  name: string;
  type: PropertyType;
  options?: string[];
}): Promise<PropertyDefRecord> {
  const user = await requireUser();
  if (!canManageWorkspace(user)) {
    throw new ForbiddenError("Only workspace admins can edit the schema.");
  }

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

  invalidatePropertyDefCache();
  revalidatePath("/chats");
  return toPropertyDefRecord(row);
}

export async function deletePropertyDef(id: string): Promise<void> {
  const user = await requireUser();
  if (!canManageWorkspace(user)) {
    throw new ForbiddenError("Only workspace admins can edit the schema.");
  }

  const prisma = getPrisma();
  await prisma.propertyDef.delete({ where: { id } });
  invalidatePropertyDefCache();
  revalidatePath("/chats");
}

export async function updateRecordStatus(
  id: string,
  status: string,
): Promise<void> {
  await assertCanEdit(id);
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { status } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function updateRecordOrder(
  id: string,
  order: number,
): Promise<void> {
  await assertCanEdit(id);
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { order } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function updateRecordTags(
  id: string,
  tags: string[],
): Promise<void> {
  await assertCanEdit(id);
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { tags } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function updateRecordTitle(
  id: string,
  title: string,
): Promise<void> {
  await assertCanEdit(id);
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { title } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function updateRecordProperty(
  id: string,
  key: string,
  value: unknown,
): Promise<void> {
  await assertCanEdit(id);
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
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function setArchived(
  id: string,
  archived: boolean,
): Promise<void> {
  await assertCanEdit(id);
  const prisma = getPrisma();
  await prisma.chat.update({ where: { id }, data: { archived } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}

export async function deleteRecord(id: string): Promise<void> {
  const user = await requireUser();
  if (!canViewAllRecords(user)) {
    const prisma = getPrisma();
    const chat = await prisma.chat.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!chat) throw new ForbiddenError("Record not found.");
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId: id, userId: user.id } },
      select: { role: true },
    });
    const ok = canDeleteChat(user, {
      ownerId: chat.ownerId,
      memberRole: membership?.role,
    });
    if (!ok) throw new ForbiddenError("Only the owner can delete this record.");
  }

  const prisma = getPrisma();
  await prisma.chat.delete({ where: { id } });
  invalidateChatCache(id);
  revalidatePath("/chats");
}
