import { FORMAT_LABELS } from "./formats";
import type { Match, Player } from "./types";

const name = (id: string | undefined, players: Player[]) =>
  players.find((p) => p.id === id)?.name ?? "Unknown";

export function buildStory(match: Match, players: Player[]): string {
  const parts: string[] = [];
  parts.push(`${FORMAT_LABELS[match.format]} — ${match.teamA.name} vs ${match.teamB.name}.`);

  for (let i = 0; i < match.innings.length; i++) {
    const inn = match.innings[i];
    const battingName = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;
    parts.push(
      `${battingName} scored ${inn.runs}/${inn.wickets} in ${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6} overs.`,
    );
    const top = [...inn.batters].sort((a, b) => b.runs - a.runs)[0];
    if (top && top.runs > 0)
      parts.push(`${name(top.playerId, players)} top-scored with ${top.runs} (${top.balls}).`);
    const topBowl = [...inn.bowlers].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs)[0];
    if (topBowl && topBowl.wickets > 0)
      parts.push(`${name(topBowl.playerId, players)} took ${topBowl.wickets}/${topBowl.runs}.`);
  }

  if (match.result) parts.push(match.result.summary + ".");
  if (match.awards?.length) {
    const pom = match.awards.find((a) => a.type === "pom");
    if (pom) parts.push(`Player of the Match: ${pom.headline}.`);
  }
  return parts.join(" ");
}