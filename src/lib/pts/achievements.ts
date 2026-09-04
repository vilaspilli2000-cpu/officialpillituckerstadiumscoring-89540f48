import type { Match, Player, AchUnlock } from "./types";

/* ══════════════════════════════════════════════════════════════════════
   PTS v3.3 — ACHIEVEMENT MASTER REGISTRY
   One centralised definition of every achievement in PTS. Every page
   references this registry; achievement definitions live nowhere else.
   ══════════════════════════════════════════════════════════════════════ */

export type Rarity = "common" | "rare" | "epic" | "legendary" | "legacy";
export type AchCategory = "batting" | "bowling" | "fielding" | "awards" | "shame";

export interface RarityStyle {
  key: Rarity;
  label: string;
  emoji: string;
  points: number;
  duration: number; // popup ms
  accent: string;
  accent2: string;
  border: string;
  particles: string;
}

export const RARITIES: Record<Rarity, RarityStyle> = {
  common:    { key: "common",    label: "Common",    emoji: "🧢", points: 5,  duration: 12000, accent: "#D9A928", accent2: "#F4C542", border: "#D9A92899", particles: "Golden sparkles · soft glow" },
  rare:      { key: "rare",      label: "Rare",      emoji: "💎", points: 10, duration: 15000, accent: "#2ECC71", accent2: "#7BE8A8", border: "#2ECC7199", particles: "Emerald crystals · green aura · crystal shine" },
  epic:      { key: "epic",      label: "Epic",      emoji: "⚔️", points: 20, duration: 18000, accent: "#E03131", accent2: "#FF7A5A", border: "#E0313199", particles: "Fire · embers · sword slash · explosion ring" },
  legendary: { key: "legendary", label: "Legendary", emoji: "👑", points: 40, duration: 24000, accent: "#9B51E0", accent2: "#D0A2FF", border: "#9B51E099", particles: "Purple lightning · royal aura · falling stars · shockwave" },
  legacy:    { key: "legacy",    label: "Legacy",    emoji: "🌌", points: 75, duration: 30000, accent: "#F4C542", accent2: "#FFFFFF", border: "#F4C542", particles: "Golden explosion · crown · confetti · light rays · screen shake" },
};

export const RARITY_ORDER: Rarity[] = ["common", "rare", "epic", "legendary", "legacy"];

export const CATEGORY_META: Record<AchCategory, { label: string; icon: string }> = {
  batting:  { label: "Batting", icon: "🏏" },
  bowling:  { label: "Bowling", icon: "🎯" },
  fielding: { label: "Fielding", icon: "🧤" },
  awards:   { label: "Awards", icon: "🏆" },
  shame:    { label: "Hall Of Shame", icon: "👹" },
};

/** Every statistic an achievement can be measured against. */
export type StatKey =
  | "runs" | "hundreds" | "fifties" | "matchSR" | "wickets" | "fours"
  | "catches" | "oneBounceCatches" | "pom" | "fighter" | "fielder" | "streak30"
  | "ducks" | "goldenDucks" | "sixOuts" | "hitWickets" | "caughtOuts"
  | "expensiveMatches" | "catchDrops"
  // New v4 achievement stats
  | "duckDodgeStreak" | "matchAppearances" | "chasingNotOuts" | "economyGuardianStreak"
  | "boundarySaves" | "botmAwards" | "bowltmAwards" | "lowScores" | "worstAwards"
  | "bowledDismissals" | "extrasGiven";

/** Statistics only evaluated once a match is officially over. */
export const RESULT_ONLY_STATS: StatKey[] = [
  "pom", "fighter", "fielder", "expensiveMatches",
  "ducks", "goldenDucks", "sixOuts", "hitWickets", "caughtOuts", "catchDrops",
  // New v4 achievement stats that are result-only
  "duckDodgeStreak", "economyGuardianStreak", "chasingNotOuts", "botmAwards", "bowltmAwards",
  "lowScores", "worstAwards", "bowledDismissals", "extrasGiven",
];

/** Statistics that unlock live, during scoring. */
export const LIVE_STATS: StatKey[] = [
  "runs", "fifties", "hundreds", "matchSR", "wickets", "fours",
  "catches", "oneBounceCatches", "streak30",
  // boundarySaves and matchAppearances could be checked live if needed
  "boundarySaves", "matchAppearances",
];

