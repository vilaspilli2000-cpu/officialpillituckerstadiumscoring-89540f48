import type { Match, Player } from "./types";

/** Head-to-head statistics computed from raw ball events across every
 *  completed and in-progress match. */

export interface BatterVsBowler {
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  dismissed: number;
  highest: number;      // most runs off this bowler in a single innings
  highestNotOut: boolean;
  strikeRate: number;
  average: number;
  lastDismissal?: string;
  lastMatchLabel?: string;
  lastMatchTs?: number;
  encounters: number;   // innings where they faced each other
}

export interface BowlerVsBatter {
  wickets: number;
  runs: number;
  balls: number;
  dots: number;
  economy: number;
  average: number;
  strikeRate: number;
  bestWickets: number;
  bestRuns: number;
  maidens: number;
}

export interface FielderVsBatter {
  fielderId: string;
  caught: number;
  runOut: number;
  stumped: number;
  total: number;
  lastDismissal?: string;
}

function matchLabelOf(m: Match): string {
  return `${m.teamA.name} vs ${m.teamB.name}`;
}

function iterAllMatches(matches: Match[], current?: Match): Match[] {
  return current ? [current, ...matches] : matches;
}

/** Runs scored by batter A off bowler B (per-innings aggregation). */
export function batterVsBowler(
  matches: Match[],
  current: Match | undefined,
  batterId: string,
  bowlerId: string,
): BatterVsBowler {
  const out: BatterVsBowler = {
    runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, dismissed: 0,
    highest: 0, highestNotOut: false, strikeRate: 0, average: 0,
    encounters: 0,
  };
  for (const m of iterAllMatches(matches, current)) {
    for (let ii = 0; ii < m.innings.length; ii++) {
      const inn = m.innings[ii];
      let innRuns = 0, innBalls = 0, faced = false, outOff = false;
      for (const ev of inn.events) {
        if (ev.batterId !== batterId || ev.bowlerId !== bowlerId) continue;
        faced = true;
        if (ev.isLegal) { innBalls += 1; out.balls += 1; }
        out.runs += ev.runsToBatter;
        innRuns += ev.runsToBatter;
        if (ev.type === "4") out.fours += 1;
        if (ev.runsToBatter === 6) out.sixes += 1;
        if (ev.isLegal && ev.runsToBatter === 0 && !ev.isWicket) out.dots += 1;
        if (ev.isWicket && ev.dismissedPlayerId === batterId) {
          out.dismissed += 1;
          outOff = true;
          out.lastDismissal = ev.dismissalType ?? "out";
          out.lastMatchLabel = matchLabelOf(m);
          out.lastMatchTs = m.completedAt ?? m.createdAt;
        }
      }
      if (faced) {
        out.encounters += 1;
        if (innRuns > out.highest) {
          out.highest = innRuns;
          out.highestNotOut = !outOff;
        }
        if (innBalls > 0 && !out.lastMatchLabel) {
          out.lastMatchLabel = matchLabelOf(m);
          out.lastMatchTs = m.completedAt ?? m.createdAt;
        }
      }
    }
  }
  out.strikeRate = out.balls ? (out.runs / out.balls) * 100 : 0;
  out.average = out.dismissed ? out.runs / out.dismissed : out.runs;
  return out;
}

