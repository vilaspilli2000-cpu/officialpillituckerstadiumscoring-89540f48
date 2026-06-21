import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";
import { rankPlayers } from "@/lib/pts/rankings";

export const Route = createFileRoute("/players")({
  head: () => ({ meta: [{ title: "Players — PTS Scorer" }] }),
  component: Players,
});

function Players() {
  const players = usePtsStore((s) => s.players);
  const ranked = rankPlayers(players);
  return (
    <AppShell title="Players">
      <h1 className="text-2xl font-black text-gradient-gold mb-4">Player Profiles</h1>
      <div className="grid sm:grid-cols-2 gap-3">
        {ranked.map((r) => {
          const c = combinedCareer(r.player);
          return (
            <Link key={r.player.id} to="/players/$id" params={{ id: r.player.id }} className="card-gold rounded-xl p-4 hover:border-primary transition-colors">
              <div className="flex items-baseline justify-between">
                <div className="font-bold text-lg">{r.player.name}</div>
                <div className="text-xs text-muted-foreground">Rank #{ranked.indexOf(r) + 1}</div>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {c.hundreds} × 💯 · {c.fifties} × 50 · HS {c.highest}{c.highestNotOut ? "*" : ""}
              </div>
              <div className="text-xs mt-1">Matches {c.matches} · Runs {c.runs} · Wkts {c.wickets} · 🏆 {c.awards}</div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}