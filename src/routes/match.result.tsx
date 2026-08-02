import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore, playerName } from "@/lib/pts/store";
import { BattingScorecard, BowlingScorecard } from "@/components/pts/Scorecards";
import { MatchTimeline } from "@/components/pts/MatchTimeline";
import { MatchInsights } from "@/components/pts/MatchInsights";
import { PointsBreakdown } from "@/components/pts/PointsBreakdown";

export const Route = createFileRoute("/match/result")({
  head: () => ({ meta: [{ title: "Match Result — PTS Scorer" }] }),
  component: Result,
});

const AWARD_ICON: Record<string, string> = {
  pom: "👑", fighter: "🔥", batsman: "🏏", bowler: "🎯", fielder: "🧤", worst: "🥶",
};
const AWARD_LABEL: Record<string, string> = {
  pom: "Player of the Match", fighter: "Fighter of the Match",
  batsman: "Batsman of the Match", bowler: "Bowler of the Match", fielder: "Fielder of the Match",
  worst: "Worst Player of the Match",
};

function Result() {
  const current = usePtsStore((s) => s.current);
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const completeMatch = usePtsStore((s) => s.completeMatch);
  const navigate = useNavigate();
  const [tab, setTab] = useState<"summary" | "points">("summary");

  if (!current?.result) {
    return (
      <AppShell title="Result"><div className="text-center mt-12 text-muted-foreground">
        No completed match to display. <Link className="text-primary underline" to="/">Home</Link>
      </div></AppShell>
    );
  }

  const order = ["pom", "fighter", "batsman", "bowler", "fielder", "worst"];
  const awards = (current.awards ?? []).sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

  return (
    <AppShell title="Result">
      <div className="mb-4 grid grid-cols-2 gap-1 p-1 rounded-xl border border-border/60 bg-secondary/40 text-xs uppercase tracking-widest">
        {(["summary", "points"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-2 font-bold transition ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary"
            }`}
          >
            {t === "summary" ? "Summary" : "Points Breakdown"}
          </button>
        ))}
      </div>

      {tab === "points" ? (
        <PointsBreakdown match={current} players={players} priorMatches={matches} />
      ) : (
      <>
      <section className="card-gold rounded-2xl p-6 text-center">
        <div className="text-xs uppercase tracking-[0.3em] text-primary/80">Final Result</div>
        <h1 className="text-3xl md:text-4xl font-black text-gradient-gold mt-2">{current.result.summary}</h1>
        {current.winDeclared && (
          <p className="mt-3 text-sm text-red-400">
            The opposing team accepted the win declaration and conceded the match.
          </p>
        )}
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {current.innings.map((inn, i) => (
            <div key={i} className="bg-secondary/40 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">{inn.battingTeam === "A" ? current.teamA.name : current.teamB.name}</div>
              <div className="text-xl font-bold">
                {inn.runs}/{inn.wickets}
                {inn.declared && <span className="ml-1 text-xs uppercase tracking-widest text-primary">Declared</span>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {current.story && (
        <section className="mt-6">
          <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">Match Story</h2>
          <p className="card-gold rounded-xl p-4 leading-relaxed">{current.story}</p>
        </section>
      )}

      <section className="mt-6">
        <MatchTimeline match={current} players={players} />
      </section>

      <section className="mt-6">
        <MatchInsights match={current} players={players} />
      </section>

      {awards.length > 0 && (
        <section className="mt-6 grid gap-3">
          {awards.map((a) => (
            <div key={a.type} className="card-gold rounded-xl p-4 flex items-start gap-3">
              <div className="text-3xl">{AWARD_ICON[a.type]}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs uppercase tracking-widest text-primary/80">{AWARD_LABEL[a.type]}</div>
                <div className="font-bold truncate">{a.headline}</div>
                <div className="text-xs text-muted-foreground">{a.reason}</div>
                <div className="text-[10px] text-muted-foreground mt-1">{a.team === "A" ? current.teamA.name : current.teamB.name}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="mt-8 space-y-4">
        {current.innings.map((inn, i) => (
          <div key={i}>
            <h3 className="text-sm uppercase tracking-widest text-primary/80 mb-2">
              {inn.battingTeam === "A" ? current.teamA.name : current.teamB.name} — {inn.runs}/{inn.wickets}
              {inn.declared ? " Declared" : ""}
            </h3>
            <BattingScorecard innings={inn} />
            <div className="h-2" />
            <BowlingScorecard innings={inn} />
          </div>
        ))}
      </section>
      </>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Button variant="outline" size="xl" onClick={() => navigate({ to: "/match/$id", params: { id: current.id } })}>
          View Full Scorecard
        </Button>
        <Button variant="hero" size="xl" onClick={() => { completeMatch(); navigate({ to: "/" }); }}>
          Save & Go Home
        </Button>
        <Button variant="ghostGold" size="xl" onClick={async () => { await exportPdf(current.id); }}>
          Export PDF
        </Button>
      </div>
      <div className="hidden">{playerName(players, "")}</div>
    </AppShell>
  );
}

async function exportPdf(id: string) {
  try {
    const { exportMatchPdf } = await import("@/lib/pts/pdf");
    await exportMatchPdf(id);
  } catch (e) {
    console.error(e);
  }
}