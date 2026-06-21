import type { Player } from "./types";

const mk = (
  id: string,
  name: string,
  hundreds: number,
  fifties: number,
  highest: number,
  highestNotOut = false,
  beginner = false,
): Player => ({
  id,
  name,
  createdAt: Date.now(),
  beginner,
  seed: { hundreds, fifties, highest, highestNotOut },
  career: {
    matches: 0,
    runs: 0,
    balls: 0,
    fours: 0,
    sixes: 0,
    hundreds: 0,
    fifties: 0,
    highest: 0,
    highestNotOut: false,
    wickets: 0,
    bowlBalls: 0,
    bowlRuns: 0,
    catches: 0,
    runOuts: 0,
    awards: 0,
    notOuts: 0,
  },
});

export const SEED_PLAYERS: Player[] = [
  mk("sunny", "Sunny", 19, 36, 264, true),
  mk("sathvik", "Sathvik", 11, 28, 174, false),
  mk("rithu", "Rithu", 6, 13, 127, false),
  mk("atharv", "Atharv", 2, 6, 167, false),
  mk("karthik", "Karthik", 0, 1, 88, false),
  mk("deva", "Deva", 0, 1, 52, true),
  mk("karunya", "Karunya", 0, 0, 38, false),
  mk("jayden", "Jayden", 0, 0, 0, false, true),
];

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