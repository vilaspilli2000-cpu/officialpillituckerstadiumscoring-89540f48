import type { Player } from "./types";
import { applyHistoricBaseline } from "./historicBaseline";

// Official PTS player database. IDs preserved from previous seed so
// existing edits, matches, and history keep referencing the same players.
type SeedRow = {
  id: string;
  name: string;
  role: Player["role"];
  notes: string;
  matches: number;
  innings: number;
  runs: number;
  balls: number;
  highest: number;
  fifties: number;
  hundreds: number;
  hundred50s: number;
  doubleHundreds: number;
  fours: number;
  sixes: number;
  notOuts: number;
  ducks: number;
  wickets: number;
  bowlRuns: number;
  bowlBalls: number;
  maidens: number;
  dots: number;
  wides: number;
  noBalls: number;
  bestBowlingWkts: number;
  bestBowlingRuns: number;
  catches: number;
  runOuts: number;
  awards: number;
  /** Legacy ranking contribution from the pre-tracking era. */
  historicRankingPoints?: number;
  ratings: NonNullable<Player["ratings"]>;
};

const ROWS: SeedRow[] = [
  {
    id: "sunny", name: "Sunny", role: "All-rounder",
    notes: "PTS greatest all-rounder. Explosive boundary hitter, elite finisher, low dot-ball rate, major match winner.",
    matches: 260, innings: 218, runs: 22686, balls: 12789, highest: 264,
    fifties: 55, hundreds: 24, hundred50s: 4, doubleHundreds: 2,
    fours: 5896, sixes: 782, notOuts: 36, ducks: 3,
    wickets: 473, bowlRuns: 4986, bowlBalls: 7632, maidens: 18, dots: 4218,
    wides: 42, noBalls: 11, bestBowlingWkts: 5, bestBowlingRuns: 9,
    catches: 173, runOuts: 37, awards: 558,
    ratings: { overall: 99, batting: 100, bowling: 99, fielding: 89, pressure: 99, matchWinning: 100, wicketTaking: 97, sixHitting: 100, deathBat: 100, deathBowl: 97, recentForm: 99 },
  },
  {
    id: "sathvik", name: "Sathvik", role: "Batter",
    notes: "Aggressive top-order batter with excellent timing and dependable bowling support.",
    matches: 260, innings: 225, runs: 16575, balls: 10042, highest: 174,
    fifties: 37, hundreds: 13, hundred50s: 0, doubleHundreds: 0,
    fours: 4298, sixes: 486, notOuts: 24, ducks: 5,
    wickets: 305, bowlRuns: 3948, bowlBalls: 5618, maidens: 12, dots: 2984,
    wides: 34, noBalls: 8, bestBowlingWkts: 5, bestBowlingRuns: 14,
    catches: 161, runOuts: 29, awards: 380,
    ratings: { overall: 98, batting: 99, bowling: 91, fielding: 90, pressure: 98, matchWinning: 99, wicketTaking: 90, sixHitting: 97, deathBat: 98, deathBowl: 90, recentForm: 98 },
  },
  {
    id: "rithu", name: "Rithu", role: "All-rounder",
    notes: "Reliable all-rounder capable of changing matches with both bat and ball.",
    matches: 260, innings: 214, runs: 13718, balls: 8560, highest: 127,
    fifties: 15, hundreds: 6, hundred50s: 0, doubleHundreds: 0,
    fours: 2964, sixes: 241, notOuts: 18, ducks: 8,
    wickets: 292, bowlRuns: 4328, bowlBalls: 6244, maidens: 16, dots: 3624,
    wides: 37, noBalls: 9, bestBowlingWkts: 6, bestBowlingRuns: 12,
    catches: 147, runOuts: 31, awards: 270,
    ratings: { overall: 96, batting: 95, bowling: 96, fielding: 93, pressure: 96, matchWinning: 95, wicketTaking: 96, sixHitting: 90, deathBat: 92, deathBowl: 96, recentForm: 95 },
  },
  {
    id: "atharv", name: "Atharv", role: "Batter",
    notes: "Fearless stroke-maker with explosive starts and aggressive intent.",
    matches: 260, innings: 201, runs: 9285, balls: 5908, highest: 167,
    fifties: 11, hundreds: 2, hundred50s: 0, doubleHundreds: 0,
    fours: 2386, sixes: 338, notOuts: 17, ducks: 10,
    wickets: 173, bowlRuns: 2765, bowlBalls: 3894, maidens: 8, dots: 2158,
    wides: 26, noBalls: 5, bestBowlingWkts: 4, bestBowlingRuns: 15,
    catches: 109, runOuts: 18, awards: 197,
    historicRankingPoints: 393,
    ratings: { overall: 93, batting: 95, bowling: 86, fielding: 88, pressure: 91, matchWinning: 93, wicketTaking: 84, sixHitting: 96, deathBat: 95, deathBowl: 83, recentForm: 92 },
  },
  {
    id: "karthik", name: "Karthik", role: "All-rounder",
    notes: "Utility all-rounder who contributes consistently in every department.",
    matches: 260, innings: 198, runs: 7159, balls: 5361, highest: 105,
    fifties: 3, hundreds: 1, hundred50s: 0, doubleHundreds: 0,
    fours: 1928, sixes: 176, notOuts: 12, ducks: 12,
    wickets: 252, bowlRuns: 3512, bowlBalls: 5128, maidens: 14, dots: 2846,
    wides: 33, noBalls: 7, bestBowlingWkts: 5, bestBowlingRuns: 17,
    catches: 116, runOuts: 22, awards: 204,
    ratings: { overall: 91, batting: 88, bowling: 94, fielding: 90, pressure: 90, matchWinning: 91, wicketTaking: 95, sixHitting: 84, deathBat: 88, deathBowl: 94, recentForm: 90 },
  },
  {
    id: "deva", name: "Deva", role: "Batter",
    notes: "Calm middle-order batter who performs well in pressure situations.",
    matches: 260, innings: 186, runs: 5851, balls: 4911, highest: 55,
    fifties: 3, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 1546, sixes: 108, notOuts: 16, ducks: 14,
    wickets: 155, bowlRuns: 3142, bowlBalls: 4322, maidens: 9, dots: 2438,
    wides: 28, noBalls: 6, bestBowlingWkts: 4, bestBowlingRuns: 18,
    catches: 97, runOuts: 19, awards: 134,
    ratings: { overall: 88, batting: 87, bowling: 89, fielding: 86, pressure: 94, matchWinning: 90, wicketTaking: 88, sixHitting: 81, deathBat: 91, deathBowl: 87, recentForm: 88 },
  },
  {
    id: "mahesh", name: "Mahesh", role: "Batter",
    notes: "Dependable batter who chips in with useful overs when required.",
    matches: 260, innings: 192, runs: 4327, balls: 3898, highest: 97,
    fifties: 2, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 642, sixes: 84, notOuts: 11, ducks: 17,
    wickets: 47, bowlRuns: 982, bowlBalls: 1158, maidens: 2, dots: 612,
    wides: 11, noBalls: 2, bestBowlingWkts: 3, bestBowlingRuns: 24,
    catches: 61, runOuts: 12, awards: 56,
    ratings: { overall: 76, batting: 79, bowling: 70, fielding: 74, pressure: 75, matchWinning: 74, wicketTaking: 69, sixHitting: 76, deathBat: 77, deathBowl: 68, recentForm: 73 },
  },
  {
    id: "karunya", name: "Karunya", role: "All-rounder",
    notes: "Developing all-rounder who contributes with both bat and ball.",
    matches: 260, innings: 178, runs: 2397, balls: 2800, highest: 38,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 148, sixes: 19, notOuts: 9, ducks: 26,
    wickets: 18, bowlRuns: 1184, bowlBalls: 1224, maidens: 1, dots: 1987,
    wides: 14, noBalls: 4, bestBowlingWkts: 3, bestBowlingRuns: 50,
    catches: 42, runOuts: 7, awards: 18,
    ratings: { overall: 48, batting: 45, bowling: 52, fielding: 49, pressure: 46, matchWinning: 44, wicketTaking: 50, sixHitting: 42, deathBat: 42, deathBowl: 51, recentForm: 47 },
  },
  {
    id: "himmu", name: "Himmu", role: "Batter",
    notes: "Developing batter with initial career appearances.",
    matches: 2, innings: 2, runs: 78, balls: 0, highest: 60,
    fifties: 1, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 6, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 6,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "madhu", name: "Madhu", role: "Batter",
    notes: "Developing batter with initial career appearances.",
    matches: 2, innings: 2, runs: 52, balls: 0, highest: 39,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 0, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 5,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "chitti", name: "Chitti", role: "—",
    notes: "New PTS entrant. Career yet to begin.",
    matches: 0, innings: 0, runs: 0, balls: 0, highest: 0,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 0, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 0,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "viru", name: "Viru", role: "Batter",
    notes: "Developing batter with initial career appearances.",
    matches: 1, innings: 1, runs: 6, balls: 0, highest: 6,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 1, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 0,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "karthikeya", name: "Karthikeya", role: "All-rounder",
    notes: "Developing all-rounder with initial career appearances.",
    matches: 2, innings: 2, runs: 16, balls: 0, highest: 10,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 3, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 0,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
  {
    id: "thanvi", name: "Thanvi", role: "Batter",
    notes: "New PTS entrant. Career yet to begin.",
    matches: 0, innings: 0, runs: 0, balls: 0, highest: 0,
    fifties: 0, hundreds: 0, hundred50s: 0, doubleHundreds: 0,
    fours: 0, sixes: 0, notOuts: 0, ducks: 0,
    wickets: 0, bowlRuns: 0, bowlBalls: 0, maidens: 0, dots: 0,
    wides: 0, noBalls: 0, bestBowlingWkts: 0, bestBowlingRuns: 0,
    catches: 0, runOuts: 0, awards: 0,
    ratings: { overall: 50, batting: 50, bowling: 50, fielding: 50, pressure: 50, matchWinning: 50, wicketTaking: 50, sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50 },
  },
];

/** Official career award splits: POTM, BOTM, BOWLTM, FOTM, Fighter, Worst.
 *  Applied once via store migration; user cloud edits are never overwritten. */
export const OFFICIAL_AWARD_SPLITS: Record<string, {
  pom: number; batsman: number; bowler: number; fielder: number; fighter: number; worst: number;
}> = {
  sunny:   { pom: 82, batsman: 160, bowler: 51, fielder: 22, fighter: 85, worst: 0 },
  sathvik: { pom: 58, batsman: 132, bowler: 28, fielder: 12, fighter: 44, worst: 0 },
  rithu:   { pom: 46, batsman: 54,  bowler: 63, fielder: 18, fighter: 37, worst: 0 },
  karthik: { pom: 31, batsman: 22,  bowler: 57, fielder: 11, fighter: 44, worst: 0 },
  atharv:  { pom: 26, batsman: 72,  bowler: 8,  fielder: 4,  fighter: 33, worst: 0 },
  deva:    { pom: 16, batsman: 41,  bowler: 18, fielder: 7,  fighter: 42, worst: 0 },
  mahesh:  { pom: 6,  batsman: 18,  bowler: 4,  fielder: 2,  fighter: 18, worst: 0 },
  karunya: { pom: 0,  batsman: 0,   bowler: 1,  fielder: 0,  fighter: 2,  worst: 15 },
};

function toPlayer(r: SeedRow): Player {
  const split = OFFICIAL_AWARD_SPLITS[r.id];
  const totalAwards = split
    ? split.pom + split.batsman + split.bowler + split.fielder + split.fighter + split.worst
    : r.awards;
  return {
    id: r.id,
    name: r.name,
    createdAt: Date.now(),
    role: r.role,
    notes: r.notes,
    ratings: r.ratings,
    seed: { hundreds: 0, fifties: 0, highest: 0, highestNotOut: false },
    career: {
      matches: r.matches,
      innings: r.innings,
      runs: r.runs,
      balls: r.balls,
      fours: r.fours,
      sixes: r.sixes,
      hundreds: r.hundreds,
      fifties: r.fifties,
      hundred50s: r.hundred50s,
      doubleHundreds: r.doubleHundreds,
      highest: r.highest,
      highestNotOut: false,
      wickets: r.wickets,
      bowlBalls: r.bowlBalls,
      bowlRuns: r.bowlRuns,
      maidens: r.maidens,
      dots: r.dots,
      wides: r.wides,
      noBalls: r.noBalls,
      bestBowlingWkts: r.bestBowlingWkts,
      bestBowlingRuns: r.bestBowlingRuns,
      catches: r.catches,
      runOuts: r.runOuts,
      awards: totalAwards,
      pomAwards: split?.pom ?? 0,
      batsmanAwards: split?.batsman ?? 0,
      bowlerAwards: split?.bowler ?? 0,
      fielderAwards: split?.fielder ?? 0,
      fighterAwards: split?.fighter ?? 0,
      worstAwards: split?.worst ?? 0,
      notOuts: r.notOuts,
      ducks: r.ducks,
    },
    historicRankingPoints: r.historicRankingPoints ?? 0,
  };
}

export const SEED_PLAYERS: Player[] = ROWS.map(toPlayer).map(applyHistoricBaseline);

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