import type { Match, Player } from "./types";

// ─────────────────────────────────────────────────────────── Player Form

export type FormLabel = "Poor" | "Average" | "Good" | "Excellent" | "Elite";
export type FormTrend = "Improving" | "Stable" | "Declining";

export interface FormInnings {
  matchId: string;
  ts: number;
  label: string;
  runs: number;
  balls: number;
  out: boolean;
  wickets: number;
  bowlRuns: number;
  bowlBalls: number;
  catches: number;
  score: number; // 0..100 impact for this match
}

export interface PlayerForm {
  score: number; // 0..100
  label: FormLabel;
  trend: FormTrend;
  recent: FormInnings[]; // newest first, max 5
  summary: string;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export function formLabelOf(score: number): FormLabel {
  if (score >= 85) return "Elite";
  if (score >= 70) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 30) return "Average";
  return "Poor";
}

function completedSorted(matches: Match[]): Match[] {
  return [...matches]
    .filter((m) => m.completedAt)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}

/** Per-match contributions for one player, newest first. */
export function playerMatchLog(playerId: string, matches: Match[]): FormInnings[] {
  const out: FormInnings[] = [];
  for (const m of completedSorted(matches)) {
    let runs = 0, balls = 0, out_ = false, wickets = 0, bowlRuns = 0, bowlBalls = 0, catches = 0;
    let played = false;
    for (const inn of m.innings) {
      for (const b of inn.batters) {
        if (b.playerId !== playerId) continue;
        if (b.balls === 0 && !b.out) continue;
        played = true;
        runs += b.runs; balls += b.balls; out_ = out_ || !!b.out;
      }
      for (const bw of inn.bowlers) {
        if (bw.playerId !== playerId) continue;
        if (bw.balls === 0 && bw.wickets === 0) continue;
        played = true;
        wickets += bw.wickets; bowlRuns += bw.runs; bowlBalls += bw.balls;
      }
      for (const ev of inn.events) {
        if (ev.isWicket && ev.catcherId === playerId) catches += 1;
      }
    }
    if (!played) continue;
    const sr = balls ? (runs / balls) * 100 : 0;
    const econ = bowlBalls ? (bowlRuns / bowlBalls) * 6 : 0;
    let score = 0;
    score += clamp((runs / 60) * 55, 0, 55);
    score += balls >= 4 ? clamp(((sr - 70) / 90) * 20, -10, 20) : 0;
    score += clamp(wickets * 12, 0, 30);
    score += bowlBalls >= 6 ? clamp(((7.5 - econ) / 3) * 10, -8, 10) : 0;
    score += catches * 4;
    if (runs === 0 && balls > 0 && out_) score -= 12;
    out.push({
      matchId: m.id,
      ts: m.completedAt ?? m.createdAt ?? 0,
      label: `${m.teamA.name} v ${m.teamB.name}`,
      runs, balls, out: out_, wickets, bowlRuns, bowlBalls, catches,
      score: Math.round(clamp(score)),
    });
  }
  return out;
}

export function computePlayerForm(player: Player, matches: Match[]): PlayerForm {
  const log = playerMatchLog(player.id, matches);
  const recent = log.slice(0, 5);
  if (recent.length === 0) {
    return {
      score: 50, label: "Good", trend: "Stable", recent: [],
      summary: "No recent PTS matches — form starts at the neutral 50 baseline.",
    };
  }
  // Recency weighted: newest innings counts most.
  const weights = [1, 0.85, 0.7, 0.55, 0.4];
  let wsum = 0, total = 0;
  recent.forEach((r, i) => {
    const w = weights[i] ?? 0.35;
    total += r.score * w;
    wsum += w;
  });
  const score = Math.round(clamp(total / Math.max(0.001, wsum)));

  const newest = recent.slice(0, Math.min(2, recent.length));
  const older = recent.slice(newest.length);
  const avg = (a: FormInnings[]) => (a.length ? a.reduce((s, x) => s + x.score, 0) / a.length : score);
  const delta = avg(newest) - avg(older);
  const trend: FormTrend = delta >= 8 ? "Improving" : delta <= -8 ? "Declining" : "Stable";

  const runs = recent.reduce((s, r) => s + r.runs, 0);
  const wkts = recent.reduce((s, r) => s + r.wickets, 0);
  const summary =
    `${runs} runs and ${wkts} wicket${wkts === 1 ? "" : "s"} across the last ${recent.length} match${recent.length === 1 ? "" : "es"}.`;

  return { score, label: formLabelOf(score), trend, recent, summary };
}

// ───────────────────────────────────────────────────────── Pressure Meter

export type PressureLabel = "Weak" | "Average" | "Strong" | "Clutch" | "Ice Cold";

export interface PressureProfile {
  score: number; // 0..100
  label: PressureLabel;
  chaseRuns: number;
  chaseBalls: number;
  chaseSr: number;
  deathRuns: number;
  deathBalls: number;
  deathSr: number;
  clutchWickets: number;
  situations: number;
  summary: string;
}

export function pressureLabelOf(score: number): PressureLabel {
  if (score >= 88) return "Ice Cold";
  if (score >= 72) return "Clutch";
  if (score >= 55) return "Strong";
  if (score >= 35) return "Average";
  return "Weak";
}

