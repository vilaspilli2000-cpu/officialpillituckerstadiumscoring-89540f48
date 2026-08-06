import type { Match, Player } from "./types";
import {
  historicFoursPoints, historicWicketsPoints,
} from "./matchPoints";
import { playerBuckets } from "./buckets";

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
  | "matchPerf"
  | "ach"
  | "historic";

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
  ach: "Achievement Points",
  historic: "Historic Contribution",
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
  const B = playerBuckets(player);

  // 1. Strike Rate bucket — official baseline + every match SR gain.
  const battingPts = B.sr;
  const battingDetail = `SR ${sr.toFixed(1)} · bucket ${battingPts} pts`;

  // 2. Big Innings bucket.
  const bigPts = B.big;
  const bigDetail = `${c.hundreds}×100=${c.hundreds * 20}, ${c.fifties}×50=${c.fifties * 10}`;

  // 3. Consistency Bonus (§5)
  const scores = playerInningsScores(matches, player.id);
  const cons = computeConsistency(scores);
  const consPts = B.cons;
  const consDetail = `${scores.filter((s) => s >= 30).length} innings of 30+, streak ${cons.currentStreak} (best ${cons.longestStreak})`;

  // 4. Awards (§6)
  const pom = c.pomAwards ?? 0;
  const bat = c.batsmanAwards ?? 0;
  const bowl = c.bowlerAwards ?? 0;
  const fld = c.fielderAwards ?? 0;
  const ftr = c.fighterAwards ?? 0;
  const wor = c.worstAwards ?? 0;
  const awardPts = B.awd;
  const awardDetail = `POM ${pom}·BOTM ${bat}·BOWLTM ${bowl}·FOTM ${fld}·Fighter ${ftr}·Worst ${wor}`;

  // 5. Fours bucket.
  const fourPts = B.fours;
  const boundaryDetail = `${c.fours ?? 0} career fours · bucket ${fourPts} pts`;

  // 6. Career Wickets bucket.
  const histWktPts = B.wkt;
  const bowlingDetail = `${c.wickets ?? 0} career wickets · bucket ${histWktPts} pts`;

  // 7. Match Performance (§12) — accumulated Net Match Points.
  const matchPerfPts = B.match;
  const matchPerfDetail = `Accumulated across ${scores.length} innings`;

  // 7b. Achievement Points (ACH) — permanent, includes Hall Of Shame penalties.
  const achPts = player.achPoints ?? 0;
  const achUnlocks = (player.achievements ?? []).filter((u) => !u.baseline);
  const achDetail = achUnlocks.length
    ? `${achUnlocks.length} achievement${achUnlocks.length === 1 ? "" : "s"} earned`
    : "No achievement points yet";

  // 8. Historic contribution is folded into the official buckets from v3.3.4.
  const historicPts = 0;
  const historicDetail = "Included in the official baseline buckets";

  const categories: Record<OvertakeCategoryKey, OvertakeCategory> = {
    batting: { key: "batting", label: CATEGORY_LABELS.batting, points: battingPts, detail: battingDetail },
    bigInnings: { key: "bigInnings", label: CATEGORY_LABELS.bigInnings, points: bigPts, detail: bigDetail },
    consistency: { key: "consistency", label: CATEGORY_LABELS.consistency, points: consPts, detail: consDetail },
    awards: { key: "awards", label: CATEGORY_LABELS.awards, points: awardPts, detail: awardDetail },
    boundaries: { key: "boundaries", label: CATEGORY_LABELS.boundaries, points: fourPts, detail: boundaryDetail },
    bowling: { key: "bowling", label: CATEGORY_LABELS.bowling, points: histWktPts, detail: bowlingDetail },
    matchPerf: { key: "matchPerf", label: CATEGORY_LABELS.matchPerf, points: matchPerfPts, detail: matchPerfDetail },
    ach: { key: "ach", label: CATEGORY_LABELS.ach, points: achPts, detail: achDetail },
    historic: { key: "historic", label: CATEGORY_LABELS.historic, points: historicPts, detail: historicDetail },
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

  const need = gap; // exact points needed to overtake (already includes +1)
  const leaderName = leader.player.name;
  const trailerName = trailer.player.name;

  // Exact single-lever paths (§1 requires mathematically exact numbers).
  s.push({
    key: "bigInnings", label: "Centuries",
    points: Math.ceil(need / 20) * 20,
    text: `${trailerName} needs exactly ${Math.ceil(need / 20)} century${Math.ceil(need / 20) === 1 ? "" : "ies"} to overtake ${leaderName}.`,
  });
  s.push({
    key: "bigInnings", label: "Fifties",
    points: Math.ceil(need / 10) * 10,
    text: `${trailerName} needs exactly ${Math.ceil(need / 10)} fifty${Math.ceil(need / 10) === 1 ? "" : "ies"} to overtake ${leaderName}.`,
  });
  s.push({
    key: "awards", label: "Player of the Match",
    points: Math.ceil(need / 6) * 6,
    text: `${trailerName} needs exactly ${Math.ceil(need / 6)} Player of the Match award${Math.ceil(need / 6) === 1 ? "" : "s"} to overtake ${leaderName}.`,
  });
  s.push({
    key: "boundaries", label: "Fours",
    points: need,
    text: `${trailerName} needs exactly ${need} more four${need === 1 ? "" : "s"} to overtake ${leaderName}.`,
  });
  // Wickets assumed middle-order tier @ 4 pts each.
  s.push({
    key: "bowling", label: "Wickets",
    points: Math.ceil(need / 4) * 4,
    text: `${trailerName} needs exactly ${Math.ceil(need / 4)} more wickets (middle-order) to overtake ${leaderName}.`,
  });
  // SR — need Δ = ceil(need/2)
  const srDelta = Math.ceil(need / 2);
  s.push({
    key: "batting", label: "Strike Rate",
    points: srDelta * 2,
    text: `${trailerName} needs exactly +${srDelta} career strike rate (${trailer.strikeRate.toFixed(1)} → ${(trailer.strikeRate + srDelta).toFixed(1)}) to overtake ${leaderName}.`,
  });
  // Consistency streak — +12 per extra 30+ once streak ≥ 3.
  const streakLeft = trailer.currentStreak >= 2
    ? Math.ceil(need / 12)
    : Math.ceil((need + 12) / 12) + (2 - trailer.currentStreak);
  s.push({
    key: "consistency", label: "Consistency Streak",
    points: need,
    text: `${trailerName} needs exactly ${streakLeft} more consecutive 30+ innings${trailer.currentStreak < 2 ? " (first two build the streak)" : ""} to overtake ${leaderName}.`,
  });

  s.sort((a, b) => a.points - b.points);

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
    case "ach": return "unlocking more achievements";
    case "historic": return "adding to the career record";
  }
}

export { CATEGORY_LABELS };