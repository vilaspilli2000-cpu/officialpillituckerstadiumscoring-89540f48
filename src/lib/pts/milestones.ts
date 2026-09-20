import type { Match, Player } from "./types";

/** Fixed milestone intervals (see product spec). */
export const MILESTONE_STEPS = {
  runs: 500,
  fours: 100,
  sixes: 50,
  wickets: 50,
  catches: 25,
  runOuts: 10,
  awards: 10,
  pomAwards: 10,
  batsmanAwards: 10,
  bowlerAwards: 10,
  fielderAwards: 10,
  fighterAwards: 10,
  worstAwards: 10,
} as const;

export type MilestoneKey = keyof typeof MILESTONE_STEPS;

export interface MilestoneCard {
  key: MilestoneKey;
  label: string;
  icon: string;
  current: number;
  target: number;
  gap: number;
  progress: number; // 0..1
  unit: string;
  unitPlural: string;
}

const META: Record<
  MilestoneKey,
  { label: string; icon: string; unit: string; unitPlural: string }
> = {
  runs: { label: "Career Runs", icon: "🏏", unit: "run", unitPlural: "runs" },
  fours: { label: "Career Fours", icon: "🎯", unit: "four", unitPlural: "fours" },
  sixes: { label: "Career Sixes", icon: "⚡", unit: "six", unitPlural: "sixes" },
  wickets: { label: "Career Wickets", icon: "🎳", unit: "wicket", unitPlural: "wickets" },
  catches: { label: "Career Catches", icon: "🧤", unit: "catch", unitPlural: "catches" },
  runOuts: { label: "Career Run Outs", icon: "🏃", unit: "run out", unitPlural: "run outs" },
  awards: { label: "Total Awards", icon: "🏅", unit: "award", unitPlural: "awards" },
  pomAwards: { label: "Player of the Match", icon: "👑", unit: "POTM", unitPlural: "POTMs" },
  batsmanAwards: { label: "Batsman of the Match", icon: "🏏", unit: "BOTM", unitPlural: "BOTMs" },
  bowlerAwards: { label: "Bowler of the Match", icon: "🎯", unit: "BOWLTM", unitPlural: "BOWLTMs" },
  fielderAwards: { label: "Fielder of the Match", icon: "🧤", unit: "FOTM", unitPlural: "FOTMs" },
  fighterAwards: {
    label: "Fighter of the Match",
    icon: "🔥",
    unit: "Fighter award",
    unitPlural: "Fighter awards",
  },
  worstAwards: {
    label: "Worst Player Awards",
    icon: "🥶",
    unit: "Worst award",
    unitPlural: "Worst awards",
  },
};

/** Returns the next multiple of `step` strictly greater than `current`. */
export function nextMilestoneTarget(current: number, step: number): number {
  if (step <= 0) return current;
  return Math.floor(current / step) * step + step;
}

/** Compute the appropriate career value for a given milestone key. */
export function careerValue(p: Player, key: MilestoneKey): number {
  const c = p.career as unknown as Record<string, number | undefined>;
  return c[key] ?? 0;
}

/** Total awards = sum of per-type + legacy `awards` counter (whichever is greater). */
export function totalAwards(p: Player): number {
  const c = p.career;
  const perType =
    (c.pomAwards ?? 0) +
    (c.batsmanAwards ?? 0) +
    (c.bowlerAwards ?? 0) +
    (c.fielderAwards ?? 0) +
    (c.fighterAwards ?? 0) +
    (c.worstAwards ?? 0);
  return Math.max(perType, c.awards ?? 0);
}

export function milestoneCard(p: Player, key: MilestoneKey): MilestoneCard {
  const step = MILESTONE_STEPS[key];
  const current = key === "awards" ? totalAwards(p) : careerValue(p, key);
  const target = nextMilestoneTarget(current, step);
  const gap = Math.max(0, target - current);
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const m = META[key];
  return {
    key,
    label: m.label,
    icon: m.icon,
    current,
    target,
    gap,
    progress,
    unit: m.unit,
    unitPlural: m.unitPlural,
  };
}

export function allMilestoneCards(p: Player): MilestoneCard[] {
  return (Object.keys(MILESTONE_STEPS) as MilestoneKey[]).map((k) => milestoneCard(p, k));
}

/** ------- Live alerts (called from RecordAlerts on every ball) ------- */

export interface LiveMilestoneAlert {
  id: string;
  icon: string;
  tone: "chase" | "record" | "milestone" | "personal";
  text: string;
}

