export type FormatId = "A" | "B" | "C";

export interface Player {
  id: string;
  name: string;
  createdAt: number;
  role?: "Batter" | "Bowler" | "All-rounder" | "Wicketkeeper" | "—";
  notes?: string;
  seed: {
    hundreds: number;
    fifties: number;
    highest: number;
    highestNotOut?: boolean;
  };
  career: {
    matches: number;
    runs: number;
    balls: number;
    fours: number;
    sixes: number;
    hundreds: number;
    fifties: number;
    highest: number;
    highestNotOut: boolean;
    wickets: number;
    bowlBalls: number;
    bowlRuns: number;
    catches: number;
    runOuts: number;
    awards: number;
    notOuts: number;
    innings?: number;
    ducks?: number;
    hundred50s?: number; // 150s
    doubleHundreds?: number; // 200s
    maidens?: number;
    dots?: number;
    wides?: number;
    noBalls?: number;
    bestBowlingWkts?: number;
    bestBowlingRuns?: number;
    // Per-award-type career counters. `awards` remains the total.
    pomAwards?: number;
    batsmanAwards?: number;
    bowlerAwards?: number;
    fielderAwards?: number;
    fighterAwards?: number;
    worstAwards?: number;
  };
  ratings?: {
    overall?: number;
    batting?: number;
    bowling?: number;
    fielding?: number;
    pressure?: number;
    matchWinning?: number;
    wicketTaking?: number;
    sixHitting?: number;
    deathBat?: number;
    deathBowl?: number;
    recentForm?: number;
  };
  manualOverride?: boolean;
  edits?: Array<{ ts: number; field: string; from: string | number; to: string | number }>;
  beginner?: boolean;
  /** Snapshot of career.fours at the moment historic ranking was frozen.
   *  New fours (career.fours - historicFours) each earn +1 ranking point. */
  historicFours?: number;
  /** Snapshot of career.wickets at freeze time. New wickets earn quality points. */
  historicWickets?: number;
  /** Accumulated Net Match Points from every future completed match. */
  matchPoints?: number;
}

export type DismissalType =
  | "bowled"
  | "caught"
  | "caught-one-bounce"
  | "six-and-out"
  | "leg-l2"
  | "run-out"
  | "stumped"
  | "hit-wicket"
  | "retired"
  | "other"
  | "not-out";

export interface BatterCard {
  playerId: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  out: boolean;
  dismissalType?: DismissalType;
  bowlerId?: string;
  catcherId?: string;
  legState?: 0 | 1; // L1 pending flag
}

export interface BowlerCard {
  playerId: string;
  balls: number; // legal balls
  runs: number;
  wickets: number;
  dots: number;
  noBalls: number;
  wides: number;
}

export type BallEventType =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "wide"
  | "no-ball"
  | "dead"
  | "wicket"
  | "catch-direct"
  | "catch-one-bounce"
  | "six-out"
  | "L1"
  | "L2";

export interface BallEvent {
  id: string;
  ts: number;
  type: BallEventType;
  inningsIndex: number;
  overNumber: number; // 0-based over
  ballInOver: number; // legal ball # in over (1..6) AT time of event, 0 for illegal
  batterId: string;
  bowlerId: string;
  runsToBatter: number;
  runsExtras: number;
  isLegal: boolean;
  isWicket: boolean;
  dismissedPlayerId?: string;
  dismissalType?: DismissalType;
  catcherId?: string;
  notes?: string;
}

export interface Innings {
  battingTeam: "A" | "B";
  bowlingTeam: "A" | "B";
  runs: number;
  wickets: number;
  legalBalls: number;
  oversCap?: number; // legal balls cap (Format A only)
  batters: BatterCard[];
  bowlers: BowlerCard[];
  lineup: string[]; // batting order ids
  nextBatterIndex: number;
  currentBatterId?: string;
  currentBowlerId?: string;
  lastOverBowlerId?: string; // bowler of just-completed over
  events: BallEvent[];
  closed: boolean;
  closeReason?: "all-out" | "overs-done" | "target" | "declared";
  followOnApplied?: boolean;
}

export interface Team {
  id: "A" | "B";
  name: string;
  playerIds: string[]; // includes joker if used
}

export interface MatchAward {
  type: "pom" | "fighter" | "batsman" | "bowler" | "fielder" | "worst";
  playerId: string;
  team: "A" | "B";
  headline: string;
  reason: string;
}

export interface ProbabilityPoint {
  ballIndex: number;
  teamA: number;
  teamB: number;
  note: string;
}

export interface Match {
  id: string;
  createdAt: number;
  completedAt?: number;
  format: FormatId;
  teamA: Team;
  teamB: Team;
  jokerId?: string;
  followOnMargin?: number;
  innings: Innings[];
  currentInnings: number; // index into innings[]
  target?: number;
  result?: {
    winner?: "A" | "B" | "tie" | "draw";
    summary: string; // e.g. "Team A won by 24 runs"
  };
  awards?: MatchAward[];
  story?: string;
  probability: ProbabilityPoint[];
  superOver?: Match["innings"]; // optional super-over innings reused shape
  pendingNoBall?: boolean; // awaiting runs-from-no-ball selection
  pendingCatchSelection?: { dismissalType: DismissalType }; // awaiting catcher select
  commentary?: CommentaryEntry[];
}

export interface CommentaryEntry {
  id: string;
  ts: number;
  inningsIndex: number;
  ballIndex: number;
  overLabel: string;
  text: string;
  kind: "ball" | "wicket" | "boundary" | "milestone" | "phase" | "swing";
  probSwing?: number;
}

export interface Achievement {
  id: string;
  ts: number;
  matchId: string;
  playerId: string;
  kind: string;
  text: string;
}

/** Permanent milestone entry: player crossed a career milestone in a match. */
export interface MilestoneEntry {
  id: string;
  ts: number;
  matchId: string;
  playerId: string;
  statKey: string; // "runs" | "wickets" | ...
  statLabel: string; // "career runs"
  value: number; // milestone reached (e.g. 21500)
  opponent: string;
  matchLabel: string;
}

/** Permanent record entry: personal best, league record, new highest score, etc. */
export interface RecordEntry {
  id: string;
  ts: number;
  matchId: string;
  playerId: string;
  kind: "personal-best" | "league-record" | "career-milestone" | "highest-score" | "best-bowling";
  recordName: string;
  value: string;
  opponent: string;
  matchLabel: string;
  inningsIndex?: number;
}

/** Permanent award-feed entry: one row per award of a completed match. */
export interface AwardFeedEntry {
  id: string;
  ts: number;
  matchId: string;
  matchLabel: string;
  awardType: "pom" | "batsman" | "bowler" | "fielder" | "fighter" | "worst";
  playerId: string;
  headline: string;
  reason: string;
  team: "A" | "B";
}