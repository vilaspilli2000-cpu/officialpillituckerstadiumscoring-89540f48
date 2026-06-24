import type {
  BallEvent,
  BallEventType,
  BatterCard,
  BowlerCard,
  DismissalType,
  Innings,
  Match,
} from "./types";

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

export function newBatterCard(playerId: string): BatterCard {
  return { playerId, runs: 0, balls: 0, fours: 0, sixes: 0, out: false, legState: 0 };
}
export function newBowlerCard(playerId: string): BowlerCard {
  return { playerId, balls: 0, runs: 0, wickets: 0, dots: 0, noBalls: 0, wides: 0 };
}

export function ensureBatterCard(innings: Innings, playerId: string) {
  let c = innings.batters.find((b) => b.playerId === playerId);
  if (!c) {
    c = newBatterCard(playerId);
    innings.batters.push(c);
  }
  return c;
}
export function ensureBowlerCard(innings: Innings, playerId: string) {
  let c = innings.bowlers.find((b) => b.playerId === playerId);
  if (!c) {
    c = newBowlerCard(playerId);
    innings.bowlers.push(c);
  }
  return c;
}

export function oversString(legalBalls: number) {
  const o = Math.floor(legalBalls / 6);
  const b = legalBalls % 6;
  return `${o}.${b}`;
}

/** Number of wickets allowed in this innings = number of batters in batting team */
export function wicketsAllowed(match: Match, innings: Innings) {
  const team = innings.battingTeam === "A" ? match.teamA : match.teamB;
  return team.playerIds.length;
}

/** Total batters that can come in == lineup length */
export function lineupLength(innings: Innings) {
  return innings.lineup.length;
}

export interface ApplyResult {
  match: Match;
  needNextBowler?: boolean;
  needNextBatter?: boolean;
  achievements: { kind: string; text: string; playerId: string }[];
  inningsClosed?: boolean;
  matchClosed?: boolean;
}

export interface ApplyOptions {
  /** for no-ball runs from bat */
  runsFromNoBall?: number;
  /** for caught dismissals */
  catcherId?: string;
  /** for wicket button: which dismissal */
  dismissalType?: DismissalType;
  /** fielder credited for run-out */
  fielderId?: string;
}