export interface AchievementDef {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  category: AchCategory;
  rarity: Rarity;
  tier: number; // 1..5
  requirement: number;
  points: number; // negative for Hall Of Shame
  statKey: StatKey;
  unit: string;
  icon: string;
  description: string;
  legacy: boolean;
  shame: boolean;
}

interface GroupSpec {
  id: string;
  name: string;
  category: AchCategory;
  statKey: StatKey;
  unit: string;
  icon: string;
  shame?: boolean;
  /** [name, requirement] per tier, common → legacy */
  tiers: Array<[string, number]>;
  note?: string;
}

const GROUP_SPECS: GroupSpec[] = [
  {
    id: "career-runs", name: "Career Runs", category: "batting", statKey: "runs",
    unit: "Runs", icon: "🏏",
    tiers: [["Run Seeker", 250], ["Run Hunter", 750], ["Run Conqueror", 1500], ["Run Machine", 3000], ["The Immortal Batter", 5000]],
  },
  {
    id: "centuries", name: "Centuries", category: "batting", statKey: "hundreds",
    unit: "Centuries", icon: "💯",
    tiers: [["Century Club", 2], ["Hundred Hero", 5], ["Hundred Collector", 8], ["Century Emperor", 12], ["Master Of Hundreds", 15]],
  },
  {
    id: "half-centuries", name: "Half Centuries", category: "batting", statKey: "fifties",
    unit: "Fifties", icon: "5️⃣",
    tiers: [["Reliable Start", 6], ["Fifty Specialist", 12], ["Fifty Hunter", 25], ["Fifty King", 40], ["Lord Of Fifties", 70]],
  },
  {
    id: "match-sr", name: "Match Strike Rate", category: "batting", statKey: "matchSR",
    unit: "SR", icon: "⚡", note: "Single innings only · minimum 20 balls faced",
    tiers: [["Quick Trigger", 200], ["Firestarter", 230], ["Blitzkrieg", 250], ["Inferno", 290], ["Speed Demon", 300]],
  },
  {
    id: "consistency", name: "Consistency", category: "batting", statKey: "streak30",
    unit: "Consecutive 30+ Scores", icon: "🔥",
    tiers: [["Finding Rhythm", 2], ["Reliable", 4], ["Consistency King", 6], ["Mr. Dependable", 8], ["Unbreakable Chain", 10]],
  },
  {
    id: "career-wickets", name: "Career Wickets", category: "bowling", statKey: "wickets",
    unit: "Wickets", icon: "🎯",
    tiers: [["First Strike", 40], ["Wicket Hunter", 80], ["Wicket Collector", 120], ["Wicket Machine", 180], ["Nightmare Of Batters", 200]],
  },
  {
    id: "career-fours", name: "Career Fours", category: "batting", statKey: "fours",
    unit: "Fours", icon: "🟨",
    tiers: [["Boundary Finder", 150], ["Boundary Hunter", 400], ["Boundary Master", 700], ["Boundary King", 1000], ["Boundary Emperor", 1500]],
  },
  {
    id: "direct-catches", name: "Direct Catches", category: "fielding", statKey: "catches",
    unit: "Catches", icon: "🧤",
    tiers: [["Safe Hands", 20], ["Catch Specialist", 50], ["Reflex Master", 100], ["Iron Hands", 170], ["Human Magnet", 250]],
  },
  {
    id: "one-bounce-catches", name: "One Bounce Catches", category: "fielding", statKey: "oneBounceCatches",
    unit: "One Bounce Catches", icon: "⚾",
    tiers: [["Bounce Reader", 20], ["Smart Fielder", 50], ["Boundary Saver", 100], ["Acrobat", 170], ["Ground Guardian", 250]],
  },
  {
    id: "pom", name: "Player Of The Match", category: "awards", statKey: "pom",
    unit: "POTM Awards", icon: "🏆",
    tiers: [["Match Hero", 5], ["Crowd Favourite", 15], ["Match Winner", 30], ["MVP", 50], ["King Of Matches", 75]],
  },
  {
    id: "fighter", name: "Fighter Of The Match", category: "awards", statKey: "fighter",
    unit: "Fighter Awards", icon: "🥊",
    tiers: [["Never Give Up", 5], ["Fighter Spirit", 15], ["Warrior Heart", 30], ["Iron Will", 50], ["Last Man Standing", 75]],
  },
  {
    id: "fielder-award", name: "Fielder Of The Match", category: "awards", statKey: "fielder",
    unit: "Fielder Awards", icon: "🧤",
    tiers: [["Sharp Eyes", 5], ["Defensive Wall", 15], ["Field General", 30], ["Human Barrier", 50], ["Guardian Of The Boundary", 75]],
  },
  // ───────────────────────────── Hall Of Shame
  {
    id: "ducks", name: "Most Ducks", category: "shame", statKey: "ducks", shame: true,
    unit: "Ducks", icon: "🦆",
    tiers: [["Duckling", 5], ["Pond Resident", 15], ["Duck Commander", 35], ["Duck Emperor", 60], ["King Of Ducks", 100]],
  },
  {
    id: "golden-ducks", name: "Most Golden Ducks", category: "shame", statKey: "goldenDucks", shame: true,
    unit: "Golden Ducks", icon: "🥇",
    tiers: [["Early Exit", 3], ["Golden Visitor", 8], ["Golden Magnet", 15], ["Golden Disaster", 25], ["Golden Goose", 40]],
  },
  {
    id: "six-outs", name: "Most Six Outs", category: "shame", statKey: "sixOuts", shame: true,
    unit: "Six Outs", icon: "💥",
    tiers: [["Sky Gambler", 5], ["Boundary Addict", 15], ["Air Specialist", 30], ["Six Sacrificer", 50], ["King Of Six Outs", 75]],
  },
  {
    id: "hit-wickets", name: "Most Hit Wickets", category: "shame", statKey: "hitWickets", shame: true,
    unit: "Hit Wickets", icon: "🤦",
    tiers: [["Lost Balance", 2], ["Self Destroyer", 5], ["Walking Timber", 10], ["Stump Kicker", 20], ["Walking Wicket", 35]],
  },
  {
    id: "caught-outs", name: "Most Caught Outs", category: "shame", statKey: "caughtOuts", shame: true,
    unit: "Caught Outs", icon: "🧲", note: "Direct catch + one bounce catch dismissals combined",
    tiers: [["Easy Target", 25], ["Catch Favourite", 75], ["Sky Victim", 150], ["Human Target", 250], ["Catch Magnet", 400]],
  },
  {
    id: "expensive-matches", name: "Expensive Matches", category: "shame", statKey: "expensiveMatches", shame: true,
    unit: "Expensive Matches", icon: "💸", note: "One entry per completed match with a final economy above 10.00",
    tiers: [["Costly Spell", 5], ["Run Donor", 15], ["Run ATM", 30], ["Run Distributor", 50], ["ATM Bowler", 75]],
  },
  {
    id: "catch-drops", name: "Catch Drops", category: "shame", statKey: "catchDrops", shame: true,
    unit: "Catch Drops", icon: "🧈",
    tiers: [["Slippery Hands", 5], ["Butter Fingers", 15], ["Drop Specialist", 30], ["Gravity's Friend", 50], ["Butter Fingers Supreme", 75]],
  },
  // NEW v4 NORMAL ACHIEVEMENTS (7 families × 5 levels = 35)
  {
    id: "duck-dodger", name: "Duck Dodger", category: "batting", statKey: "duckDodgeStreak",
    unit: "No‑Duck Streak", icon: "🦆", note: "A duck (dismissed for 0) resets the streak",
    tiers: [["Duck Dodger", 5], ["Duck Breaker", 10], ["Duck Master", 20], ["Duck Slayer", 35], ["Duck Immortal", 50]],
  },
  {
    id: "veteran", name: "Veteran", category: "awards", statKey: "matchAppearances",
    unit: "Match Appearances", icon: "🌱", note: "Actual player match appearances from existing data",
    tiers: [["Rookie", 50], ["Regular", 100], ["Veteran", 200], ["Ironman", 300], ["Immortal", 500]],
  },
  {
    id: "chase-survivor", name: "Chase Survivor", category: "batting", statKey: "chasingNotOuts",
    unit: "Chase Not‑Outs", icon: "🏃", note: "Count qualifying not‑out innings while chasing",
    tiers: [["Chase Runner", 3], ["Chase Finisher", 7], ["Chase Specialist", 15], ["Chase Master", 25], ["Chase Immortal", 40]],
  },
  {
    id: "economy-guardian", name: "Economy Guardian", category: "bowling", statKey: "economyGuardianStreak",
    unit: "Economy ≤8 Streak", icon: "🧤", note: "Economy ≤8 is successful; >8 resets the streak",
    tiers: [["Economy Keeper", 3], ["Economy Guardian", 5], ["Economy Master", 10], ["Economy Fortress", 20], ["Economy Immortal", 30]],
  },
  {
    id: "boundary-guardian", name: "Boundary Guardian", category: "fielding", statKey: "boundarySaves",
    unit: "Boundary Saves", icon: "👀", note: "Authoritative existing fielding data",
    tiers: [["Boundary Watcher", 10], ["Boundary Saver", 25], ["Boundary Guardian", 50], ["Boundary Master", 100], ["Boundary Immortal", 200]],
  },
  {
    id: "batting-royalty", name: "Batting Royalty", category: "awards", statKey: "botmAwards",
    unit: "BOTM Awards", icon: "🔎", note: "Count actual existing BOTM awards",
    tiers: [["Batting Seeker", 10], ["Batting Star", 25], ["Batting Hero", 50], ["Batting King", 100], ["Batting Legend", 150]],
  },
  {
    id: "bowling-royalty", name: "Bowling Royalty", category: "awards", statKey: "bowltmAwards",
    unit: "BOWLTM Awards", icon: "🎳", note: "Count actual existing BOWLTM awards",
    tiers: [["Bowling Seeker", 10], ["Bowling Star", 25], ["Bowling Hero", 50], ["Bowling King", 100], ["Bowling Legend", 150]],
  },
  // NEW v4 HALL OF SHAME (4 topics × 5 levels = 20)
  {
    id: "low-blow", name: "Low Blow", category: "shame", statKey: "lowScores", shame: true,
    unit: "Scores Below 10", icon: "🥴", note: "Scores below 10 runs",
    tiers: [["Rough Start", 3], ["Bad Touch", 7], ["Low Blow", 12], ["Run Drought", 20], ["Batting Breakdown", 30]],
  },
  {
    id: "worst-case", name: "Worst Case", category: "shame", statKey: "worstAwards", shame: true,
    unit: "Worst Player Awards", icon: "😵", note: "Count actual Worst Player awards",
    tiers: [["Off Day", 3], ["Bad Run", 5], ["Rough Patch", 10], ["Downfall", 15], ["Total Meltdown", 25]],
  },
  {
    id: "clean-bowled", name: "Clean Bowled", category: "shame", statKey: "bowledDismissals", shame: true,
    unit: "Bowled Dismissals", icon: "🥊", note: "Count actual bowled dismissals",
    tiers: [["Beaten", 5], ["Broken Stumps", 10], ["Cleaned Up", 20], ["Stump Storm", 35], ["Bowled Out", 50]],
  },
  {
    id: "wayward", name: "Wayward", category: "shame", statKey: "extrasGiven", shame: true,
    unit: "Extras Given", icon: "💨", note: "Extras attributable to the bowler",
    tiers: [["Loose Delivery", 25], ["Wayward Spell", 50], ["Costly Bowler", 100], ["Run Leak", 175], ["Extraordinary Disaster", 250]],
  },
];

