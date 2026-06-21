import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";

export const Route = createFileRoute("/players/$id")({
  head: ({ params }) => ({ meta: [{ title: `Profile · ${params.id} — PTS Scorer` }] }),
  component: Profile,
  notFoundComponent: () => <AppShell><div className="text-muted-foreground">Player not found.</div></AppShell>,
});

function Profile() {
  const { id } = Route.useParams();
  const player = usePtsStore((s) => s.players.find((p) => p.id === id));
  if (!player) return <AppShell><p>Player not found. <Link to="/players" className="text-primary underline">Back</Link></p></AppShell>;
  const c = combinedCareer(player);
  const sr = player.career.balls ? ((player.career.runs / player.career.balls) * 100).toFixed(1) : "-";
  const econ = player.career.bowlBalls ? ((player.career.bowlRuns / player.career.bowlBalls) * 6).toFixed(1) : "-";

  return (
    <AppShell title="Profile">
      <header className="card-gold rounded-2xl p-6">
        <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Player</div>
        <h1 className="text-3xl font-black text-gradient-gold">{player.name}</h1>
        {player.beginner && player.career.matches === 0 && <p className="text-xs text-muted-foreground mt-1">Beginner — pinned last until earning stats.</p>}
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
        <Stat label="Matches" value={c.matches} />
        <Stat label="Runs" value={c.runs} />
        <Stat label="Highest" value={`${c.highest}${c.highestNotOut ? "*" : ""}`} />
        <Stat label="100s" value={c.hundreds} />
        <Stat label="50s" value={c.fifties} />
        <Stat label="Strike Rate" value={sr} />
        <Stat label="Wickets" value={c.wickets} />
        <Stat label="Economy" value={econ} />
        <Stat label="Catches" value={c.catches} />
        <Stat label="Awards" value={c.awards} />
      </div>
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