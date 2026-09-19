import type { Match, Player } from "./types";
import { ChallengeAssignment } from "./challengesEngine";

export interface ChallengePointsEntry {
  playerId: string;
  playerName: string;
  team: "A" | "B";
  challengeType: string;
  challengeTier: string;
  tierEmoji: string;
  target: number;
  actualValue: number;
  reward: number;
  matchId: string;
  ts: number;
  inningsIndex: number;
  isBatting: boolean;
}

export interface ChallengePointsState {
  entries: ChallengePointsEntry[];
  totalChallengePoints: number; // cumulative total earned from challenges
}

/**
 * Add challenge points to a player's permanent history
 * Similar to how achievement points and milestones are tracked
 */
export function addChallengePoints(
  match: Match,
  player: Player,
  assignment: ChallengeAssignment,
  inningsIndex: number,
  isBatting: boolean,
): ChallengePointsEntry {
  const entry: ChallengePointsEntry = {
    playerId: player.id,
    playerName: player.name,
    team: match.teamA.playerIds.includes(player.id) ? "A" : "B",
    challengeType: assignment.type,
    challengeTier: assignment.tier,
    tierEmoji: getTierEmoji(assignment.tier),
    target: assignment.target,
    actualValue: assignment.actualValue ?? 0,
    reward: assignment.reward,
    matchId: match.id,
    ts: Date.now(),
    inningsIndex,
    isBatting,
  };

  return entry;
}

export function getTierEmoji(tier: string): string {
  switch (tier) {
    case "EASY":
      return "🟢";
    case "MEDIUM":
      return "🔵";
    case "HARD":
      return "🟣";
    case "EXTREME":
      return "🔴";
    case "LEGENDARY":
      return "👑";
    default:
      return "⚪";
  }
}

/**
 * Calculate total challenge points earned by a player
 * (sum of all completed challenge rewards)
 */
export function calculateTotalChallengePoints(entries: ChallengePointsEntry[]): number {
  return entries.reduce((sum, entry) => sum + entry.reward, 0);
}

/**
 * Get challenge points breakdown by tier for a player
 */
export function getChallengePointsByTier(entries: ChallengePointsEntry[]): Record<string, number> {
  const breakdown: Record<string, number> = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
    EXTREME: 0,
    LEGENDARY: 0,
  };

  entries.forEach((entry) => {
    if (breakdown[entry.challengeTier] !== undefined) {
      breakdown[entry.challengeTier] += entry.reward;
    }
  });

  return breakdown;
}

export default {
  addChallengePoints,
  getTierEmoji,
  calculateTotalChallengePoints,
  getChallengePointsByTier,
};
