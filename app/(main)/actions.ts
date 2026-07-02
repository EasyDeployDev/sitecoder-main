"use server";

import { getPrisma } from "@/lib/prisma";
import { invalidateMessageCache } from "@/lib/cached-db";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canEditChat, canViewAllRecords, ForbiddenError } from "@/lib/rbac";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: any[],
) {
  const user = await requireUser();
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    include: { messages: true },
  });
  if (!chat) notFound();

  if (!canViewAllRecords(user)) {
    const membership = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: user.id } },
      select: { role: true },
    });
    const allowed = canEditChat(user, {
      ownerId: chat.ownerId,
      memberRole: membership?.role,
    });
    if (!allowed) {
      throw new ForbiddenError("You don't have edit access to this chat.");
    }
  }

  const maxPosition = chat.messages.reduce(
    (max, message) => Math.max(max, message.position),
    -1,
  );

  const newMessage = await prisma.message.create({
    data: {
      role,
      content: text,
      files: files ? JSON.parse(JSON.stringify(files)) : null,
      position: maxPosition + 1,
      chatId,
    },
  });

  invalidateMessageCache(chatId, newMessage.id);
  return newMessage;
}
