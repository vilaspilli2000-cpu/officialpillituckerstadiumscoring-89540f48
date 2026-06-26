import type { Player } from "./types";

type SeedRow = {
  id: string;
  name: string;
  matches: number;
  runs: number;
  balls: number;
  highest: number;
  highestNotOut?: boolean;
  fifties: number;
  hundreds: number;
  wickets: number;
  catches: number;
  notes: string;
  role?: Player["role"];
  ratings?: NonNullable<Player["ratings"]>;
  beginner?: boolean;
};

// Estimated splits (fours/sixes/bowlBalls/bowlRuns) inferred from career data so
// derived metrics (SR, econ, boundary%) reflect each player's style. Fully
// editable later via Edit Records; never overwrites manual edits.
const ROWS: SeedRow[] = [
  {
    id: "sunny", name: "Sunny", matches: 96, runs: 4982, balls: 2406,
    highest: 264, highestNotOut: true, fifties: 36, hundreds: 19,
    wickets: 74, catches: 42, role: "All-rounder",
    notes: "Aggressive elite boundary hitter, very high strike rate, low dot-ball rate, major match winner.",
    ratings: { overall: 96, batting: 98, bowling: 70, fielding: 82, pressure: 88, matchWinning: 96, wicketTaking: 72, sixHitting: 95, deathBat: 92, deathBowl: 70, recentForm: 90 },
  },
  {
    id: "sathvik", name: "Sathvik", matches: 88, runs: 4216, balls: 2375,
    highest: 174, fifties: 28, hundreds: 11, wickets: 109, catches: 37,
    role: "All-rounder",
    notes: "Strong all-rounder, dangerous wicket-taker, explosive top-order batter.",
    ratings: { overall: 92, batting: 90, bowling: 90, fielding: 80, pressure: 84, matchWinning: 90, wicketTaking: 92, sixHitting: 86, deathBat: 84, deathBowl: 86, recentForm: 86 },
  },
  {
    id: "rithu", name: "Rithu", matches: 74, runs: 3182, balls: 2121,
    highest: 127, fifties: 13, hundreds: 6, wickets: 82, catches: 46,
    role: "All-rounder",
    notes: "Reliable pressure player, strong fielder, important middle-order contributor.",
    ratings: { overall: 85, batting: 82, bowling: 82, fielding: 90, pressure: 88, matchWinning: 80, wicketTaking: 80, sixHitting: 70, deathBat: 78, deathBowl: 80, recentForm: 80 },
  },
  {
    id: "atharv", name: "Atharv", matches: 48, runs: 1846, balls: 1188,
    highest: 167, fifties: 6, hundreds: 2, wickets: 41, catches: 24,
    role: "Batter",
    notes: "High-ceiling attacking player with major-score potential.",
    ratings: { overall: 80, batting: 86, bowling: 70, fielding: 76, pressure: 74, matchWinning: 82, wicketTaking: 70, sixHitting: 84, deathBat: 78, deathBowl: 68, recentForm: 78 },
  },
  {
    id: "karthik", name: "Karthik", matches: 57, runs: 2146, balls: 1690,
    highest: 88, fifties: 1, hundreds: 0, wickets: 67, catches: 29,
    role: "All-rounder",
    notes: "Pressure-resistant contributor and useful bowler.",
    ratings: { overall: 76, batting: 72, bowling: 80, fielding: 78, pressure: 84, matchWinning: 72, wicketTaking: 78, sixHitting: 64, deathBat: 70, deathBowl: 78, recentForm: 74 },
  },
  {
    id: "deva", name: "Deva", matches: 52, runs: 1928, balls: 1748,
    highest: 52, highestNotOut: true, fifties: 1, hundreds: 0,
    wickets: 38, catches: 31, role: "Batter",
    notes: "Patient rescue batter, values survival and difficult chases.",
    ratings: { overall: 74, batting: 76, bowling: 66, fielding: 78, pressure: 90, matchWinning: 72, wicketTaking: 66, sixHitting: 58, deathBat: 78, deathBowl: 64, recentForm: 72 },
  },
  {
    id: "karunya", name: "Karunya", matches: 39, runs: 1264, balls: 1015,
    highest: 38, fifties: 0, hundreds: 0, wickets: 44, catches: 19,
    role: "All-rounder",
    notes: "Developing all-round player.",
    ratings: { overall: 68, batting: 68, bowling: 70, fielding: 70, pressure: 66, matchWinning: 66, wicketTaking: 70, sixHitting: 60, deathBat: 62, deathBowl: 66, recentForm: 68 },
  },
  {
    id: "himmu", name: "Himmu", matches: 34, runs: 1086, balls: 905,
    highest: 23, fifties: 0, hundreds: 0, wickets: 51, catches: 21,
    role: "Bowler",
    notes: "Bowling-focused player with useful lower-order runs.",
    ratings: { overall: 68, batting: 60, bowling: 80, fielding: 72, pressure: 70, matchWinning: 66, wicketTaking: 80, sixHitting: 56, deathBat: 58, deathBowl: 76, recentForm: 68 },
  },
  {
    id: "nishant", name: "Nishant", matches: 28, runs: 814, balls: 690,
    highest: 35, fifties: 0, hundreds: 0, wickets: 23, catches: 16,
    role: "All-rounder",
    notes: "Developing player.",
    ratings: { overall: 62, batting: 62, bowling: 62, fielding: 64, pressure: 60, matchWinning: 58, wicketTaking: 62, sixHitting: 56, deathBat: 56, deathBowl: 60, recentForm: 60 },
  },
  {
    id: "madhu", name: "Madhu", matches: 24, runs: 652, balls: 560,
    highest: 14, fifties: 0, hundreds: 0, wickets: 18, catches: 11,
    role: "All-rounder",
    notes: "Developing player.",
    ratings: { overall: 58, batting: 58, bowling: 58, fielding: 60, pressure: 56, matchWinning: 54, wicketTaking: 58, sixHitting: 52, deathBat: 52, deathBowl: 56, recentForm: 56 },
  },
  {
    id: "karthik2", name: "Karthik2", matches: 0, runs: 0, balls: 0,
    highest: 0, fifties: 0, hundreds: 0, wickets: 0, catches: 0,
    role: "—", beginner: true,
    notes: "New player, default rating 50.",
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "jayden", name: "Jayden", matches: 0, runs: 0, balls: 0,
    highest: 0, fifties: 0, hundreds: 0, wickets: 0, catches: 0,
    role: "—", beginner: true,
    notes: "Beginner, default rating 50.",
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
];

function toPlayer(r: SeedRow): Player {
  // Estimate boundary/bowling splits to power derived metrics.
  const fours = Math.round(r.runs * 0.18 / 4); // ~18% of runs from fours
  const sixes = Math.round(r.runs * 0.12 / 6); // ~12% from sixes
  const bowlBalls = Math.round(r.wickets * 18); // ~3 overs per wicket
  const bowlRuns = Math.round(bowlBalls * 1.15); // ~6.9 economy
  return {
    id: r.id,
    name: r.name,
    createdAt: Date.now(),
    role: r.role ?? "—",
    notes: r.notes,
    beginner: r.beginner,
    ratings: r.ratings ?? { overall: 50 },
    seed: { hundreds: 0, fifties: 0, highest: 0, highestNotOut: false },
    career: {
      matches: r.matches,
      innings: r.matches,
      runs: r.runs,
      balls: r.balls,
      fours,
      sixes,
      hundreds: r.hundreds,
      fifties: r.fifties,
      hundred50s: 0,
      doubleHundreds: r.highest >= 200 ? 1 : 0,
      highest: r.highest,
      highestNotOut: !!r.highestNotOut,
      wickets: r.wickets,
      bowlBalls,
      bowlRuns,
      maidens: 0,
      dots: Math.round(bowlBalls * 0.35),
      wides: 0,
      noBalls: 0,
      bestBowlingWkts: r.wickets > 0 ? Math.min(5, Math.max(2, Math.round(r.wickets / 20))) : 0,
      bestBowlingRuns: r.wickets > 0 ? 12 : 0,
      catches: r.catches,
      runOuts: 0,
      awards: 0,
      notOuts: Math.max(0, Math.round(r.matches * 0.08)),
      ducks: 0,
    },
  };
}

export const SEED_PLAYERS: Player[] = ROWS.map(toPlayer);

/** Combined career view = seed + accrued career stats (for display only). */
export function combinedCareer(p: Player) {
  return {
    hundreds: p.seed.hundreds + p.career.hundreds,
    fifties: p.seed.fifties + p.career.fifties,
    highest: Math.max(p.seed.highest, p.career.highest),
    highestNotOut:
      p.seed.highest > p.career.highest
        ? !!p.seed.highestNotOut
        : p.career.highest > p.seed.highest
          ? p.career.highestNotOut
          : !!(p.seed.highestNotOut || p.career.highestNotOut),
    runs: p.career.runs,
    matches: p.career.matches,
    wickets: p.career.wickets,
    catches: p.career.catches,
    awards: p.career.awards,
  };
}