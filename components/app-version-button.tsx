import ArrowLeftIcon from "@/components/icons/arrow-left";
import { toTitleCase } from "@/lib/utils";

export function AppVersionButton({
  version,
  filename,
  fileCount,
  appTitle,
  generating,
  disabled,
  onClick,
  isActive,
}: {
  version: number;
  filename?: { name: string; extension: string };
  fileCount?: number;
  appTitle?: string;
  generating?: boolean;
  disabled: boolean;
  onClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div className="my-2">
      <button
        disabled={disabled}
        className={`inline-flex w-full items-center gap-2.5 rounded-xl border p-2 text-left transition ${
          generating
            ? "animate-pulse border-slate-700 bg-slate-800/60"
            : isActive !== undefined
              ? isActive
                ? "border-blue-500/40 bg-blue-500/10"
                : "border-slate-700/50 bg-slate-800/40 hover:border-blue-500/30 hover:bg-slate-700/60"
              : "border-slate-700/50 bg-slate-800/40"
        }`}
        onClick={onClick}
      >
        <div
          className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
            isActive !== undefined
              ? isActive
                ? "bg-blue-500 text-white"
                : "bg-slate-700 text-slate-300"
              : "bg-slate-700 text-slate-300"
          }`}
        >
          V{version}
        </div>
        <div className="flex min-w-0 flex-col gap-0.5 text-left leading-none">
          {generating ? (
            <div className="text-sm font-medium leading-none text-slate-200">
              Generating...
            </div>
          ) : fileCount ? (
            <>
              <div className="text-sm font-medium leading-none text-slate-200">
                Version {version}
                {appTitle ? ` - ${appTitle}` : ""}
              </div>
              <div className="text-xs leading-none text-slate-500">
                {fileCount} file{fileCount !== 1 ? "s" : ""} edited
              </div>
            </>
          ) : filename ? (
            <>
              <div className="text-sm font-medium leading-none text-slate-200">
                {toTitleCase(filename.name)} {version !== 1 && `v${version}`}
              </div>
              <div className="text-xs leading-none text-slate-500">
                {filename.name}
                {version !== 1 && `-v${version}`}
                {"."}
                {filename.extension}
              </div>
            </>
          ) : null}
        </div>
        {!generating && (
          <div className="ml-auto text-slate-400">
            {isActive ? (
              <ArrowLeftIcon />
            ) : (
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M11 0.5L11 11M5.16667 2.25L8.66667 5.75M8.66667 5.75L5.16667 9.25M8.66667 5.75L0.5 5.75"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
        )}
      </button>
    </div>
  );
}
