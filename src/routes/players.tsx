import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus } from "lucide-react";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";
import { rankPlayers } from "@/lib/pts/rankings";

export const Route = createFileRoute("/players")({
  head: () => ({ meta: [{ title: "Players — PTS Scorer" }] }),
  component: Players,
});

function Players() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/players") return <Outlet />;
  const players = usePtsStore((s) => s.players);
  const addPlayer = usePtsStore((s) => s.addPlayer);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const ranked = rankPlayers(players);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ranked;
    return ranked.filter((r) => r.player.name.toLowerCase().includes(t));
  }, [ranked, q]);
  return (
    <AppShell title="Players">
      <h1 className="text-2xl font-black text-gradient-gold mb-3">Player Profiles</h1>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search players"
            className="w-full rounded-full border border-border/60 bg-background/60 pl-9 pr-3 py-2 text-sm focus:border-primary outline-none"
          />
        </div>
        <button
          onClick={() => setAdding((a) => !a)}
          className="flex items-center gap-1 rounded-full border border-primary/60 bg-primary/10 px-3 py-2 text-sm font-bold text-primary hover:bg-primary/20"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {adding && (
        <div className="mb-3 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Player name"
            className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm focus:border-primary outline-none"
          />
          <button
            onClick={() => { addPlayer(newName); setNewName(""); setAdding(false); }}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground"
          >
            Save
          </button>
        </div>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {filtered.map((r) => {
          const c = combinedCareer(r.player);
          return (
            <Link key={r.player.id} to="/players/$id" params={{ id: r.player.id }} className="card-gold rounded-xl p-4 hover:border-primary transition-colors">
              <div className="flex items-baseline justify-between">
                <div className="min-w-0">
                  <div className="font-bold text-lg truncate">{r.player.name}</div>
                  {r.player.role && r.player.role !== "—" && (
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.player.role}</div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">Rank #{ranked.indexOf(r) + 1}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.hundreds} × 100 · {c.fifties} × 50 · HS {c.highest}{c.highestNotOut ? "*" : ""}
              </div>
              <div className="text-xs mt-1">Matches {c.matches} · Runs {c.runs} · Wkts {c.wickets} · Awards {c.awards}</div>
              {r.player.manualOverride && (
                <div className="mt-2 inline-block rounded-full border border-primary/40 px-2 py-0.5 text-[9px] uppercase tracking-wider text-primary">Edited</div>
              )}
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}