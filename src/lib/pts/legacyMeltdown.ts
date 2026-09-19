import type { Player } from "./types";
import { ACHIEVEMENTS, achievementById } from "./achievements";

export interface ProgressionState {
  legacyLevel: number;
  meltdownLevel: number;
}

export interface ProgressionMilestone {
  id: string;
  ts: number;
  matchId: string;
  playerId: string;
  system: "legacy" | "meltdown";
  level: number;
  perk: string;
  multiplier: number;
  trigger: string;
}

export interface LayeredResult {
  baseResult: number;
  legacyLevel: number;
  legacyMultiplier: number;
  legacyActive: boolean;
  meltdownLevel: number;
  meltdownMultiplier: number;
  meltdownActive: boolean;
  finalResult: number;
  calculation: string;
  legacyPerk: string;
  meltdownPerk: string;
}

/** Legacy multipliers for positive PTS. L1 through L19. */
const LEGACY_POSITIVE = [
  2.0, 2.3334, 2.6668, 3.0002, 3.3336, 3.667, 4.0004, 4.3338, 4.6672, 5.0006, 5.334, 5.6674, 6.0008,
  6.3342, 6.6676, 7.001, 7.3344, 7.6678, 8.0012,
];

/** Legacy multipliers for negative PTS. L1 through L19. */
const LEGACY_NEGATIVE = [0.7, 0.4, 0.1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

/** Meltdown multipliers for positive PTS. M1 through M11. */
const MELTDOWN_POSITIVE = [0.8, 0.71, 0.62, 0.53, 0.44, 0.35, 0.26, 0.17, 0.1, 0.1, 0.1];

/** Meltdown multipliers for negative PTS. M1 through M11. */
const MELTDOWN_NEGATIVE = [1.75, 2.0, 2.25, 2.5, 2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25];

const LEGACY_PERKS = [
  "First Light",
  "Rising Standard",
  "Crafted Under Pressure",
  "Reliable Hand",
  "Match Memory",
  "Golden Thread",
  "Big-Match Instinct",
  "Legacy Builder",
  "Stadium Favourite",
  "Elite Standard",
  "Record Chaser",
  "Fearless Finisher",
  "Era Shaper",
  "PTS Royalty",
  "Hallmark Performer",
  "Immortal Form",
  "Generational Class",
  "Icon Status",
  "Pilli Tucker Legend",
];
const MELTDOWN_PERKS = [
  "Warning Track",
  "Pressure Leak",
  "Crack In The Armour",
  "Momentum Lost",
  "Red Zone",
  "Collapse Watch",
  "Critical Spell",
  "Deep Trouble",
  "Danger Level",
  "Meltdown Alert",
  "Total Meltdown",
];

const clampLevel = (value: number, max: number) => Math.max(0, Math.min(max, value));

/** Show base PTS with the app's readable precision (2 dp). */
const fmtBase = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return (r > 0 ? "+" : "") + (Number.isInteger(r) ? r.toString() : r.toFixed(2));
};

/** Show final PTS with the app's readable precision (2 dp). */
const fmtFinal = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return (r > 0 ? "+" : "") + (Number.isInteger(r) ? r.toString() : r.toFixed(2));
};

/**
 * Derive the authoritative progression state from a player's unlocked
 * achievements. Levels are 1-to-1 with the number of actually unlocked
 * achievement IDs — never from stored progression, never from thresholds.
 */
export function progressionOf(player: Player): ProgressionState {
  return progressionFromAchievements(player);
}

export function perkFor(system: "legacy" | "meltdown", level: number) {
  if (level <= 0) return "Inactive";
  const perks = system === "legacy" ? LEGACY_PERKS : MELTDOWN_PERKS;
  return perks[Math.min(level, perks.length) - 1] ?? perks[perks.length - 1];
}

/**
 * Look up a multiplier from the authoritative table.
 * level 0 (inactive) always returns the neutral multiplier 1.
 * positive selects the positive table; negative the negative table.
 */
