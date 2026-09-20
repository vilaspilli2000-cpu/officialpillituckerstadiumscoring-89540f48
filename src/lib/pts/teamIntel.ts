import type { Player } from "./types";

/** Pre-match team analysis: strength, ratings, AI notes, swap suggestions,
 *  and a match-prediction probability. Purely derived from career stats
 *  and ratings — no randomness. */

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const avg = (nums: number[]) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);

export interface TeamRatings {
  overall: number;
  batting: number;
  bowling: number;
  fielding: number;
  experience: number;
  matchWinning: number;
  pressure: number;
}

export interface TeamProfile {
  playerIds: string[];
  ratings: TeamRatings;
  batting: {
    totalRuns: number;
    avg: number;
    sr: number;
    boundaryPct: number;
    sixHitting: number;
    depth: number;
  };
  bowling: {
    totalWickets: number;
    economy: number;
    depth: number;
    deathBowl: number;
    wicketTaking: number;
  };
  fielding: { catches: number; runOuts: number; rating: number };
  experience: { matches: number; awards: number; hof: number };
  strength: number; // 0..100
}

export function profileTeam(ids: string[], players: Player[]): TeamProfile {
  const roster = ids.map((id) => players.find((p) => p.id === id)).filter(Boolean) as Player[];
  if (roster.length === 0) {
    return {
      playerIds: ids,
      ratings: {
        overall: 50,
        batting: 50,
        bowling: 50,
        fielding: 50,
        experience: 50,
        matchWinning: 50,
        pressure: 50,
      },
      batting: { totalRuns: 0, avg: 0, sr: 0, boundaryPct: 0, sixHitting: 50, depth: 0 },
      bowling: { totalWickets: 0, economy: 0, depth: 0, deathBowl: 50, wicketTaking: 50 },
      fielding: { catches: 0, runOuts: 0, rating: 50 },
      experience: { matches: 0, awards: 0, hof: 0 },
      strength: 50,
    };
  }
  const r = (k: keyof NonNullable<Player["ratings"]>) =>
    avg(roster.map((p) => p.ratings?.[k] ?? 50));
  const totalRuns = roster.reduce((s, p) => s + p.career.runs, 0);
  const totalBalls = roster.reduce((s, p) => s + p.career.balls, 0);
  const totalInnings = roster.reduce((s, p) => s + (p.career.innings ?? p.career.matches), 0);
  const totalNotOuts = roster.reduce((s, p) => s + p.career.notOuts, 0);
  const totalBoundaries = roster.reduce((s, p) => s + p.career.fours + p.career.sixes, 0);
  const totalWkts = roster.reduce((s, p) => s + p.career.wickets, 0);
  const totalBowlBalls = roster.reduce((s, p) => s + p.career.bowlBalls, 0);
  const totalBowlRuns = roster.reduce((s, p) => s + p.career.bowlRuns, 0);
  const catches = roster.reduce((s, p) => s + p.career.catches, 0);
  const runOuts = roster.reduce((s, p) => s + p.career.runOuts, 0);
  const matches = roster.reduce((s, p) => s + p.career.matches, 0);
  const awards = roster.reduce((s, p) => s + p.career.awards, 0);

  const battingDepth = roster.filter((p) => (p.ratings?.batting ?? 50) >= 55).length;
  const bowlingDepth = roster.filter((p) => (p.ratings?.bowling ?? 50) >= 55).length;
  const hof = clamp(totalRuns / 50 + totalWkts * 2 + awards * 5, 0, 100);

  const ratings: TeamRatings = {
    overall: r("overall"),
    batting: r("batting"),
    bowling: r("bowling"),
    fielding: r("fielding"),
    experience: clamp((matches / (roster.length * 100)) * 100 + awards * 2, 0, 100),
    matchWinning: r("matchWinning"),
    pressure: r("pressure"),
  };

  const avgBat = totalInnings - totalNotOuts > 0 ? totalRuns / (totalInnings - totalNotOuts) : 0;
  const sr = totalBalls ? (totalRuns / totalBalls) * 100 : 0;
  const boundaryPct = totalBalls ? (totalBoundaries / totalBalls) * 100 : 0;
  const economy = totalBowlBalls ? (totalBowlRuns / totalBowlBalls) * 6 : 0;

  const battingScore = clamp(
    ratings.batting * 0.4 +
      clamp((avgBat / 35) * 100) * 0.25 +
      clamp(((sr - 90) / 60) * 100) * 0.15 +
      clamp((boundaryPct / 22) * 100) * 0.1 +
      clamp((battingDepth / roster.length) * 100) * 0.1,
  );
  const bowlingScore = clamp(
    ratings.bowling * 0.4 +
      clamp((totalWkts / (roster.length * 80)) * 100) * 0.2 +
      clamp(((9 - economy) / 4) * 100) * 0.2 +
      clamp((bowlingDepth / roster.length) * 100) * 0.1 +
      r("deathBowl") * 0.1,
  );
  const fieldingScore = clamp(
    ratings.fielding * 0.6 + clamp(((catches + runOuts * 1.5) / Math.max(1, matches)) * 60) * 0.4,
  );
  const strength = clamp(
    battingScore * 0.38 +
      bowlingScore * 0.32 +
      fieldingScore * 0.1 +
      ratings.matchWinning * 0.1 +
      ratings.experience * 0.05 +
      ratings.pressure * 0.05,
  );

  return {
    playerIds: ids,
    ratings,
    batting: {
      totalRuns,
      avg: avgBat,
      sr,
      boundaryPct,
      sixHitting: r("sixHitting"),
      depth: battingDepth,
    },
    bowling: {
      totalWickets: totalWkts,
      economy,
      depth: bowlingDepth,
      deathBowl: r("deathBowl"),
      wicketTaking: r("wicketTaking"),
    },
    fielding: { catches, runOuts, rating: ratings.fielding },
    experience: { matches, awards, hof },
    strength,
  };
}

