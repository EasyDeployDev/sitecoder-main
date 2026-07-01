"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import TableView from "@/components/crm/table-view";
import BoardView from "@/components/crm/board-view";
import GalleryView from "@/components/crm/gallery-view";
import AddPropertyDialog from "@/components/crm/add-property-dialog";
import type { CrmRecord, PropertyDefRecord } from "@/lib/crm-types";
import { LayoutGrid, List, Rows3, Search, Plus } from "lucide-react";

type ViewKind = "table" | "board" | "gallery";

export default function CrmDashboard({
  records,
  propertyDefs,
}: {
  records: CrmRecord[];
  propertyDefs: PropertyDefRecord[];
}) {
  const [view, setView] = useState<ViewKind>("table");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return records;
    const q = query.toLowerCase();
    return records.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q)) ||
        r.status.toLowerCase().includes(q),
    );
  }, [records, query]);

  return (
    <div className="flex flex-1 flex-col gap-4 px-6 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Workspace</h1>
          <p className="text-sm text-muted-foreground">
            {records.length} {records.length === 1 ? "record" : "records"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AddPropertyDialog />
          <Button asChild size="sm">
            <Link href="/">
              <Plus className="h-4 w-4" />
              New chat
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewKind)}>
          <TabsList>
            <TabsTrigger value="table">
              <List className="mr-1.5 h-3.5 w-3.5" />
              Table
            </TabsTrigger>
            <TabsTrigger value="board">
              <Rows3 className="mr-1.5 h-3.5 w-3.5" />
              Board
            </TabsTrigger>
            <TabsTrigger value="gallery">
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Gallery
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records…"
            className="pl-8"
          />
        </div>
      </div>

      {view === "table" && (
        <TableView records={filtered} propertyDefs={propertyDefs} />
      )}
      {view === "board" && <BoardView records={filtered} />}
      {view === "gallery" && <GalleryView records={filtered} />}
    </div>
  );
}