export interface AchievementGroup extends Omit<GroupSpec, "tiers"> {
  tiers: AchievementDef[];
}

export const ACHIEVEMENT_GROUPS: AchievementGroup[] = GROUP_SPECS.map((g) => ({
  ...g,
  shame: !!g.shame,
  tiers: g.tiers.map(([name, requirement], i) => {
    const rarity = RARITY_ORDER[i];
    const base = RARITIES[rarity].points;
    const def: AchievementDef = {
      id: `${g.id}-t${i + 1}`,
      groupId: g.id,
      groupName: g.name,
      name,
      category: g.category,
      rarity,
      tier: i + 1,
      requirement,
      points: g.shame ? -base : base,
      statKey: g.statKey,
      unit: g.unit,
      icon: g.icon,
      description: g.shame
        ? `Reached ${requirement} ${g.unit}`
        : `Reach ${requirement} ${g.unit}`,
      legacy: rarity === "legacy",
      shame: !!g.shame,
    };
    return def;
  }),
}));

export const ACHIEVEMENTS: AchievementDef[] = ACHIEVEMENT_GROUPS.flatMap((g) => g.tiers);
const BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
export const achievementById = (id: string) => BY_ID.get(id);
export const groupById = (id: string) => ACHIEVEMENT_GROUPS.find((g) => g.id === id);

