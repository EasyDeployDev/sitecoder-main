import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { getRecord, listPropertyDefs } from "@/lib/crm";
import DataView from "./data-view";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const record = await getRecord(id);
  if (!record) {
    return { title: "Record not found" };
  }
  return {
    title: `Data · ${record.title}`,
    description: `Data layer for ${record.title}`,
  };
}

// This route is the dedicated "database record" view for a single chat —
// the CRM/data-layer counterpart to the chat conversation itself. The
// conversation lives at /chats/[id]; this page at /chats/[id]/data exposes
// the same record's structured properties (status, tags, custom fields,
// ownership, sharing) as their own first-class page, independent of the
// gallery/table/board list views at /chats.
export default async function ChatDataPage({ params }: Props) {
  const { id } = await params;
  const [record, propertyDefs] = await Promise.all([
    getRecord(id),
    listPropertyDefs(),
  ]);

  if (!record) notFound();

  return (
    <div className="min-h-dvh bg-[#0B0F19]">
      <header className="flex items-center justify-between border-b border-slate-800/80 px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/chats/${id}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
            title="Back to chat"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-slate-500">
              Data · Record
            </span>
            <span className="line-clamp-1 max-w-[320px] text-sm font-medium text-slate-100">
              {record.icon ? `${record.icon} ` : ""}
              {record.title}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {record.messageCount}
          </span>
          <Link
            href="/chats"
            className="rounded-lg px-3 py-1.5 font-medium text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
          >
            My apps
          </Link>
        </div>
      </header>

      <DataView record={record} propertyDefs={propertyDefs} />
    </div>
  );
}