/** Projected career total (career + live match contribution) for a stat. */
function projectedCareer(p: Player, match: Match | undefined, key: MilestoneKey): number {
  const base = key === "awards" ? totalAwards(p) : careerValue(p, key);
  if (!match) return base;
  let live = 0;
  for (const inn of match.innings) {
    if (key === "runs") {
      const c = inn.batters.find((b) => b.playerId === p.id);
      if (c) live += c.runs;
    } else if (key === "fours") {
      const c = inn.batters.find((b) => b.playerId === p.id);
      if (c) live += c.fours;
    } else if (key === "sixes") {
      const c = inn.batters.find((b) => b.playerId === p.id);
      if (c) live += c.sixes;
    } else if (key === "wickets") {
      const c = inn.bowlers.find((b) => b.playerId === p.id);
      if (c) live += c.wickets;
    } else if (key === "catches") {
      for (const ev of inn.events)
        if (ev.catcherId === p.id && ev.dismissalType !== "run-out") live += 1;
    } else if (key === "runOuts") {
      for (const ev of inn.events)
        if (ev.catcherId === p.id && ev.dismissalType === "run-out") live += 1;
    }
  }
  return base + live;
}

// Record Alerts must never surface six-count or run-out milestones (see
// product rule: run-outs / stumpings / six-counts / best bowling figures do
// NOT appear as Record Alerts). The stats themselves stay tracked; only the
// alert surface is pruned.
const CAREER_KEYS: MilestoneKey[] = ["runs", "fours", "wickets", "catches", "awards"];

/** Batting-innings milestones + career milestones for focus players. */
export function computeLiveMilestoneAlerts(
  match: Match | undefined,
  players: Player[],
  focusIds: string[],
): LiveMilestoneAlert[] {
  if (!match) return [];
  const inn = match.innings[match.currentInnings];
  const out: LiveMilestoneAlert[] = [];
  const focus = new Set(focusIds.filter(Boolean));

  // --- Batting milestone thresholds (only when within the specified range) ---
  const battingMilestones: Array<[number, number]> = [
    [50, 25],
    [100, 30],
    [150, 35],
    [200, 40],
  ];
  if (inn) {
    for (const b of inn.batters) {
      if (!focus.has(b.playerId)) continue;
      const p = players.find((x) => x.id === b.playerId);
      if (!p) continue;
      for (const [mark, within] of battingMilestones) {
        if (b.runs < mark && mark - b.runs <= within) {
          out.push({
            id: `bat-${mark}-${b.playerId}`,
            icon: mark >= 100 ? "💯" : "🎯",
            tone: "milestone",
            text: `${p.name} needs ${mark - b.runs} run${mark - b.runs === 1 ? "" : "s"} to reach ${mark}.`,
          });
          break;
        }
      }
    }
  }

  // --- Career milestones for focus players ---
  for (const focusId of focus) {
    const p = players.find((x) => x.id === focusId);
    if (!p) continue;
    for (const key of CAREER_KEYS) {
      const step = MILESTONE_STEPS[key];
      const proj = projectedCareer(p, match, key);
      const target = nextMilestoneTarget(proj, step);
      const gap = target - proj;
      const window = Math.max(3, Math.round(step * 0.2));
      if (gap > 0 && gap <= window) {
        const meta = META[key];
        out.push({
          id: `career-${key}-${focusId}-${target}`,
          icon: meta.icon,
          tone: "milestone",
          text: `${p.name} needs ${gap} ${gap === 1 ? meta.unit : meta.unitPlural} to reach ${target.toLocaleString()} ${meta.unitPlural}.`,
        });
      } else if (gap === 0 && proj > 0) {
        const meta = META[key];
        out.push({
          id: `career-hit-${key}-${focusId}-${target}`,
          icon: "🎉",
          tone: "record",
          text: `MILESTONE! ${p.name} reaches ${target.toLocaleString()} ${meta.unitPlural}.`,
        });
      }
    }
  }

  // --- Personal-best proximity: highest score + best bowling wickets ---
  if (inn) {
    for (const focusId of focus) {
      const p = players.find((x) => x.id === focusId);
      if (!p) continue;
      const bc = inn.batters.find((b) => b.playerId === focusId);
      if (bc && bc.runs > 0) {
        const best = p.career.highest ?? 0;
        const gap = best - bc.runs;
        if (gap > 0 && gap <= 20) {
          out.push({
            id: `pb-hs-${focusId}`,
            icon: "⭐",
            tone: "personal",
            text: `${p.name} needs ${gap} run${gap === 1 ? "" : "s"} to beat his highest score of ${best}.`,
          });
        }
      }
      // Best bowling figures NEVER surface as a Record Alert (product rule).
    }
  }

  const seen = new Set<string>();
  return out.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}
