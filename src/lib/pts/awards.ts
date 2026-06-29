import type { Match, MatchAward, Player } from "./types";

/**
 * PTS Award Engine — weighted multi-factor impact model.
 * Awards reward CONTRIBUTION to the match (Impact Score),
 * not just raw runs or wickets.
 *
 *   Impact = MeaningfulRuns + PressureRuns + Boundaries +
 *            CrucialWickets + BowlingImpact + FieldingImpact +
 *            Partnerships + Finishing + WinningContribution
 */

type Side = "A" | "B";

interface BatLine {
  id: string;
  team: Side;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  innings: number; // count of innings batted
}
interface BowlLine {
  id: string;
  team: Side;
  balls: number;
  runs: number;
  wickets: number;
  dots: number;
  maidens: number;
}

function nameOf(id: string, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

function aggregateBatting(match: Match) {
  const m = new Map<string, BatLine>();
  for (const inn of match.innings) {
    for (const b of inn.batters) {
      const prev = m.get(b.playerId);
      if (prev) {
        prev.runs += b.runs;
        prev.balls += b.balls;
        prev.fours += b.fours;
        prev.sixes += b.sixes;
        prev.out = prev.out || b.out;
        prev.innings += 1;
      } else {
        m.set(b.playerId, {
          id: b.playerId, team: inn.battingTeam, runs: b.runs, balls: b.balls,
          fours: b.fours, sixes: b.sixes, out: b.out, innings: 1,
        });
      }
    }
  }
  return m;
}

function aggregateBowling(match: Match) {
  const m = new Map<string, BowlLine>();
  for (const inn of match.innings) {
    // maidens per innings via event walk
    const overMap = new Map<string, Map<number, { runs: number; legal: number }>>();
    for (const ev of inn.events) {
      const bm = overMap.get(ev.bowlerId) ?? new Map();
      const cur = bm.get(ev.overNumber) ?? { runs: 0, legal: 0 };
      cur.runs += ev.runsToBatter + ev.runsExtras;
      if (ev.isLegal) cur.legal += 1;
      bm.set(ev.overNumber, cur);
      overMap.set(ev.bowlerId, bm);
    }
    for (const b of inn.bowlers) {
      let maidens = 0;
      const om = overMap.get(b.playerId);
      if (om) for (const o of om.values()) if (o.legal === 6 && o.runs === 0) maidens += 1;
      const prev = m.get(b.playerId);
      if (prev) {
        prev.balls += b.balls; prev.runs += b.runs; prev.wickets += b.wickets;
        prev.dots += b.dots; prev.maidens += maidens;
      } else {
        m.set(b.playerId, {
          id: b.playerId, team: inn.bowlingTeam, balls: b.balls, runs: b.runs,
          wickets: b.wickets, dots: b.dots, maidens,
        });
      }
    }
  }
  return m;
}

function aggregateFielding(match: Match) {
  const catches = new Map<string, number>();
  const runOuts = new Map<string, number>();
  const team = new Map<string, Side>();
  for (const inn of match.innings) {
    for (const ev of inn.events) {
      if (ev.catcherId) {
        catches.set(ev.catcherId, (catches.get(ev.catcherId) ?? 0) + 1);
        team.set(ev.catcherId, inn.bowlingTeam);
      }
      if (ev.isWicket && ev.dismissalType === "run-out" && ev.catcherId) {
        runOuts.set(ev.catcherId, (runOuts.get(ev.catcherId) ?? 0) + 1);
        team.set(ev.catcherId, inn.bowlingTeam);
      }
    }
  }
  return { catches, runOuts, team };
}

/** Team totals & match situation context. */
function teamTotals(match: Match) {
  const totals: Record<Side, { runs: number; wkts: number; balls: number }> = {
    A: { runs: 0, wkts: 0, balls: 0 },
    B: { runs: 0, wkts: 0, balls: 0 },
  };
  for (const inn of match.innings) {
    totals[inn.battingTeam].runs += inn.runs;
    totals[inn.battingTeam].wkts += inn.wickets;
    totals[inn.battingTeam].balls += inn.legalBalls;
  }
  return totals;
}

/** Pressure runs: balls faced while team had lost ≥3 wickets OR chasing in last third. */
function pressureRunsFor(match: Match, batterId: string): number {
  let pr = 0;
  for (const inn of match.innings) {
    let wkts = 0;
    for (const ev of inn.events) {
      const chase = match.target && inn.battingTeam !== match.innings[0].battingTeam;
      const ballsLeft = inn.oversCap ? inn.oversCap - inn.legalBalls : undefined;
      const pressure = wkts >= 3 || (chase && ballsLeft !== undefined && ballsLeft <= (inn.oversCap! / 3));
      if (ev.batterId === batterId && pressure) pr += ev.runsToBatter;
      if (ev.isWicket) wkts += 1;
    }
  }
  return pr;
}

function buildBattingImpact(line: BatLine, match: Match, totals: ReturnType<typeof teamTotals>): number {
  const sr = line.balls ? (line.runs / line.balls) * 100 : 0;
  const teamRuns = Math.max(1, totals[line.team].runs);
  const shareOfRuns = line.runs / teamRuns; // 0..1
  const boundaryRuns = line.fours * 4 + line.sixes * 6;
  const pressure = pressureRunsFor(match, line.id);
  const meaningful = line.runs * (0.6 + 0.8 * shareOfRuns); // bigger share → bigger weight
  const srBonus = line.balls >= 10 ? Math.max(0, sr - 100) * 0.4 : 0;
  const boundaryImpact = boundaryRuns * 0.35 + line.sixes * 2;
  const finishing = line.out ? 0 : Math.min(40, line.runs * 0.3); // unbeaten innings reward
  return meaningful + srBonus + boundaryImpact + pressure * 0.8 + finishing;
}

function buildBowlingImpact(line: BowlLine, match: Match): number {
  if (line.balls === 0) return 0;
  const econ = (line.runs / line.balls) * 6;
  // Crucial wickets = top-order or set-batter wickets — approximate via wickets weight escalation
  const crucialBonus = line.wickets * 4; // each wicket extra weight beyond raw count
  const econImpact = (8 - econ) * Math.min(12, line.balls); // negative if expensive
  const dotImpact = line.dots * 0.7;
  const maidenImpact = line.maidens * 8;
  // Best bowling streak proxy
  const bigHaul = line.wickets >= 3 ? 15 : line.wickets >= 2 ? 6 : 0;
  void match;
  return line.wickets * 18 + crucialBonus + econImpact + dotImpact + maidenImpact + bigHaul;
}

function buildFieldingImpact(catches: number, runOuts: number): number {
  return catches * 12 + runOuts * 16;
}

function winningContribution(playerTeam: Side, winner: Side | undefined, base: number): number {
  if (!winner) return base;
  return playerTeam === winner ? base * 1.15 : base * 0.92;
}

export function computeAwards(match: Match, players: Player[]): MatchAward[] {
  const winner = (match.result?.winner === "A" || match.result?.winner === "B") ? match.result.winner : undefined;
  const bat = aggregateBatting(match);
  const bowl = aggregateBowling(match);
  const field = aggregateFielding(match);
  const totals = teamTotals(match);
  const awards: MatchAward[] = [];

  // Build a full per-player impact ledger.
  const impact = new Map<string, { team: Side; total: number; batI: number; bowlI: number; fldI: number }>();
  const ensure = (id: string, team: Side) => {
    if (!impact.has(id)) impact.set(id, { team, total: 0, batI: 0, bowlI: 0, fldI: 0 });
    return impact.get(id)!;
  };
  for (const b of bat.values()) {
    const e = ensure(b.id, b.team);
    e.batI = buildBattingImpact(b, match, totals);
    e.total += e.batI;
  }
  for (const b of bowl.values()) {
    const e = ensure(b.id, b.team);
    e.bowlI = buildBowlingImpact(b, match);
    e.total += e.bowlI;
  }
  for (const [id, n] of field.catches) {
    const ro = field.runOuts.get(id) ?? 0;
    const team = field.team.get(id) ?? (bat.get(id)?.team ?? bowl.get(id)?.team ?? "A");
    const e = ensure(id, team);
    e.fldI = buildFieldingImpact(n, ro);
    e.total += e.fldI;
  }
  for (const [id, ro] of field.runOuts) {
    if (field.catches.has(id)) continue;
    const team = field.team.get(id) ?? (bat.get(id)?.team ?? bowl.get(id)?.team ?? "A");
    const e = ensure(id, team);
    e.fldI = buildFieldingImpact(0, ro);
    e.total += e.fldI;
  }

  // Adjust by winning side weight.
  for (const v of impact.values()) v.total = winningContribution(v.team, winner, v.total);

  // --- Batsman of the Match (highest batting impact across all sides) ---
  let bestBat: { id: string; v: number } | undefined;
  for (const [id, e] of impact) if (e.batI > 0 && (!bestBat || e.batI > bestBat.v)) bestBat = { id, v: e.batI };
  if (bestBat) {
    const b = bat.get(bestBat.id)!;
    const sr = b.balls ? ((b.runs / b.balls) * 100).toFixed(0) : "-";
    awards.push({
      type: "batsman", playerId: bestBat.id, team: b.team,
      headline: `${nameOf(bestBat.id, players)} — ${b.runs}${b.out ? "" : "*"} (${b.balls})`,
      reason: `Top batting impact · SR ${sr} · ${b.fours}×4 ${b.sixes}×6`,
    });
  }

  // --- Bowler of the Match ---
  let bestBowl: { id: string; v: number } | undefined;
  for (const [id, e] of impact) if (e.bowlI > 0 && (!bestBowl || e.bowlI > bestBowl.v)) bestBowl = { id, v: e.bowlI };
  if (bestBowl) {
    const b = bowl.get(bestBowl.id)!;
    const econ = b.balls ? ((b.runs / b.balls) * 6).toFixed(2) : "-";
    awards.push({
      type: "bowler", playerId: bestBowl.id, team: b.team,
      headline: `${nameOf(bestBowl.id, players)} — ${b.wickets}/${b.runs}`,
      reason: `${b.dots} dots · ${b.maidens} maiden${b.maidens === 1 ? "" : "s"} · econ ${econ}`,
    });
  }

  // --- Fielder of the Match ---
  let bestField: { id: string; v: number } | undefined;
  for (const [id, e] of impact) if (e.fldI > 0 && (!bestField || e.fldI > bestField.v)) bestField = { id, v: e.fldI };
  if (bestField) {
    const c = field.catches.get(bestField.id) ?? 0;
    const ro = field.runOuts.get(bestField.id) ?? 0;
    const team = field.team.get(bestField.id) ?? "A";
    const bits = [c ? `${c} catch${c === 1 ? "" : "es"}` : null, ro ? `${ro} run-out${ro === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ");
    awards.push({
      type: "fielder", playerId: bestField.id, team,
      headline: `${nameOf(bestField.id, players)} — ${bits || "Sharp in the field"}`,
      reason: `Highest fielding impact this match`,
    });
  }

  // --- Player of the Match (winning side only) ---
  if (winner) {
    const winners = [...impact.entries()].filter(([, e]) => e.team === winner).sort((a, b) => b[1].total - a[1].total);
    if (winners[0]) {
      const [id] = winners[0];
      const b = bat.get(id);
      const bw = bowl.get(id);
      const c = field.catches.get(id) ?? 0;
      const perf = [
        b && b.balls ? `${b.runs}${b.out ? "" : "*"} (${b.balls})` : null,
        bw && (bw.wickets || bw.balls) ? `${bw.wickets}/${bw.runs}` : null,
        c ? `${c}c` : null,
      ].filter(Boolean).join(" · ");
      awards.push({
        type: "pom", playerId: id, team: winner,
        headline: `${nameOf(id, players)} — ${perf || "Match-defining effort"}`,
        reason: "Greatest overall match impact on the winning side",
      });
    }

    // --- Fighter of the Match (losing side) ---
    const loser: Side = winner === "A" ? "B" : "A";
    const losers = [...impact.entries()].filter(([, e]) => e.team === loser).sort((a, b) => b[1].total - a[1].total);
    if (losers[0]) {
      const [id] = losers[0];
      const b = bat.get(id);
      const bw = bowl.get(id);
      const perf = [
        b && b.balls ? `${b.runs}${b.out ? "" : "*"} (${b.balls})` : null,
        bw && bw.wickets ? `${bw.wickets}/${bw.runs}` : null,
      ].filter(Boolean).join(" · ");
      awards.push({
        type: "fighter", playerId: id, team: loser,
        headline: `${nameOf(id, players)} — ${perf || "Fought to the end"}`,
        reason: "Held the line for the losing side",
      });
    }

    // --- Worst Player of the Match (losing side, lowest meaningful impact among those who played a real role) ---
    const eligible = losers.filter(([id]) => {
      const b = bat.get(id);
      const bw = bowl.get(id);
      const balls = (b?.balls ?? 0) + (bw?.balls ?? 0);
      return balls >= 3; // exclude DNB / didn't bowl
    });
    if (eligible.length > 0) {
      const [id, e] = eligible[eligible.length - 1];
      const b = bat.get(id);
      const bw = bowl.get(id);
      const bits: string[] = [];
      if (b && b.balls > 0) bits.push(`${b.runs} off ${b.balls}`);
      if (bw && bw.balls > 0) bits.push(`${bw.wickets}/${bw.runs} in ${(bw.balls / 6).toFixed(1)}`);
      void e;
      awards.push({
        type: "worst", playerId: id, team: loser,
        headline: `${nameOf(id, players)} — ${bits.join(" · ") || "Quiet day"}`,
        reason: "Lowest match impact on the losing side",
      });
    }
  }

  return awards;
}