/* ══════════════════════════════════════════════════════════════════════
   STATISTICS
   ══════════════════════════════════════════════════════════════════════ */

export type AchStats = Record<StatKey, number>;

export const ALL_STAT_KEYS: StatKey[] = [
  "runs", "hundreds", "fifties", "matchSR", "wickets", "fours",
  "catches", "oneBounceCatches", "pom", "fighter", "fielder", "streak30",
  "ducks", "goldenDucks", "sixOuts", "hitWickets", "caughtOuts",
  "expensiveMatches", "catchDrops",
  // New v4 achievement stats
  "duckDodgeStreak", "matchAppearances", "chasingNotOuts", "economyGuardianStreak",
  "boundarySaves", "botmAwards", "bowltmAwards", "lowScores", "worstAwards",
  "bowledDismissals", "extrasGiven",
];

export const zeroAchProgress = (): AchStats =>
  Object.fromEntries(ALL_STAT_KEYS.map((k) => [k, 0])) as AchStats;

/**
 * v3.3.4 — Achievement progress is a SEPARATE system from career statistics.
 * Every counter starts at ZERO when the achievement system is installed and
 * only grows from matches played after that point.
 */
export function careerAchStats(p: Player): AchStats {
  const src = p.achProgress ?? {};
  const out = zeroAchProgress();
  for (const k of ALL_STAT_KEYS) out[k] = src[k] ?? 0;
  return out;
}

