"use client";

import ArrowRightIcon from "@/components/icons/arrow-right";
import Spinner from "@/components/spinner";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createMessage } from "../../actions";
import { type Chat } from "./page";

export default function ChatBox({
  chat,
  onNewStreamPromise,
  isStreaming,
}: {
  chat: Chat;
  onNewStreamPromise: (v: Promise<ReadableStream>) => void;
  isStreaming: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const disabled = isPending || isStreaming;
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState("");

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const submit = () => {
    if (!prompt.trim() || disabled) return;

    startTransition(async () => {
      const message = await createMessage(chat.id, prompt.trim(), "user");
      const streamPromise = fetch("/api/get-next-completion-stream-promise", {
        method: "POST",
        body: JSON.stringify({
          messageId: message.id,
          model: chat.model,
        }),
      }).then((res) => {
        if (!res.body) throw new Error("No body on response");
        return res.body;
      });

      onNewStreamPromise(streamPromise);
      setPrompt("");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto mb-6 w-full max-w-2xl shrink-0 px-4">
      <form
        className="relative flex w-full items-end rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 shadow-2xl shadow-black/20 backdrop-blur-md transition focus-within:border-blue-500/50 focus-within:bg-slate-900 focus-within:ring-1 focus-within:ring-blue-500/20"
        action={submit}
        onSubmit={(e) => e.preventDefault()}
      >
        <textarea
          ref={textareaRef}
          rows={1}
          placeholder="Ask a follow up..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          disabled={disabled}
          className="max-h-40 min-h-[24px] w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
        />

        <button
          type="button"
          onClick={submit}
          disabled={disabled || !prompt.trim()}
          className="ml-2 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 hover:shadow-blue-400/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
        >
          <Spinner loading={disabled} className="size-3.5">
            <ArrowRightIcon />
          </Spinner>
        </button>
      </form>

      <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-500">
        <span>Enter to send, Shift+Enter for new line</span>
        <span className="font-medium text-slate-400">Kimi K2.7 Code</span>
      </div>
    </div>
  );
}
