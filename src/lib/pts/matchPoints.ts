import type { Match, Player } from "./types";

/**
 * PTS Batter Tiers — used to award wicket points based on victim quality.
 * Top order: 7pts, Middle: 4pts, Lower / beginners: 3pts.
 * Unknown ids default to Lower (3pts).
 */
const TOP_ORDER = new Set(["sunny", "rithu", "sathvik", "himmu"]);
const MIDDLE_ORDER = new Set(["atharv", "karthik", "deva", "mahesh"]);
const LOWER_ORDER = new Set(["karunya", "madhu", "chitti", "vir"]);

export type BatterTier = "top" | "middle" | "lower";

export function batterTierOf(playerId: string, players?: Player[]): BatterTier {
  if (TOP_ORDER.has(playerId)) return "top";
  if (MIDDLE_ORDER.has(playerId)) return "middle";
  if (LOWER_ORDER.has(playerId)) return "lower";
  // Fallback: beginner or low-cap players → lower.
  const p = players?.find((x) => x.id === playerId);
  if (p?.beginner) return "lower";
  if (p && (p.career.matches ?? 0) < 20) return "lower";
  return "middle";
}

export function wicketPointsFor(playerId: string, players?: Player[]): number {
  const t = batterTierOf(playerId, players);
  return t === "top" ? 7 : t === "middle" ? 4 : 3;
}

/** Batting runs points from §9 of the spec. */
export function runsPoints(runs: number, balls: number): number {
  if (runs === 0 && balls === 1) return -10; // golden duck
  if (runs === 0 && balls >= 2) return -5; // duck
  if (runs <= 10) return 1;
  if (runs <= 20) return 4;
  if (runs <= 30) return 5;
  if (runs <= 49) return 6;
  if (runs <= 75) return Math.round(10 + (runs - 50) / 10);
  if (runs <= 100) return 14 + Math.floor((runs - 76) / 4);
  // Above 100: 20 base at 100, +1 per additional 10 runs.
  return 20 + Math.floor((runs - 100) / 10);
}

/** Strike-rate points from §9: round UP to nearest 10, divide by 10. */
export function strikeRatePoints(runs: number, balls: number): number {
  if (balls === 0) return 0;
  const sr = (runs / balls) * 100;
  return Math.ceil(sr / 10);
}

/** Economy penalty from §10: -1 per full run above 6.00 economy. */
export function economyPenalty(runs: number, balls: number): number {
  if (balls === 0) return 0;
  const econ = (runs / balls) * 6;
  if (econ <= 6) return 0;
  return -Math.floor(econ - 6);
}

export interface PointLine {
  label: string;
  detail?: string;
  value: number;
}

export interface PlayerMatchPoints {
  playerId: string;
  batting: number;
  bowling: number;
  fielding: number;
  awards: number;
  consistencyBonus: number;
  /** Exact (decimal) net match points. Round only when adding to career. */
  net: number;
  breakdown: string[];
  lines: {
    batting: PointLine[];
    bowling: PointLine[];
    fielding: PointLine[];
    awards: PointLine[];
  };
}

/** Fielding point values (decimals allowed). */
export const FIELDING_POINTS = {
  directCatch: 4,
  oneBounceCatch: 2,
  runOut: 3,
  boundarySave: 0.5,
  catchDrop: -1,
} as const;

/**
 * Compute Net Match Points for every player who appeared in `match`.
 * `priorStreakByPlayer` maps player.id → number of consecutive prior 30+ innings
 * across their career BEFORE this match (used to award the +12 streak bonus
 * once a 3rd or later consecutive 30+ innings arrives).
 */