/** Chasing + death-over + clutch-wicket performance across all matches. */
export function computePressure(player: Player, matches: Match[]): PressureProfile {
  let chaseRuns = 0, chaseBalls = 0, deathRuns = 0, deathBalls = 0;
  let clutchWickets = 0, situations = 0;

  for (const m of completedSorted(matches)) {
    m.innings.forEach((inn, idx) => {
      const chasing = !!m.target && idx > 0;
      const cap = inn.oversCap ?? 0;
      const deathFrom = cap ? Math.floor(cap * 0.7) : Infinity;

      for (const b of inn.batters) {
        if (b.playerId !== player.id) continue;
        if (chasing && b.balls > 0) {
          chaseRuns += b.runs; chaseBalls += b.balls; situations += 1;
        }
      }
      for (const ev of inn.events) {
        const inDeath = ev.isLegal && (inn.legalBalls ?? 0) > 0 && deathFrom !== Infinity
          ? (ev.overNumber ?? 0) * 6 + (ev.ballInOver ?? 0) >= deathFrom
          : false;
        if (inDeath && ev.strikerId === player.id) {
          deathRuns += ev.runsToBatter; deathBalls += 1;
        }
        if (ev.isWicket && ev.bowlerId === player.id && (chasing || inDeath)) {
          clutchWickets += 1; situations += 1;
        }
      }
    });
  }

  const chaseSr = chaseBalls ? (chaseRuns / chaseBalls) * 100 : 0;
  const deathSr = deathBalls ? (deathRuns / deathBalls) * 100 : 0;

  if (situations === 0 && deathBalls === 0) {
    const base = clamp(player.ratings?.pressure ?? 50);
    return {
      score: Math.round(base), label: pressureLabelOf(base),
      chaseRuns, chaseBalls, chaseSr, deathRuns, deathBalls, deathSr,
      clutchWickets, situations,
      summary: "No pressure situations recorded yet — showing the baseline rating.",
    };
  }

  let score = 40;
  if (chaseBalls >= 6) score += clamp(((chaseSr - 80) / 80) * 30, -20, 30);
  if (deathBalls >= 6) score += clamp(((deathSr - 100) / 90) * 25, -15, 25);
  score += clamp(clutchWickets * 5, 0, 20);
  score += clamp(chaseRuns / 25, 0, 10);
  score = clamp(score);

  const bits: string[] = [];
  if (chaseBalls) bits.push(`${chaseRuns} chase runs at SR ${chaseSr.toFixed(0)}`);
  if (deathBalls) bits.push(`death SR ${deathSr.toFixed(0)}`);
  if (clutchWickets) bits.push(`${clutchWickets} clutch wickets`);

  return {
    score: Math.round(score), label: pressureLabelOf(score),
    chaseRuns, chaseBalls, chaseSr, deathRuns, deathBalls, deathSr,
    clutchWickets, situations,
    summary: bits.join(" · ") || "Building a pressure record.",
  };
}

// ─────────────────────────────────────────────────────── Live Team Momentum

export interface TeamMomentum {
  teamA: number; // 0..100 share
  teamB: number;
  leader: "A" | "B" | "even";
  delta: number; // -100..100, positive = team A
  note: string;
}

/**
 * Live ball-by-ball momentum between the two teams. Built from the last
 * 12 legal balls of the current innings, then mapped onto the batting side.
 */
export function teamMomentum(match: Match): TeamMomentum {
  const inn = match.innings[match.currentInnings ?? match.innings.length - 1];
  if (!inn) return { teamA: 50, teamB: 50, leader: "even", delta: 0, note: "Match yet to begin." };

  const evs = inn.events.slice(-12);
  const legal = evs.filter((e) => e.isLegal);
  let m = 0;
  if (legal.length > 0) {
    const runs = evs.reduce((s, e) => s + e.runsToBatter + e.runsExtras, 0);
    const dots = legal.filter((e) => e.runsToBatter + e.runsExtras === 0).length;
    const boundaries = legal.filter((e) => e.runsToBatter >= 4).length;
    const wks = evs.filter((e) => e.isWicket).length;
    const rr = (runs / legal.length) * 6;
    const par = match.target && inn.oversCap
      ? ((match.target - inn.runs) / Math.max(1, inn.oversCap - inn.legalBalls)) * 6
      : match.format === "A" ? 10 : match.format === "B" ? 7 : 4.5;
    m = (rr - par) * 8 + boundaries * 8 - dots * 3 - wks * 22;
    m = Math.max(-100, Math.min(100, m));
  }

  const battingIsA = inn.battingTeam === "A";
  const delta = battingIsA ? m : -m;
  const teamA = Math.round(clamp(50 + delta / 2));
  const teamB = 100 - teamA;
  const leader = teamA > 55 ? "A" : teamA < 45 ? "B" : "even";
  const strength = Math.abs(delta);
  const who = leader === "A" ? match.teamA.name : leader === "B" ? match.teamB.name : "";
  const note =
    leader === "even"
      ? "Evenly poised — neither side pulling away."
      : `${who} ${strength > 60 ? "completely on top" : strength > 30 ? "building pressure" : "edging ahead"}.`;

  return { teamA, teamB, leader, delta: Math.round(delta), note };
}