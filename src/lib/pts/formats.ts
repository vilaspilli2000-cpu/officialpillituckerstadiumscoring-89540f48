import type { FormatId, Innings, Match, Team } from "./types";

export const FORMAT_LABELS: Record<FormatId, string> = {
  A: "Format A — 6 Overs",
  B: "Format B — 2 Innings (Unlimited)",
  C: "Format C — Classic Test (4 Innings)",
};

export function totalInningsFor(format: FormatId) {
  return format === "A" ? 2 : format === "B" ? 2 : 4;
}

export function oversCapFor(format: FormatId) {
  return format === "A" ? 36 : undefined; // 6 overs = 36 legal balls
}

export function newInnings(
  batting: "A" | "B",
  bowling: "A" | "B",
  lineup: string[],
  format: FormatId,
  /** Format C requires manual opening batter selection every innings. */
  autoOpen = true,
): Innings {
  return {
    battingTeam: batting,
    bowlingTeam: bowling,
    runs: 0,
    wickets: 0,
    legalBalls: 0,
    oversCap: oversCapFor(format),
    batters: [],
    bowlers: [],
    lineup,
    nextBatterIndex: 1,
    currentBatterId: autoOpen ? lineup[0] : undefined,
    events: [],
    closed: false,
  };
}

/** Aggregate runs scored by each side across every innings so far. */
export function teamAggregates(match: Match) {
  const A = match.innings.filter((i) => i.battingTeam === "A").reduce((s, i) => s + i.runs, 0);
  const B = match.innings.filter((i) => i.battingTeam === "B").reduce((s, i) => s + i.runs, 0);
  return { A, B };
}

function teamNameOf(match: Match, side: "A" | "B") {
  return side === "A" ? match.teamA.name : match.teamB.name;
}

