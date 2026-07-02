"use server";

import { getPrisma } from "@/lib/prisma";
import { invalidateMessageCache } from "@/lib/cached-db";
import { nextMessagePosition } from "@/lib/messages";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canEditChat, canViewAllRecords, ForbiddenError } from "@/lib/rbac";

export async function createMessage(
  chatId: string,
  text: string,
  role: "assistant" | "user",
  files?: { path: string; content: string }[],
) {
  const user = await requireUser();
  const prisma = getPrisma();
  const chat = await prisma.chat.findUnique({
    where: { id: chatId },
    select: { id: true, ownerId: true },
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

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  const newMessage = await prisma.$transaction(async (tx) => {
    const position = await nextMessagePosition(tx, chatId);
    return tx.message.create({
      data: {
        role,
        content: trimmed,
        files: files ? JSON.parse(JSON.stringify(files)) : null,
        position,
        chatId,
      },
    });
  });

  invalidateMessageCache(chatId, newMessage.id);
  return newMessage;
}
