import type { BallEvent, Innings, Match, Player } from "./types";
import { oversString } from "./engine";

export interface PartnershipRow {
  index: number;
  wicket: number; // 1st, 2nd ... wicket partnership
  batterAId: string;
  batterBId?: string;
  runs: number;
  balls: number;
  broken: boolean;
  endOverLabel?: string;
}

export interface FallOfWicketRow {
  wicket: number;
  runs: number;
  overLabel: string;
  batterOutId: string;
  dismissalText?: string;
}

export interface OverBucket {
  overNumber: number;
  runs: number;
  wickets: number;
  legalBalls: number;
}

/** Per-batter extended metrics derived from events. */
export function batterAdvanced(innings: Innings, playerId: string) {
  const events = innings.events.filter((e) => e.batterId === playerId);
  let dots = 0;
  let fours = 0;
  let sixes = 0;
  let legalFaced = 0;
  for (const e of events) {
    if (e.isLegal) {
      legalFaced += 1;
      if (e.runsToBatter === 0) dots += 1;
    }
    if (e.runsToBatter === 4) fours += 1;
    if (e.type === "six-out" || (e.isWicket && e.dismissalType === "six-and-out")) sixes += 1;
  }
  const boundaries = fours + sixes;
  const dotPct = legalFaced ? (dots / legalFaced) * 100 : 0;
  const boundaryPct = legalFaced ? (boundaries / legalFaced) * 100 : 0;
  const boundaryRatio = boundaries ? legalFaced / boundaries : 0;
  const dotRatio = dots ? legalFaced / dots : 0;
  return {
    dots,
    fours,
    sixes,
    boundaries,
    dotPct,
    boundaryPct,
    boundaryRatio,
    dotRatio,
    legalFaced,
  };
}

/** Per-bowler extended metrics derived from events. */
export function bowlerAdvanced(innings: Innings, playerId: string) {
  const events = innings.events.filter((e) => e.bowlerId === playerId);
  let dots = 0;
  let fours = 0;
  let sixes = 0;
  let legal = 0;
  let maidens = 0;
  // Compute maidens by walking overs
  const overMap = new Map<number, { runs: number; legal: number }>();
  for (const e of events) {
    if (e.isLegal) {
      legal += 1;
      if (e.runsToBatter + e.runsExtras === 0) dots += 1;
    }
    if (e.runsToBatter === 4) fours += 1;
    if (e.type === "six-out" || (e.isWicket && e.dismissalType === "six-and-out")) sixes += 1;
    const ov = overMap.get(e.overNumber) ?? { runs: 0, legal: 0 };
    ov.runs += e.runsToBatter + e.runsExtras;
    if (e.isLegal) ov.legal += 1;
    overMap.set(e.overNumber, ov);
  }
  for (const ov of overMap.values()) {
    if (ov.legal === 6 && ov.runs === 0) maidens += 1;
  }
  const boundaries = fours + sixes;
  const dotPct = legal ? (dots / legal) * 100 : 0;
  const boundaryPct = legal ? (boundaries / legal) * 100 : 0;
  const boundaryRatio = boundaries ? legal / boundaries : 0;
  const dotRatio = dots ? legal / dots : 0;
  return {
    dots,
    fours,
    sixes,
    boundaries,
    dotPct,
    boundaryPct,
    boundaryRatio,
    dotRatio,
    legal,
    maidens,
  };
}

export function inningsExtras(innings: Innings) {
  let wides = 0;
  let noBalls = 0;
  for (const e of innings.events) {
    if (e.type === "wide") wides += e.runsExtras;
    if (e.type === "no-ball") noBalls += e.runsExtras;
  }
  return { wides, noBalls, total: wides + noBalls };
}

