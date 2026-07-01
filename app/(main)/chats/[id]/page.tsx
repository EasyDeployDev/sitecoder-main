import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import PageClient from "./page.client";
import { Metadata } from "next";
import { getCachedChatPage, getCachedChatMembersFor } from "@/lib/cached-db";
import { getCurrentUser } from "@/lib/auth";
import { canViewChat } from "@/lib/rbac";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // Await the params before accessing its properties
  const resolvedParams = await params;
  const chat = await getChatById(resolvedParams.id);

  if (!chat) {
    return {
      title: "Chat not found",
      description: "The requested chat could not be found.",
    };
  }

  return {
    title: `App: ${chat.title}`,
    description: `Building an app for ${chat.title} with ${chat.model}`,
    openGraph: {
      title: `App: ${chat.title}`,
      description: `Building an app for ${chat.title} with ${chat.model}`,
      type: "website",
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  const chat = await getChatById(id);

  if (!chat) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirectTo=/chats/${id}`);

  const memberMap = await getCachedChatMembersFor([id], user.id);
  const allowed = canViewChat(user, {
    ownerId: chat.ownerId,
    memberRole: memberMap[id] ?? null,
  });
  if (!allowed) notFound();

  return <PageClient chat={chat} />;
}

const getChatById = cache(async (id: string) => {
  return getCachedChatPage(id);
});

export type Chat = NonNullable<Awaited<ReturnType<typeof getChatById>>>;
export type Message = Chat["messages"][number];

export const maxDuration = 45;
