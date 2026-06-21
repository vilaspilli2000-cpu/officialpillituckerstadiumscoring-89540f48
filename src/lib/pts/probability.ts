import type { Match, Player } from "./types";
import { combinedCareer } from "./seed";

/** Returns [teamA, teamB] percentages summing to 100. */
export function computeProbability(
  match: Match,
  players: Player[],
): { teamA: number; teamB: number; note: string } {
  // If match has a result, lock to 100/0
  if (match.result) {
    if (match.result.winner === "A") return { teamA: 100, teamB: 0, note: match.result.summary };
    if (match.result.winner === "B") return { teamA: 0, teamB: 100, note: match.result.summary };
    return { teamA: 50, teamB: 50, note: match.result.summary };
  }

  const innings = match.innings[match.currentInnings];
  if (!innings) return { teamA: 50, teamB: 50, note: "Match yet to begin" };

  // 1st innings of A/B: par-score estimate using simple format-specific average
  if (match.format === "A" && match.currentInnings === 0) {
    const par = 60;
    const projected = innings.legalBalls > 0 ? (innings.runs / innings.legalBalls) * 36 : par;
    const advantage = Math.max(-30, Math.min(30, projected - par));
    const batPct = 50 + advantage * 0.8;
    return assign(innings.battingTeam, batPct, "Setting up the chase");
  }

  if ((match.format === "B" || match.format === "C") && innings.battingTeam && !match.target) {
    // setting innings — gauge tempo
    const teamSize = (innings.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length;
    const wktsLeft = teamSize - innings.wickets;
    const par = match.format === "B" ? 120 : 200;
    const projected = innings.runs + (wktsLeft / teamSize) * par;
    const batPct = clamp(40 + ((projected - par) / par) * 40, 30, 70);
    return assign(innings.battingTeam, batPct, "Building first innings");
  }

  // Chase
  if (match.target) {
    const need = match.target - innings.runs;
    if (need <= 0) {
      return assign(innings.battingTeam, 99, "Target reached");
    }
    const teamSize = (innings.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length;
    const wktsLeft = teamSize - innings.wickets;
    const ballsLeft = innings.oversCap ? innings.oversCap - innings.legalBalls : 999;
    const rrr = ballsLeft > 0 ? (need / ballsLeft) * 6 : 99;
    // Base from required run rate vs comfortable rate (PTS = high scoring, par ~10 rpo)
    let batPct = 60 - (rrr - 9) * 5;
    batPct -= (teamSize - wktsLeft) * 6;
    // Striker quality boost
    const striker = players.find((p) => p.id === innings.currentBatterId);
    if (striker) batPct += ratingBoost(striker, "bat");
    // Bowler quality reduces batPct (strong bowler) or boosts (weak)
    const bowler = players.find((p) => p.id === innings.currentBowlerId);
    if (bowler) batPct -= ratingBoost(bowler, "bowl");
    batPct = clamp(batPct, 1, 99);
    const note = noteFor(need, ballsLeft, wktsLeft, rrr, striker, bowler);
    return assign(innings.battingTeam, batPct, note);
  }

  return { teamA: 50, teamB: 50, note: "Live" };
}

function ratingBoost(p: Player, mode: "bat" | "bowl") {
  const c = combinedCareer(p);
  if (mode === "bat") {
    // 0..12 boost based on hundreds/fifties
    return Math.min(12, c.hundreds * 1.2 + c.fifties * 0.3);
  }
  // bowl: based on wickets accrued (career only)
  return Math.min(12, p.career.wickets * 0.6);
}

function assign(side: "A" | "B", batPct: number, note: string) {
  const bat = clamp(Math.round(batPct), 1, 99);
  return side === "A"
    ? { teamA: bat, teamB: 100 - bat, note }
    : { teamB: bat, teamA: 100 - bat, note };
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function noteFor(
  need: number,
  ballsLeft: number,
  wkts: number,
  rrr: number,
  striker?: Player,
  bowler?: Player,
) {
  const parts: string[] = [];
  parts.push(`${need} needed${isFinite(ballsLeft) ? ` in ${ballsLeft} balls` : ""}, ${wkts} wkts left`);
  if (rrr < 8) parts.push("rate is comfortable");
  else if (rrr > 14) parts.push("escalating pressure");
  if (striker && combinedCareer(striker).hundreds >= 5) parts.push(`${striker.name} set at the crease`);
  if (bowler && bowler.career.wickets >= 5) parts.push(`${bowler.name} dangerous with ball`);
  return parts.join(" · ");
}