/** Achievement progress counters gained from one completed match. */
export function addAchProgress(p: Player, delta: Partial<AchStats>): Player {
  const base = careerAchStats(p);
  for (const [k, v] of Object.entries(delta)) {
    const key = k as StatKey;
    if (key === "matchSR" || key === "streak30") base[key] = Math.max(base[key], v ?? 0);
    else base[key] = base[key] + (v ?? 0);
  }
  return { ...p, achProgress: base };
}

/** Career stats + everything the player has done in the in-progress match. */
export function liveAchStats(p: Player, match?: Match): AchStats {
  const s = careerAchStats(p);
  if (!match) return s;
  let bestSR = s.matchSR;
  let liveThirty = false;
  for (const inn of match.innings) {
    for (const b of inn.batters) {
      if (b.playerId !== p.id) continue;
      s.runs += b.runs;
      s.fours += b.fours;
      if (b.runs >= 100) s.hundreds += 1;
      else if (b.runs >= 50) s.fifties += 1;
      if (b.runs >= 30) liveThirty = true;
      if (b.balls >= 20) bestSR = Math.max(bestSR, (b.runs / b.balls) * 100);
    }
    for (const bw of inn.bowlers) {
      if (bw.playerId !== p.id) continue;
      s.wickets += bw.wickets;
    }
    for (const ev of inn.events) {
      if (!ev.isWicket || ev.catcherId !== p.id) continue;
      if (ev.dismissalType === "caught") s.catches += 1;
      if (ev.dismissalType === "caught-one-bounce") s.oneBounceCatches += 1;
    }
  }
  s.matchSR = bestSR;
  s.streak30 = Math.max(s.streak30, (p.career.streak30Current ?? 0) + (liveThirty ? 1 : 0));
  return s;
}

/* ══════════════════════════════════════════════════════════════════════
   PROGRESS + UNLOCK EVALUATION
   ══════════════════════════════════════════════════════════════════════ */

export const unlockedIds = (p: Player) => new Set((p.achievements ?? []).map((u) => u.achId));

export function isLegacyTaken(achId: string, players: Player[], exceptPlayerId?: string): boolean {
  return players.some(
    (p) => p.id !== exceptPlayerId && (p.achievements ?? []).some((u) => u.achId === achId),
  );
}

export interface AchProgress {
  def: AchievementDef;
  value: number;
  requirement: number;
  pct: number;
  unlocked: boolean;
  unlock?: AchUnlock;
  legacyLockedOut: boolean;
}

