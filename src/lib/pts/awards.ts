import type { Match, MatchAward, Player } from "./types";

function batterStats(match: Match) {
  const map = new Map<string, { team: "A" | "B"; runs: number; balls: number; fours: number; sixes: number; out: boolean }>();
  for (const inn of match.innings) {
    for (const b of inn.batters) {
      const prev = map.get(b.playerId);
      const team = inn.battingTeam;
      if (prev) {
        prev.runs += b.runs;
        prev.balls += b.balls;
        prev.fours += b.fours;
        prev.sixes += b.sixes;
        prev.out = prev.out || b.out;
      } else {
        map.set(b.playerId, { team, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, out: b.out });
      }
    }
  }
  return map;
}

function bowlerStats(match: Match) {
  const map = new Map<string, { team: "A" | "B"; balls: number; runs: number; wickets: number; dots: number }>();
  for (const inn of match.innings) {
    for (const b of inn.bowlers) {
      const prev = map.get(b.playerId);
      const team = inn.bowlingTeam;
      if (prev) {
        prev.balls += b.balls;
        prev.runs += b.runs;
        prev.wickets += b.wickets;
        prev.dots += b.dots;
      } else {
        map.set(b.playerId, { team, balls: b.balls, runs: b.runs, wickets: b.wickets, dots: b.dots });
      }
    }
  }
  return map;
}

function fielderStats(match: Match) {
  const map = new Map<string, number>();
  for (const inn of match.innings) {
    for (const ev of inn.events) {
      if (ev.catcherId) map.set(ev.catcherId, (map.get(ev.catcherId) ?? 0) + 1);
    }
  }
  return map;
}

function nameOf(id: string, players: Player[]) {
  return players.find((p) => p.id === id)?.name ?? "Unknown";
}

export function computeAwards(match: Match, players: Player[]): MatchAward[] {
  const winner = match.result?.winner;
  const bs = batterStats(match);
  const bw = bowlerStats(match);
  const fs = fielderStats(match);
  const awards: MatchAward[] = [];

  // Best batsman: highest impact = runs + SR bonus
  let bestBat: { id: string; score: number; team: "A" | "B" } | undefined;
  for (const [id, s] of bs) {
    const sr = s.balls ? (s.runs / s.balls) * 100 : 0;
    const score = s.runs * 1 + Math.max(0, sr - 100) * 0.3 + s.fours * 1 + s.sixes * 2;
    if (!bestBat || score > bestBat.score) bestBat = { id, score, team: s.team };
  }

  // Best bowler: wickets*15 + dots*0.5 - econ penalty
  let bestBowl: { id: string; score: number; team: "A" | "B" } | undefined;
  for (const [id, s] of bw) {
    if (s.balls === 0) continue;
    const econ = (s.runs / s.balls) * 6;
    const score = s.wickets * 15 + s.dots * 0.6 - Math.max(0, econ - 8) * 2;
    if (!bestBowl || score > bestBowl.score) bestBowl = { id, score, team: s.team };
  }

  // Best fielder
  let bestField: { id: string; score: number; team: "A" | "B" } | undefined;
  for (const [id, n] of fs) {
    // figure out team
    let team: "A" | "B" = "A";
    for (const inn of match.innings) {
      if (inn.bowlingTeam && (inn.battingTeam === "A" ? match.teamB : match.teamA).playerIds.includes(id)) {
        team = inn.bowlingTeam;
        break;
      }
    }
    const score = n * 10;
    if (!bestField || score > bestField.score) bestField = { id, score, team };
  }

  if (bestBat)
    awards.push({
      type: "batsman",
      playerId: bestBat.id,
      team: bestBat.team,
      headline: `${nameOf(bestBat.id, players)} — ${bs.get(bestBat.id)!.runs} (${bs.get(bestBat.id)!.balls})`,
      reason: `Top-scoring innings with ${bs.get(bestBat.id)!.fours} fours`,
    });

  if (bestBowl) {
    const s = bw.get(bestBowl.id)!;
    const econ = s.balls ? ((s.runs / s.balls) * 6).toFixed(1) : "-";
    awards.push({
      type: "bowler",
      playerId: bestBowl.id,
      team: bestBowl.team,
      headline: `${nameOf(bestBowl.id, players)} — ${s.wickets}/${s.runs}`,
      reason: `${s.dots} dots · economy ${econ}`,
    });
  }

  if (bestField) {
    awards.push({
      type: "fielder",
      playerId: bestField.id,
      team: bestField.team,
      headline: `${nameOf(bestField.id, players)} — ${fs.get(bestField.id)} catches`,
      reason: `Crucial work in the field`,
    });
  }

  // Player of the match — from winning team only
  if (winner === "A" || winner === "B") {
    const candidates: { id: string; score: number }[] = [];
    for (const [id, s] of bs) {
      if (s.team !== winner) continue;
      candidates.push({ id, score: s.runs + s.fours + s.sixes * 2 });
    }
    for (const [id, s] of bw) {
      if (s.team !== winner) continue;
      const existing = candidates.find((c) => c.id === id);
      const bonus = s.wickets * 15 + s.dots * 0.4;
      if (existing) existing.score += bonus;
      else candidates.push({ id, score: bonus });
    }
    for (const [id, n] of fs) {
      // assume catcher is on bowling side of the innings the catch happened
      const e = candidates.find((c) => c.id === id);
      if (e) e.score += n * 8;
    }
    candidates.sort((a, b) => b.score - a.score);
    if (candidates[0]) {
      const id = candidates[0].id;
      const bsv = bs.get(id);
      const bwv = bw.get(id);
      const perf = [
        bsv ? `${bsv.runs} (${bsv.balls})` : null,
        bwv && bwv.wickets ? `${bwv.wickets}/${bwv.runs}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      awards.push({
        type: "pom",
        playerId: id,
        team: winner,
        headline: `${nameOf(id, players)} — ${perf || "Match-winning effort"}`,
        reason: "Greatest impact on the winning side",
      });
    }

    // Fighter from losing team
    const loser: "A" | "B" = winner === "A" ? "B" : "A";
    const fighters: { id: string; score: number }[] = [];
    for (const [id, s] of bs) {
      if (s.team !== loser) continue;
      const sr = s.balls ? (s.runs / s.balls) * 100 : 0;
      fighters.push({ id, score: s.runs * 1.2 + sr * 0.2 });
    }
    for (const [id, s] of bw) {
      if (s.team !== loser) continue;
      const e = fighters.find((f) => f.id === id);
      const bonus = s.wickets * 12;
      if (e) e.score += bonus;
      else fighters.push({ id, score: bonus });
    }
    fighters.sort((a, b) => b.score - a.score);
    if (fighters[0]) {
      const id = fighters[0].id;
      const bsv = bs.get(id);
      const bwv = bw.get(id);
      const perf = [
        bsv ? `${bsv.runs} (${bsv.balls})` : null,
        bwv && bwv.wickets ? `${bwv.wickets}/${bwv.runs}` : null,
      ]
        .filter(Boolean)
        .join(" · ");
      awards.push({
        type: "fighter",
        playerId: id,
        team: loser,
        headline: `${nameOf(id, players)} — ${perf || "Fought to the end"}`,
        reason: "Pushed hardest in a losing cause",
      });
    }
  }

  return awards;
}