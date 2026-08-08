"use client";

import type { Chat } from "./page";
import { Fragment } from "react";
import { Streamdown } from "streamdown";
import { StickToBottom } from "use-stick-to-bottom";
import { motion } from "framer-motion";

export default function ChatLog({
  chat,
  streamText,
  isThinking,
}: {
  chat: Chat;
  streamText: string;
  isThinking?: boolean;
}) {
  return (
    <StickToBottom
      className="relative grow overflow-hidden"
      resize="smooth"
      initial="smooth"
    >
      <StickToBottom.Content className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pb-4 pt-8">
        <UserMessage content={chat.prompt} />

        {chat.totalMessages > chat.messages.length && (
          <div className="py-2 text-center text-sm text-slate-500">
            Only last messages loaded. Full history not available.
          </div>
        )}

        {chat.messages.slice(2).map((message, index) => (
          <Fragment key={message.id}>
            {message.role === "user" ? (
              <UserMessage content={message.content} />
            ) : (
              <AssistantMessage content={message.content} index={index} />
            )}
          </Fragment>
        ))}

        {streamText && (
          <AssistantMessage
            content={streamText}
            isStreaming
            index={chat.messages.length}
          />
        )}

        {isThinking && !streamText && <ThinkingIndicator />}
      </StickToBottom.Content>
    </StickToBottom>
  );
}

function ThinkingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      className="relative max-w-[92%] self-start rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-900/60 px-4 py-3 shadow-xl shadow-black/10"
    >
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
        </span>
        Thinking...
      </div>
    </motion.div>
  );
}

function UserMessage({ content }: { content: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="relative flex max-w-[85%] items-end gap-3 self-end"
    >
      <div className="whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-blue-600 px-4 py-2.5 text-sm text-white shadow-lg shadow-blue-900/20">
        {content}
      </div>
    </motion.div>
  );
}

function AssistantMessage({
  content,
  isStreaming = false,
  index = 0,
}: {
  content: string;
  isStreaming?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
      className="relative max-w-[92%] self-start"
    >
      <div className="rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-slate-200 shadow-xl shadow-black/10 backdrop-blur-sm">
        <Streamdown
          className={`prose-sm prose-invert break-words ${isStreaming ? "opacity-90" : ""}`}
        >
          {content}
        </Streamdown>
      </div>
    </motion.div>
  );
}
