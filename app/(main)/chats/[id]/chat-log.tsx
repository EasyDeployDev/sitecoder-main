"use client";

import type { Chat, Message } from "./page";
import {
  parseReplySegments,
  extractFirstCodeBlock,
  extractAllCodeBlocks,
  toTitleCase,
} from "@/lib/utils";
import { Fragment } from "react";
import { Streamdown } from "streamdown";
import { StickToBottom } from "use-stick-to-bottom";
import { AppVersionButton } from "@/components/app-version-button";
import { motion } from "framer-motion";

export default function ChatLog({
  chat,
  activeMessage,
  streamText,
  isThinking,
  onMessageClick,
}: {
  chat: Chat;
  activeMessage?: Message;
  streamText: string;
  isThinking?: boolean;
  onMessageClick: (v: Message) => void;
}) {
  const assistantMessages = chat.messages.filter(
    (m) =>
      m.role === "assistant" &&
      (extractFirstCodeBlock(m.content) ||
        extractAllCodeBlocks(m.content).length > 0),
  );

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
              <AssistantMessage
                content={message.content}
                version={
                  (chat.assistantMessagesCountBefore || 0) +
                  assistantMessages.map((m) => m.id).indexOf(message.id) +
                  1
                }
                message={message}
                previousMessage={(() => {
                  const idx = assistantMessages
                    .map((m) => m.id)
                    .indexOf(message.id);
                  return idx > 0 ? assistantMessages[idx - 1] : undefined;
                })()}
                isActive={!streamText && activeMessage?.id === message.id}
                onMessageClick={onMessageClick}
                isStreaming={!!streamText}
                index={index}
              />
            )}
          </Fragment>
        ))}

        {streamText && (
          <AssistantMessage
            content={streamText}
            version={
              (chat.assistantMessagesCountBefore || 0) +
              assistantMessages.length +
              1
            }
            isActive={true}
            previousMessage={assistantMessages.at(-1)}
            isStreaming={true}
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
  version,
  message,
  isActive,
  onMessageClick = () => {},
  previousMessage,
  isStreaming = false,
  index = 0,
}: {
  content: string;
  version: number;
  message?: Message;
  isActive?: boolean;
  onMessageClick?: (v: Message) => void;
  previousMessage?: Message;
  isStreaming?: boolean;
  index?: number;
}) {
  const allFiles = extractAllCodeBlocks(content);
  const segments = parseReplySegments(content);
  const fileSegments = segments.filter((s) => s.type === "file");

  const generateAppTitle = (files: typeof allFiles) => {
    const mainFile = files.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (mainFile) {
      const appMatch = mainFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }

    const firstFile = files[0];
    if (firstFile) {
      const name =
        firstFile.path.split("/").pop()?.replace(/\.\w+$/, "") || "App";
      return toTitleCase(name.replace(/(App|Component)$/, ""));
    }

    return "App";
  };

  const appTitle = generateAppTitle(
    allFiles.length > 0
      ? allFiles
      : (fileSegments.map((f) => ({
          code: f.code,
          language: f.language,
          path: f.path,
          fullMatch: "",
        })) as any),
  );

  const displayFileCount = fileSegments.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03, ease: "easeOut" }}
      className="relative max-w-[92%] self-start"
    >
      {displayFileCount > 0 ? (
        <div className="rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-900/60 p-4 shadow-xl shadow-black/10 backdrop-blur-sm">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {segments.map((seg, i) =>
              seg.type === "text" ? null : (
                <button
                  key={i}
                  onClick={() => message && onMessageClick(message)}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600/40 bg-slate-800/80 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-500/40 hover:bg-slate-700/80"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-blue-400"
                  >
                    <path
                      d="M10.5 3.5L11.5 2.5L12.5 3.5L11.5 4.5L10.5 3.5ZM2.5 9.5V11.5H4.5L9.5 6.5L7.5 4.5L2.5 9.5ZM0.5 12.5H13.5V14.5H0.5V12.5Z"
                      fill="currentColor"
                    />
                  </svg>
                  {seg.path}
                </button>
              ),
            )}
          </div>

          {segments.some((s) => s.type === "text") && (
            <div className="mb-3 text-slate-300">
              {segments.map((seg, i) =>
                seg.type === "file" ? null : (
                  <div key={i}>
                    <Streamdown className="prose-sm prose-invert break-words">
                      {seg.content}
                    </Streamdown>
                  </div>
                ),
              )}
            </div>
          )}

          <AppVersionButton
            version={version}
            fileCount={displayFileCount}
            appTitle={appTitle}
            generating={false}
            disabled={!message || isStreaming}
            onClick={message ? () => onMessageClick(message) : undefined}
            isActive={isActive}
          />
        </div>
      ) : (
        <div className="rounded-2xl rounded-bl-md border border-slate-700/50 bg-slate-900/60 px-4 py-3 text-slate-200 shadow-xl shadow-black/10 backdrop-blur-sm">
          <Streamdown className="prose-sm prose-invert break-words">
            {content}
          </Streamdown>
        </div>
      )}
    </motion.div>
  );
}