/** Apply a scoring event. Returns new match (mutated copy ok). */
export function applyEvent(
  inMatch: Match,
  type: BallEventType,
  opts: ApplyOptions = {},
): ApplyResult {
  const match: Match = structuredClone(inMatch);
  const innings = match.innings[match.currentInnings];
  const achievements: ApplyResult["achievements"] = [];

  if (!innings || innings.closed) {
    return { match, achievements };
  }
  const batterId = innings.currentBatterId!;
  const bowlerId = innings.currentBowlerId!;
  if (!batterId || !bowlerId) {
    return { match, achievements };
  }

  const bat = ensureBatterCard(innings, batterId);
  const bowl = ensureBowlerCard(innings, bowlerId);

  let runsBatter = 0;
  let runsExtras = 0;
  let isLegal = true;
  let isWicket = false;
  let dismissedPlayerId: string | undefined;
  let dismissalType: DismissalType | undefined;
  let catcherId: string | undefined;
  let resetLeg = false;
  let preserveLegOnIllegal = false;

  switch (type) {
    case "0":
      runsBatter = 0;
      resetLeg = true;
      bowl.dots += 1;
      break;
    case "1":
      runsBatter = 1;
      break;
    case "2":
      runsBatter = 2;
      break;
    case "3":
      runsBatter = 3;
      break;
    case "4":
      runsBatter = 4;
      bat.fours += 1;
      resetLeg = true;
      break;
    case "wide":
      isLegal = false;
      runsExtras = 1;
      bowl.wides += 1;
      preserveLegOnIllegal = true;
      break;
    case "no-ball":
      isLegal = false;
      runsExtras = 1;
      bowl.noBalls += 1;
      runsBatter = Math.max(0, opts.runsFromNoBall ?? 0);
      if (runsBatter === 4) bat.fours += 1;
      resetLeg = true; // no-ball resets leg sequence
      break;
    case "dead":
      isLegal = false;
      preserveLegOnIllegal = true;
      break;
    case "wicket":
      isWicket = true;
      dismissalType = opts.dismissalType ?? "bowled";
      dismissedPlayerId = batterId;
      if (opts.dismissalType === "caught" || opts.dismissalType === "caught-one-bounce" || opts.dismissalType === "stumped") {
        catcherId = opts.catcherId;
      }
      if (opts.dismissalType === "run-out") {
        catcherId = opts.fielderId;
      }
      if (opts.dismissalType === "six-and-out") {
        bat.sixes += 1;
      }
      break;
    case "catch-direct":
      isWicket = true;
      dismissalType = "caught";
      dismissedPlayerId = batterId;
      catcherId = opts.catcherId;
      break;
    case "catch-one-bounce":
      isWicket = true;
      dismissalType = "caught-one-bounce";
      dismissedPlayerId = batterId;
      catcherId = opts.catcherId;
      break;
    case "six-out":
      isWicket = true;
      dismissalType = "six-and-out";
      dismissedPlayerId = batterId;
      bat.sixes += 1;
      break;
    case "L1":
      // legal ball, 0 runs, sets pending
      runsBatter = 0;
      bat.legState = 1;
      bowl.dots += 1;
      break;
    case "L2":
      // L2: if batter already had L1 pending → OUT; else treat as L1
      if (bat.legState === 1) {
        isWicket = true;
        dismissalType = "leg-l2";
        dismissedPlayerId = batterId;
      } else {
        bat.legState = 1;
        bowl.dots += 1;
      }
      break;
  }

  // apply runs
  bat.runs += runsBatter;
  if (isLegal) bat.balls += 1;
  bowl.runs += runsBatter + runsExtras;
  if (isLegal) bowl.balls += 1;
  innings.runs += runsBatter + runsExtras;
  if (isLegal) innings.legalBalls += 1;

  // leg-state reset rules
  if (!preserveLegOnIllegal && (resetLeg || type === "no-ball")) {
    bat.legState = 0;
  }

  // wickets
  if (isWicket) {
    bat.out = true;
    bat.dismissalType = dismissalType;
    bat.bowlerId = bowlerId;
    bat.catcherId = catcherId;
    bowl.wickets += 1;
    innings.wickets += 1;
  }

  // milestones
  if (bat.runs >= 50 && bat.runs - runsBatter < 50) {
    achievements.push({ kind: "fifty", text: `Fifty for batter`, playerId: batterId });
  }
  if (bat.runs >= 100 && bat.runs - runsBatter < 100) {
    achievements.push({ kind: "century", text: `Century for batter`, playerId: batterId });
  }
  // 4 fours in current over check
  const overFours = innings.events
    .filter((e) => e.overNumber === currentOver(innings) && e.runsToBatter === 4)
    .length + (runsBatter === 4 ? 1 : 0);
  if (overFours === 4) {
    achievements.push({ kind: "four-fours", text: `Four boundaries in one over!`, playerId: batterId });
  }

  const event: BallEvent = {
    id: uid(),
    ts: Date.now(),
    type,
    inningsIndex: match.currentInnings,
    overNumber: currentOver(innings),
    ballInOver: isLegal ? ((innings.legalBalls - 1) % 6) + 1 : 0,
    batterId,
    bowlerId,
    runsToBatter: runsBatter,
    runsExtras,
    isLegal,
    isWicket,
    dismissedPlayerId,
    dismissalType,
    catcherId,
  };
  innings.events.push(event);

  // determine state transitions
  const allowedWk = wicketsAllowed(match, innings);
  const overCap = innings.oversCap; // legal balls cap
  const target = match.target;
  let inningsClosed = false;
  let matchClosed = false;
  let needNextBowler = false;
  let needNextBatter = false;

  // wicket → need next batter unless innings closes
  if (isWicket) {
    if (innings.wickets >= allowedWk - 0 && innings.nextBatterIndex >= innings.lineup.length) {
      // shouldn't happen, but safe
    }
    // last wicket = lineup exhausted (one fewer batter than lineup unless joker... we use lineup length as wickets allowed - 0)
    // We treat wicketsAllowed as number of players, so innings closes when wickets == players
    if (innings.wickets >= allowedWk) {
      innings.closed = true;
      innings.closeReason = "all-out";
      inningsClosed = true;
    } else {
      needNextBatter = true;
    }
  }

  // target reached?
  if (target && innings.runs >= target) {
    innings.closed = true;
    innings.closeReason = "target";
    inningsClosed = true;
  }

  // overs done?
  if (!innings.closed && overCap && innings.legalBalls >= overCap) {
    innings.closed = true;
    innings.closeReason = "overs-done";
    inningsClosed = true;
  }

  // end of over → next bowler required (only if innings still open)
  if (!innings.closed && isLegal && innings.legalBalls % 6 === 0) {
    innings.lastOverBowlerId = innings.currentBowlerId;
    innings.currentBowlerId = undefined;
    needNextBowler = true;
  }

  return {
    match,
    needNextBatter: needNextBatter && !inningsClosed,
    needNextBowler: needNextBowler && !inningsClosed,
    achievements,
    inningsClosed,
    matchClosed,
  };
}

export function currentOver(innings: Innings) {
  return Math.floor(innings.legalBalls / 6);
}

export function ballsRemaining(innings: Innings) {
  if (!innings.oversCap) return Infinity;
  return Math.max(0, innings.oversCap - innings.legalBalls);
}

export function runsRequired(match: Match) {
  if (!match.target) return undefined;
  const innings = match.innings[match.currentInnings];
  return Math.max(0, match.target - innings.runs);
}

export function undoLastBall(match: Match): Match {
  // Undo is implemented at the store level via snapshot stack.
  return match;
}