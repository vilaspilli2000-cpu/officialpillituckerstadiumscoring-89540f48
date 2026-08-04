import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import { LiveScorecard } from "@/components/pts/LiveScorecard";
import { MatchAnalytics } from "@/components/pts/MatchAnalytics";
import { CommentaryFeed } from "@/components/pts/CommentaryFeed";
import { ProbabilityBar } from "@/components/pts/ProbabilityBar";
import { MatchTimeline } from "@/components/pts/MatchTimeline";
import { MatchInsights } from "@/components/pts/MatchInsights";
import { TeamMomentumMeter } from "@/components/pts/TeamMomentumMeter";
import { PointsBreakdown } from "@/components/pts/PointsBreakdown";

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
  worst: "Worst Player of the Match",
};

function MatchView() {
  const { id } = Route.useParams();
  const current = usePtsStore((s) => s.current);
  const saved = usePtsStore((s) => s.matches.find((m) => m.id === id));
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const match = current?.id === id ? current : saved;
  const navigate = useNavigate();
  const [tab, setTab] = useState<"scorecard" | "analytics" | "commentary" | "points">("scorecard");

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
  const live = !match.result;

  return (
    <AppShell title="Scorecard">
      <section className="card-gold rounded-2xl p-5 text-center">
        <div className="text-[11px] uppercase tracking-[0.3em] text-primary/80">
          {live ? "Live Scorecard" : "Full Scorecard"}
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-gradient-gold mt-2">
          {match.result?.summary ?? `${match.teamA.name} vs ${match.teamB.name}`}
        </h1>
        <div className="text-xs text-muted-foreground mt-1">
          {match.teamA.name} vs {match.teamB.name} · Format {match.format}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {match.innings.map((inn, i) => (
            <div key={i} className="bg-secondary/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">{inn.battingTeam === "A" ? match.teamA.name : match.teamB.name}</div>
              <div className="text-xl font-bold tabular-nums">
                {inn.runs}/{inn.wickets}
                {inn.declared && <span className="ml-1 text-[10px] uppercase tracking-widest text-primary">Declared</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-4">
        <ProbabilityBar match={match} />
      </div>

      <div className="mt-4">
        <TeamMomentumMeter match={match} />
      </div>

      <div className="mt-4">
        <MatchTimeline match={match} players={players} />
      </div>

      <div className="mt-4">
        <MatchInsights match={match} players={players} />
      </div>

      {match.winDeclared && (
        <p className="mt-4 rounded-xl border border-red-600/40 bg-red-600/10 p-3 text-center text-sm text-red-400">
          The opposing team accepted the win declaration and conceded the match.
        </p>
      )}

      <div className="mt-4 grid grid-cols-4 gap-1 p-1 rounded-xl border border-border/60 bg-secondary/40 text-[10px] uppercase tracking-widest">
        {(["scorecard", "analytics", "commentary", "points"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 font-bold transition ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "scorecard" && <LiveScorecard match={match} players={players} />}
        {tab === "analytics" && <MatchAnalytics match={match} />}
        {tab === "commentary" && <CommentaryFeed entries={match.commentary ?? []} />}
        {tab === "points" && <PointsBreakdown match={match} players={players} priorMatches={matches} />}
      </div>

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

      <div className="mt-8 flex gap-3">
        {live && (
          <Button variant="gold" className="flex-1" onClick={() => navigate({ to: "/match/live" })}>
            Back to Live
          </Button>
        )}
        {!live && (
          <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/history" })}>Back</Button>
        )}
      </div>
    </AppShell>
  );
}