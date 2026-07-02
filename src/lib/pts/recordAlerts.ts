import type { Match, Player } from "./types";

export interface RecordAlert {
  id: string;
  icon: string;
  text: string;
  tone: "chase" | "record" | "milestone" | "personal";
}

type StatKey =
  | "runs" | "highest" | "fifties" | "hundreds" | "hundred50s" | "doubleHundreds"
  | "fours" | "sixes"
  | "wickets" | "bestBowlingWkts" | "dots" | "maidens"
  | "catches" | "runOuts"
  | "awards";

interface StatDef {
  key: StatKey;
  label: string;
  icon: string;
  higherIsBetter: true;
  singularUnit: string; // e.g. "run", "wicket"
}

const STATS: StatDef[] = [
  { key: "runs", label: "highest run scorer", icon: "🏆", higherIsBetter: true, singularUnit: "run" },
  { key: "highest", label: "highest individual score", icon: "🌟", higherIsBetter: true, singularUnit: "run" },
  { key: "fifties", label: "most 50s", icon: "5️⃣", higherIsBetter: true, singularUnit: "fifty" },
  { key: "hundreds", label: "most 100s", icon: "💯", higherIsBetter: true, singularUnit: "century" },
  { key: "hundred50s", label: "most 150s", icon: "🎯", higherIsBetter: true, singularUnit: "150" },
  { key: "doubleHundreds", label: "most double centuries", icon: "👑", higherIsBetter: true, singularUnit: "double" },
  { key: "fours", label: "most fours", icon: "🎯", higherIsBetter: true, singularUnit: "four" },
  { key: "sixes", label: "most sixes", icon: "⚡", higherIsBetter: true, singularUnit: "six" },
  { key: "wickets", label: "leading wicket-taker", icon: "🔥", higherIsBetter: true, singularUnit: "wicket" },
  { key: "bestBowlingWkts", label: "best bowling figures", icon: "🎳", higherIsBetter: true, singularUnit: "wicket" },
  { key: "dots", label: "most dot balls", icon: "🧱", higherIsBetter: true, singularUnit: "dot" },
  { key: "maidens", label: "most maidens", icon: "🛡️", higherIsBetter: true, singularUnit: "maiden" },
  { key: "catches", label: "catching record", icon: "🧤", higherIsBetter: true, singularUnit: "catch" },
  { key: "runOuts", label: "most run outs", icon: "🎯", higherIsBetter: true, singularUnit: "run out" },
  { key: "awards", label: "most match awards", icon: "🏅", higherIsBetter: true, singularUnit: "award" },
];

function pluralUnit(n: number, unit: string) {
  if (n === 1) return unit;
  if (unit === "century") return "centuries";
  if (unit === "fifty") return "fifties";
  if (unit === "run out") return "run outs";
  return unit + "s";
}

/** Compute live-projected career total for a player + a specific stat,
 *  factoring in what they've added in the current match's innings so far. */
function projected(player: Player, match: Match | undefined, key: StatKey): number {
  const base = (player.career as unknown as Record<StatKey, number | undefined>)[key] ?? 0;
  if (!match) return base;
  let live = 0;
  let liveMax = 0;
  for (const inn of match.innings) {
    switch (key) {
      case "runs": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c) live += c.runs;
        break;
      }
      case "highest": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c) liveMax = Math.max(liveMax, c.runs);
        break;
      }
      case "fifties": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c && c.runs >= 50 && c.runs < 100) live += 1;
        break;
      }
      case "hundreds": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c && c.runs >= 100 && c.runs < 150) live += 1;
        break;
      }
      case "hundred50s": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c && c.runs >= 150 && c.runs < 200) live += 1;
        break;
      }
      case "doubleHundreds": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c && c.runs >= 200) live += 1;
        break;
      }
      case "fours": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c) live += c.fours;
        break;
      }
      case "sixes": {
        const c = inn.batters.find((b) => b.playerId === player.id);
        if (c) live += c.sixes;
        break;
      }
      case "wickets": {
        const c = inn.bowlers.find((b) => b.playerId === player.id);
        if (c) live += c.wickets;
        break;
      }
      case "bestBowlingWkts": {
        const c = inn.bowlers.find((b) => b.playerId === player.id);
        if (c) liveMax = Math.max(liveMax, c.wickets);
        break;
      }
      case "dots": {
        const c = inn.bowlers.find((b) => b.playerId === player.id);
        if (c) live += c.dots;
        break;
      }
      case "catches": {
        for (const ev of inn.events) if (ev.catcherId === player.id) live += 1;
        break;
      }
      default: break;
    }
  }
  if (key === "highest" || key === "bestBowlingWkts") return Math.max(base, liveMax);
  return base + live;
}