export function computeMatchPoints(
  match: Match,
  players: Player[],
  priorStreakByPlayer: Map<string, number>,
): Map<string, PlayerMatchPoints> {
  const out = new Map<string, PlayerMatchPoints>();

  const ensure = (id: string): PlayerMatchPoints => {
    let m = out.get(id);
    if (!m) {
      m = {
        playerId: id,
        batting: 0,
        bowling: 0,
        fielding: 0,
        awards: 0,
        consistencyBonus: 0,
        net: 0,
        breakdown: [],
        lines: { batting: [], bowling: [], fielding: [], awards: [] },
      };
      out.set(id, m);
    }
    return m;
  };

  // Batting
  for (const inn of match.innings) {
    for (const b of inn.batters) {
      if (b.balls === 0 && !b.out) continue;
      const m = ensure(b.playerId);
      const rp = runsPoints(b.runs, b.balls);
      const sp = strikeRatePoints(b.runs, b.balls);
      const fp = b.fours; // +1 per four
      m.batting += rp + sp + fp;
      m.lines.batting.push({
        label: "Runs Points",
        detail: `${b.runs} runs off ${b.balls} balls`,
        value: rp,
      });
      m.lines.batting.push({
        label: "Strike Rate Points",
        detail: `SR ${b.balls ? ((b.runs / b.balls) * 100).toFixed(1) : "0.0"} → ceil(SR ÷ 10)`,
        value: sp,
      });
      m.lines.batting.push({ label: "Four Points", detail: `${b.fours} × 1`, value: fp });
      m.breakdown.push(`Bat ${b.runs}(${b.balls}): runs +${rp}, SR +${sp}, 4s +${fp}`);
      // Consistency streak — count 30+ innings from this match, add +12
      // for each 30+ innings once prior streak is already ≥ 2.
      if (b.runs >= 30) {
        const prior = priorStreakByPlayer.get(b.playerId) ?? 0;
        const idx = prior + 1; // this innings' streak position
        if (idx >= 3) {
          m.consistencyBonus += 12;
          m.lines.batting.push({
            label: "Consistency Bonus",
            detail: `${idx}th consecutive 30+ innings`,
            value: 12,
          });
          m.breakdown.push(`Consistency streak +12 (innings ${idx})`);
        }
        priorStreakByPlayer.set(b.playerId, idx);
      } else {
        priorStreakByPlayer.set(b.playerId, 0);
      }
    }
  }

  // Bowling
  for (const inn of match.innings) {
    for (const bw of inn.bowlers) {
      if (bw.balls === 0 && bw.wickets === 0) continue;
      const m = ensure(bw.playerId);
      const eco = economyPenalty(bw.runs, bw.balls);
      m.bowling += eco;
      let wktPts = 0;
      // Sum quality points per wicket taken by this bowler in this innings.
      for (const ev of inn.events) {
        if (!ev.isWicket) continue;
        if (ev.bowlerId !== bw.playerId) continue;
        // Only credit dismissals attributed to the bowler (not pure run-outs).
        if (ev.dismissalType === "run-out") continue;
        if (!ev.dismissedPlayerId) continue;
        wktPts += wicketPointsFor(ev.dismissedPlayerId, players);
      }
      if (bw.wickets === 0) {
        m.bowling += -1;
        m.lines.bowling.push({ label: "Wicket Points", detail: "Wicketless spell", value: -1 });
        m.lines.bowling.push({
          label: "Economy Points",
          detail: `${bw.runs} runs off ${bw.balls} balls`,
          value: eco,
        });
        m.breakdown.push(`Bowl 0/${bw.runs}: econ ${eco}, wicketless -1`);
      } else {
        m.bowling += wktPts;
        m.lines.bowling.push({
          label: "Wicket Points",
          detail: `${bw.wickets} wicket${bw.wickets === 1 ? "" : "s"} (quality tiered)`,
          value: wktPts,
        });
        m.lines.bowling.push({
          label: "Economy Points",
          detail: `${bw.runs} runs off ${bw.balls} balls`,
          value: eco,
        });
        m.breakdown.push(`Bowl ${bw.wickets}/${bw.runs}: econ ${eco}, wickets +${wktPts}`);
      }
    }
  }

  // Fielding: catches (+4 direct, +2 one-bounce) + run outs credited elsewhere.
  for (const inn of match.innings) {
    for (const ev of inn.events) {
      if (!ev.isWicket) continue;
      if (!ev.catcherId) continue;
      const m = ensure(ev.catcherId);
      if (ev.dismissalType === "caught") {
        m.fielding += FIELDING_POINTS.directCatch;
        m.lines.fielding.push({
          label: "Direct Catch",
          detail: "+4 each",
          value: FIELDING_POINTS.directCatch,
        });
        m.breakdown.push("Direct catch +4");
      } else if (ev.dismissalType === "caught-one-bounce") {
        m.fielding += FIELDING_POINTS.oneBounceCatch;
        m.lines.fielding.push({
          label: "One Bounce Catch",
          detail: "+2 each",
          value: FIELDING_POINTS.oneBounceCatch,
        });
        m.breakdown.push("One-bounce catch +2");
      } else if (ev.dismissalType === "run-out") {
        m.fielding += FIELDING_POINTS.runOut;
        m.lines.fielding.push({
          label: "Run Out",
          detail: "+3 each",
          value: FIELDING_POINTS.runOut,
        });
        m.breakdown.push("Run out +3");
      }
    }
  }

  // Fielding extras: boundary saves (+0.5) and dropped catches (-1).
  for (const fe of match.fieldingEvents ?? []) {
    const m = ensure(fe.playerId);
    if (fe.kind === "boundary-save") {
      m.fielding += FIELDING_POINTS.boundarySave;
      m.lines.fielding.push({
        label: "Boundary Save",
        detail: "+0.5 each",
        value: FIELDING_POINTS.boundarySave,
      });
    } else {
      m.fielding += FIELDING_POINTS.catchDrop;
      m.lines.fielding.push({
        label: "Catch Drop",
        detail: "-1 each",
        value: FIELDING_POINTS.catchDrop,
      });
    }
  }

  // Awards
  const awardPts: Record<string, number> = {
    pom: 6,
    batsman: 4,
    bowler: 4,
    fielder: 2,
    fighter: 2,
    worst: -3,
  };
  const awardLabels: Record<string, string> = {
    pom: "Player of the Match",
    batsman: "Batsman of the Match",
    bowler: "Bowler of the Match",
    fielder: "Fielder of the Match",
    fighter: "Fighter of the Match",
    worst: "Worst Player",
  };
  for (const aw of match.awards ?? []) {
    const m = ensure(aw.playerId);
    const pts = awardPts[aw.type] ?? 0;
    m.awards += pts;
    m.lines.awards.push({ label: awardLabels[aw.type] ?? aw.type, value: pts });
    m.breakdown.push(`${aw.type.toUpperCase()} ${pts >= 0 ? "+" : ""}${pts}`);
  }

  for (const m of out.values()) {
    m.net = m.batting + m.bowling + m.fielding + m.awards + m.consistencyBonus;
  }
  return out;
}

/** Reconstruct pre-match consecutive-30+ streaks per player from history. */
export function buildStreakSnapshot(matches: Match[]): Map<string, number> {
  const streaks = new Map<string, number>();
  const sorted = [...matches]
    .filter((m) => m.completedAt)
    .sort((a, b) => (a.completedAt ?? 0) - (b.completedAt ?? 0));
  for (const m of sorted) {
    for (const inn of m.innings) {
      for (const b of inn.batters) {
        if (b.balls === 0 && !b.out) continue;
        if (b.runs >= 30) streaks.set(b.playerId, (streaks.get(b.playerId) ?? 0) + 1);
        else streaks.set(b.playerId, 0);
      }
    }
  }
  return streaks;
}

export function historicFoursPoints(historicFours: number): number {
  return Math.round(historicFours / 10);
}
export function historicWicketsPoints(historicWickets: number): number {
  return Math.round(historicWickets / 5);
}