/** Detect & describe the result. Returns undefined while still live. */
export function detectResult(match: Match):
  | { winner: "A" | "B" | "tie" | "draw"; summary: string }
  | undefined {
  const inns = match.innings;
  const last = inns[inns.length - 1];
  const allClosed = inns.length === totalInningsFor(match.format) && inns.every((i) => i.closed);

  // Format A: chasing innings
  if (match.format === "A") {
    if (inns.length < 2) return undefined;
    const first = inns[0];
    const second = inns[1];
    if (!second.closed) return undefined;
    const teamA = first.battingTeam === "A" ? first.runs : second.runs;
    const teamB = first.battingTeam === "B" ? first.runs : second.runs;
    if (teamA === teamB) return { winner: "tie", summary: "Match tied" };
    if (second.closeReason === "target") {
      const wktsLeft =
        (second.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length - second.wickets;
      const team = second.battingTeam === "A" ? match.teamA.name : match.teamB.name;
      return { winner: second.battingTeam, summary: `${team} won by ${wktsLeft} wickets` };
    }
    const diff = Math.abs(teamA - teamB);
    const winnerSide: "A" | "B" = teamA > teamB ? "A" : "B";
    const team = winnerSide === "A" ? match.teamA.name : match.teamB.name;
    return { winner: winnerSide, summary: `${team} won by ${diff} runs` };
  }

  // Format B: two innings unlimited
  if (match.format === "B") {
    if (inns.length < 2 || !inns[1].closed) return undefined;
    const teamA = inns.find((i) => i.battingTeam === "A")!.runs;
    const teamB = inns.find((i) => i.battingTeam === "B")!.runs;
    if (teamA === teamB) return { winner: "tie", summary: "Match tied" };
    if (inns[1].closeReason === "target") {
      const wktsLeft =
        (inns[1].battingTeam === "A" ? match.teamA : match.teamB).playerIds.length - inns[1].wickets;
      const team = inns[1].battingTeam === "A" ? match.teamA.name : match.teamB.name;
      return { winner: inns[1].battingTeam, summary: `${team} won by ${wktsLeft} wickets` };
    }
    const diff = Math.abs(teamA - teamB);
    const winnerSide: "A" | "B" = teamA > teamB ? "A" : "B";
    const team = winnerSide === "A" ? match.teamA.name : match.teamB.name;
    return { winner: winnerSide, summary: `${team} won by ${diff} runs` };
  }

  // Format C: classic Test — 4 innings, declarations, follow-on, innings victory.
  if (match.format === "C") {
    const agg = teamAggregates(match);

    // After the 3rd innings: the side that has batted twice may still trail,
    // which ends the match immediately as an innings victory.
    if (inns.length === 3) {
      const third = inns[2];
      if (!third.closed) return undefined;
      const twice = third.battingTeam;
      const other: "A" | "B" = twice === "A" ? "B" : "A";
      const twiceRuns = twice === "A" ? agg.A : agg.B;
      const otherRuns = other === "A" ? agg.A : agg.B;
      if (twiceRuns < otherRuns) {
        return {
          winner: other,
          summary: `${teamNameOf(match, other)} won by an innings and ${otherRuns - twiceRuns} runs`,
        };
      }
      return undefined; // 4th innings to come
    }

    if (inns.length < 4 || !last.closed) return undefined;

    // 4th innings chase completed successfully.
    if (last.closeReason === "target") {
      const team = teamNameOf(match, last.battingTeam);
      const wktsLeft =
        (last.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length - last.wickets;
      return { winner: last.battingTeam, summary: `${team} won by ${wktsLeft} wickets` };
    }
    // Chasing side declared without reaching the target → drawn match.
    if (last.declared || last.closeReason === "declared") {
      return { winner: "draw", summary: "Match drawn" };
    }
    if (agg.A === agg.B) return { winner: "tie", summary: "Match tied" };
    const winnerSide: "A" | "B" = agg.A > agg.B ? "A" : "B";
    const diff = Math.abs(agg.A - agg.B);
    return { winner: winnerSide, summary: `${teamNameOf(match, winnerSide)} won by ${diff} runs` };
  }
  return undefined;
}

/** When the prior innings closes, set up the next innings (target, follow-on, etc.). */
export function advanceInnings(
  match: Match,
  teams: { A: Team; B: Team },
  followOnMargin: number,
): Match {
  const m: Match = structuredClone(match);
  const idx = m.currentInnings;
  const prev = m.innings[idx];
  if (!prev || !prev.closed) return m;

  if (m.format === "A") {
    if (idx === 0) {
      m.target = prev.runs + 1;
      const battingSide = prev.bowlingTeam;
      const bowlingSide = prev.battingTeam;
      const team = battingSide === "A" ? teams.A : teams.B;
      m.innings.push(newInnings(battingSide, bowlingSide, [...team.playerIds], m.format));
      m.currentInnings = 1;
    }
    return m;
  }

  if (m.format === "B") {
    if (idx === 0) {
      m.target = prev.runs + 1;
      const battingSide = prev.bowlingTeam;
      const bowlingSide = prev.battingTeam;
      const team = battingSide === "A" ? teams.A : teams.B;
      m.innings.push(newInnings(battingSide, bowlingSide, [...team.playerIds], m.format));
      m.currentInnings = 1;
    }
    return m;
  }

  // Format C — classic Test with declarations, follow-on and innings victories.
  if (m.format === "C") {
    const open = (batting: "A" | "B", followOn = false) => {
      const bowling: "A" | "B" = batting === "A" ? "B" : "A";
      const team = batting === "A" ? teams.A : teams.B;
      // Manual opening batter AND bowler selection every innings.
      const next = newInnings(batting, bowling, [...team.playerIds], m.format, false);
      next.currentBowlerId = undefined;
      if (followOn) next.followOnApplied = true;
      m.innings.push(next);
      m.currentInnings = m.innings.length - 1;
    };

    if (idx === 0) {
      // 2nd innings: the other side bats.
      open(prev.bowlingTeam);
    } else if (idx === 1) {
      const firstSide = m.innings[0].battingTeam;
      const secondSide = m.innings[1].battingTeam;
      const lead = m.innings[0].runs - m.innings[1].runs;
      if (lead >= followOnMargin) {
        // Follow-on enforced: the trailing side bats again immediately.
        open(secondSide, true);
      } else {
        open(firstSide);
      }
    } else if (idx === 2) {
      const agg = teamAggregates(m);
      const twice = m.innings[2].battingTeam; // side that has now batted twice
      const other: "A" | "B" = twice === "A" ? "B" : "A";
      const twiceRuns = twice === "A" ? agg.A : agg.B;
      const otherRuns = other === "A" ? agg.A : agg.B;
      if (twiceRuns < otherRuns) {
        // Innings victory — no 4th innings is played.
        return m;
      }
      // 4th innings: `other` chases what is left.
      m.target = twiceRuns - otherRuns + 1;
      open(other);
    }
    return m;
  }
  return m;
}

export function chaseStatus(match: Match): string {
  const innings = match.innings[match.currentInnings];
  if (!innings || !match.target) return "";
  const need = match.target - innings.runs;
  if (need <= 0) return "Target reached";
  if (match.format === "A" && innings.oversCap) {
    const ballsLeft = innings.oversCap - innings.legalBalls;
    return `Need ${need} runs in ${ballsLeft} balls`;
  }
  return `Need ${need} runs to win`;
}

export function leadTrailStatus(match: Match): string {
  if (match.format !== "C") return "";
  const teamARuns = match.innings.filter((i) => i.battingTeam === "A").reduce((s, i) => s + i.runs, 0);
  const teamBRuns = match.innings.filter((i) => i.battingTeam === "B").reduce((s, i) => s + i.runs, 0);
  const innings = match.innings[match.currentInnings];
  if (!innings) return "";
  const ownRuns = innings.battingTeam === "A" ? teamARuns : teamBRuns;
  const oppRuns = innings.battingTeam === "A" ? teamBRuns : teamARuns;
  const diff = ownRuns - oppRuns;
  const teamName = innings.battingTeam === "A" ? match.teamA.name : match.teamB.name;
  if (diff > 0) return `${teamName} lead by ${diff} runs`;
  if (diff < 0) return `${teamName} trail by ${-diff} runs`;
  return `Scores level`;
}