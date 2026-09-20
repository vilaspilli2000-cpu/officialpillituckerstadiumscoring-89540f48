import type { Match, Player } from "./types";
import { computeMatchPoints, buildStreakSnapshot, type PointLine } from "./matchPoints";
import { computeOvertakeScore } from "./overtakeRanking";
import {
  layerResult,
  legacyLevelFromAchievements,
  meltdownLevelFromAchievements,
} from "./legacyMeltdown";

export interface PointsBreakdownEntry {
  playerId: string;
  playerName: string;
  team: "A" | "B";
  oldPoints: number;
  baseNet: number; // exact base PTS before Legacy/Meltdown multipliers
  netPoints: number; // exact final PTS after multipliers
  netRounded: number; // added to career ranking
  newPoints: number;
  legacyLevel: number;
  meltdownLevel: number;
  legacyMultiplier: number;
  meltdownMultiplier: number;
  calculation: string;
  sections: {
    batting: { total: number; lines: PointLine[] };
    bowling: { total: number; lines: PointLine[] };
    fielding: { total: number; lines: PointLine[] };
    awards: { total: number; lines: PointLine[] };
  };
}

function mergeLines(lines: PointLine[]): PointLine[] {
  const out: PointLine[] = [];
  for (const l of lines) {
    const found = out.find((x) => x.label === l.label && x.detail === l.detail);
    if (found) found.value += l.value;
    else out.push({ ...l });
  }
  return out;
}

/**
 * Build the permanent Points Breakdown for a match.
 * `priorMatches` must NOT include `match` (they are the completed matches
 * that existed before it) and `players` are the PRE-MATCH player records,
 * so `oldPoints` reflects the true ranking total before this match.
 * `postPlayers` are optional POST-match records used ONLY for the Legacy /
 * Meltdown achievement counts (which include this match's unlocks).
 */
export function buildPointsBreakdown(
  match: Match,
  players: Player[],
  priorMatches: Match[],
  postPlayers?: Player[],
): PointsBreakdownEntry[] {
  const streaks = buildStreakSnapshot(priorMatches);
  const mp = computeMatchPoints(match, players, streaks);
  const entries: PointsBreakdownEntry[] = [];
  for (const [playerId, pm] of mp) {
    const player = players.find((p) => p.id === playerId);
    if (!player) continue;
    const oldPoints = computeOvertakeScore(player, priorMatches).total;
    const post = postPlayers?.find((p) => p.id === playerId);
    const levelSource = post ?? player;
    const ll = legacyLevelFromAchievements(levelSource);
    const ml = meltdownLevelFromAchievements(levelSource);
    const layered = layerResult(pm.net, ll, ml);
    const netRounded = Math.round(layered.finalResult);
    entries.push({
      playerId,
      playerName: player.name,
      team: match.teamA.playerIds.includes(playerId) ? "A" : "B",
      oldPoints,
      baseNet: pm.net,
      netPoints: layered.finalResult,
      netRounded,
      newPoints: oldPoints + netRounded,
      legacyLevel: ll,
      meltdownLevel: ml,
      legacyMultiplier: layered.legacyMultiplier,
      meltdownMultiplier: layered.meltdownMultiplier,
      calculation: layered.calculation,
      sections: {
        batting: { total: pm.batting + pm.consistencyBonus, lines: mergeLines(pm.lines.batting) },
        bowling: { total: pm.bowling, lines: mergeLines(pm.lines.bowling) },
        fielding: { total: pm.fielding, lines: mergeLines(pm.lines.fielding) },
        awards: { total: pm.awards, lines: mergeLines(pm.lines.awards) },
      },
    });
  }
  entries.sort((a, b) => b.netPoints - a.netPoints);
  return entries;
}
