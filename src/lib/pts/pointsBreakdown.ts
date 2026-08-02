import type { Match, Player } from "./types";
import { computeMatchPoints, buildStreakSnapshot, type PointLine } from "./matchPoints";
import { computeOvertakeScore } from "./overtakeRanking";

export interface PointsBreakdownEntry {
  playerId: string;
  playerName: string;
  team: "A" | "B";
  oldPoints: number;
  netPoints: number; // exact, decimals allowed
  netRounded: number; // added to career ranking
  newPoints: number;
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
 * that existed before it) and `players` are the pre-match player records.
 */
export function buildPointsBreakdown(
  match: Match,
  players: Player[],
  priorMatches: Match[],
): PointsBreakdownEntry[] {
  const streaks = buildStreakSnapshot(priorMatches);
  const mp = computeMatchPoints(match, players, streaks);
  const entries: PointsBreakdownEntry[] = [];
  for (const [playerId, pm] of mp) {
    const player = players.find((p) => p.id === playerId);
    if (!player) continue;
    const oldPoints = computeOvertakeScore(player, priorMatches).total;
    const netRounded = Math.round(pm.net);
    entries.push({
      playerId,
      playerName: player.name,
      team: match.teamA.playerIds.includes(playerId) ? "A" : "B",
      oldPoints,
      netPoints: pm.net,
      netRounded,
      newPoints: oldPoints + netRounded,
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