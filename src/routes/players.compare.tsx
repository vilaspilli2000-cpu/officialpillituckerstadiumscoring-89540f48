import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/pts/AppShell";
import { usePtsStore } from "@/lib/pts/store";
import { rankPlayers } from "@/lib/pts/rankings";
import { batterVsBowler } from "@/lib/pts/rivalries";
import {
  computeOvertakeScore,
  rankAllOvertake,
  buildOvertakePlan,
  type OvertakeScore,
  type OvertakeCategoryKey,
} from "@/lib/pts/overtakeRanking";
import type { Player } from "@/lib/pts/types";

export const Route = createFileRoute("/players/compare")({
  head: () => ({ meta: [{ title: "Compare Players — PTS Scorer" }] }),
  component: Compare,
});

type Row = { label: string; a: number | string; b: number | string; aBetter?: boolean; bBetter?: boolean; };

function num(v: number | string) {
  return typeof v === "number" ? v : parseFloat(v as string);
}

function markBetter(rows: Row[]): Row[] {
  return rows.map((r) => {
    const av = num(r.a), bv = num(r.b);
    if (isNaN(av) || isNaN(bv) || av === bv) return r;
    return { ...r, aBetter: av > bv, bBetter: bv > av };
  });
}

function Compare() {
  const players = usePtsStore((s) => s.players);
  const matches = usePtsStore((s) => s.matches);
  const ranked = useMemo(() => rankPlayers(players), [players]);
  const overtakeRanked = useMemo(() => rankAllOvertake(players, matches), [players, matches]);
  const [aId, setAId] = useState<string>(players[0]?.id ?? "");
  const [bId, setBId] = useState<string>(players[1]?.id ?? "");
  const [mode, setMode] = useState<"compare" | "overtake">("compare");

  const a = players.find((p) => p.id === aId);
  const b = players.find((p) => p.id === bId);

  return (
    <AppShell title="Compare Players">
      <div className="flex items-center gap-1 mb-4 -mt-2">
        <Link to="/players" className="flex items-center gap-1 text-primary">
          <ChevronLeft size={20} /> <span className="font-semibold">Back</span>
        </Link>
      </div>
      <h1 className="text-2xl font-black text-gradient-gold mb-3">
        {mode === "compare" ? "Compare Players" : "Overtake Analysis"}
      </h1>

      <div className="inline-flex rounded-xl border border-primary/30 bg-card/60 p-1 mb-3">
        <button
          onClick={() => setMode("compare")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${mode === "compare" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Compare
        </button>
        <button
          onClick={() => setMode("overtake")}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${mode === "overtake" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
        >
          Overtake
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <PlayerPicker label="Player A" value={aId} onChange={setAId} players={players} />
        <PlayerPicker label="Player B" value={bId} onChange={setBId} players={players} />
      </div>

      {a && b && a.id !== b.id ? (
        mode === "compare" ? (
          <Comparison a={a} b={b} ranked={ranked} matches={matches} />
        ) : (
          <OvertakeView a={a} b={b} overtakeRanked={overtakeRanked} matches={matches} />
        )
      ) : (
        <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-sm text-muted-foreground">
          Pick two different players to compare.
        </div>
      )}
    </AppShell>
  );
}

function PlayerPicker({ label, value, onChange, players }: {
  label: string; value: string; onChange: (v: string) => void; players: Player[];
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
      >
        {players.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
  );
}

function Comparison({ a, b, ranked, matches }: {
  a: Player; b: Player;
  ranked: ReturnType<typeof rankPlayers>;
  matches: ReturnType<typeof usePtsStore.getState>["matches"];
}) {
  const rankOf = (id: string, sel: (p: Player) => number) => {
    const sorted = [...ranked].sort((x, y) => sel(y.player) - sel(x.player));
    return sorted.findIndex((r) => r.player.id === id) + 1;
  };
  const overallRank = (id: string) => ranked.findIndex((r) => r.player.id === id) + 1;

  const battingRows = markBetter([
    { label: "Matches", a: a.career.matches, b: b.career.matches },
    { label: "Innings", a: a.career.innings ?? a.career.matches, b: b.career.innings ?? b.career.matches },
    { label: "Runs", a: a.career.runs, b: b.career.runs },
    { label: "Balls", a: a.career.balls, b: b.career.balls },
    { label: "Average", a: avgOf(a), b: avgOf(b) },
    { label: "Strike Rate", a: srOf(a), b: srOf(b) },
    { label: "Highest", a: `${a.career.highest}${a.career.highestNotOut ? "*" : ""}`, b: `${b.career.highest}${b.career.highestNotOut ? "*" : ""}` },
    { label: "50s", a: a.career.fifties, b: b.career.fifties },
    { label: "100s", a: a.career.hundreds, b: b.career.hundreds },
    { label: "150s", a: a.career.hundred50s ?? 0, b: b.career.hundred50s ?? 0 },
    { label: "200s", a: a.career.doubleHundreds ?? 0, b: b.career.doubleHundreds ?? 0 },
    { label: "Fours", a: a.career.fours, b: b.career.fours },
    { label: "Sixes", a: a.career.sixes, b: b.career.sixes },
    { label: "Not Outs", a: a.career.notOuts, b: b.career.notOuts },
    { label: "Ducks", a: a.career.ducks ?? 0, b: b.career.ducks ?? 0 },
  ]);

  const bowlingRows = markBetter([
    { label: "Wickets", a: a.career.wickets, b: b.career.wickets },
    { label: "Runs Conceded", a: a.career.bowlRuns, b: b.career.bowlRuns },
    { label: "Balls Bowled", a: a.career.bowlBalls, b: b.career.bowlBalls },
    { label: "Economy", a: econOf(a), b: econOf(b) },
    { label: "Bowling Avg", a: bowlAvgOf(a), b: bowlAvgOf(b) },
    { label: "Bowling SR", a: bowlSROf(a), b: bowlSROf(b) },
    { label: "Maidens", a: a.career.maidens ?? 0, b: b.career.maidens ?? 0 },
    { label: "Dot Balls", a: a.career.dots ?? 0, b: b.career.dots ?? 0 },
    { label: "Wides", a: a.career.wides ?? 0, b: b.career.wides ?? 0 },
    { label: "No Balls", a: a.career.noBalls ?? 0, b: b.career.noBalls ?? 0 },
    { label: "Best", a: `${a.career.bestBowlingWkts ?? 0}/${a.career.bestBowlingRuns ?? 0}`, b: `${b.career.bestBowlingWkts ?? 0}/${b.career.bestBowlingRuns ?? 0}` },
  ]);

  const catchPct = (p: Player) => p.career.matches ? ((p.career.catches / p.career.matches) * 100).toFixed(0) : "0";
  const fieldingRows = markBetter([
    { label: "Catches", a: a.career.catches, b: b.career.catches },
    { label: "Run Outs", a: a.career.runOuts, b: b.career.runOuts },
    { label: "Catch % (per match)", a: catchPct(a), b: catchPct(b) },
  ]);

  const awardRows = markBetter([
    { label: "POTM", a: a.career.pomAwards ?? 0, b: b.career.pomAwards ?? 0 },
    { label: "BOTM", a: a.career.batsmanAwards ?? 0, b: b.career.batsmanAwards ?? 0 },
    { label: "BOWLTM", a: a.career.bowlerAwards ?? 0, b: b.career.bowlerAwards ?? 0 },
    { label: "FOTM", a: a.career.fielderAwards ?? 0, b: b.career.fielderAwards ?? 0 },
    { label: "Fighter", a: a.career.fighterAwards ?? 0, b: b.career.fighterAwards ?? 0 },
    { label: "Worst", a: a.career.worstAwards ?? 0, b: b.career.worstAwards ?? 0 },
    { label: "Total Awards", a: a.career.awards, b: b.career.awards },
  ]);

  const rating = (p: Player, k: keyof NonNullable<Player["ratings"]>) => p.ratings?.[k] ?? 50;
  const ratingRows = markBetter([
    { label: "Overall", a: rating(a, "overall"), b: rating(b, "overall") },
    { label: "Batting", a: rating(a, "batting"), b: rating(b, "batting") },
    { label: "Bowling", a: rating(a, "bowling"), b: rating(b, "bowling") },
    { label: "Fielding", a: rating(a, "fielding"), b: rating(b, "fielding") },
    { label: "Pressure", a: rating(a, "pressure"), b: rating(b, "pressure") },
    { label: "Match Winning", a: rating(a, "matchWinning"), b: rating(b, "matchWinning") },
    { label: "Wicket Taking", a: rating(a, "wicketTaking"), b: rating(b, "wicketTaking") },
    { label: "Six Hitting", a: rating(a, "sixHitting"), b: rating(b, "sixHitting") },
    { label: "Death Bat", a: rating(a, "deathBat"), b: rating(b, "deathBat") },
    { label: "Death Bowl", a: rating(a, "deathBowl"), b: rating(b, "deathBowl") },
    { label: "Recent Form", a: rating(a, "recentForm"), b: rating(b, "recentForm") },
  ]);

  const rankingRows: Row[] = [
    { label: "Overall", a: overallRank(a.id), b: overallRank(b.id) },
    { label: "Runs", a: rankOf(a.id, (p) => p.career.runs), b: rankOf(b.id, (p) => p.career.runs) },
    { label: "Wickets", a: rankOf(a.id, (p) => p.career.wickets), b: rankOf(b.id, (p) => p.career.wickets) },
    { label: "Average", a: rankOf(a.id, avgOf), b: rankOf(b.id, avgOf) },
    { label: "Strike Rate", a: rankOf(a.id, srOf), b: rankOf(b.id, srOf) },
    { label: "Fours", a: rankOf(a.id, (p) => p.career.fours), b: rankOf(b.id, (p) => p.career.fours) },
    { label: "Sixes", a: rankOf(a.id, (p) => p.career.sixes), b: rankOf(b.id, (p) => p.career.sixes) },
    { label: "Catches", a: rankOf(a.id, (p) => p.career.catches), b: rankOf(b.id, (p) => p.career.catches) },
    { label: "Awards", a: rankOf(a.id, (p) => p.career.awards), b: rankOf(b.id, (p) => p.career.awards) },
  ].map((r) => ({ ...r, aBetter: (r.a as number) < (r.b as number), bBetter: (r.b as number) < (r.a as number) }));

  // Head-to-head (batter A vs bowler B and vice versa)
  const aVsB = batterVsBowler(matches, undefined, a.id, b.id);
  const bVsA = batterVsBowler(matches, undefined, b.id, a.id);

  // Summary sentence
  const battingLead = a.career.runs > b.career.runs ? a.name : b.name;
  const bowlingLead = a.career.wickets > b.career.wickets ? a.name : b.name;
  const awardsLead = a.career.awards > b.career.awards ? a.name : b.name;
  const summary = `${battingLead} leads in career runs. ${bowlingLead} leads in career wickets. ${awardsLead} leads in match awards.`;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">{summary}</div>
      <Section title="Batting" rows={battingRows} aName={a.name} bName={b.name} />
      <Section title="Bowling" rows={bowlingRows} aName={a.name} bName={b.name} />
      <Section title="Fielding" rows={fieldingRows} aName={a.name} bName={b.name} />
      <Section title="Awards" rows={awardRows} aName={a.name} bName={b.name} />
      <Section title="Ratings" rows={ratingRows} aName={a.name} bName={b.name} />
      <Section title="Rankings (lower is better)" rows={rankingRows} aName={a.name} bName={b.name} />

      {(aVsB.encounters > 0 || bVsA.encounters > 0) && (
        <div className="rounded-xl border border-primary/30 bg-card/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Head-to-Head</div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="font-semibold mb-1">{a.name} vs {b.name} (bat)</div>
              <div>Runs: {aVsB.runs} · Balls: {aVsB.balls}</div>
              <div>SR: {aVsB.balls ? aVsB.strikeRate.toFixed(1) : "—"} · Dismissed: {aVsB.dismissed}</div>
              <div>4s: {aVsB.fours} · 6s: {aVsB.sixes} · Highest: {aVsB.highest || "—"}</div>
            </div>
            <div>
              <div className="font-semibold mb-1">{b.name} vs {a.name} (bat)</div>
              <div>Runs: {bVsA.runs} · Balls: {bVsA.balls}</div>
              <div>SR: {bVsA.balls ? bVsA.strikeRate.toFixed(1) : "—"} · Dismissed: {bVsA.dismissed}</div>
              <div>4s: {bVsA.fours} · 6s: {bVsA.sixes} · Highest: {bVsA.highest || "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function avgOf(p: Player) {
  const innings = p.career.innings ?? p.career.matches;
  const outs = Math.max(1, innings - p.career.notOuts);
  return p.career.runs / outs;
}
function srOf(p: Player) { return p.career.balls ? (p.career.runs / p.career.balls) * 100 : 0; }
function econOf(p: Player) { return p.career.bowlBalls ? (p.career.bowlRuns / p.career.bowlBalls) * 6 : 0; }
function bowlAvgOf(p: Player) { return p.career.wickets ? p.career.bowlRuns / p.career.wickets : 0; }
function bowlSROf(p: Player) { return p.career.wickets ? p.career.bowlBalls / p.career.wickets : 0; }

function fmt(v: number | string) {
  if (typeof v === "string") return v;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

function OvertakeView({
  a, b, overtakeRanked, matches,
}: {
  a: Player; b: Player;
  overtakeRanked: OvertakeScore[];
  matches: ReturnType<typeof usePtsStore.getState>["matches"];
}) {
  const sA = useMemo(() => computeOvertakeScore(a, matches), [a, matches]);
  const sB = useMemo(() => computeOvertakeScore(b, matches), [b, matches]);
  const rankOf = (id: string) => overtakeRanked.findIndex((r) => r.player.id === id) + 1;
  const rankA = rankOf(a.id);
  const rankB = rankOf(b.id);

  const leader = sA.total >= sB.total ? sA : sB;
  const trailer = leader === sA ? sB : sA;
  const plan = useMemo(
    () => buildOvertakePlan(trailer, leader, overtakeRanked),
    [trailer, leader, overtakeRanked],
  );

  const catKeys: OvertakeCategoryKey[] = ["batting", "bigInnings", "consistency", "awards", "boundaries", "bowling"];

  return (
    <div className="space-y-3">
      {/* Overall */}
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Overall Ranking</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <ScoreCard s={sA} rank={rankA} winner={sA.total > sB.total} />
          <ScoreCard s={sB} rank={rankB} winner={sB.total > sA.total} />
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          Difference: <span className="text-primary font-bold">{Math.abs(sA.total - sB.total)} pts</span>
          {" · "}Leader: <span className="font-bold text-foreground">{leader.player.name}</span>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="rounded-xl border border-border/60 bg-card/60 p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary mb-2">Category Points</div>
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 gap-y-1 text-xs items-center">
          <div className="text-muted-foreground">Category</div>
          <div className="text-right font-semibold truncate">{a.name}</div>
          <div className="text-right font-semibold truncate">{b.name}</div>
          <div className="text-right text-muted-foreground">Winner</div>
          {catKeys.map((k) => {
            const ca = sA.categories[k];
            const cb = sB.categories[k];
            const aWin = ca.points > cb.points;
            const bWin = cb.points > ca.points;
            return (
              <div key={k} className="contents">
                <div className="text-muted-foreground">
                  <div>{ca.label}</div>
                  <div className="text-[10px] opacity-70">{aWin ? ca.detail : bWin ? cb.detail : ca.detail}</div>
                </div>
                <div className={`text-right tabular-nums ${aWin ? "text-primary font-bold" : ""}`}>{ca.points}</div>
                <div className={`text-right tabular-nums ${bWin ? "text-primary font-bold" : ""}`}>{cb.points}</div>
                <div className="text-right text-[10px] font-semibold">
                  {aWin ? a.name : bWin ? b.name : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Strength / Weakness */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1">
            {trailer.player.name}: Strongest
          </div>
          <div className="text-sm font-bold">{plan.strongest.label}</div>
          <div className="text-[11px] text-muted-foreground">{plan.strongest.detail}</div>
          <div className="text-xs mt-1 text-emerald-500 font-bold">{plan.strongest.points} pts</div>
        </div>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <div className="text-[10px] uppercase tracking-widest text-destructive mb-1">
            {trailer.player.name}: Weakest vs {leader.player.name}
          </div>
          <div className="text-sm font-bold">{plan.weakness.label}</div>
          <div className="text-[11px] text-muted-foreground">{plan.weakness.detail}</div>
        </div>
      </div>

      {/* Overtake Plan */}
      {trailer.total < leader.total && (
        <div className="rounded-xl border border-primary/40 bg-card/60 p-3">
          <div className="text-[10px] uppercase tracking-widest text-primary mb-2">
            Path for {trailer.player.name} to overtake {leader.player.name}
          </div>
          <div className="text-sm mb-3">{plan.summary}</div>
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <Stat label="Points Gap" value={`${plan.totalGap}`} />
            <Stat label="Projected Rank" value={`#${plan.projectedRank}`} />
            <Stat label="Est. Matches" value={`~${plan.estimatedMatches}`} />
            <Stat label="Confidence" value={`${plan.confidence}%`} />
          </div>
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-primary">Improvement Suggestions</div>
            {plan.suggestions.length === 0 ? (
              <div className="text-xs text-muted-foreground">No gaps — {trailer.player.name} already matches or leads in every category.</div>
            ) : (
              plan.suggestions.map((sg) => (
                <div key={sg.key} className="rounded-lg border border-border/60 bg-background/40 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">{sg.label}</span>
                    <span className="text-primary font-bold tabular-nums">+{sg.points} pts</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{sg.text}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
              <div className="text-[10px] uppercase tracking-widest text-primary">Quickest Path</div>
              <div className="font-semibold">{sA.categories[plan.quickestPath].label}</div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-2">
              <div className="text-[10px] uppercase tracking-widest text-primary">Biggest Gain</div>
              <div className="font-semibold">{sA.categories[plan.biggestPath].label}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ s, rank, winner }: { s: OvertakeScore; rank: number; winner: boolean }) {
  return (
    <div className={`rounded-lg border p-2 ${winner ? "border-primary bg-primary/10" : "border-border/60 bg-background/40"}`}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground truncate">{s.player.name}</div>
      <div className={`text-2xl font-black tabular-nums ${winner ? "text-primary" : ""}`}>{s.total}</div>
      <div className="text-[10px] text-muted-foreground">Rank #{rank || "—"} · SR {s.strikeRate.toFixed(1)}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function Section({ title, rows, aName, bName }: { title: string; rows: Row[]; aName: string; bName: string; }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/60 p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary mb-2">{title}</div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-xs">
        <div className="text-muted-foreground">Metric</div>
        <div className="text-right font-semibold truncate">{aName}</div>
        <div className="text-right font-semibold truncate">{bName}</div>
        {rows.map((r) => (
          <>
            <div key={r.label + "l"} className="text-muted-foreground">{r.label}</div>
            <div key={r.label + "a"} className={`text-right tabular-nums ${r.aBetter ? "text-primary font-bold" : ""}`}>{fmt(r.a)}</div>
            <div key={r.label + "b"} className={`text-right tabular-nums ${r.bBetter ? "text-primary font-bold" : ""}`}>{fmt(r.b)}</div>
          </>
        ))}
      </div>
    </div>
  );
}