export function verdictFromGap(gap: number): {
  label: string;
  tone: "balanced" | "slight" | "moderate" | "strong";
} {
  const g = Math.abs(gap);
  if (g <= 3) return { label: "✅ Perfectly Balanced", tone: "balanced" };
  if (g <= 7) return { label: "🟢 Slight Advantage", tone: "slight" };
  if (g <= 15) return { label: "🟠 Moderate Advantage", tone: "moderate" };
  return { label: "🔴 Strong Advantage", tone: "strong" };
}

/** Human-readable AI analysis explaining the strength gap. */
export function analyzeMatchup(
  a: TeamProfile,
  b: TeamProfile,
  aName: string,
  bName: string,
): string[] {
  const out: string[] = [];
  const cmp = (
    metric: string,
    av: number,
    bv: number,
    aBetter: string,
    bBetter: string,
    threshold = 4,
  ) => {
    if (Math.abs(av - bv) < threshold) return;
    out.push(av > bv ? `${aName} ${aBetter}` : `${bName} ${bBetter}`);
    void metric;
  };
  cmp(
    "bat",
    a.ratings.batting,
    b.ratings.batting,
    "has a stronger top order.",
    "has a stronger top order.",
  );
  cmp(
    "bowl",
    a.ratings.bowling,
    b.ratings.bowling,
    "has more penetrative bowling.",
    "has more penetrative bowling.",
  );
  cmp(
    "field",
    a.ratings.fielding,
    b.ratings.fielding,
    "has better fielding.",
    "has better fielding.",
  );
  cmp(
    "dbowl",
    a.bowling.deathBowl,
    b.bowling.deathBowl,
    "has stronger death bowling.",
    "has stronger death bowling.",
  );
  cmp(
    "mw",
    a.ratings.matchWinning,
    b.ratings.matchWinning,
    "has more match winners.",
    "has more match winners.",
  );
  cmp(
    "depth",
    a.batting.depth,
    b.batting.depth,
    "has greater batting depth.",
    "has greater batting depth.",
    1,
  );
  cmp(
    "exp",
    a.experience.matches,
    b.experience.matches,
    "brings more experienced players.",
    "brings more experienced players.",
    20,
  );
  cmp(
    "six",
    a.batting.sixHitting,
    b.batting.sixHitting,
    "has better six-hitting.",
    "has better six-hitting.",
  );
  return out.slice(0, 6);
}

export interface SwapSuggestion {
  fromA: string;
  fromB: string;
  newStrengthA: number;
  newStrengthB: number;
  newGap: number;
  currentGap: number;
}

export function suggestSwaps(
  teamAIds: string[],
  teamBIds: string[],
  players: Player[],
  jokerId?: string,
): SwapSuggestion[] {
  const current = {
    A: profileTeam(teamAIds, players).strength,
    B: profileTeam(teamBIds, players).strength,
  };
  const currentGap = Math.abs(current.A - current.B);
  const out: SwapSuggestion[] = [];
  for (const a of teamAIds) {
    if (a === jokerId) continue;
    for (const b of teamBIds) {
      if (b === jokerId) continue;
      const newA = teamAIds.map((x) => (x === a ? b : x));
      const newB = teamBIds.map((x) => (x === b ? a : x));
      const sA = profileTeam(newA, players).strength;
      const sB = profileTeam(newB, players).strength;
      const gap = Math.abs(sA - sB);
      if (gap + 0.5 < currentGap) {
        out.push({
          fromA: a,
          fromB: b,
          newStrengthA: sA,
          newStrengthB: sB,
          newGap: gap,
          currentGap,
        });
      }
    }
  }
  out.sort((x, y) => x.newGap - y.newGap);
  return out.slice(0, 3);
}

/** Match prediction = strength percentages normalized to 100. */
export function predictMatch(a: TeamProfile, b: TeamProfile): { A: number; B: number } {
  const total = a.strength + b.strength;
  if (total === 0) return { A: 50, B: 50 };
  const A = Math.round((a.strength / total) * 100);
  return { A, B: 100 - A };
}
