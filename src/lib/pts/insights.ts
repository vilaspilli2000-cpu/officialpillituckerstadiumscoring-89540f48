import type { BallEvent, Match, Player } from "./types";
import { partnerships, overBuckets, bowlerAdvanced } from "./analytics";

const nameOf = (id: string | undefined, players: Player[]) =>
  players.find((p) => p.id === id)?.name ?? "Unknown";

export interface MomentumPoint {
  ballIndex: number;
  overLabel: string;
  value: number; // -100..100, positive = batting momentum
  inningsIndex: number;
}

/** Rolling momentum across an innings, computed from the last 12 legal balls. */
export function momentumSeries(match: Match, inningsIndex: number): MomentumPoint[] {
  const inn = match.innings[inningsIndex];
  if (!inn) return [];
  const out: MomentumPoint[] = [];
  const window = 12;
  const evs = inn.events;
  for (let i = 0; i < evs.length; i++) {
    const slice = evs.slice(Math.max(0, i - window + 1), i + 1);
    const legal = slice.filter((e) => e.isLegal);
    if (legal.length === 0) continue;
    const runs = slice.reduce((s, e) => s + e.runsToBatter + e.runsExtras, 0);
    const dots = legal.filter((e) => e.runsToBatter + e.runsExtras === 0).length;
    const boundaries = legal.filter((e) => e.runsToBatter >= 4).length;
    const wks = slice.filter((e) => e.isWicket).length;
    const extras = slice.reduce((s, e) => s + e.runsExtras, 0);
    const rr = (runs / legal.length) * 6;
    // Baseline rate: RRR if chasing, else par.
    const par = match.target && inn.oversCap
      ? ((match.target - inn.runs) / Math.max(1, inn.oversCap - inn.legalBalls)) * 6
      : match.format === "A" ? 10 : match.format === "B" ? 7 : 4.5;
    let m = (rr - par) * 8; // ±80 max
    m += boundaries * 8 - dots * 3 + extras * 1.5 - wks * 22;
    m = Math.max(-100, Math.min(100, m));
    const e = evs[i];
    out.push({
      ballIndex: i + 1,
      overLabel: `${e.overNumber}.${e.ballInOver || 0}`,
      value: Math.round(m),
      inningsIndex,
    });
  }
  return out;
}

export interface TimelineEvent {
  ballIndex: number;
  overLabel: string;
  inningsIndex: number;
  kind:
    | "toss" | "first-run" | "first-four" | "first-six" | "first-wicket"
    | "fifty" | "hundred" | "hat-trick" | "three-wkt" | "partnership"
    | "turning-point" | "last-over" | "winning-shot" | "result" | "award";
  title: string;
  detail: string;
}