export function bowlerVsBatter(
  matches: Match[],
  current: Match | undefined,
  bowlerId: string,
  batterId: string,
): BowlerVsBatter {
  const out: BowlerVsBatter = {
    wickets: 0, runs: 0, balls: 0, dots: 0, economy: 0, average: 0,
    strikeRate: 0, bestWickets: 0, bestRuns: 0, maidens: 0,
  };
  let bestBallsRun = Infinity;
  for (const m of iterAllMatches(matches, current)) {
    for (const inn of m.innings) {
      let innW = 0, innR = 0;
      for (const ev of inn.events) {
        if (ev.bowlerId !== bowlerId || ev.batterId !== batterId) continue;
        if (ev.isLegal) { out.balls += 1; }
        // runs conceded to this pairing = runs to batter + extras that came off this ball to bowler
        out.runs += ev.runsToBatter + (ev.type === "wide" || ev.type === "no-ball" ? ev.runsExtras : 0);
        innR += ev.runsToBatter;
        if (ev.isLegal && ev.runsToBatter === 0 && !ev.isWicket) out.dots += 1;
        if (ev.isWicket && ev.dismissedPlayerId === batterId &&
            ev.dismissalType && ev.dismissalType !== "run-out" && ev.dismissalType !== "retired") {
          out.wickets += 1;
          innW += 1;
        }
      }
      if (innW > out.bestWickets || (innW === out.bestWickets && innW > 0 && innR < bestBallsRun)) {
        out.bestWickets = innW;
        out.bestRuns = innR;
        bestBallsRun = innR;
      }
    }
  }
  out.economy = out.balls ? (out.runs / out.balls) * 6 : 0;
  out.average = out.wickets ? out.runs / out.wickets : 0;
  out.strikeRate = out.wickets ? out.balls / out.wickets : 0;
  return out;
}

/** Fielders (from the bowling team) most often responsible for dismissing this batter. */
export function fielderVsBatter(
  matches: Match[],
  current: Match | undefined,
  batterId: string,
  fielderIds: string[],
): FielderVsBatter[] {
  const map = new Map<string, FielderVsBatter>();
  for (const id of fielderIds) map.set(id, { fielderId: id, caught: 0, runOut: 0, stumped: 0, total: 0 });
  for (const m of iterAllMatches(matches, current)) {
    for (const inn of m.innings) {
      for (const ev of inn.events) {
        if (ev.dismissedPlayerId !== batterId || !ev.catcherId) continue;
        const fr = map.get(ev.catcherId);
        if (!fr) continue;
        if (ev.dismissalType === "run-out") fr.runOut += 1;
        else if (ev.dismissalType === "stumped") fr.stumped += 1;
        else fr.caught += 1;
        fr.total += 1;
        fr.lastDismissal = ev.dismissalType ?? "out";
      }
    }
  }
  return Array.from(map.values()).filter((f) => f.total > 0).sort((a, b) => b.total - a.total);
}

export interface RivalryAlert { id: string; icon: string; text: string; }

/** Rivalry milestone alerts for the current batter+bowler pairing. */
export function rivalryAlerts(
  players: Player[],
  matches: Match[],
  current: Match | undefined,
  batterId?: string,
  bowlerId?: string,
): RivalryAlert[] {
  const out: RivalryAlert[] = [];
  const name = (id: string) => players.find((p) => p.id === id)?.name ?? "—";
  if (batterId && bowlerId) {
    const h = batterVsBowler(matches, current, batterId, bowlerId);
    // Round-number career runs vs bowler.
    for (const mark of [100, 250, 500, 1000, 1500, 2000]) {
      if (h.runs >= mark && h.runs - mark <= 10) {
        out.push({
          id: `bvb-runs-${batterId}-${bowlerId}-${mark}`,
          icon: "🔥",
          text: `${name(batterId)} has now scored ${mark}+ career runs against ${name(bowlerId)}.`,
        });
        break;
      }
    }
    if (h.dismissed >= 5 && h.dismissed % 5 === 0) {
      out.push({
        id: `bvb-dis-${batterId}-${bowlerId}-${h.dismissed}`,
        icon: "🎯",
        text: `${name(bowlerId)} has dismissed ${name(batterId)} ${h.dismissed} times overall.`,
      });
    }
    // New highest score vs this bowler happening live.
    if (current) {
      const inn = current.innings[current.currentInnings];
      const bc = inn?.batters.find((b) => b.playerId === batterId);
      if (bc && bc.runs > 0 && bc.runs === h.highest && h.encounters > 1) {
        out.push({
          id: `bvb-hs-${batterId}-${bowlerId}-${bc.runs}`,
          icon: "👑",
          text: `${name(batterId)} records his highest innings against ${name(bowlerId)} — ${bc.runs}.`,
        });
      }
    }
  }
  return out;
}