"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  LayoutDashboard,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
};

// Admin "command center" shell: fixed left rail + content area, loosely
// inspired by clawport-ui's sidebar-driven dashboard layout (org map /
// kanban / cron nav rail). Sitecoder's admin surface is much smaller today
// (overview + waitlist) but the shell is built to grow additional sections
// (members, schema, usage) without reshaping every page.
export default function AdminShell({
  children,
  pendingCount = 0,
  currentUserEmail,
}: {
  children: React.ReactNode;
  pendingCount?: number;
  currentUserEmail?: string;
}) {
  const pathname = usePathname();

  const nav: NavItem[] = [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    {
      href: "/admin/waitlist",
      label: "Waitlist",
      icon: UserCheck,
      badge: pendingCount,
    },
  ];

  return (
    <div className="flex min-h-dvh w-full bg-[#0B0F19]">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-800/80 bg-[#0A0D16]">
        <div className="flex items-center gap-2 border-b border-slate-800/80 px-5 py-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/15 text-blue-400">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-semibold text-slate-100">
              Admin center
            </span>
            <span className="text-[11px] text-slate-500">Sitecoder</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3 py-4">
          {nav.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition",
                  active
                    ? "bg-blue-500/15 text-blue-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active
                        ? "text-blue-400"
                        : "text-slate-500 group-hover:text-slate-300",
                    )}
                  />
                  {item.label}
                </span>
                {!!item.badge && item.badge > 0 && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500/20 px-1 text-xs font-semibold text-blue-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800/80 px-3 py-3">
          <Link
            href="/chats"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-slate-200"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            Back to workspace
          </Link>
          {currentUserEmail && (
            <p className="mt-2 truncate px-3 text-[11px] text-slate-600">
              Signed in as {currentUserEmail}
            </p>
          )}
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">{children}</div>
    </div>
  );
}