export function multiplierFor(system: "legacy" | "meltdown", level: number, positive: boolean) {
  if (level <= 0) return 1;
  const values =
    system === "legacy"
      ? positive
        ? LEGACY_POSITIVE
        : LEGACY_NEGATIVE
      : positive
        ? MELTDOWN_POSITIVE
        : MELTDOWN_NEGATIVE;
  return values[Math.min(level, values.length) - 1] ?? 1;
}

/**
 * Count how many of a player's unlocked achievements belong to a given system.
 *
 * - Legacy system: only counts achievements whose `def.legacy === true` (legacy-rarity tier).
 * - Meltdown system: only counts achievements whose `def.shame === true` AND
 *   `def.rarity === "legacy"` (legacy-rarity Hall Of Shame tiers = Meltdown).
 *
 * Unknown / invalid achIds are silently ignored — they must never affect the count.
 */
function countUnlockedAchievements(player: Player, legacy: boolean): number {
  const unlocked = player.achievements ?? [];
  let count = 0;
  for (const u of unlocked) {
    const def = achievementById(u.achId);
    if (!def) continue; // unknown/invalid ID — do NOT count
    if (legacy) {
      // Legacy Level: exact number of legacy-rarity achievements unlocked.
      if (def.legacy) count++;
    } else {
      // Meltdown Level: exact number of Meltdown achievements unlocked.
      // Meltdown = Hall Of Shame achievements at legacy rarity tier.
      if (def.shame && def.rarity === "legacy") count++;
    }
  }
  return count;
}

/** Derive Legacy level from unlocked achievements (1-to-1: count = level). */
export function legacyLevelFromAchievements(player: Player): number {
  return clampLevel(countUnlockedAchievements(player, true), 19);
}

/** Derive Meltdown level from unlocked achievements (1-to-1: count = level). */
export function meltdownLevelFromAchievements(player: Player): number {
  return clampLevel(countUnlockedAchievements(player, false), 11);
}

/** Compute progression state from existing unlock data. */
export function progressionFromAchievements(player: Player): ProgressionState {
  return {
    legacyLevel: legacyLevelFromAchievements(player),
    meltdownLevel: meltdownLevelFromAchievements(player),
  };
}

/**
 * Apply Legacy and Meltdown multipliers to a base PTS result.
 *
 * - Base PTS is the exact decimal result from computeMatchPoints.
 * - Positive base PTS uses the positive multiplier tables.
 * - Negative base PTS uses the negative multiplier tables.
 * - Zero base PTS safely returns zero with no misleading multiplication.
 * - Level 0 (no achievements) uses the neutral multiplier 1 — L1/M1 are
 *   never applied to a player with zero unlocked achievements.
 */
export function layerResult(
  baseNet: number,
  legacyLevel: number,
  meltdownLevel: number,
): LayeredResult {
  const baseResult = baseNet;
  const positive = baseResult > 0;
  const legacyActive = legacyLevel > 0;
  const meltdownActive = meltdownLevel > 0;
  const legacyMultiplier = multiplierFor("legacy", legacyLevel, positive);
  const meltdownMultiplier = multiplierFor("meltdown", meltdownLevel, positive);

  let finalResult: number;
  let calculation: string;

  if (baseResult === 0) {
    finalResult = 0;
    calculation = "Base PTS is 0 — no multiplier applied (final = 0)";
  } else {
    finalResult = baseResult * legacyMultiplier * meltdownMultiplier;
    const baseStr = fmtBase(baseResult);
    calculation = `${baseStr} × ${legacyMultiplier.toFixed(4)} × ${meltdownMultiplier.toFixed(2)} = ${fmtFinal(finalResult)}`;
  }

  return {
    baseResult,
    legacyLevel,
    legacyMultiplier,
    legacyActive,
    meltdownLevel,
    meltdownMultiplier,
    meltdownActive,
    finalResult,
    calculation,
    legacyPerk: perkFor("legacy", legacyLevel),
    meltdownPerk: perkFor("meltdown", meltdownLevel),
  };
}

export function milestoneId(m: Omit<ProgressionMilestone, "id">) {
  return `${m.playerId}-${m.system}-${m.level}-${m.matchId}`;
}