export function timelineEvents(match: Match, players: Player[]): TimelineEvent[] {
  const list: TimelineEvent[] = [];
  list.push({
    ballIndex: 0, overLabel: "—", inningsIndex: 0,
    kind: "toss",
    title: "Match begins",
    detail: `${match.teamA.name} vs ${match.teamB.name} · Format ${match.format}`,
  });

  for (let idx = 0; idx < match.innings.length; idx++) {
    const inn = match.innings[idx];
    const teamName = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;
    let firstRun = false, firstFour = false, firstSix = false, firstWkt = false;
    const runsPerBatter = new Map<string, number>();
    const wkStreak = { bowlerId: "", count: 0, lastOver: -1 };
    const bowlerWks = new Map<string, number>();

    inn.events.forEach((e, i) => {
      const gRuns = e.runsToBatter + e.runsExtras;
      // batter running total for milestones
      const prevR = runsPerBatter.get(e.batterId) ?? 0;
      const newR = prevR + e.runsToBatter;
      runsPerBatter.set(e.batterId, newR);

      if (!firstRun && gRuns > 0) {
        firstRun = true;
        list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "first-run", title: "First run", detail: `${teamName} on the board` });
      }
      if (!firstFour && e.runsToBatter === 4) {
        firstFour = true;
        list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "first-four", title: "First four", detail: `${nameOf(e.batterId, players)} finds the fence` });
      }
      if (!firstSix && (e.type === "six-out")) {
        firstSix = true;
        list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "first-six", title: "First six", detail: `${nameOf(e.batterId, players)} clears the rope — six & out` });
      }
      // milestone crossing
      if (prevR < 50 && newR >= 50) {
        list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "fifty", title: "Fifty", detail: `${nameOf(e.batterId, players)} reaches 50` });
      }
      if (prevR < 100 && newR >= 100) {
        list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "hundred", title: "Century", detail: `${nameOf(e.batterId, players)} raises three figures` });
      }
      if (e.isWicket) {
        if (!firstWkt) {
          firstWkt = true;
          list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "first-wicket", title: "First wicket", detail: `${nameOf(e.dismissedPlayerId, players)} falls to ${nameOf(e.bowlerId, players)}` });
        }
        const bw = (bowlerWks.get(e.bowlerId) ?? 0) + 1;
        bowlerWks.set(e.bowlerId, bw);
        if (bw === 3) {
          list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "three-wkt", title: "Three-wicket haul", detail: `${nameOf(e.bowlerId, players)} on fire` });
        }
        // hat-trick detection
        if (wkStreak.bowlerId === e.bowlerId && (e.overNumber === wkStreak.lastOver || e.overNumber === wkStreak.lastOver + 1)) {
          wkStreak.count += 1;
        } else {
          wkStreak.bowlerId = e.bowlerId;
          wkStreak.count = 1;
        }
        wkStreak.lastOver = e.overNumber;
        if (wkStreak.count === 3) {
          list.push({ ballIndex: i + 1, overLabel: `${e.overNumber}.${e.ballInOver || 0}`, inningsIndex: idx, kind: "hat-trick", title: "HAT-TRICK!", detail: `${nameOf(e.bowlerId, players)} on a hat-trick` });
        }
      } else if (wkStreak.bowlerId === e.bowlerId) {
        // any legal ball not a wicket resets streak
        if (e.isLegal) wkStreak.count = 0;
      }
    });

    // Partnership highlight (>= 40)
    const ps = partnerships(inn);
    for (const p of ps) {
      if (p.runs >= 40) {
        list.push({
          ballIndex: 0, overLabel: p.endOverLabel ?? "—", inningsIndex: idx, kind: "partnership",
          title: `${p.runs}-run stand`,
          detail: `${nameOf(p.batterAId, players)} & ${nameOf(p.batterBId, players)} (W${p.wicket})`,
        });
      }
    }

    // Last over of a completed chase / capped innings
    if (inn.oversCap && inn.legalBalls >= inn.oversCap - 6 && inn.events.length > 0) {
      const lastBall = inn.events[inn.events.length - 1];
      list.push({
        ballIndex: inn.events.length, overLabel: `${lastBall.overNumber}.${lastBall.ballInOver || 0}`,
        inningsIndex: idx, kind: "last-over", title: "Last over", detail: `${teamName} — climax of the innings`,
      });
    }
  }

  // Turning point = biggest single-ball probability swing
  if (match.probability.length > 2) {
    let bestIdx = -1, bestSwing = 0;
    for (let i = 1; i < match.probability.length; i++) {
      const swing = Math.abs(match.probability[i].teamA - match.probability[i - 1].teamA);
      if (swing > bestSwing) { bestSwing = swing; bestIdx = i; }
    }
    if (bestIdx >= 0 && bestSwing >= 8) {
      const p = match.probability[bestIdx];
      list.push({
        ballIndex: p.ballIndex, overLabel: "—", inningsIndex: match.currentInnings,
        kind: "turning-point", title: "Turning point",
        detail: `${bestSwing.toFixed(0)}% swing · ${p.note}`,
      });
    }
  }

  if (match.result) {
    const lastInn = match.innings[match.innings.length - 1];
    const lastEv = lastInn?.events[lastInn.events.length - 1];
    if (lastEv && match.result.winner) {
      list.push({
        ballIndex: lastInn.events.length, overLabel: `${lastEv.overNumber}.${lastEv.ballInOver || 0}`,
        inningsIndex: match.innings.length - 1, kind: "winning-shot",
        title: "Winning moment", detail: `${nameOf(lastEv.batterId, players)} seals it`,
      });
    }
    list.push({
      ballIndex: 999999, overLabel: "—", inningsIndex: match.innings.length - 1,
      kind: "result", title: "Result", detail: match.result.summary,
    });
    for (const a of match.awards ?? []) {
      list.push({
        ballIndex: 1000000, overLabel: "—", inningsIndex: match.innings.length - 1,
        kind: "award", title: a.type.toUpperCase(), detail: a.headline,
      });
    }
  }

  return list;
}