export function groupProgress(
  group: AchievementGroup,
  stats: AchStats,
  player: Player,
  players: Player[],
): { highest?: AchProgress; next?: AchProgress; all: AchProgress[] } {
  const unlocked = unlockedIds(player);
  const byAch = new Map((player.achievements ?? []).map((u) => [u.achId, u]));
  const all = group.tiers.map<AchProgress>((def) => {
    const value = stats[def.statKey] ?? 0;
    return {
      def,
      value,
      requirement: def.requirement,
      pct: Math.max(0, Math.min(1, value / def.requirement)),
      unlocked: unlocked.has(def.id),
      unlock: byAch.get(def.id),
      legacyLockedOut: def.legacy && !unlocked.has(def.id) && isLegacyTaken(def.id, players, player.id),
    };
  });
  const highest = [...all].reverse().find((a) => a.unlocked);
  const next = all.find((a) => !a.unlocked && !a.legacyLockedOut);
  return { highest, next, all };
}

export interface UnlockContext {
  matchId?: string;
  matchLabel?: string;
  opponent?: string;
  ts?: number;
}

/**
 * Evaluate achievements for one player and return the unlock records that
 * should be added. Only groups whose statKey is inside `only` are scanned
 * (engine optimisation §26) — pass undefined to scan everything.
 */
export function evaluateAchievements(
  player: Player,
  stats: AchStats,
  players: Player[],
  ctx: UnlockContext = {},
  only?: StatKey[],
): AchUnlock[] {
  const have = unlockedIds(player);
  const ts = ctx.ts ?? Date.now();
  const out: AchUnlock[] = [];
  for (const group of ACHIEVEMENT_GROUPS) {
    if (only && !only.includes(group.statKey)) continue;
    const value = stats[group.statKey] ?? 0;
    for (const def of group.tiers) {
      if (have.has(def.id)) continue;
      if (value < def.requirement) continue;
      if (def.legacy && isLegacyTaken(def.id, players, player.id)) continue;
      out.push({
        id: `${player.id}-${def.id}-${ts}`,
        achId: def.id,
        playerId: player.id,
        ts,
        matchId: ctx.matchId,
        matchLabel: ctx.matchLabel,
        opponent: ctx.opponent,
        points: def.points,
        reason: `Reached ${def.requirement.toLocaleString()} ${def.unit}`,
      });
      have.add(def.id);
    }
  }
  // Lower tiers first so the queue plays in ascending order.
  out.sort((a, b) => (achievementById(a.achId)?.tier ?? 0) - (achievementById(b.achId)?.tier ?? 0));
  return out;
}

/** Apply unlocks to a player: permanent history + Achievement Points. */
export function applyUnlocks(player: Player, unlocks: AchUnlock[]): Player {
  if (unlocks.length === 0) return player;
  const gained = unlocks.reduce((s, u) => s + u.points, 0);
  return {
    ...player,
    achievements: [...(player.achievements ?? []), ...unlocks],
    achPoints: (player.achPoints ?? 0) + gained,
  };
}

/**
 * v3.3.4 — The Achievement System officially begins now. Every achievement
 * progress counter starts at ZERO, nothing is unlocked from historic career
 * statistics, and every ACH bucket starts at 0. Career statistics are left
 * completely untouched.
 */
export function resetAchievementBaseline(players: Player[]): Player[] {
  return players.map((p) => ({
    ...p,
    achProgress: zeroAchProgress(),
    achievements: [],
    achPoints: 0,
    achBaselineV334: true,
  }));
}

/** Commentary line matched to the rarity of the unlock. */
export function achievementCommentary(name: string, achId: string, isFirstInHistory: boolean): string {
  const def = achievementById(achId);
  if (!def) return `${name} unlocks an achievement!`;
  if (def.shame) return `👹 Hall Of Shame! ${name} unlocks ${def.name}. ${def.points} ACH.`;
  if (def.legacy) {
    return isFirstInHistory
      ? `🌌 History created! ${name} becomes the first player in PTS history to earn ${def.name}!`
      : `🌌 ${name} unlocks ${def.name}!`;
  }
  if (def.rarity === "legendary") return `👑 ${name} unlocks ${def.name}!`;
  if (def.rarity === "epic") return `⚔ ${name} has become the ${def.name}!`;
  if (def.rarity === "rare") return `💎 ${name} unlocks ${def.name}!`;
  return `🧢 ${name} unlocks ${def.name}!`;
}
