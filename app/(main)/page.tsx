/* eslint-disable @next/next/no-img-element */
"use client";

import Fieldset from "@/components/fieldset";
import ArrowRightIcon from "@/components/icons/arrow-right";
import LightningBoltIcon from "@/components/icons/lightning-bolt";
import LoadingButton from "@/components/loading-button";
import Spinner from "@/components/spinner";
import UploadIcon from "@/components/icons/upload-icon";
import assert from "assert";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  use,
  useState,
  useRef,
  useTransition,
  useEffect,
  useMemo,
  memo,
} from "react";
import * as Select from "@radix-ui/react-select";

import { Context } from "./providers";
import Header from "@/components/header";
import { useS3Upload } from "next-s3-upload";
import { DEFAULT_MODEL, SUGGESTED_PROMPTS } from "@/lib/constants";

export default function Home() {
  const { setStreamPromise } = use(Context);
  const router = useRouter();

  const [prompt, setPrompt] = useState("");
  const model = DEFAULT_MODEL;
  const [quality, setQuality] = useState("low");
  const [screenshotUrl, setScreenshotUrl] = useState<string | undefined>(
    undefined,
  );
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "0px";
    textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
  }, [prompt]);

  const { uploadToS3 } = useS3Upload();

  const qualityOptions = useMemo(
    () => [
      { value: "low", label: "Low quality [faster]" },
      { value: "high", label: "High quality [slower]" },
    ],
    [],
  );

  const handleScreenshotUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (prompt.length === 0) setPrompt("Build this");
    setQuality("low");
    setScreenshotLoading(true);
    const { url } = await uploadToS3(file);
    setScreenshotUrl(url);
    setScreenshotLoading(false);
  };

  const submit = () => {
    if (!prompt.trim() || isPending) return;
    const form = textareaRef.current?.closest("form");
    form?.requestSubmit();
  };

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0B0F19]">
      {/* Subtle background gradient — no halo image */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59, 130, 246, 0.18), transparent), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(139, 92, 246, 0.10), transparent)",
        }}
      />

      <div className="isolate flex min-h-dvh flex-col">
        <Header />

        <main className="flex grow flex-col items-center justify-center px-4 pb-12 pt-8">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight text-slate-100 sm:text-5xl md:text-6xl">
              Turn your <span className="text-blue-400">idea</span> into an{" "}
              <span className="text-blue-400">app</span>
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-base text-slate-400 sm:text-lg">
              Describe what you want to build. Sitecoder generates the code and
              a live preview in seconds.
            </p>
          </div>

          <form
            className="relative mt-8 w-full max-w-2xl"
            action={async (formData) => {
              startTransition(async () => {
                const { prompt, model, quality } = Object.fromEntries(formData);

                assert.ok(typeof prompt === "string");
                assert.ok(typeof model === "string");
                assert.ok(quality === "high" || quality === "low");

                const response = await fetch("/api/create-chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    prompt,
                    model,
                    quality,
                    screenshotUrl,
                  }),
                });

                if (!response.ok) throw new Error("Failed to create chat");

                const { chatId, lastMessageId } = await response.json();

                const streamPromise = fetch(
                  "/api/get-next-completion-stream-promise",
                  {
                    method: "POST",
                    body: JSON.stringify({ messageId: lastMessageId, model }),
                  },
                ).then((res) => {
                  if (!res.body) throw new Error("No body on response");
                  return res.body;
                });

                startTransition(() => {
                  setStreamPromise(streamPromise);
                  router.push(`/chats/${chatId}`);
                });
              });
            }}
          >
            <Fieldset>
              <div className="relative flex flex-col rounded-2xl border border-slate-700/60 bg-slate-900/70 p-3 shadow-2xl shadow-black/20 backdrop-blur-md transition focus-within:border-blue-500/50 focus-within:bg-slate-900 focus-within:ring-1 focus-within:ring-blue-500/20">
                {screenshotLoading && (
                  <div className="mb-2 flex h-16 w-[68px] animate-pulse items-center justify-center rounded-xl bg-slate-800">
                    <Spinner />
                  </div>
                )}

                {screenshotUrl && !screenshotLoading && (
                  <div className="relative mb-2 inline-block">
                    <img
                      alt="screenshot"
                      src={screenshotUrl}
                      className="h-16 w-[68px] rounded-xl object-cover ring-1 ring-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setScreenshotUrl(undefined);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-slate-800 text-slate-300 shadow transition hover:text-slate-100"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="size-4"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        />
                      </svg>
                    </button>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  name="prompt"
                  rows={1}
                  placeholder="Build me a budgeting app..."
                  required
                  disabled={isPending}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pastedText = e.clipboardData
                      .getData("text")
                      .replace(/\r\n/g, "\n")
                      .replace(/\r/g, "\n")
                      .replace(/\n{3,}/g, "\n\n")
                      .trim();

                    const textarea = e.target as HTMLTextAreaElement;
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const newValue =
                      prompt.slice(0, start) + pastedText + prompt.slice(end);

                    setPrompt(newValue);

                    setTimeout(() => {
                      if (textareaRef.current) {
                        textareaRef.current.selectionStart =
                          start + pastedText.length;
                        textareaRef.current.selectionEnd =
                          start + pastedText.length;
                      }
                    }, 0);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit();
                    }
                  }}
                  className="max-h-40 min-h-[24px] w-full resize-none bg-transparent px-2 py-1 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-60"
                />

                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <input type="hidden" name="model" value={model} />

                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2 py-1 text-xs font-medium text-slate-400">
                      <LightningBoltIcon className="size-3" />
                      Kimi K2.7 Code
                    </span>

                    <div className="hidden h-4 w-px bg-slate-700 sm:block" />

                    <Select.Root
                      name="quality"
                      value={quality}
                      onValueChange={setQuality}
                    >
                      <Select.Trigger className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500/40">
                        <Select.Value aria-label={quality}>
                          <span className="hidden sm:inline">
                            {quality === "low"
                              ? "Low quality [faster]"
                              : "High quality [slower]"}
                          </span>
                          <span className="sm:hidden">
                            <LightningBoltIcon className="size-3" />
                          </span>
                        </Select.Value>
                        <Select.Icon>
                          <ChevronDownIcon className="size-3" />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-900 shadow-xl">
                          <Select.Viewport className="space-y-0.5 p-1.5">
                            {qualityOptions.map((q) => (
                              <Select.Item
                                key={q.value}
                                value={q.value}
                                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-300 outline-none transition data-[highlighted]:bg-slate-800 data-[highlighted]:text-slate-100"
                              >
                                <Select.ItemText>{q.label}</Select.ItemText>
                                <Select.ItemIndicator className="ml-auto">
                                  <CheckIcon className="size-3 text-blue-400" />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                          <Select.Arrow className="fill-slate-700" />
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>

                    <div className="hidden h-4 w-px bg-slate-700 sm:block" />

                    <label
                      htmlFor="screenshot"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
                    >
                      <UploadIcon className="size-3.5" />
                      <span className="hidden sm:inline">Attach</span>
                    </label>
                    <input
                      id="screenshot"
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleScreenshotUpload}
                      className="hidden"
                      ref={fileInputRef}
                    />
                  </div>

                  <LoadingButton
                    type="submit"
                    disabled={screenshotLoading || prompt.trim().length === 0}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 hover:shadow-blue-400/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 disabled:shadow-none"
                  >
                    <ArrowRightIcon />
                  </LoadingButton>
                </div>

                {isPending && (
                  <LoadingMessage
                    isHighQuality={quality === "high"}
                    screenshotUrl={screenshotUrl}
                  />
                )}
              </div>
            </Fieldset>
          </form>

          <div className="mt-4 w-full max-w-2xl">
            <p className="mb-2 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
              Try an example
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((v) => (
                <button
                  key={v.title}
                  type="button"
                  onClick={() => {
                    setPrompt(v.description);
                    setTimeout(() => {
                      textareaRef.current?.focus();
                      if (textareaRef.current) {
                        const len = textareaRef.current.value.length;
                        textareaRef.current.selectionStart = len;
                        textareaRef.current.selectionEnd = len;
                      }
                    }, 0);
                  }}
                  className="rounded-full border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 text-xs text-slate-300 transition hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
                >
                  {v.title}
                </button>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

const Footer = memo(() => {
  return (
    <footer className="flex w-full flex-col items-center justify-center px-5 pb-6 pt-4 text-center">
      <div className="text-sm text-slate-500">
        Built with{" "}
        <span className="font-semibold text-blue-400">Sitecoder</span>
      </div>
    </footer>
  );
});

function LoadingMessage({
  isHighQuality,
  screenshotUrl,
}: {
  isHighQuality: boolean;
  screenshotUrl: string | undefined;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-900/90 px-4 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center gap-3 text-slate-300">
        <span className="text-balance text-center text-sm">
          {isHighQuality
            ? "Coming up with project plan, may take 15 seconds..."
            : screenshotUrl
              ? "Analyzing your screenshot..."
              : "Creating your app..."}
        </span>
        <Spinner />
      </div>
    </div>
  );
}

export const maxDuration = 60;
