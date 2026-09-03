import type { Player } from "./types";

export interface ProgressionState {
  legacyProgress: number;
  legacyLevel: number;
  meltdownProgress: number;
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

const LEGACY_POSITIVE = Array.from({ length: 19 }, (_, i) =>
  Number((2 + (6.0012 * i) / 18).toFixed(4)),
);
const LEGACY_NEGATIVE = [0.7, 0.4, 0.1, ...Array.from({ length: 16 }, () => 0)];
const MELTDOWN_POSITIVE = [0.8, 0.71, 0.62, 0.53, 0.44, 0.35, 0.26, 0.17, 0.1, 0.1, 0.1];
const MELTDOWN_NEGATIVE = Array.from({ length: 11 }, (_, i) => 1.75 + i * 0.25);

const LEGACY_PERKS = [
  "First Light", "Rising Standard", "Crafted Under Pressure", "Reliable Hand", "Match Memory",
  "Golden Thread", "Big-Match Instinct", "Legacy Builder", "Stadium Favourite", "Elite Standard",
  "Record Chaser", "Fearless Finisher", "Era Shaper", "PTS Royalty", "Hallmark Performer",
  "Immortal Form", "Generational Class", "Icon Status", "Pilli Tucker Legend",
];
const MELTDOWN_PERKS = [
  "Warning Track", "Pressure Leak", "Crack In The Armour", "Momentum Lost", "Red Zone",
  "Collapse Watch", "Critical Spell", "Deep Trouble", "Danger Level", "Meltdown Alert", "Total Meltdown",
];

const clampLevel = (value: number, max: number) => Math.max(0, Math.min(max, value));

export function defaultProgression(): ProgressionState {
  return { legacyProgress: 0, legacyLevel: 0, meltdownProgress: 0, meltdownLevel: 0 };
}

export function progressionOf(player: Player): ProgressionState {
  return { ...defaultProgression(), ...(player.progression ?? {}) };
}

function levelForProgress(progress: number, max: number, pointsPerLevel: number) {
  return clampLevel(Math.floor(progress / pointsPerLevel), max);
}

export function perkFor(system: "legacy" | "meltdown", level: number) {
  if (level <= 0) return "Inactive";
  const perks = system === "legacy" ? LEGACY_PERKS : MELTDOWN_PERKS;
  return perks[Math.min(level, perks.length) - 1] ?? perks[perks.length - 1];
}

function multiplierFor(system: "legacy" | "meltdown", level: number, positive: boolean) {
  if (level <= 0) return 1;
  const values = system === "legacy"
    ? (positive ? LEGACY_POSITIVE : LEGACY_NEGATIVE)
    : (positive ? MELTDOWN_POSITIVE : MELTDOWN_NEGATIVE);
  return values[Math.min(level, values.length) - 1] ?? 1;
}

export function layerResult(player: Player, normalNet: number): LayeredResult {
  const baseResult = Math.round(normalNet);
  const state = progressionOf(player);
  const positive = baseResult >= 0;
  const legacyActive = state.legacyLevel > 0;
  const meltdownActive = state.meltdownLevel > 0;
  const legacyMultiplier = legacyActive ? multiplierFor("legacy", state.legacyLevel, positive) : 1;
  const meltdownMultiplier = meltdownActive ? multiplierFor("meltdown", state.meltdownLevel, positive) : 1;
  const finalResult = Math.round(baseResult * legacyMultiplier * meltdownMultiplier);
  return {
    baseResult,
    legacyLevel: state.legacyLevel,
    legacyMultiplier,
    legacyActive,
    meltdownLevel: state.meltdownLevel,
    meltdownMultiplier,
    meltdownActive,
    finalResult,
    calculation: `${baseResult} × ${legacyMultiplier.toFixed(4)} × ${meltdownMultiplier.toFixed(4)} = ${finalResult}`,
    legacyPerk: perkFor("legacy", state.legacyLevel),
    meltdownPerk: perkFor("meltdown", state.meltdownLevel),
  };
}

export function advanceProgression(player: Player, normalNet: number): {
  progression: ProgressionState;
  milestones: Array<Omit<ProgressionMilestone, "id" | "ts" | "matchId" | "playerId">>;
} {
  const prior = progressionOf(player);
  const rounded = Math.round(normalNet);
  const next: ProgressionState = {
    legacyProgress: prior.legacyProgress + Math.max(0, rounded),
    legacyLevel: prior.legacyLevel,
    meltdownProgress: prior.meltdownProgress + Math.max(0, -rounded),
    meltdownLevel: prior.meltdownLevel,
  };
  next.legacyLevel = Math.max(prior.legacyLevel, levelForProgress(next.legacyProgress, 19, 100));
  next.meltdownLevel = Math.max(prior.meltdownLevel, levelForProgress(next.meltdownProgress, 11, 50));
  const milestones: Array<Omit<ProgressionMilestone, "id" | "ts" | "matchId" | "playerId">> = [];
  for (let level = prior.legacyLevel + 1; level <= next.legacyLevel; level++) {
    milestones.push({ system: "legacy", level, perk: perkFor("legacy", level), multiplier: multiplierFor("legacy", level, true), trigger: `Reached ${next.legacyProgress.toLocaleString()} positive normal PTS` });
  }
  for (let level = prior.meltdownLevel + 1; level <= next.meltdownLevel; level++) {
    milestones.push({ system: "meltdown", level, perk: perkFor("meltdown", level), multiplier: multiplierFor("meltdown", level, false), trigger: `Absorbed ${next.meltdownProgress.toLocaleString()} negative normal PTS` });
  }
  return { progression: next, milestones };
}

export function milestoneId(m: Omit<ProgressionMilestone, "id">) {
  return `${m.playerId}-${m.system}-${m.level}-${m.matchId}`;
}