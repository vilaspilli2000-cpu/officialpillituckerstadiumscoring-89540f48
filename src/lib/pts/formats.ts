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
    currentBatterId: lineup[0],
    events: [],
    closed: false,
  };
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

  // Format C: test, 4 innings, with follow-on possible (collapses to 3 innings then)
  if (match.format === "C") {
    if (!allClosed && inns.length < 3) return undefined;
    const teamARuns = inns.filter((i) => i.battingTeam === "A").reduce((s, i) => s + i.runs, 0);
    const teamBRuns = inns.filter((i) => i.battingTeam === "B").reduce((s, i) => s + i.runs, 0);
    // innings victory check after 3 innings if follow-on enforced
    if (inns.length === 3 && inns[2].closed && inns[2].followOnApplied) {
      // Team B has now batted twice; compare
      if (teamARuns > teamBRuns) {
        return {
          winner: "A",
          summary: `${match.teamA.name} won by an innings and ${teamARuns - teamBRuns} runs`,
        };
      }
    }
    if (!allClosed) return undefined;
    if (last.closeReason === "target") {
      const team = last.battingTeam === "A" ? match.teamA.name : match.teamB.name;
      const wktsLeft =
        (last.battingTeam === "A" ? match.teamA : match.teamB).playerIds.length - last.wickets;
      return { winner: last.battingTeam, summary: `${team} won by ${wktsLeft} wickets` };
    }
    if (teamARuns === teamBRuns) return { winner: "tie", summary: "Match tied" };
    const diff = Math.abs(teamARuns - teamBRuns);
    const winnerSide: "A" | "B" = teamARuns > teamBRuns ? "A" : "B";
    const team = winnerSide === "A" ? match.teamA.name : match.teamB.name;
    return { winner: winnerSide, summary: `${team} won by ${diff} runs` };
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

  // Format C
  if (m.format === "C") {
    if (idx === 0) {
      // Team B first innings
      const battingSide = prev.bowlingTeam;
      const bowlingSide = prev.battingTeam;
      const team = battingSide === "A" ? teams.A : teams.B;
      m.innings.push(newInnings(battingSide, bowlingSide, [...team.playerIds], m.format));
      m.currentInnings = 1;
    } else if (idx === 1) {
      // After Team B 1st innings: check follow-on
      const teamAfirst = m.innings[0].runs;
      const teamBfirst = m.innings[1].runs;
      const trail = teamAfirst - teamBfirst;
      if (trail >= followOnMargin) {
        // enforce follow-on: Team B bats again
        const battingSide = prev.battingTeam; // Team B again
        const bowlingSide = prev.bowlingTeam;
        const team = battingSide === "A" ? teams.A : teams.B;
        const next = newInnings(battingSide, bowlingSide, [...team.playerIds], m.format);
        next.followOnApplied = true;
        m.innings.push(next);
        m.currentInnings = 2;
      } else {
        // Team A 2nd innings
        const battingSide = prev.bowlingTeam; // Team A
        const bowlingSide = prev.battingTeam;
        const team = battingSide === "A" ? teams.A : teams.B;
        m.innings.push(newInnings(battingSide, bowlingSide, [...team.playerIds], m.format));
        m.currentInnings = 2;
      }
    } else if (idx === 2) {
      // After 3rd innings, set up final innings + target
      // target depends on who's batting next
      const teamARuns = m.innings.filter((i) => i.battingTeam === "A").reduce((s, i) => s + i.runs, 0);
      const teamBRuns = m.innings.filter((i) => i.battingTeam === "B").reduce((s, i) => s + i.runs, 0);
      // The team that just batted is `prev.battingTeam`. Next batting is the opposite,
      // unless follow-on was applied (then it's Team A's turn next).
      let battingSide: "A" | "B";
      if (prev.followOnApplied) {
        // After follow-on, Team A bats only if they need to chase
        // Check innings result: if Team B's combined > Team A's first, Team A bats
        if (teamBRuns > teamARuns) {
          battingSide = "A";
        } else {
          // Team A already leads — match ends by innings (no 4th innings)
          return m;
        }
      } else {
        battingSide = prev.bowlingTeam;
      }
      const bowlingSide = battingSide === "A" ? "B" : "A";
      const leadOfBattingSide =
        battingSide === "A" ? teamARuns - teamBRuns : teamBRuns - teamARuns;
      // target = opponent's aggregate + 1
      m.target =
        (battingSide === "A" ? teamBRuns : teamARuns) + 1;
      const team = battingSide === "A" ? teams.A : teams.B;
      m.innings.push(newInnings(battingSide, bowlingSide, [...team.playerIds], m.format));
      m.currentInnings = 3;
      void leadOfBattingSide;
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