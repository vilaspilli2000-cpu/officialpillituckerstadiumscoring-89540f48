import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Plus, Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";
import { rankAllOvertake } from "@/lib/pts/overtakeRanking";

export const Route = createFileRoute("/players")({
  head: () => ({ meta: [{ title: "Players — PTS Scorer" }] }),
  component: Players,
});

function Players() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/players") return <Outlet />;
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const addPlayer = usePtsStore((s) => s.addPlayer);
  const deletePlayer = usePtsStore((s) => s.deletePlayer);
  const resetPlayer = usePtsStore((s) => s.resetPlayerToCalculated);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  // Single shared ranking source — identical to Records & Overtake pages.
  const ranked = useMemo(() => rankAllOvertake(players, matches), [players, matches]);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return ranked;
    return ranked.filter((r) => r.player.name.toLowerCase().includes(t));
  }, [ranked, q]);

  return (
    <AppShell title="Players">
      <h1 className="text-2xl font-black text-gradient-gold mb-3">Player Management</h1>
      <div className="mb-3">
        <Link
          to="/players/compare"
          className="inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
        >
          ⚖️ Compare Players
        </Link>
        <Link
          to="/achievements"
          search={{ player: undefined }}
          className="ml-2 inline-flex items-center gap-1 rounded-full border border-primary/60 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
        >
          🏆 Achievements
        </Link>
      </div>
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
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
            onClick={() => {
              addPlayer(newName);
              setNewName("");
              setAdding(false);
            }}
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
            <div
              key={r.player.id}
              className="card-gold rounded-xl p-4 hover:border-primary transition-colors relative"
            >
              <Link to="/players/$id" params={{ id: r.player.id }} className="block">
                <div className="flex items-baseline justify-between pr-16">
                  <div className="min-w-0">
                    <div className="font-bold text-lg truncate">{r.player.name}</div>
                    {r.player.role && r.player.role !== "—" && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {r.player.role}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Rank #{ranked.indexOf(r) + 1}</div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.hundreds} × 100 · {c.fifties} × 50 · HS {c.highest}
                  {c.highestNotOut ? "*" : ""}
                </div>
                <div className="text-xs mt-1">
                  Matches {c.matches} · Runs {c.runs} · Wkts {c.wickets} · Awards {c.awards}
                </div>
                <div className="mt-2 text-[11px] font-bold text-primary tabular-nums">
                  {r.total} ranking pts
                </div>
              </Link>
              <div className="absolute top-2 right-2 flex gap-1">
                <button
                  title="Reset to calculated"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Reset ${r.player.name} to calculated values?`)) {
                      resetPlayer(r.player.id);
                      toast.success("Reset");
                    }
                  }}
                  className="rounded-full border border-border/60 bg-secondary/60 p-1.5 text-muted-foreground hover:text-primary hover:border-primary"
                >
                  <RotateCcw size={12} />
                </button>
                <button
                  title="Delete player"
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm(`Delete ${r.player.name}? This cannot be undone.`)) {
                      deletePlayer(r.player.id);
                      toast.success("Deleted");
                    }
                  }}
                  className="rounded-full border border-border/60 bg-secondary/60 p-1.5 text-muted-foreground hover:text-red-500 hover:border-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