/** All alerts relevant right now given the live match state. */
export function computeRecordAlerts(
  match: Match | undefined,
  players: Player[],
  focusIds: string[],
): RecordAlert[] {
  if (players.length === 0) return [];
  const alerts: RecordAlert[] = [];
  const focus = new Set(focusIds.filter(Boolean));

  for (const stat of STATS) {
    // Rank all players by projected value for this stat.
    const ranked = players
      .map((p) => ({ p, val: projected(p, match, stat.key) }))
      .filter((r) => r.val > 0 || stat.key === "runs")
      .sort((a, b) => b.val - a.val);
    if (ranked.length === 0) continue;
    const top = ranked[0];
    const second = ranked[1];

    // 1) NEW RECORD — someone in focus just overtook the previous holder.
    for (const focusId of focus) {
      const me = ranked.find((r) => r.p.id === focusId);
      if (!me) continue;
      const careerVal = (me.p.career as unknown as Record<StatKey, number | undefined>)[stat.key] ?? 0;
      // Only fire if projected value beat the previous holder AND career value was behind.
      const prevHolder = players
        .map((p) => ({ p, val: (p.career as unknown as Record<StatKey, number | undefined>)[stat.key] ?? 0 }))
        .filter((r) => r.p.id !== focusId)
        .sort((a, b) => b.val - a.val)[0];
      if (prevHolder && me.val > prevHolder.val && careerVal <= prevHolder.val && me.val > 0) {
        alerts.push({
          id: `new-${stat.key}-${focusId}`,
          icon: "👑",
          tone: "record",
          text: `NEW RECORD! ${me.p.name} becomes PTS' ${stat.label} with ${me.val} ${pluralUnit(me.val, stat.singularUnit)}.`,
        });
      }
    }

    // 2) CHASE — someone in focus close to overtaking the leader.
    for (const focusId of focus) {
      if (focusId === top.p.id) continue;
      const me = ranked.find((r) => r.p.id === focusId);
      if (!me) continue;
      const gap = top.val - me.val;
      if (gap <= 0) continue;
      const threshold = Math.max(5, Math.round(top.val * 0.05));
      if (gap <= threshold) {
        alerts.push({
          id: `chase-${stat.key}-${focusId}`,
          icon: stat.icon,
          tone: "chase",
          text: `${me.p.name} needs ${gap} ${pluralUnit(gap, stat.singularUnit)} to become PTS' ${stat.label}.`,
        });
      }
    }

    // 3) TOP CHASER — always surface how close the #2 is (rotating context).
    if (top && second && top.val > second.val) {
      const gap = top.val - second.val;
      const threshold = Math.max(3, Math.round(top.val * 0.03));
      if (gap <= threshold && !focus.has(second.p.id)) {
        alerts.push({
          id: `close-${stat.key}`,
          icon: stat.icon,
          tone: "chase",
          text: `${second.p.name} is ${gap} ${pluralUnit(gap, stat.singularUnit)} away from ${top.p.name}'s ${stat.label} record.`,
        });
      }
    }
  }

  // 4) PERSONAL BEST — striker approaching career-best score.
  if (match) {
    const inn = match.innings[match.currentInnings];
    if (inn) {
      for (const focusId of focus) {
        const p = players.find((x) => x.id === focusId);
        const bc = inn.batters.find((b) => b.playerId === focusId);
        if (!p || !bc || bc.runs <= 0) continue;
        const best = p.career.highest ?? 0;
        const gap = best - bc.runs;
        if (gap > 0 && gap <= 15) {
          alerts.push({
            id: `pb-${focusId}`,
            icon: "⭐",
            tone: "personal",
            text: `${p.name} is ${gap} run${gap === 1 ? "" : "s"} away from his career-best score (${best}).`,
          });
        } else if (best > 0 && bc.runs > best) {
          alerts.push({
            id: `pb-new-${focusId}`,
            icon: "🔥",
            tone: "record",
            text: `NEW CAREER BEST! ${p.name} passes his previous highest of ${best}.`,
          });
        }
      }
    }
  }

  // Deduplicate by id.
  const seen = new Set<string>();
  return alerts.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
}