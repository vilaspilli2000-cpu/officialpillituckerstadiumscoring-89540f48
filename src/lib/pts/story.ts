import { FORMAT_LABELS } from "./formats";
import type { Innings, Match, Player } from "./types";
import { overBuckets, partnerships } from "./analytics";

const nameOf = (id: string | undefined, players: Player[]) =>
  players.find((p) => p.id === id)?.name ?? "Unknown";

const pick = <T,>(arr: T[], seed: number) => arr[Math.abs(seed) % arr.length];

function detectFastStart(inn: Innings): string | null {
  const buckets = overBuckets(inn);
  if (buckets.length === 0) return null;
  const first3 = buckets.slice(0, 3);
  const runs = first3.reduce((s, b) => s + b.runs, 0);
  const balls = first3.reduce((s, b) => s + b.legalBalls, 0);
  if (balls >= 12 && (runs / balls) * 6 >= 10) return `blazing start (${runs} in ${first3.length} ov)`;
  if (balls >= 12 && (runs / balls) * 6 <= 4) return `cagey start (${runs} in ${first3.length} ov)`;
  return null;
}

function detectCollapse(inn: Innings): { runs: number; wkts: number; overs: number } | null {
  // any window of 3 overs with >=3 wickets and <15 runs
  const buckets = overBuckets(inn);
  for (let i = 0; i <= buckets.length - 3; i++) {
    const slice = buckets.slice(i, i + 3);
    const wkts = slice.reduce((s, b) => s + b.wickets, 0);
    const runs = slice.reduce((s, b) => s + b.runs, 0);
    if (wkts >= 3 && runs < 20) return { runs, wkts, overs: 3 };
  }
  return null;
}

function detectRecovery(inn: Innings): { runs: number; balls: number } | null {
  // Any partnership >=40 that came at wicket >=4
  const best = partnerships(inn).filter((p) => p.wicket >= 4).sort((a, b) => b.runs - a.runs)[0];
  if (best && best.runs >= 40) return { runs: best.runs, balls: best.balls };
  return null;
}

function bestSpell(inn: Innings) {
  return [...inn.bowlers].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
}

function deathOverStory(inn: Innings): string | null {
  const buckets = overBuckets(inn);
  if (!inn.oversCap) return null;
  const totalOvers = Math.ceil(inn.oversCap / 6);
  const last3 = buckets.filter((b) => b.overNumber >= totalOvers - 3);
  if (last3.length === 0) return null;
  const runs = last3.reduce((s, b) => s + b.runs, 0);
  const wkts = last3.reduce((s, b) => s + b.wickets, 0);
  if (runs >= 40) return `${runs} runs erupted in the death overs`;
  if (wkts >= 3) return `death overs squeezed — ${wkts} late wickets`;
  return null;
}

export function buildStory(match: Match, players: Player[]): string {
  const sections: string[] = [];
  const seed = match.createdAt || Date.now();
  const openers = [
    "A story of shifting momentum.",
    "This one had everything.",
    "One for the memory bank.",
    "The kind of contest people talk about the next day.",
    "A match that lived on the fine line.",
  ];
  sections.push(`${FORMAT_LABELS[match.format]} — ${match.teamA.name} vs ${match.teamB.name}. ${pick(openers, seed)}`);

  match.innings.forEach((inn, i) => {
    const battingName = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;
    const overs = `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`;
    const line = `${battingName} posted ${inn.runs}/${inn.wickets} in ${overs} overs.`;

    const fast = detectFastStart(inn);
    const collapse = detectCollapse(inn);
    const recovery = detectRecovery(inn);
    const death = deathOverStory(inn);

    const top = [...inn.batters].sort((a, b) => b.runs - a.runs)[0];
    const bw = bestSpell(inn);

    const bits: string[] = [line];
    if (fast) bits.push(`They opened with a ${fast}.`);
    if (collapse) bits.push(`Then came a collapse — ${collapse.wkts} wickets for ${collapse.runs} in ${collapse.overs} overs.`);
    if (recovery) bits.push(`${nameOf(top?.playerId, players)}'s crew rebuilt with a ${recovery.runs}-run stand (${recovery.balls}).`);
    if (top && top.runs >= 20) {
      const sr = top.balls ? ((top.runs / top.balls) * 100).toFixed(0) : "-";
      bits.push(`${nameOf(top.playerId, players)} top-scored with ${top.runs}${top.out ? "" : "*"} off ${top.balls} (SR ${sr}).`);
    }
    if (bw && bw.wickets > 0) {
      bits.push(`${nameOf(bw.playerId, players)} led the attack with ${bw.wickets}/${bw.runs}.`);
    }
    if (death) bits.push(`${death}.`);

    // Chase-specific
    if (i > 0 && match.target) {
      const need = match.target - inn.runs;
      if (need <= 0) bits.push(`Target of ${match.target} was hunted down.`);
      else if (inn.closed) bits.push(`They fell ${need} short of ${match.target}.`);
    }

    sections.push(bits.join(" "));
  });

  // Turning point via probability swing
  if (match.probability.length > 2) {
    let bestSwing = 0, bestIdx = -1;
    for (let j = 1; j < match.probability.length; j++) {
      const s = Math.abs(match.probability[j].teamA - match.probability[j - 1].teamA);
      if (s > bestSwing) { bestSwing = s; bestIdx = j; }
    }
    if (bestIdx > 0 && bestSwing >= 8) {
      sections.push(`Turning point: a ${bestSwing.toFixed(0)}% probability swing — ${match.probability[bestIdx].note}.`);
    }
  }

  // Final over drama
  const lastInn = match.innings[match.innings.length - 1];
  if (lastInn && lastInn.oversCap && lastInn.legalBalls >= lastInn.oversCap - 6) {
    const last6 = lastInn.events.slice(-6);
    const r = last6.reduce((s, e) => s + e.runsToBatter + e.runsExtras, 0);
    const w = last6.filter((e) => e.isWicket).length;
    sections.push(`Final over: ${r} run${r === 1 ? "" : "s"}${w ? `, ${w} wkt${w === 1 ? "" : "s"}` : ""}.`);
  }

  if (match.result) sections.push(match.result.summary + ".");
  const pom = match.awards?.find((a) => a.type === "pom");
  if (pom) {
    const closers = [
      `Player of the Match: ${pom.headline}.`,
      `The night belonged to ${pom.headline}.`,
      `Standing tallest: ${pom.headline}.`,
    ];
    sections.push(pick(closers, seed + match.innings.length));
  }

  return sections.join(" ");
}