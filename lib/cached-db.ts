import { getPrisma } from "@/lib/prisma";
import { kvInvalidateTags, kvRemember } from "@/lib/kv-cache";
import type { CrmRecord, PropertyDefRecord } from "@/lib/crm-types";

const SECOND = 1000;
const MINUTE = 60 * SECOND;

export const CACHE_TAGS = {
  workspace: "workspace",
  propertyDefs: "property-defs",
  share: "share",
  generatedApps: "generated-apps",
  chat: (id: string) => `chat:${id}`,
  message: (id: string) => `message:${id}`,
  generatedApp: (id: string) => `generated-app:${id}`,
};

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
    type: row.type as PropertyDefRecord["type"],
    options: Array.isArray(row.options)
      ? (row.options as PropertyDefRecord["options"])
      : [],
    order: row.order,
  };
}

type ChatRow = {
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
  ownerId: string | null;
  _count?: { messages: number };
};

// NOTE: viewerRole is intentionally left off this raw cache row — it's
// computed per-viewer in lib/crm.ts (via lib/rbac.ts) and must never be
// cached, since the same underlying row can look different to different
// users.
function toCachedChatRow(row: ChatRow) {
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
    ownerId: row.ownerId,
  };
}

export type CachedChatRow = ReturnType<typeof toCachedChatRow>;

export async function getCachedWorkspaceRecords(
  opts: { includeArchived?: boolean } = {},
): Promise<CachedChatRow[]> {
  const includeArchived = Boolean(opts.includeArchived);

  return kvRemember(
    `db:workspace:${includeArchived ? "all" : "active"}`,
    {
      ttlMs: 30 * SECOND,
      tags: [CACHE_TAGS.workspace],
    },
    async () => {
      const prisma = getPrisma();
      const rows = await prisma.chat.findMany({
        where: includeArchived ? {} : { archived: false },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        include: { _count: { select: { messages: true } } },
      });
      return rows.map(toCachedChatRow);
    },
  );
}

// Membership rows for a set of chats, used to compute each viewer's
// effective per-record role on top of the shared workspace cache. Cached
// separately (and briefly) since membership changes are rare but must
// never be baked into the shared CrmRecord cache above.
export async function getCachedChatMembersFor(
  chatIds: string[],
  userId: string,
): Promise<Record<string, "OWNER" | "EDITOR" | "VIEWER">> {
  if (chatIds.length === 0) return {};
  return kvRemember(
    `db:chat-members:${userId}:${chatIds.slice().sort().join(",")}`,
    {
      ttlMs: 30 * SECOND,
      tags: [CACHE_TAGS.workspace],
    },
    async () => {
      const prisma = getPrisma();
      const rows = await prisma.chatMember.findMany({
        where: { chatId: { in: chatIds }, userId },
        select: { chatId: true, role: true },
      });
      const map: Record<string, "OWNER" | "EDITOR" | "VIEWER"> = {};
      for (const row of rows) {
        map[row.chatId] = row.role as "OWNER" | "EDITOR" | "VIEWER";
      }
      return map;
    },
  );
}

export async function getCachedPropertyDefs(): Promise<PropertyDefRecord[]> {
  return kvRemember(
    "db:property-defs",
    {
      ttlMs: 5 * MINUTE,
      tags: [CACHE_TAGS.propertyDefs, CACHE_TAGS.workspace],
    },
    async () => {
      const prisma = getPrisma();
      const rows = await prisma.propertyDef.findMany({
        orderBy: { order: "asc" },
      });
      return rows.map(toPropertyDefRecord);
    },
  );
}

export async function getCachedChatPage(chatId: string) {
  return kvRemember(
    `db:chat-page:${chatId}`,
    {
      ttlMs: 20 * SECOND,
      tags: [CACHE_TAGS.chat(chatId), CACHE_TAGS.workspace],
    },
    async () => {
      const prisma = getPrisma();
      const chat = await prisma.chat.findFirst({
        where: { id: chatId },
      });

      if (!chat) return null;

      const totalMessages = await prisma.message.count({
        where: { chatId },
      });

      const initialMessages = await prisma.message.findMany({
        where: {
          chatId,
          position: { in: [0, 1] },
        },
        orderBy: { position: "asc" },
      });

      const recentMessages = await prisma.message.findMany({
        where: {
          chatId,
          position: { gte: 2 },
        },
        orderBy: { position: "desc" },
        take: 100,
      });

      const allMessages = [...initialMessages, ...recentMessages].sort(
        (a, b) => a.position - b.position,
      );

      const assistantMessagesInLoaded = allMessages.filter(
        (m) => m.role === "assistant",
      );
      let assistantMessagesCountBefore = 0;
      if (assistantMessagesInLoaded.length > 0) {
        const minPosition = Math.min(
          ...assistantMessagesInLoaded.map((m) => m.position),
        );
        assistantMessagesCountBefore = await prisma.message.count({
          where: {
            chatId,
            role: "assistant",
            position: { lt: minPosition },
          },
        });
      }

      return {
        ...chat,
        messages: allMessages,
        totalMessages,
        assistantMessagesCountBefore,
      };
    },
  );
}

export async function getCachedGeneratedApp(id: string) {
  return kvRemember(
    `db:generated-app:${id}`,
    {
      ttlMs: 10 * MINUTE,
      tags: [
        CACHE_TAGS.share,
        CACHE_TAGS.generatedApps,
        CACHE_TAGS.generatedApp(id),
      ],
    },
    async () => {
      const prisma = getPrisma();
      return prisma.generatedApp.findUnique({
        where: { id },
      });
    },
  );
}

export async function getCachedMessageWithChat(messageId: string) {
  return kvRemember(
    `db:message-with-chat:${messageId}`,
    {
      ttlMs: 2 * MINUTE,
      tags: [CACHE_TAGS.share, CACHE_TAGS.message(messageId)],
    },
    async () => {
      const prisma = getPrisma();
      return prisma.message.findUnique({
        where: { id: messageId },
        include: { chat: true },
      });
    },
  );
}

export async function getCachedMessageForGeneration(messageId: string) {
  return kvRemember(
    `db:generation-message:${messageId}`,
    {
      ttlMs: 30 * SECOND,
      tags: [CACHE_TAGS.message(messageId)],
    },
    async () => {
      const prisma = getPrisma();
      return prisma.message.findUnique({
        where: { id: messageId },
      });
    },
  );
}

export async function getCachedMessagesForGeneration(
  chatId: string,
  maxPosition: number,
) {
  return kvRemember(
    `db:generation-messages:${chatId}:${maxPosition}`,
    {
      ttlMs: 30 * SECOND,
      tags: [CACHE_TAGS.chat(chatId)],
    },
    async () => {
      const prisma = getPrisma();
      return prisma.message.findMany({
        where: { chatId, position: { lte: maxPosition } },
        orderBy: { position: "asc" },
      });
    },
  );
}

export function invalidateChatCache(chatId: string) {
  kvInvalidateTags([CACHE_TAGS.chat(chatId), CACHE_TAGS.workspace]);
}

export function invalidateMessageCache(chatId: string, messageId?: string) {
  kvInvalidateTags([
    CACHE_TAGS.chat(chatId),
    CACHE_TAGS.workspace,
    CACHE_TAGS.share,
    ...(messageId ? [CACHE_TAGS.message(messageId)] : []),
  ]);
}

export function invalidatePropertyDefCache() {
  kvInvalidateTags([CACHE_TAGS.propertyDefs, CACHE_TAGS.workspace]);
}
