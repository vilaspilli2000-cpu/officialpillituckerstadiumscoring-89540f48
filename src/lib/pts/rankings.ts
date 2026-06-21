import { combinedCareer } from "./seed";
import type { Player } from "./types";

export function rankPlayers(players: Player[]) {
  const scored = players.map((p) => {
    const c = combinedCareer(p);
    const sr = p.career.balls ? (p.career.runs / p.career.balls) * 100 : 0;
    const econ = p.career.bowlBalls ? (p.career.bowlRuns / p.career.bowlBalls) * 6 : 0;
    const score =
      c.runs * 1 +
      c.hundreds * 60 +
      c.fifties * 20 +
      c.wickets * 15 +
      c.catches * 5 +
      c.awards * 25 +
      Math.max(0, sr - 80) * 0.5 -
      Math.max(0, econ - 8) * 4;
    return { player: p, score, c, sr, econ };
  });
  // Beginners (Jayden) pinned last unless they earn enough — threshold: any career runs/wickets/awards
  scored.sort((a, b) => {
    const aBeg = !!a.player.beginner && a.player.career.matches === 0;
    const bBeg = !!b.player.beginner && b.player.career.matches === 0;
    if (aBeg && !bBeg) return 1;
    if (!aBeg && bBeg) return -1;
    return b.score - a.score;
  });
  return scored;
}