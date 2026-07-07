import type { Match, Player } from "./types";
import {
  historicFoursPoints, historicWicketsPoints,
} from "./matchPoints";

/**
 * Overtake Ranking Engine
 * Weighted, quality-first ranking used by the Overtake Comparison page.
 *
 * Categories (priority order):
 *   1. Batting Quality      — 1 point per Strike Rate (runs/balls*100)
 *   2. Big Innings          — 100:+10, 50:+5, 150:+5 extra, 200:+10 extra
 *   3. Recent Form          — Every 30+ = +2. After 2 consecutive 30+, each
 *                             additional 30+ while streak is live = +10.
 *                             A sub-30 innings resets the streak.
 *   4. Match Awards         — POM+3 / BOTM+2 / BOWLTM+2 / FOTM+1 / Fighter+1 / Worst-1
 *   5. Boundary Hitting     — floor(fours/10)  (career fours grouped in 10s)
 *   6. Bowling Contribution — floor(wickets/5) (career wickets grouped in 5s)
 */

export type OvertakeCategoryKey =
  | "batting"
  | "bigInnings"
  | "consistency"
  | "awards"
  | "boundaries"
  | "bowling"
  | "matchPerf";

export interface OvertakeCategory {
  key: OvertakeCategoryKey;
  label: string;
  points: number;
  detail: string;
}

export interface OvertakeScore {
  player: Player;
  total: number;
  categories: Record<OvertakeCategoryKey, OvertakeCategory>;
  strikeRate: number;
  perInningsScores: number[]; // chronological
  currentStreak: number;
  longestStreak: number;
}

const CATEGORY_LABELS: Record<OvertakeCategoryKey, string> = {
  batting: "Strike Rate Points",
  bigInnings: "Big Innings",
  consistency: "Consistency Bonus",
  awards: "Match Awards",
  boundaries: "Career Fours",
  bowling: "Career Wickets",
  matchPerf: "Match Performance",
};

/** Collect a player's per-innings scores from completed match history, in
 *  chronological order (oldest first). */
