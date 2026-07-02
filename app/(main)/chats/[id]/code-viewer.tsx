"use client";

import CloseIcon from "@/components/icons/close-icon";
import RefreshIcon from "@/components/icons/refresh";
import { DownloadIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  extractAllCodeBlocks,
  generateIntelligentFilename,
  getExtensionForLanguage,
  timeAgo,
  toTitleCase,
} from "@/lib/utils";
import { useState, useEffect } from "react";
import type { Chat, Message } from "./page";
import { Share } from "./share";
import { StickToBottom } from "use-stick-to-bottom";
import JSZip from "jszip";
import dynamic from "next/dynamic";

const CodeRunner = dynamic(() => import("@/components/code-runner"), {
  ssr: false,
});
const SyntaxHighlighter = dynamic(
  () => import("@/components/syntax-highlighter"),
  {
    ssr: false,
  },
);

export default function CodeViewer({
  chat,
  streamText,
  message,
  onMessageChange,
  activeTab,
  onTabChange,
  onClose,
  onRequestFix,
  onRestore,
}: {
  chat: Chat;
  streamText: string;
  message?: Message;
  onMessageChange: (v: Message) => void;
  activeTab: string;
  onTabChange: (v: "code" | "preview") => void;
  onClose: () => void;
  onRequestFix: (e: string) => void;
  onRestore: (
    message: Message | undefined,
    oldVersion: number,
    newVersion: number,
  ) => void;
}) {
  const streamAllFiles = extractAllCodeBlocks(streamText);

  function extractLatestStreamBlock(
    input: string,
  ): { code: string; language: string; path: string } | undefined {
    if (!input) return undefined;
    const lines = input.split("\n");
    const codeFenceRegex = /^```([^\n]*)$/;

    let openTag: string | null = null;
    let codeBuffer: string[] = [];
    let latestComplete:
      | { code: string; language: string; path: string }
      | undefined;

    for (const line of lines) {
      const match = line.match(codeFenceRegex);
      if (match && !openTag) {
        openTag = match[1] || "";
        codeBuffer = [];
      } else if (match && openTag) {
        const { language, path } = parseTag(openTag);
        latestComplete = { code: codeBuffer.join("\n"), language, path };
        openTag = null;
        codeBuffer = [];
      } else if (openTag) {
        codeBuffer.push(line);
      }
    }

    if (openTag) {
      const { language, path } = parseTag(openTag);
      return { code: codeBuffer.join("\n"), language, path };
    }
    return latestComplete;
  }

  function parseTag(tag: string) {
    const raw = tag || "";
    const langMatch = raw.match(/^([A-Za-z0-9]+)/);
    const language = langMatch ? langMatch[1] : "text";
    const pathMatch = raw.match(/(?:\{\s*)?path\s*=\s*([^}\s]+)(?:\s*\})?/);
    const filenameMatch = raw.match(
      /(?:\{\s*)?filename\s*=\s*([^}\s]+)(?:\s*\})?/,
    );
    const path = pathMatch
      ? pathMatch[1]
      : filenameMatch
        ? filenameMatch[1]
        : `file.${getExtensionForLanguage(language)}`;
    return { language, path };
  }

  const latestStreamBlock = extractLatestStreamBlock(streamText);

  let mergedStreamFiles = [...streamAllFiles];
  if (latestStreamBlock) {
    const existingIdx = mergedStreamFiles.findIndex(
      (f) => f.path === latestStreamBlock.path,
    );
    if (existingIdx !== -1) {
      mergedStreamFiles[existingIdx] = {
        code: latestStreamBlock.code,
        language: latestStreamBlock.language,
        path: latestStreamBlock.path,
        fullMatch: "",
      };
    } else {
      mergedStreamFiles.push({
        code: latestStreamBlock.code,
        language: latestStreamBlock.language,
        path: latestStreamBlock.path,
        fullMatch: "",
      });
    }
  }

  function mergeFiles(
    base: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
    overlay: Array<{
      code: string;
      language: string;
      path: string;
      fullMatch: string;
    }>,
  ) {
    const map = new Map<
      string,
      { code: string; language: string; path: string; fullMatch: string }
    >();
    base.forEach((f) => map.set(f.path, f));
    overlay.forEach((f) => map.set(f.path, f));
    return Array.from(map.values());
  }

  const getFilesFromMessage = (msg: Message) => {
    return (msg.files as any[]) || extractAllCodeBlocks(msg.content);
  };

  const assistantMessages = chat.messages.filter(
    (m) => m.role === "assistant" && getFilesFromMessage(m).length > 0,
  );

  const files = streamText
    ? (() => {
        const lastMessage = assistantMessages.at(-1);
        const baseFiles = lastMessage ? getFilesFromMessage(lastMessage) : [];
        return mergeFiles(baseFiles, mergedStreamFiles);
      })()
    : message
      ? getFilesFromMessage(message)
      : [];

  const mainFile =
    latestStreamBlock && streamText
      ? files.find((f) => f.path === latestStreamBlock.path) || files.at(-1)
      : files.find((f) => f.path === "App.tsx") ||
        files.find((f) => f.path.endsWith(".tsx")) ||
        files[0];
  const code = mainFile ? mainFile.code : "";
  const language = mainFile ? mainFile.language : "";
  const rawFilename = mainFile ? mainFile.path : "";

  const generateAppTitle = (fileList: typeof files) => {
    if (fileList.length === 1) {
      return generateIntelligentFilename(fileList[0].code, fileList[0].language)
        .name;
    }

    const appFile = fileList.find(
      (f) => f.path === "App.tsx" || f.path.endsWith("App.tsx"),
    );
    if (appFile) {
      const appMatch = appFile.code.match(
        /function\s+(\w+App|\w+Component|\w+)/,
      );
      if (appMatch) {
        return toTitleCase(appMatch[1].replace(/(App|Component)$/, ""));
      }
    }

    const firstFile = fileList[0];
    if (firstFile) {
      const name =
        firstFile.path.split("/").pop()?.replace(/\.\w+$/, "") || "App";
      return toTitleCase(name.replace(/(App|Component)$/, ""));
    }

    return "App";
  };

  const appTitle = generateAppTitle(files);

  const allAssistantMessages = assistantMessages.some(
    (m) => m.id === message?.id,
  )
    ? assistantMessages
    : message && getFilesFromMessage(message).length > 0
      ? [...assistantMessages, message]
      : assistantMessages;
  const reversedAllAssistantMessages = allAssistantMessages.slice().reverse();
  const currentVersionIndex =
    streamAllFiles.length > 0
      ? allAssistantMessages.length
      : message && allAssistantMessages.some((m) => m.id === message.id)
        ? allAssistantMessages.map((m) => m.id).indexOf(message.id)
        : allAssistantMessages.length - 1;
  const currentVersion =
    (chat.assistantMessagesCountBefore || 0) + currentVersionIndex;

  const [refresh, setRefresh] = useState(0);
  const disabledControls = !!streamText || files.length === 0;
  const selectValue = disabledControls
    ? undefined
    : (allAssistantMessages.length - 1 - currentVersionIndex).toString();

  const handleDownloadFiles = async () => {
    if (files.length === 0) return;

    const zip = new JSZip();
    files.forEach((file) => {
      zip.file(file.path, file.code);
    });

    const content = await zip.generateAsync({ type: "blob" });
    const appTitle = generateAppTitle(files);
    const filename = `${appTitle.replace(/[^a-zA-Z0-9]/g, "-")}-sitecoder.zip`;

    const url = URL.createObjectURL(content);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Files downloaded!",
      description: `${files.length} files downloaded as ${filename}`,
      variant: "default",
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex h-full flex-col rounded-l-2xl border-l border-slate-700/50 bg-slate-900/90 shadow-2xl shadow-black/30">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700/50 px-4">
        <div className="inline-flex items-center gap-3">
          <button
            className="hidden text-slate-400 transition hover:text-slate-200 md:block"
            onClick={onClose}
          >
            <CloseIcon className="size-5" />
          </button>
          <span className="hidden text-sm font-medium text-slate-100 md:block">
            {appTitle}
          </span>
          {!disabledControls && (
            <Select
              value={selectValue}
              onValueChange={(value) =>
                onMessageChange(reversedAllAssistantMessages[parseInt(value)])
              }
              disabled={disabledControls}
            >
              <SelectTrigger className="h-8 w-[72px] rounded-lg border-slate-600/40 bg-slate-800/80 text-xs font-semibold text-slate-200 !outline-none !ring-0">
                <SelectValue>{`v${currentVersion + 1}`}</SelectValue>
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                {reversedAllAssistantMessages.map((msg, i) => (
                  <SelectItem
                    key={i}
                    value={i.toString()}
                    className="text-slate-200 focus:bg-slate-800 focus:text-slate-100"
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold">
                        v
                        {(chat.assistantMessagesCountBefore || 0) +
                          (allAssistantMessages.length - 1 - i) +
                          1}
                      </span>
                      <span className="text-xs text-slate-500">
                        {timeAgo(msg.createdAt)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currentVersionIndex < allAssistantMessages.length - 1 && message && (
            <button
              onClick={() =>
                onRestore(
                  message,
                  currentVersion + 1,
                  (chat.assistantMessagesCountBefore || 0) +
                    allAssistantMessages.length +
                    1,
                )
              }
              className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              Restore
            </button>
          )}
        </div>

        <div className="inline-flex rounded-xl border border-slate-700/50 bg-slate-800/60 p-1">
          <button
            onClick={() => onTabChange("code")}
            data-active={activeTab === "code" ? true : undefined}
            disabled={disabledControls}
            className="inline-flex h-7 items-center justify-center rounded-lg px-3 text-xs font-medium text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-blue-600 data-[active]:text-white"
          >
            Code
          </button>
          <button
            onClick={() => onTabChange("preview")}
            data-active={activeTab === "preview" ? true : undefined}
            disabled={disabledControls}
            className="inline-flex h-7 items-center justify-center rounded-lg px-3 text-xs font-medium text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-50 data-[active]:bg-blue-600 data-[active]:text-white"
          >
            Preview
          </button>
        </div>
      </div>

      <div className="relative flex grow flex-col overflow-hidden bg-[#0B0F19]">
        {activeTab === "code" ? (
          <StickToBottom
            className="relative grow overflow-hidden *:!h-[inherit]"
            resize="smooth"
            initial={false}
          >
            <StickToBottom.Content>
              <SyntaxHighlighter
                files={files.map((f) => ({
                  path: f.path,
                  content: f.code,
                  language: f.language,
                }))}
                activePath={
                  streamText
                    ? latestStreamBlock?.path || files.at(-1)?.path
                    : undefined
                }
                disableSelection={!!streamText}
                isStreaming={!!streamText}
              />
            </StickToBottom.Content>
          </StickToBottom>
        ) : (
          <>
            {files.length > 0 && (
              <div className="flex h-full items-center justify-center p-4">
                <CodeRunner
                  onRequestFix={onRequestFix}
                  language={language}
                  files={files.map((f) => ({ path: f.path, content: f.code }))}
                  key={refresh}
                />
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-slate-700/50 px-4 py-3">
        <div className="inline-flex items-center gap-2.5 text-sm">
          <Share
            message={
              disabledControls
                ? undefined
                : message && streamAllFiles.length === 0
                  ? message
                  : undefined
            }
          />
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600/40 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700/60 disabled:opacity-50"
            onClick={() => setRefresh((r) => r + 1)}
            disabled={disabledControls}
          >
            <RefreshIcon className="size-3.5" />
            Refresh
          </button>
          <button
            className="hidden items-center gap-1.5 rounded-lg border border-slate-600/40 bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700/60 disabled:opacity-50 md:inline-flex"
            onClick={handleDownloadFiles}
            disabled={disabledControls}
            title="Download files"
          >
            <DownloadIcon className="size-3.5" />
            Download
          </button>
        </div>
        <div className="text-xs text-slate-500 md:hidden">{chat.model}</div>
      </div>
    </div>
  );
}
