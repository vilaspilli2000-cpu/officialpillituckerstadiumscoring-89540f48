import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";

export const Route = createFileRoute("/players/$id")({
  head: ({ params }) => ({ meta: [{ title: `Profile · ${params.id} — PTS Scorer` }] }),
  component: Profile,
  notFoundComponent: () => <AppShell><div className="text-muted-foreground">Player not found.</div></AppShell>,
});

function Profile() {
  const { id } = Route.useParams();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // This file is also the layout for /players/:id/edit — defer to child route there.
  if (pathname !== `/players/${id}`) return <Outlet />;
  const player = usePtsStore((s) => s.players.find((p) => p.id === id));
  if (!player) return <AppShell><p>Player not found. <Link to="/players" className="text-primary underline">Back</Link></p></AppShell>;
  const c = combinedCareer(player);
  const sr = player.career.balls ? ((player.career.runs / player.career.balls) * 100).toFixed(1) : "-";
  const econ = player.career.bowlBalls ? ((player.career.bowlRuns / player.career.bowlBalls) * 6).toFixed(1) : "-";
  const avg = player.career.notOuts < player.career.matches && (player.career.matches - player.career.notOuts) > 0
    ? (player.career.runs / (player.career.matches - player.career.notOuts)).toFixed(1)
    : "-";
  const dotPct = player.career.bowlBalls && (player.career.dots ?? 0) > 0
    ? (((player.career.dots ?? 0) / player.career.bowlBalls) * 100).toFixed(0) + "%"
    : "-";

  return (
    <AppShell title="Profile">
      <header className="card-gold rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Player</div>
            <h1 className="text-3xl font-black text-gradient-gold truncate">{player.name}</h1>
            {player.role && player.role !== "—" && (
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{player.role}</div>
            )}
            {player.manualOverride && (
              <span className="mt-2 inline-block rounded-full border border-primary/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">Edited</span>
            )}
          </div>
          <Link to="/players/$id/edit" params={{ id: player.id }}>
            <Button variant="gold" className="gap-1">
              <Pencil size={14} /> Edit records
            </Button>
          </Link>
        </div>
        {player.beginner && player.career.matches === 0 && <p className="text-xs text-muted-foreground mt-2">Beginner — pinned last until earning stats.</p>}
        {player.notes && <p className="mt-3 text-sm text-muted-foreground">{player.notes}</p>}
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <Stat label="Matches" value={c.matches} />
        <Stat label="Runs" value={c.runs} />
        <Stat label="Highest" value={`${c.highest}${c.highestNotOut ? "*" : ""}`} />
        <Stat label="100s" value={c.hundreds} />
        <Stat label="50s" value={c.fifties} />
        <Stat label="Average" value={avg} />
        <Stat label="Strike Rate" value={sr} />
        <Stat label="Wickets" value={c.wickets} />
        <Stat label="Economy" value={econ} />
        <Stat label="Dot %" value={dotPct} />
        <Stat label="Catches" value={c.catches} />
        <Stat label="Awards" value={c.awards} />
      </div>
      {player.ratings && Object.keys(player.ratings).length > 0 && (
        <section className="card-gold rounded-2xl p-4 mt-4">
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">Ratings</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Object.entries(player.ratings).map(([k, v]) =>
              typeof v === "number" && v > 0 ? <Stat key={k} label={k} value={v} /> : null,
            )}
          </div>
        </section>
      )}
      {player.edits && player.edits.length > 0 && (
        <details className="mt-4 text-xs text-muted-foreground">
          <summary className="cursor-pointer">Edit history ({player.edits.length})</summary>
          <ul className="mt-2 space-y-1">
            {player.edits.slice(-10).reverse().map((e, i) => (
              <li key={i}>
                {new Date(e.ts).toLocaleString()} · <span className="text-primary">{e.field}</span>: {String(e.from)} → {String(e.to)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-xl font-bold text-primary">{value}</div>
    </div>
  );
}