/** All partnerships including the current unbroken one. */
export function partnerships(innings: Innings): PartnershipRow[] {
  const rows: PartnershipRow[] = [];
  let wkt = 1;
  let curA: string | undefined;
  let curB: string | undefined;
  let runs = 0;
  let balls = 0;
  // We track partnership pair using `currentBatterId` from sequence of events.
  // Strike isn't recorded explicitly, so we approximate the pair as the two
  // most recent unique non-out batters known up to that point.
  const seenOrder: string[] = [];
  const out = new Set<string>();
  for (const e of innings.events) {
    if (!seenOrder.includes(e.batterId)) seenOrder.push(e.batterId);
    // pair = last two not-yet-out batters in order seen
    const livePair = seenOrder.filter((id) => !out.has(id)).slice(-2);
    curA = livePair[0];
    curB = livePair[1];
    runs += e.runsToBatter + e.runsExtras;
    if (e.isLegal) balls += 1;
    if (e.isWicket && e.dismissedPlayerId) {
      rows.push({
        index: rows.length,
        wicket: wkt,
        batterAId: curA ?? e.batterId,
        batterBId: curB,
        runs,
        balls,
        broken: true,
        endOverLabel: `${e.overNumber}.${e.ballInOver || 0}`,
      });
      wkt += 1;
      out.add(e.dismissedPlayerId);
      runs = 0;
      balls = 0;
    }
  }
  // current unbroken partnership
  const livePair = seenOrder.filter((id) => !out.has(id)).slice(-2);
  if (livePair.length > 0 && !innings.closed) {
    rows.push({
      index: rows.length,
      wicket: wkt,
      batterAId: livePair[0],
      batterBId: livePair[1],
      runs,
      balls,
      broken: false,
    });
  }
  return rows;
}

export function fallOfWickets(innings: Innings, players: Player[]): FallOfWicketRow[] {
  const rows: FallOfWicketRow[] = [];
  let running = 0;
  let wkt = 0;
  for (const e of innings.events) {
    running += e.runsToBatter + e.runsExtras;
    if (e.isWicket && e.dismissedPlayerId) {
      wkt += 1;
      const name = players.find((p) => p.id === e.dismissedPlayerId)?.name ?? "—";
      rows.push({
        wicket: wkt,
        runs: running,
        overLabel: `${e.overNumber}.${e.ballInOver || 0}`,
        batterOutId: e.dismissedPlayerId,
        dismissalText: `${name} ${e.dismissalType ?? "out"}`,
      });
    }
  }
  return rows;
}

export function overBuckets(innings: Innings, maxOver?: number): OverBucket[] {
  const map = new Map<number, OverBucket>();
  for (const e of innings.events) {
    const b = map.get(e.overNumber) ?? {
      overNumber: e.overNumber,
      runs: 0,
      wickets: 0,
      legalBalls: 0,
    };
    b.runs += e.runsToBatter + e.runsExtras;
    if (e.isLegal) b.legalBalls += 1;
    if (e.isWicket) b.wickets += 1;
    map.set(e.overNumber, b);
  }
  const arr = Array.from(map.values()).sort((a, b) => a.overNumber - b.overNumber);
  if (maxOver) {
    for (let i = 0; i <= maxOver; i++) {
      if (!map.has(i)) arr.push({ overNumber: i, runs: 0, wickets: 0, legalBalls: 0 });
    }
    arr.sort((a, b) => a.overNumber - b.overNumber);
  }
  return arr;
}

export function currentRunRate(innings: Innings) {
  if (!innings.legalBalls) return 0;
  return (innings.runs / innings.legalBalls) * 6;
}

export function requiredRunRate(match: Match) {
  const innings = match.innings[match.currentInnings];
  if (!innings || !match.target || !innings.oversCap) return undefined;
  const ballsLeft = innings.oversCap - innings.legalBalls;
  const need = match.target - innings.runs;
  if (ballsLeft <= 0) return undefined;
  return (need / ballsLeft) * 6;
}

/** Run-rate progression per over for worm chart. */
export function worm(innings: Innings) {
  const buckets = overBuckets(innings);
  let cum = 0;
  return buckets.map((b) => {
    cum += b.runs;
    return { overNumber: b.overNumber + 1, runs: cum, wickets: b.wickets };
  });
}

export function lastNBalls(innings: Innings, n: number): BallEvent[] {
  return innings.events.slice(-n);
}

export function recentRunRate(innings: Innings, balls = 30) {
  const evs = lastNBalls(innings, balls).filter((e) => e.isLegal);
  if (!evs.length) return 0;
  const r = evs.reduce((s, e) => s + e.runsToBatter + e.runsExtras, 0);
  return (r / evs.length) * 6;
}

export function recentWickets(innings: Innings, balls = 30) {
  return lastNBalls(innings, balls).filter((e) => e.isWicket).length;
}

export function highestPartnership(innings: Innings): PartnershipRow | undefined {
  const ps = partnerships(innings);
  if (!ps.length) return undefined;
  return ps.reduce((m, p) => (p.runs > m.runs ? p : m));
}

export { oversString };