export function playerInningsScores(matches: Match[], playerId: string): number[] {
  const out: Array<{ ts: number; runs: number }> = [];
  for (const m of matches) {
    if (!m.completedAt) continue;
    for (const inn of m.innings) {
      for (const b of inn.batters) {
        if (b.playerId !== playerId) continue;
        if (b.balls === 0 && !b.out) continue;
        out.push({ ts: m.completedAt, runs: b.runs });
      }
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out.map((x) => x.runs);
}

/** Compute consistency points and streak stats from an ordered list of scores. */
export function computeConsistency(scores: number[]): {
  points: number;
  currentStreak: number;
  longestStreak: number;
  streakBonusInnings: number;
} {
  let points = 0;
  let consecutive = 0;
  let longest = 0;
  let bonusInnings = 0;
  for (const s of scores) {
    if (s >= 30) {
      consecutive += 1;
      if (consecutive <= 2) {
        points += 6;
      } else {
        points += 6 + 12;
        bonusInnings += 1;
      }
      if (consecutive > longest) longest = consecutive;
    } else {
      consecutive = 0;
    }
  }
  return { points, currentStreak: consecutive, longestStreak: longest, streakBonusInnings: bonusInnings };
}

export function computeOvertakeScore(player: Player, matches: Match[]): OvertakeScore {
  const c = player.career;
  const sr = c.balls ? (c.runs / c.balls) * 100 : 0;

  // 1. Strike Rate Points — 2 pts per SR unit (§3). Runs never affect this.
  const battingPts = Math.round(sr * 2);
  const battingDetail = `SR ${sr.toFixed(1)} × 2 = ${battingPts} pts`;

  // 2. Big Innings (§4) — 20 per 100, 10 per 50.
  const bigPts =
    c.hundreds * 20 +
    c.fifties * 10 +
    (c.hundred50s ?? 0) * 10 +
    (c.doubleHundreds ?? 0) * 20;
  const bigDetail = `${c.hundreds}×100=${c.hundreds * 20}, ${c.fifties}×50=${c.fifties * 10}`;

  // 3. Consistency Bonus (§5)
  const scores = playerInningsScores(matches, player.id);
  const cons = computeConsistency(scores);
  const consDetail = `${scores.filter((s) => s >= 30).length} innings of 30+, streak ${cons.currentStreak} (best ${cons.longestStreak})`;

  // 4. Awards (§6)
  const pom = c.pomAwards ?? 0;
  const bat = c.batsmanAwards ?? 0;
  const bowl = c.bowlerAwards ?? 0;
  const fld = c.fielderAwards ?? 0;
  const ftr = c.fighterAwards ?? 0;
  const wor = c.worstAwards ?? 0;
  const awardPts = pom * 6 + bat * 4 + bowl * 4 + fld * 2 + ftr * 2 - wor * 3;
  const awardDetail = `POM ${pom}·BOTM ${bat}·BOWLTM ${bowl}·FOTM ${fld}·Fighter ${ftr}·Worst ${wor}`;

  // 5. Fours (§7) — historic snapshot rounded to nearest 10 (÷10 pts).
  //    Every new four earns +1 pt immediately.
  const historicFours = player.historicFours ?? c.fours ?? 0;
  const histFourPts = historicFoursPoints(historicFours);
  const newFours = Math.max(0, (c.fours ?? 0) - historicFours);
  const fourPts = histFourPts + newFours;
  const boundaryDetail = `Historic ${historicFours} → ${histFourPts} pts · New +${newFours}`;

  // 6. Career Wickets (§8) — historic rounded to nearest 5 (÷5 pts).
  //    New wickets earn quality points via match performance.
  const historicWickets = player.historicWickets ?? c.wickets ?? 0;
  const histWktPts = historicWicketsPoints(historicWickets);
  const bowlingDetail = `Historic ${historicWickets} → ${histWktPts} pts`;

  // 7. Match Performance (§12) — accumulated Net Match Points.
  const matchPerfPts = player.matchPoints ?? 0;
  const matchPerfDetail = `Accumulated across ${scores.length} innings`;

  const categories: Record<OvertakeCategoryKey, OvertakeCategory> = {
    batting: { key: "batting", label: CATEGORY_LABELS.batting, points: battingPts, detail: battingDetail },
    bigInnings: { key: "bigInnings", label: CATEGORY_LABELS.bigInnings, points: bigPts, detail: bigDetail },
    consistency: { key: "consistency", label: CATEGORY_LABELS.consistency, points: cons.points, detail: consDetail },
    awards: { key: "awards", label: CATEGORY_LABELS.awards, points: awardPts, detail: awardDetail },
    boundaries: { key: "boundaries", label: CATEGORY_LABELS.boundaries, points: fourPts, detail: boundaryDetail },
    bowling: { key: "bowling", label: CATEGORY_LABELS.bowling, points: histWktPts, detail: bowlingDetail },
    matchPerf: { key: "matchPerf", label: CATEGORY_LABELS.matchPerf, points: matchPerfPts, detail: matchPerfDetail },
  };

  const total = Object.values(categories).reduce((a, b) => a + b.points, 0);

  return {
    player,
    total,
    categories,
    strikeRate: sr,
    perInningsScores: scores,
    currentStreak: cons.currentStreak,
    longestStreak: cons.longestStreak,
  };
}

export interface OvertakePlan {
  totalGap: number;
  suggestions: Array<{ key: OvertakeCategoryKey; label: string; points: number; text: string }>;
  strongest: OvertakeCategory;
  weakness: OvertakeCategory; // biggest deficit vs opponent
  projectedRank: number;
  estimatedMatches: number;
  quickestPath: OvertakeCategoryKey;
  biggestPath: OvertakeCategoryKey;
  confidence: number; // 0-100
  summary: string;
}

/** Build ranking of all players by overall Overtake score. */
export function rankAllOvertake(players: Player[], matches: Match[]): OvertakeScore[] {
  return players
    .map((p) => computeOvertakeScore(p, matches))
    .sort((a, b) => b.total - a.total);
}

/** Build an improvement plan for the trailing player to overtake the leader. */
export function buildOvertakePlan(
  trailer: OvertakeScore,
  leader: OvertakeScore,
  ranked: OvertakeScore[],
): OvertakePlan {
  const gap = leader.total - trailer.total + 1;

  // Category deficits
  const deficits = (Object.keys(trailer.categories) as OvertakeCategoryKey[]).map((k) => ({
    key: k,
    label: trailer.categories[k].label,
    diff: leader.categories[k].points - trailer.categories[k].points,
  }));

  // Strengths / weaknesses vs leader
  const sortedByDiff = [...deficits].sort((a, b) => b.diff - a.diff);
  const weakestKey = sortedByDiff[0]?.key ?? "batting";
  const strongestKey =
    (Object.keys(trailer.categories) as OvertakeCategoryKey[])
      .slice()
      .sort((a, b) => trailer.categories[b].points - trailer.categories[a].points)[0];

  // Suggestions per category — concrete, quality-first
  const s: OvertakePlan["suggestions"] = [];

  // Batting SR
  const srGap = leader.strikeRate - trailer.strikeRate;
  if (srGap > 0) {
    const target = Math.ceil(leader.strikeRate + 1);
    s.push({
      key: "batting",
      label: "Strike Rate",
      points: Math.max(0, Math.round(srGap)),
      text: `Lift career strike rate from ${trailer.strikeRate.toFixed(1)} to ~${target} (+${Math.round(srGap)} pts).`,
    });
  }

  // Big innings
  const bigDiff = leader.categories.bigInnings.points - trailer.categories.bigInnings.points;
  if (bigDiff > 0) {
    const centuriesNeeded = Math.ceil(bigDiff / 10);
    const fiftiesNeeded = Math.ceil(bigDiff / 5);
    s.push({
      key: "bigInnings",
      label: "Big Innings",
      points: bigDiff,
      text: `Add ~${centuriesNeeded} more century or ${fiftiesNeeded} more fifties to close the ${bigDiff}-pt gap.`,
    });
  }

  // Consistency
  const consDiff = leader.categories.consistency.points - trailer.categories.consistency.points;
  if (consDiff > 0) {
    const needed = trailer.currentStreak >= 2 ? Math.ceil(consDiff / 10) : Math.ceil((consDiff - 4) / 10) + 2;
    s.push({
      key: "consistency",
      label: "Consistency Streak",
      points: consDiff,
      text: `Chain ~${Math.max(2, needed)} more 30+ scores${trailer.currentStreak < 2 ? " (build a 2-innings streak first)" : ""} for +${consDiff} pts.`,
    });
  }

  // Awards
  const awdDiff = leader.categories.awards.points - trailer.categories.awards.points;
  if (awdDiff > 0) {
    s.push({
      key: "awards",
      label: "Match Awards",
      points: awdDiff,
      text: `Win ~${Math.ceil(awdDiff / 3)} more Player-of-the-Match awards (+${awdDiff} pts).`,
    });
  }

  // Boundaries
  const bDiff = leader.categories.boundaries.points - trailer.categories.boundaries.points;
  if (bDiff > 0) {
    s.push({
      key: "boundaries",
      label: "Boundaries",
      points: bDiff,
      text: `Hit ~${bDiff * 10} more fours (+${bDiff} pts).`,
    });
  }

  // Bowling
  const wDiff = leader.categories.bowling.points - trailer.categories.bowling.points;
  if (wDiff > 0) {
    s.push({
      key: "bowling",
      label: "Wickets",
      points: wDiff,
      text: `Take ~${wDiff * 5} more wickets (+${wDiff} pts).`,
    });
  }

  s.sort((a, b) => b.points - a.points);

  // Projected rank if trailer closes gap
  const projectedTotal = trailer.total + gap;
  const projectedRank =
    ranked.filter((r) => r.player.id !== trailer.player.id && r.total >= projectedTotal).length + 1;

  // Estimated matches — rough model: ~1.5 pts avg per match per active player.
  // Use recent form: matches played in last 10 scored innings.
  const recentAvg = trailer.perInningsScores.slice(-10);
  const per30 = recentAvg.filter((r) => r >= 30).length;
  const estPerMatch = Math.max(3, 4 + per30 * 2); // 4 baseline, +2 per recent 30+
  const estimatedMatches = Math.max(1, Math.ceil(gap / estPerMatch));

  const quickest = s[0]?.key ?? "batting";
  const biggest =
    sortedByDiff.filter((d) => d.diff > 0).sort((a, b) => b.diff - a.diff)[0]?.key ?? quickest;

  // Confidence: recent form + gap size
  const formScore = Math.min(100, per30 * 20 + trailer.currentStreak * 10);
  const gapScore = Math.max(0, 100 - gap);
  const confidence = Math.round(Math.min(100, formScore * 0.6 + gapScore * 0.4));

  const summary = `${trailer.player.name} trails ${leader.player.name} by ${gap - 1} ranking points. The fastest path is ${categoryPhrase(quickest)}. Based on current form, ${trailer.player.name} is projected to overtake within ${Math.max(1, estimatedMatches - 2)}–${estimatedMatches + 2} matches.`;

  return {
    totalGap: gap - 1,
    suggestions: s,
    strongest: trailer.categories[strongestKey],
    weakness: trailer.categories[weakestKey],
    projectedRank,
    estimatedMatches,
    quickestPath: quickest,
    biggestPath: biggest,
    confidence,
    summary,
  };
}

function categoryPhrase(k: OvertakeCategoryKey): string {
  switch (k) {
    case "batting": return "raising the career strike rate";
    case "bigInnings": return "scoring more centuries and fifties";
    case "consistency": return "building a 30+ consistency streak";
    case "awards": return "winning more match awards";
    case "boundaries": return "hitting more boundaries";
    case "bowling": return "picking up more wickets";
    case "matchPerf": return "compiling stronger match-by-match performances";
  }
}

export { CATEGORY_LABELS };