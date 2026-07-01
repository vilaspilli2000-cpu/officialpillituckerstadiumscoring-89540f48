import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Pencil } from "lucide-react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { combinedCareer } from "@/lib/pts/seed";
import { playerAwardCounts, careerImpactScore } from "@/lib/pts/insights";
import { rankPlayers } from "@/lib/pts/rankings";

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
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  if (!player) return <AppShell><p>Player not found. <Link to="/players" className="text-primary underline">Back</Link></p></AppShell>;
  const c = combinedCareer(player);
  const innings = Math.max(0, player.career.innings ?? player.career.matches);
  const outs = Math.max(0, innings - player.career.notOuts);
  const sr = player.career.balls ? ((player.career.runs / player.career.balls) * 100).toFixed(1) : "-";
  const avg = outs > 0 ? (player.career.runs / outs).toFixed(1) : "-";
  const boundaries = (player.career.fours ?? 0) + (player.career.sixes ?? 0);
  const boundaryPct = player.career.balls ? ((boundaries / player.career.balls) * 100).toFixed(1) + "%" : "-";
  const boundaryRatio = boundaries ? (player.career.balls / boundaries).toFixed(1) : "-";
  const dots = player.career.dots ?? 0;
  const bowlBalls = player.career.bowlBalls;
  const oversBowled = bowlBalls ? `${Math.floor(bowlBalls / 6)}.${bowlBalls % 6}` : "-";
  const econ = bowlBalls ? ((player.career.bowlRuns / bowlBalls) * 6).toFixed(2) : "-";
  const bowlAvg = player.career.wickets ? (player.career.bowlRuns / player.career.wickets).toFixed(1) : "-";
  const bowlSR = player.career.wickets ? (bowlBalls / player.career.wickets).toFixed(1) : "-";
  const bowlerDotPct = bowlBalls && dots ? ((dots / bowlBalls) * 100).toFixed(0) + "%" : "-";
  const bestBB = (player.career.bestBowlingWkts ?? 0) > 0
    ? `${player.career.bestBowlingWkts}/${player.career.bestBowlingRuns}`
    : "-";
  const awardCounts = playerAwardCounts(player.id, matches);
  const totalAwards = awardCounts.total + player.career.awards;
  const impact = careerImpactScore(player, matches);
  const rankings = rankPlayers(players);
  const rankIdx = rankings.findIndex((r) => r.player.id === player.id);
  const rankLabel = rankIdx >= 0 ? `#${rankIdx + 1} of ${rankings.length}` : "—";
  const milestones = [
    player.career.hundreds > 0 && `${player.career.hundreds}× 💯`,
    (player.career.hundred50s ?? 0) > 0 && `${player.career.hundred50s}× 150+`,
    (player.career.doubleHundreds ?? 0) > 0 && `${player.career.doubleHundreds}× 200+`,
    player.career.fifties > 0 && `${player.career.fifties}× 50+`,
    (player.career.maidens ?? 0) > 0 && `${player.career.maidens}× maidens`,
  ].filter(Boolean) as string[];

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

      <Section title="Career Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Matches" value={c.matches} />
          <Stat label="Total Runs" value={c.runs} />
          <Stat label="Total Wickets" value={c.wickets} />
          <Stat label="Batting Avg" value={avg} />
          <Stat label="Strike Rate" value={sr} />
          <Stat label="Economy" value={econ} />
          <Stat label="Boundary %" value={boundaryPct} />
          <Stat label="Dot Ball %" value={bowlerDotPct} />
          <Stat label="Total Boundaries" value={boundaries} />
          <Stat label="Total Sixes" value={player.career.sixes ?? 0} />
          <Stat label="Career Awards" value={totalAwards} />
          <Stat label="Impact Score" value={impact} />
          <Stat label="Overall Rank" value={rankLabel} />
          <Stat label="Milestones" value={milestones.length} />
        </div>
        {milestones.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {milestones.map((m) => (
              <span key={m} className="rounded-full border border-primary/40 px-2 py-0.5 text-primary">{m}</span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Batting">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Innings" value={innings} />
          <Stat label="Runs" value={c.runs} />
          <Stat label="Balls" value={player.career.balls} />
          <Stat label="Average" value={avg} />
          <Stat label="Strike Rate" value={sr} />
          <Stat label="Highest" value={`${c.highest}${c.highestNotOut ? "*" : ""}`} />
          <Stat label="50s" value={player.career.fifties} />
          <Stat label="100s" value={player.career.hundreds} />
          <Stat label="150s" value={player.career.hundred50s ?? 0} />
          <Stat label="200s" value={player.career.doubleHundreds ?? 0} />
          <Stat label="Fours" value={player.career.fours ?? 0} />
          <Stat label="Sixes" value={player.career.sixes ?? 0} />
          <Stat label="Boundary %" value={boundaryPct} />
          <Stat label="Boundary Ratio" value={boundaryRatio} />
          <Stat label="Not Outs" value={player.career.notOuts} />
          <Stat label="Ducks" value={player.career.ducks ?? 0} />
        </div>
      </Section>

      <Section title="Bowling">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Wickets" value={player.career.wickets} />
          <Stat label="Balls Bowled" value={bowlBalls} />
          <Stat label="Overs" value={oversBowled} />
          <Stat label="Runs Conceded" value={player.career.bowlRuns} />
          <Stat label="Economy" value={econ} />
          <Stat label="Bowling Avg" value={bowlAvg} />
          <Stat label="Bowling SR" value={bowlSR} />
          <Stat label="Dot Balls" value={dots} />
          <Stat label="Dot %" value={bowlerDotPct} />
          <Stat label="Maidens" value={player.career.maidens ?? 0} />
          <Stat label="Wides" value={player.career.wides ?? 0} />
          <Stat label="No Balls" value={player.career.noBalls ?? 0} />
          <Stat label="Best Bowling" value={bestBB} />
        </div>
      </Section>

      <Section title="Fielding">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Catches" value={player.career.catches} />
          <Stat label="Run Outs" value={player.career.runOuts} />
          <Stat label="Stumpings" value={0} />
        </div>
      </Section>

      <Section title="Awards">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Stat label="Player of Match" value={awardCounts.pom} />
          <Stat label="Batsman of Match" value={awardCounts.batsman} />
          <Stat label="Bowler of Match" value={awardCounts.bowler} />
          <Stat label="Fielder of Match" value={awardCounts.fielder} />
          <Stat label="Fighter of Match" value={awardCounts.fighter} />
          <Stat label="Worst of Match" value={awardCounts.worst} />
          <Stat label="Total Awards" value={totalAwards} />
        </div>
      </Section>

      {player.ratings && Object.keys(player.ratings).length > 0 && (
        <Section title="Ratings">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {RATING_ORDER.map((k) => {
              const v = player.ratings?.[k as keyof typeof player.ratings];
              return typeof v === "number" ? <Stat key={k} label={RATING_LABELS[k] ?? k} value={v} /> : null;
            })}
          </div>
        </Section>
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 card-gold rounded-2xl p-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">{title}</h2>
      {children}
    </section>
  );
}

const RATING_ORDER = [
  "overall", "batting", "bowling", "fielding", "pressure", "matchWinning",
  "wicketTaking", "sixHitting", "deathBat", "deathBowl", "recentForm",
];
const RATING_LABELS: Record<string, string> = {
  overall: "Overall", batting: "Batting", bowling: "Bowling", fielding: "Fielding",
  pressure: "Pressure", matchWinning: "Match Winning", wicketTaking: "Wicket Taking",
  sixHitting: "Six Hitting", deathBat: "Death Batting", deathBowl: "Death Bowling",
  recentForm: "Recent Form",
};