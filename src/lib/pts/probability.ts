import type { Match, Player } from "./types";
import { recentRunRate, recentWickets, currentRunRate, partnerships, lastNBalls } from "./analytics";

/** Returns [teamA, teamB] percentages summing to 100. */
export function computeProbability(
  match: Match,
  players: Player[],
): { teamA: number; teamB: number; note: string } {
  // Locked results
  if (match.result) {
    if (match.result.winner === "A") return { teamA: 100, teamB: 0, note: match.result.summary };
    if (match.result.winner === "B") return { teamA: 0, teamB: 100, note: match.result.summary };
    return { teamA: 50, teamB: 50, note: match.result.summary };
  }
  const innings = match.innings[match.currentInnings];
  if (!innings) return { teamA: 50, teamB: 50, note: "Match yet to begin" };

  const teamSize = (innings.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length;
  const wktsLeft = teamSize - innings.wickets;
  const striker = players.find((p) => p.id === innings.currentBatterId);
  const bowler = players.find((p) => p.id === innings.currentBowlerId);

  // === CHASE (target known) ===
  if (match.target) {
    const need = match.target - innings.runs;
    if (need <= 0) return assign(innings.battingTeam, 99, "Target reached");
    if (wktsLeft <= 0) return assign(innings.battingTeam, 1, "All out — chase failed");
    const ballsLeft = innings.oversCap ? innings.oversCap - innings.legalBalls : Math.max(60, need * 2);
    if (ballsLeft <= 0 && need > 0) return assign(innings.battingTeam, 1, "Out of balls");

    const rrr = (need / Math.max(1, ballsLeft)) * 6;
    const crr = currentRunRate(innings);
    const rr18 = recentRunRate(innings, 18);   // last 3 overs
    const wk18 = recentWickets(innings, 18);
    const rr6 = recentRunRate(innings, 6);     // last over
    const wk6 = recentWickets(innings, 6);
    // last 6 balls fine-grained: dots + boundaries for micro momentum
    const last6 = lastNBalls(innings, 6).filter((e) => e.isLegal);
    const dots6 = last6.filter((e) => e.runsToBatter + e.runsExtras === 0).length;
    const bnd6 = last6.filter((e) => e.runsToBatter >= 4).length;

    let bat = 50;
    const factors: string[] = [];

    // Run-rate gap (par chase ~10 rpo)
    const gap = crr - rrr;
    bat += gap * 3.5;
    if (rrr > 14) { bat -= 6; factors.push(`RRR ${rrr.toFixed(1)} climbing`); }
    else if (rrr < 8 && need > 0) { bat += 4; factors.push("rate comfortable"); }

    // Wickets in hand
    const wktFrac = wktsLeft / teamSize;
    bat += (wktFrac - 0.5) * 24;
    if (wktsLeft <= 2) { bat -= 8; factors.push(`only ${wktsLeft} wkts left`); }

    // Momentum — last 3 overs (medium term)
    if (rr18 > rrr) { bat += Math.min(7, (rr18 - rrr) * 1.6); factors.push("last 3 overs going"); }
    else if (rr18 < rrr - 2) { bat -= Math.min(7, (rrr - rr18) * 1.4); factors.push("rate slipping"); }
    bat -= wk18 * 5;
    if (wk18 >= 2) factors.push(`${wk18} wkts in last 3 overs`);
    // Micro momentum — last over
    if (rr6 >= rrr + 4) { bat += 3; factors.push("last over exploded"); }
    if (wk6 >= 1) { bat -= 4; factors.push("wicket in the last over"); }
    if (dots6 >= 4) { bat -= 3; factors.push(`${dots6} dots in last 6`); }
    if (bnd6 >= 2) { bat += 3; factors.push("boundaries flowing"); }

    // Partnership boost
    const ps = partnerships(innings);
    const cur = ps[ps.length - 1];
    if (cur && !cur.broken && cur.runs >= 25) {
      bat += Math.min(10, cur.runs * 0.12);
      factors.push(`${cur.runs}-run stand`);
    }
    // Set vs new batter — striker's balls faced this innings
    if (striker) {
      const stBall = innings.batters.find((b) => b.playerId === striker.id);
      const faced = stBall?.balls ?? 0;
      if (faced >= 15) { bat += Math.min(4, (faced - 15) * 0.15); factors.push("set batter"); }
      else if (faced <= 3) { bat -= 3; factors.push("new batter in"); }
    }

    // Striker quality
    if (striker?.ratings) {
      const r = striker.ratings;
      bat += ((r.overall ?? 50) - 50) * 0.10;
      bat += ((r.matchWinning ?? 50) - 50) * 0.06;
      bat += ((r.pressure ?? 50) - 50) * 0.06;
      if (rrr > 11) bat += ((r.sixHitting ?? 50) - 50) * 0.05;
      // death-bat in final 2 overs
      if (innings.oversCap && ballsLeft <= 12) {
        bat += ((r.deathBat ?? 50) - 50) * 0.10;
      }
      bat += ((r.recentForm ?? 50) - 50) * 0.04;
    }

    // Bowling options remaining — count bowlers with any balls left in cap.
    // In this custom format there's no per-bowler ball cap, so use variety:
    // fewer distinct bowlers used = fewer plausible options if fatigued.
    const bowlersUsed = new Set(innings.events.filter((e) => e.bowlerId).map((e) => e.bowlerId)).size;
    if (innings.oversCap && ballsLeft <= 24) {
      // final phase: variety matters
      if (bowlersUsed >= 4) { bat -= 2; factors.push("bowlers rotating well"); }
      else if (bowlersUsed <= 2) { bat += 2; factors.push("limited bowling options"); }
    }

    // Bowler quality
    if (bowler?.ratings) {
      const r = bowler.ratings;
      bat -= ((r.bowling ?? 50) - 50) * 0.08;
      bat -= ((r.wicketTaking ?? 50) - 50) * 0.06;
      bat -= ((r.pressure ?? 50) - 50) * 0.04;
      bat -= ((r.matchWinning ?? 50) - 50) * 0.04;
      if (innings.oversCap && ballsLeft <= 12) {
        bat -= ((r.deathBowl ?? 50) - 50) * 0.10;
      }
    }

    // Remaining batting strength
    const remainingIds = innings.lineup.filter(
      (id) => !innings.batters.find((b) => b.playerId === id && b.out),
    );
    const remainingBatters = remainingIds
      .map((id) => players.find((p) => p.id === id))
      .filter((p): p is Player => !!p);
    if (remainingBatters.length > 0) {
      const avgBat =
        remainingBatters.reduce((s, p) => s + (p.ratings?.batting ?? 50), 0) / remainingBatters.length;
      bat += (avgBat - 50) * 0.05;
    }

    // Final-over pressure scaling
    if (innings.oversCap && ballsLeft <= 6 && need > 0) {
      const par = ballsLeft * 2.2;
      if (need > par) { bat -= 10; factors.push("final over heat"); }
      else if (need <= ballsLeft) { bat += 8; factors.push("a run a ball"); }
    }

    const note =
      `${need} need in ${formatBalls(ballsLeft)}, ${wktsLeft} wkts · RRR ${rrr.toFixed(1)} vs CRR ${crr.toFixed(1)}` +
      (factors.length ? ` · ${factors.slice(0, 2).join(" · ")}` : "");
    return assign(innings.battingTeam, clamp(bat, 1, 99), note);
  }

  // === FIRST INNINGS (setting) ===
  const parRpo = match.format === "A" ? 10 : match.format === "B" ? 7 : 4.5;
  const balls = innings.legalBalls;
  const oversCap = innings.oversCap;
  const par = oversCap ? (oversCap / 6) * parRpo : 30 * parRpo;

  // Project final score
  let projected: number;
  if (oversCap) {
    const ballsLeft = Math.max(0, oversCap - balls);
    const rrSoFar = balls > 0 ? innings.runs / balls : parRpo / 6;
    // weight wickets in hand
    const wktFactor = Math.max(0.25, wktsLeft / teamSize);
    projected = innings.runs + ballsLeft * rrSoFar * (0.7 + 0.6 * wktFactor);
  } else {
    const wktFactor = Math.max(0.2, wktsLeft / teamSize);
    projected = innings.runs + wktFactor * par;
  }

  let bat = 50 + ((projected - par) / Math.max(par, 1)) * 45;
  // wickets fallen drag
  bat -= (innings.wickets / teamSize) * 12;
  // striker quality
  if (striker?.ratings) bat += (((striker.ratings.batting ?? 50) - 50)) * 0.05;
  if (bowler?.ratings) bat -= (((bowler.ratings.bowling ?? 50) - 50)) * 0.04;

  const note = `Projected ~${Math.round(projected)} · par ${Math.round(par)} · ${wktsLeft} wkts left`;
  return assign(innings.battingTeam, clamp(bat, 1, 99), note);
}

function assign(side: "A" | "B", batPct: number, note: string) {
  const bat = clamp(Math.round(batPct), 1, 99);
  return side === "A"
    ? { teamA: bat, teamB: 100 - bat, note }
    : { teamB: bat, teamA: 100 - bat, note };
}
function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function formatBalls(b: number) {
  if (!isFinite(b)) return "—";
  const o = Math.floor(b / 6); const r = b % 6;
  return r ? `${o}.${r} ov` : `${o} ov`;
}