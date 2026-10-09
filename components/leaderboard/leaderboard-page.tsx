"use client";

import { useEffect, useMemo, useState } from "react";
import type { LeaderboardRow } from "@/lib/types";
import Podium from "./podium";
import LeaderboardTable, { type SortDir, type SortKey } from "./leaderboard-table";

export default function LeaderboardPage() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const refresh = async () => {
    try {
      const res = await fetch("/api/leaderboard", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setRows(Array.isArray(data.rows) ? data.rows : []);
      setLoaded(true);
    } catch {
      // offline
    }
  };

  useEffect(() => {
    const boot = setTimeout(() => {
      refresh();
    }, 0);
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "leaderboard") refresh();
      } catch {
        // ignore malformed frames
      }
    };
    return () => {
      clearTimeout(boot);
      source.close();
    };
  }, []);

  const podiumRows = useMemo(() => [...rows].sort((a, b) => a.rank - b.rank).slice(0, 3), [rows]);

  const visibleRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query ? rows.filter((row) => row.teamName.toLowerCase().includes(query)) : [...rows];
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "rank") cmp = a.rank - b.rank;
      else if (sortKey === "score") cmp = a.score - b.score;
      else if (sortKey === "completed") cmp = a.solves - b.solves;
      else if (sortKey === "activity") cmp = new Date(a.lastSeenAt).getTime() - new Date(b.lastSeenAt).getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filtered.slice(0, pageSize);
  }, [rows, search, sortKey, sortDir, pageSize]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "rank" ? "asc" : "desc");
    }
  }

  return (
    <div className="pb-4">
      <Podium rows={podiumRows} />
      <LeaderboardTable
        rows={visibleRows}
        loaded={loaded}
        search={search}
        onSearchChange={setSearch}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
      />
    </div>
  );
}