export interface SmartInsight {
  key: string;
  label: string;
  headline: string;
  detail: string;
  ballIndex?: number;
  inningsIndex?: number;
}

export function smartInsights(match: Match, players: Player[]): SmartInsight[] {
  const out: SmartInsight[] = [];

  // Best partnership across the match
  let bestP: { p: ReturnType<typeof partnerships>[number]; idx: number } | undefined;
  for (let i = 0; i < match.innings.length; i++) {
    for (const p of partnerships(match.innings[i])) {
      if (!bestP || p.runs > bestP.p.runs) bestP = { p, idx: i };
    }
  }
  if (bestP && bestP.p.runs > 0) {
    out.push({
      key: "best-partnership", label: "Best Partnership",
      headline: `${nameOf(bestP.p.batterAId, players)} & ${nameOf(bestP.p.batterBId, players)}`,
      detail: `${bestP.p.runs} runs (${bestP.p.balls}) · Wicket ${bestP.p.wicket}`,
      inningsIndex: bestP.idx,
    });
  }

  // Most valuable over (fewest runs for wickets — best for bowling side)
  // Most expensive over (most runs)
  let mvo: { over: number; runs: number; wkts: number; idx: number } | undefined;
  let meo: { over: number; runs: number; wkts: number; idx: number } | undefined;
  let quiet: { over: number; runs: number; idx: number } | undefined;
  let fast: { over: number; runs: number; idx: number } | undefined;
  for (let i = 0; i < match.innings.length; i++) {
    for (const b of overBuckets(match.innings[i])) {
      if (b.legalBalls === 0) continue;
      const score = b.wickets * 20 - b.runs;
      if (!mvo || score > (mvo.wkts * 20 - mvo.runs)) mvo = { over: b.overNumber, runs: b.runs, wkts: b.wickets, idx: i };
      if (!meo || b.runs > meo.runs) meo = { over: b.overNumber, runs: b.runs, wkts: b.wickets, idx: i };
      if (!quiet || b.runs < quiet.runs) quiet = { over: b.overNumber, runs: b.runs, idx: i };
      if (!fast || b.runs > fast.runs) fast = { over: b.overNumber, runs: b.runs, idx: i };
    }
  }
  if (mvo && (mvo.wkts > 0 || mvo.runs <= 2)) out.push({
    key: "mvo", label: "Most Valuable Over",
    headline: `Over ${mvo.over + 1} · ${mvo.runs} run${mvo.runs === 1 ? "" : "s"}${mvo.wkts ? `, ${mvo.wkts} wkt` : ""}`,
    detail: `Match-shifting over for the bowling side`,
    inningsIndex: mvo.idx,
  });
  if (meo && meo.runs >= 12) out.push({
    key: "meo", label: "Most Expensive Over",
    headline: `Over ${meo.over + 1} · ${meo.runs} runs`,
    detail: `Boundary-heavy over that flipped the pressure`,
    inningsIndex: meo.idx,
  });
  if (fast) out.push({
    key: "fast", label: "Fastest Scoring Phase",
    headline: `Over ${fast.over + 1}`,
    detail: `${fast.runs} runs in a single over`,
    inningsIndex: fast.idx,
  });
  if (quiet) out.push({
    key: "quiet", label: "Quietest Phase",
    headline: `Over ${quiet.over + 1}`,
    detail: `Just ${quiet.runs} run${quiet.runs === 1 ? "" : "s"} conceded`,
    inningsIndex: quiet.idx,
  });

  // Best bowling spell — best bowler by wickets then economy
  let bestBw: { id: string; wk: number; runs: number; balls: number; idx: number } | undefined;
  for (let i = 0; i < match.innings.length; i++) {
    for (const b of match.innings[i].bowlers) {
      const better =
        !bestBw ||
        b.wickets > bestBw.wk ||
        (b.wickets === bestBw.wk && b.runs < bestBw.runs);
      if (better && (b.wickets > 0 || b.balls >= 12)) {
        bestBw = { id: b.playerId, wk: b.wickets, runs: b.runs, balls: b.balls, idx: i };
      }
    }
  }
  if (bestBw) {
    const adv = bowlerAdvanced(match.innings[bestBw.idx], bestBw.id);
    out.push({
      key: "spell", label: "Best Bowling Spell",
      headline: `${nameOf(bestBw.id, players)} — ${bestBw.wk}/${bestBw.runs}`,
      detail: `${adv.dots} dots · ${adv.maidens} maiden${adv.maidens === 1 ? "" : "s"} · ${(bestBw.balls / 6).toFixed(1)} overs`,
      inningsIndex: bestBw.idx,
    });
  }

  // Biggest momentum swing (probability-based)
  if (match.probability.length > 2) {
    let bestIdx = 0, bestSwing = 0;
    for (let i = 1; i < match.probability.length; i++) {
      const swing = Math.abs(match.probability[i].teamA - match.probability[i - 1].teamA);
      if (swing > bestSwing) { bestSwing = swing; bestIdx = i; }
    }
    if (bestSwing >= 5) {
      out.push({
        key: "swing", label: "Biggest Momentum Swing",
        headline: `${bestSwing.toFixed(0)}% win probability swing`,
        detail: match.probability[bestIdx].note,
        ballIndex: match.probability[bestIdx].ballIndex,
      });
    }
  }

  // Turning point (same as swing but framed differently — the ball that "decided" it)
  if (match.result && match.probability.length > 4) {
    // find first ball after which winner's probability crossed 70 and never went back
    const winnerSide = match.result.winner;
    if (winnerSide === "A" || winnerSide === "B") {
      const key: "teamA" | "teamB" = winnerSide === "A" ? "teamA" : "teamB";
      let tp = -1;
      for (let i = 0; i < match.probability.length; i++) {
        if (match.probability[i][key] >= 70) {
          const rest = match.probability.slice(i);
          if (rest.every((p) => p[key] >= 55)) { tp = i; break; }
        }
      }
      if (tp >= 0) {
        out.push({
          key: "tp", label: "Turning Point",
          headline: `Winners crossed 70% and never looked back`,
          detail: match.probability[tp].note,
          ballIndex: match.probability[tp].ballIndex,
        });
      }
    }
  }

  // Pressure moment — lowest point for the eventual winner
  if (match.result && (match.result.winner === "A" || match.result.winner === "B")) {
    const key: "teamA" | "teamB" = match.result.winner === "A" ? "teamA" : "teamB";
    let low = { i: -1, v: 101 };
    for (let i = 0; i < match.probability.length; i++) {
      if (match.probability[i][key] < low.v) { low = { i, v: match.probability[i][key] }; }
    }
    if (low.i >= 0 && low.v <= 35) {
      out.push({
        key: "pressure", label: "Pressure Moment",
        headline: `Winners dropped to ${low.v.toFixed(0)}%`,
        detail: `Held their nerve and turned it around`,
        ballIndex: match.probability[low.i].ballIndex,
      });
    }
  }

  return out;
}

/** Per-award-type totals for a player, aggregated across saved matches. */
export function playerAwardCounts(playerId: string, matches: Match[]) {
  const c = { pom: 0, batsman: 0, bowler: 0, fielder: 0, fighter: 0, worst: 0, total: 0 };
  for (const m of matches) {
    for (const a of m.awards ?? []) {
      if (a.playerId !== playerId) continue;
      c[a.type] = (c[a.type] ?? 0) + 1;
      c.total += 1;
    }
  }
  return c;
}

/** Simple deterministic Career Impact Score (0-100). */
export function careerImpactScore(p: Player, matches: Match[]): number {
  const games = Math.max(1, p.career.matches);
  const runsPerM = p.career.runs / games;
  const wksPerM = p.career.wickets / games;
  const catchesPerM = p.career.catches / games;
  const awards = playerAwardCounts(p.id, matches).total + p.career.awards;
  const awardsPerM = awards / games;
  const raw =
    runsPerM * 0.6 +
    wksPerM * 12 +
    catchesPerM * 5 +
    awardsPerM * 20 +
    ((p.ratings?.overall ?? 50) - 50) * 0.4;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export type { BallEvent };