import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient | {
  message: Prisma.TransactionClient["message"];
};

export async function nextMessagePosition(
  db: Db,
  chatId: string,
): Promise<number> {
  const result = await db.message.aggregate({
    where: { chatId },
    _max: { position: true },
  });
  return (result._max.position ?? -1) + 1;
}

export function deriveChatTitle(prompt: string, maxLen = 60): string {
  const trimmed = prompt.trim().replace(/\s+/g, " ");
  if (!trimmed) return "Untitled app";
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}
