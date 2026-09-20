import { combinedCareer } from "./seed";
import type { Player } from "./types";

/**
 * Deterministic PTS Player Ranking Score.
 * Weighted model — every factor is normalized to 0..100 then weighted:
 *   Batting career impact      30%
 *   Bowling impact             22%
 *   Match-winning & pressure   18%
 *   Awards (POTM/BOTM/etc.)    12%
 *   Fielding                    8%
 *   Recent form                10%
 * New players (zero matches) default to 50/100.
 */

const WEIGHTS = {
  batting: 0.3,
  bowling: 0.22,
  pressure: 0.18,
  awards: 0.12,
  fielding: 0.08,
  form: 0.1,
} as const;

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

function battingScore(p: Player): { score: number; sr: number; avg: number } {
  const c = combinedCareer(p);
  const sr = p.career.balls ? (p.career.runs / p.career.balls) * 100 : 0;
  const innings = Math.max(1, p.career.innings ?? p.career.matches);
  const avg = p.career.runs / Math.max(1, innings - p.career.notOuts);
  if (p.career.matches === 0) return { score: 50, sr: 0, avg: 0 };
  // Component sub-scores (each 0..100)
  const runsS = clamp((c.runs / 5000) * 100); // 5000 runs → 100
  const avgS = clamp((avg / 60) * 100); // avg 60 → 100
  const srS = clamp(((sr - 80) / 80) * 100); // sr 160 → 100
  const hundredsS = clamp((c.hundreds / 20) * 100); // 20 tons → 100
  const fiftiesS = clamp((c.fifties / 40) * 100); // 40 fifties → 100
  const highestS = clamp((c.highest / 250) * 100); // HS 250 → 100
  const bigS = clamp(
    (((p.career.hundred50s ?? 0) * 2 + (p.career.doubleHundreds ?? 0) * 4) / 10) * 100,
  );
  const boundaries = (p.career.fours ?? 0) + (p.career.sixes ?? 0);
  const boundaryPct = p.career.balls ? (boundaries / p.career.balls) * 100 : 0;
  const boundaryS = clamp((boundaryPct / 25) * 100); // 25% boundaries → 100
  const score =
    runsS * 0.25 +
    avgS * 0.18 +
    srS * 0.17 +
    hundredsS * 0.12 +
    fiftiesS * 0.08 +
    highestS * 0.05 +
    bigS * 0.07 +
    boundaryS * 0.08;
  return { score: clamp(score), sr, avg };
}

function bowlingScore(p: Player): { score: number; econ: number } {
  const econ = p.career.bowlBalls ? (p.career.bowlRuns / p.career.bowlBalls) * 6 : 0;
  if ((p.career.wickets ?? 0) === 0 && (p.career.bowlBalls ?? 0) === 0) {
    return { score: p.career.matches === 0 ? 50 : 30, econ: 0 };
  }
  const wktsS = clamp((p.career.wickets / 100) * 100); // 100 wkts → 100
  const econS = clamp(((9 - econ) / 4) * 100); // econ 5 → 100
  const dots = p.career.dots ?? 0;
  const dotsS = clamp((dots / Math.max(1, p.career.bowlBalls)) * 200); // 50% dots → 100
  const bestS = clamp(((p.career.bestBowlingWkts ?? 0) / 5) * 100);
  const score = wktsS * 0.45 + econS * 0.3 + dotsS * 0.15 + bestS * 0.1;
  return { score: clamp(score), econ };
}

function pressureScore(p: Player): number {
  const r = p.ratings ?? {};
  if (p.career.matches === 0) return 50;
  const parts = [r.pressure, r.matchWinning, r.deathBat, r.deathBowl].filter(
    (x): x is number => typeof x === "number",
  );
  if (parts.length === 0) return 50;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
}

function awardsScore(p: Player): number {
  // 10 awards → 100
  return clamp((p.career.awards / 10) * 100);
}

function fieldingScore(p: Player): number {
  if (p.career.matches === 0) return 50;
  const catches = p.career.catches;
  const runOuts = p.career.runOuts;
  const perMatch = (catches + runOuts * 1.5) / Math.max(1, p.career.matches);
  // 1 dismissal per match → 100
  const dismS = clamp(perMatch * 100);
  const ratingS = p.ratings?.fielding ?? 50;
  return clamp(dismS * 0.6 + ratingS * 0.4);
}

function formScore(p: Player): number {
  if (p.career.matches === 0) return 50;
  return clamp(p.ratings?.recentForm ?? p.ratings?.overall ?? 60);
}

function buildExplanation(
  p: Player,
  parts: {
    bat: number;
    bowl: number;
    pres: number;
    awd: number;
    fld: number;
    form: number;
    sr: number;
    econ: number;
  },
): string {
  const c = combinedCareer(p);
  const bits: string[] = [];
  if (c.hundreds >= 5) bits.push(`${c.hundreds} centuries`);
  if (c.highest >= 100) bits.push(`HS ${c.highest}${c.highestNotOut ? "*" : ""}`);
  if (parts.sr >= 140) bits.push(`elite SR ${parts.sr.toFixed(0)}`);
  if (p.career.wickets >= 50) bits.push(`${p.career.wickets} wickets`);
  if (parts.econ > 0 && parts.econ < 6.5) bits.push(`econ ${parts.econ.toFixed(2)}`);
  if (parts.pres >= 85) bits.push("high pressure rating");
  if (parts.fld >= 75) bits.push("strong fielder");
  if (p.career.awards > 0) bits.push(`${p.career.awards} match awards`);
  if (bits.length === 0) {
    if (p.career.matches === 0) return "New player — default rating 50/100.";
    return "Developing all-round contributor.";
  }
  return bits.slice(0, 4).join(" · ");
}

export function rankPlayers(players: Player[]) {
  const scored = players.map((p) => {
    const bat = battingScore(p);
    const bowl = bowlingScore(p);
    const pres = pressureScore(p);
    const awd = awardsScore(p);
    const fld = fieldingScore(p);
    const form = formScore(p);
    const score =
      bat.score * WEIGHTS.batting +
      bowl.score * WEIGHTS.bowling +
      pres * WEIGHTS.pressure +
      awd * WEIGHTS.awards +
      fld * WEIGHTS.fielding +
      form * WEIGHTS.form;
    const c = combinedCareer(p);
    const reason = buildExplanation(p, {
      bat: bat.score,
      bowl: bowl.score,
      pres,
      awd,
      fld,
      form,
      sr: bat.sr,
      econ: bowl.econ,
    });
    return {
      player: p,
      score,
      c,
      sr: bat.sr,
      econ: bowl.econ,
      reason,
      breakdown: {
        batting: bat.score,
        bowling: bowl.score,
        pressure: pres,
        awards: awd,
        fielding: fld,
        form,
      },
    };
  });
  scored.sort((a, b) => {
    const aBeg = !!a.player.beginner && a.player.career.matches === 0;
    const bBeg = !!b.player.beginner && b.player.career.matches === 0;
    if (aBeg && !bBeg) return 1;
    if (!aBeg && bBeg) return -1;
    return b.score - a.score;
  });
  return scored;
}

export const RANKING_WEIGHTS = WEIGHTS;
