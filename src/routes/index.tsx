import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PTS Scorer — Home" },
      { name: "description", content: "Score, record and relive every PTS cricket match." },
    ],
  }),
  component: Home,
});

function Home() {
  const current = usePtsStore((s) => s.current);
  const matches = usePtsStore((s) => s.matches);
  return (
    <AppShell>
      <section className="relative overflow-hidden rounded-2xl card-gold p-6 md:p-10 mb-8">
        <div
          className="absolute inset-0 opacity-30 pointer-events-none gradient-gold blur-3xl"
          style={{ clipPath: "circle(35% at 100% 0)" }}
        />
        <div className="relative">
          <p className="text-xs tracking-[0.3em] text-primary/80 uppercase">PTS Scorer</p>
          <h1 className="mt-2 text-4xl md:text-5xl font-black text-gradient-gold leading-tight">
            Pilli Tucker Stadium
          </h1>
          <p className="mt-2 text-muted-foreground max-w-md">
            A premium mobile-first scoring platform for PTS cricket. Every touch counts.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="xl">
              <Link to="/match/setup">New Match</Link>
            </Button>
            {current && (
              <Button asChild variant="ghostGold" size="xl">
                <Link to="/match/live">Continue Match</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Tile to="/records" title="Records" sub="Rankings & milestones" />
        <Tile to="/players" title="Players" sub="Profiles & career stats" />
        <Tile to="/almanac" title="Almanac" sub="Live achievements" />
        <Tile to="/history" title="History" sub={`${matches.length} matches`} />
        <Tile to="/settings" title="Settings" sub="Rules & calculations" />
        <Tile to="/challenges" title="Challenges" sub="Active player goals" />
      </section>
    </AppShell>
  );
}

function Tile({ to, title, sub }: { to: string; title: string; sub: string }) {
  return (
    <Link to={to} className="card-gold rounded-xl p-4 hover:border-primary transition-colors">
      <div className="text-lg font-bold text-primary">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </Link>
  );
}
