"use client";

import { createMessage } from "@/app/(main)/actions";
import LogoSmall from "@/components/icons/logo-small";
import { extractAllCodeBlocks } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { memo, startTransition, use, useEffect, useRef, useState } from "react";
import { ChatCompletionStream } from "together-ai/lib/ChatCompletionStream.mjs";
import ChatBox from "./chat-box";
import ChatLog from "./chat-log";
import type { Chat } from "./page";
import { Context } from "../../providers";

const HeaderChat = memo(({ chat }: { chat: Chat }) => (
  <div className="flex items-center justify-between px-4 py-3">
    <div className="flex items-center gap-3">
      <Link
        href="/"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-200 transition hover:bg-slate-700"
      >
        <LogoSmall />
      </Link>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-slate-500">Chat</span>
        <span className="line-clamp-1 max-w-[240px] text-sm font-medium text-slate-100">
          {chat.title}
        </span>
      </div>
    </div>
  </div>
));

HeaderChat.displayName = "HeaderChat";

export default function PageClient({ chat }: { chat: Chat }) {
  const context = use(Context);
  const [streamPromise, setStreamPromise] = useState<
    Promise<ReadableStream> | undefined
  >(context.streamPromise);
  const [streamText, setStreamText] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const router = useRouter();
  const isHandlingStreamRef = useRef(false);

  useEffect(() => {
    async function f() {
      if (!streamPromise || isHandlingStreamRef.current) return;

      isHandlingStreamRef.current = true;
      context.setStreamPromise(undefined);
      setIsThinking(true);

      try {
        const stream = await streamPromise;

        ChatCompletionStream.fromReadableStream(stream)
          .on("content", (delta) => {
            setIsThinking(false);
            setStreamText((text) => text + delta);
          })
          .on("finalContent", async (finalText) => {
            startTransition(async () => {
              const previousAssistantMessages = chat.messages.filter(
                (m) =>
                  m.role === "assistant" &&
                  extractAllCodeBlocks(m.content).length > 0,
              );

              const previousFiles = previousAssistantMessages.flatMap((msg) =>
                extractAllCodeBlocks(msg.content),
              );

              const currentFiles = extractAllCodeBlocks(finalText);

              const fileMap = new Map<
                string,
                { path: string; content: string }
              >();
              previousFiles.forEach((file) =>
                fileMap.set(file.path, {
                  path: file.path,
                  content: file.code,
                }),
              );
              currentFiles.forEach((file) =>
                fileMap.set(file.path, {
                  path: file.path,
                  content: file.code,
                }),
              );
              const allFiles = Array.from(fileMap.values());

              await createMessage(
                chat.id,
                finalText,
                "assistant",
                allFiles.length > 0 ? allFiles : undefined,
              );

              startTransition(() => {
                isHandlingStreamRef.current = false;
                setStreamText("");
                setIsThinking(false);
                setStreamPromise(undefined);
                router.refresh();
              });
            });
          });
      } catch (err) {
        isHandlingStreamRef.current = false;
        setIsThinking(false);
        console.error("Stream error:", err);
      }
    }

    f();
  }, [chat.id, router, streamPromise, context, chat.messages]);

  return (
    <div className="h-dvh bg-[#0B0F19]">
      <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden">
        <HeaderChat chat={chat} />

        <ChatLog chat={chat} streamText={streamText} isThinking={isThinking} />

        <ChatBox
          chat={chat}
          onNewStreamPromise={setStreamPromise}
          isStreaming={!!streamPromise}
        />
      </div>
    </div>
  );
}
