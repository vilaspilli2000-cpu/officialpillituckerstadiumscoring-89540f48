import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { BattingScorecard, BowlingScorecard } from "@/components/pts/Scorecards";

export const Route = createFileRoute("/match/$id")({
  head: () => ({ meta: [{ title: "Full Scorecard — PTS Scorer" }] }),
  component: MatchView,
});

const AWARD_LABEL: Record<string, string> = {
  pom: "Player of the Match",
  fighter: "Fighter of the Match",
  batsman: "Batsman of the Match",
  bowler: "Bowler of the Match",
  fielder: "Fielder of the Match",
};

function MatchView() {
  const { id } = Route.useParams();
  const match = usePtsStore((s) => s.matches.find((m) => m.id === id));
  const navigate = useNavigate();

  if (!match) {
    return (
      <AppShell title="Scorecard">
        <div className="text-center mt-12">
          <p className="text-muted-foreground">Match not found.</p>
          <Link to="/history" className="text-primary underline mt-3 inline-block">Back to History</Link>
        </div>
      </AppShell>
    );
  }

  const awards = match.awards ?? [];

  return (
    <AppShell title="Scorecard">
      <section className="card-gold rounded-2xl p-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-primary/80">Full Scorecard</div>
        <h1 className="text-2xl md:text-3xl font-black text-gradient-gold mt-2">{match.result?.summary ?? "Match"}</h1>
        <div className="text-xs text-muted-foreground mt-1">
          {match.teamA.name} vs {match.teamB.name} · Format {match.format}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {match.innings.map((inn, i) => (
            <div key={i} className="bg-secondary/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">{inn.battingTeam === "A" ? match.teamA.name : match.teamB.name}</div>
              <div className="text-xl font-bold tabular-nums">{inn.runs}/{inn.wickets}</div>
            </div>
          ))}
        </div>
      </section>

      {match.story && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">Match Story</h2>
          <p className="card-gold rounded-xl p-4 leading-relaxed">{match.story}</p>
        </section>
      )}

      {awards.length > 0 && (
        <section className="mt-6 grid gap-3">
          {awards.map((a) => (
            <div key={a.type} className="card-gold rounded-xl p-4">
              <div className="text-xs uppercase tracking-widest text-primary/80">{AWARD_LABEL[a.type] ?? a.type}</div>
              <div className="font-bold">{a.headline}</div>
              <div className="text-xs text-muted-foreground mt-1">{a.reason}</div>
            </div>
          ))}
        </section>
      )}

      <section className="mt-8 space-y-6">
        {match.innings.map((inn, i) => (
          <div key={i}>
            <h3 className="text-sm uppercase tracking-widest text-primary/80 mb-2">
              {inn.battingTeam === "A" ? match.teamA.name : match.teamB.name} — {inn.runs}/{inn.wickets}
            </h3>
            <BattingScorecard innings={inn} />
            <div className="h-2" />
            <BowlingScorecard innings={inn} />
          </div>
        ))}
      </section>

      <div className="mt-8 flex gap-3">
        <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/history" })}>Back</Button>
      </div>
    </AppShell>
  );
}