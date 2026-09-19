import type { FormatId, Player, Match } from "./types";

export type ChallengeTier = "EASY" | "MEDIUM" | "HARD" | "EXTREME" | "LEGENDARY";

export type ChallengeType =
  | "Runs"
  | "Strike Rate"
  | "Fours"
  | "Balls Faced"
  | "Dot Balls Bowled"
  | "Boundary Saves"
  | "Economy";

export interface ChallengeAssignment {
  type: ChallengeType;
  tier: ChallengeTier;
  target: number;
  reward: number;
  progress: number;
  completed: boolean;
  actualValue?: number;
  completionInnings?: number;
  completionTs?: number;
  matchId?: string;
  cycleNumber?: number;
}

export interface ChallengeState {
  batting: Record<ChallengeType, ChallengeAssignment>;
  bowling: Record<ChallengeType, ChallengeAssignment>;
  battingCycle: number;
  bowlingCycle: number;
  lastUpdatedMatchId?: string;
}

export const CHALLENGE_COLORS: Record<ChallengeTier, { emoji: string; bg: string; text: string }> =
  {
    EASY: { emoji: "🟢", bg: "bg-green-500/20", text: "text-green-500" },
    MEDIUM: { emoji: "🔵", bg: "bg-blue-500/20", text: "text-blue-500" },
    HARD: { emoji: "🟣", bg: "bg-purple-500/20", text: "text-purple-500" },
    EXTREME: { emoji: "🔴", bg: "bg-red-500/20", text: "text-red-500" },
    LEGENDARY: { emoji: "👑", bg: "bg-yellow-500/20", text: "text-yellow-500" },
  };

interface TargetInfoBase {
  target: number;
  reward: number;
  minBalls?: number;
  isEconomy?: boolean;
  isMin?: boolean;
}

interface TargetInfo extends TargetInfoBase {}

// Format A excludes "Balls Faced" from its available pool.
// The type below ensures "Balls Faced" is not a valid key here.
const FORMAT_A_AVAILABLE: ChallengeType[] = [
  "Runs",
  "Strike Rate",
  "Fours",
  "Dot Balls Bowled",
  "Boundary Saves",
  "Economy",
];

type FormatAType = (typeof FORMAT_A_AVAILABLE)[number];

type FormatATargetRow = Partial<Record<FormatAType, TargetInfo>>;

const FORMAT_A_TARGETS: Record<ChallengeTier, FormatATargetRow> = {
  EASY: {
    Runs: { target: 50, reward: 200 },
    "Strike Rate": { target: 210, reward: 200, minBalls: 18 },
    Fours: { target: 10, reward: 200 },
    "Dot Balls Bowled": { target: 10, reward: 200 },
    "Boundary Saves": { target: 10, reward: 200 },
    Economy: { target: 4.0, reward: 200, isEconomy: true },
  } as FormatATargetRow,
  MEDIUM: {
    Runs: { target: 75, reward: 400 },
    "Strike Rate": { target: 250, reward: 400, minBalls: 18 },
    Fours: { target: 12, reward: 400 },
    "Dot Balls Bowled": { target: 14, reward: 400 },
    "Boundary Saves": { target: 13, reward: 400 },
    Economy: { target: 3.5, reward: 400, isEconomy: true },
  } as FormatATargetRow,
  HARD: {
    Runs: { target: 90, reward: 600 },
    "Strike Rate": { target: 280, reward: 600, minBalls: 18 },
    Fours: { target: 15, reward: 600 },
    "Dot Balls Bowled": { target: 16, reward: 600 },
    "Boundary Saves": { target: 16, reward: 600 },
    Economy: { target: 3.0, reward: 600, isEconomy: true },
  } as FormatATargetRow,
  EXTREME: {
    Runs: { target: 100, reward: 800 },
    "Strike Rate": { target: 290, reward: 800, minBalls: 18 },
    Fours: { target: 19, reward: 800 },
    "Dot Balls Bowled": { target: 17, reward: 800 },
    "Boundary Saves": { target: 19, reward: 800 },
    Economy: { target: 2.0, reward: 800, isEconomy: true },
  } as FormatATargetRow,
  LEGENDARY: {
    Runs: { target: 110, reward: 1000 },
    "Strike Rate": { target: 300, reward: 1000, minBalls: 20 },
    Fours: { target: 22, reward: 1000 },
    "Dot Balls Bowled": { target: 18, reward: 1000 },
    "Boundary Saves": { target: 21, reward: 1000 },
    Economy: { target: 1.0, reward: 1000, isEconomy: true },
  } as FormatATargetRow,
};

const FORMAT_BC_TARGETS: Record<ChallengeTier, Record<ChallengeType, TargetInfo>> = {
  EASY: {
    Runs: { target: 50, reward: 250, isMin: true },
    "Strike Rate": { target: 210, reward: 250, minBalls: 25 },
    Fours: { target: 10, reward: 250 },
    "Balls Faced": { target: 40, reward: 250 },
    "Dot Balls Bowled": { target: 15, reward: 250 },
    "Boundary Saves": { target: 10, reward: 250 },
    Economy: { target: 2.0, reward: 250, isEconomy: true },
  },
  MEDIUM: {
    Runs: { target: 75, reward: 500, isMin: true },
    "Strike Rate": { target: 250, reward: 500, minBalls: 25 },
    Fours: { target: 18, reward: 500 },
    "Balls Faced": { target: 75, reward: 500 },
    "Dot Balls Bowled": { target: 18, reward: 500 },
    "Boundary Saves": { target: 15, reward: 500 },
    Economy: { target: 1.5, reward: 500, isEconomy: true },
  },
  HARD: {
    Runs: { target: 100, reward: 750, isMin: true },
    "Strike Rate": { target: 280, reward: 750, minBalls: 25 },
    Fours: { target: 21, reward: 750 },
    "Balls Faced": { target: 100, reward: 750 },
    "Dot Balls Bowled": { target: 21, reward: 750 },
    "Boundary Saves": { target: 18, reward: 750 },
    Economy: { target: 1.0, reward: 750, isEconomy: true },
  },
  EXTREME: {
    Runs: { target: 125, reward: 1000, isMin: true },
    "Strike Rate": { target: 290, reward: 1000, minBalls: 25 },
    Fours: { target: 25, reward: 1000 },
    "Balls Faced": { target: 125, reward: 1000 },
    "Dot Balls Bowled": { target: 28, reward: 1000 },
    "Boundary Saves": { target: 21, reward: 1000 },
    Economy: { target: 0.75, reward: 1000, isEconomy: true },
  },
  LEGENDARY: {
    Runs: { target: 150, reward: 1500, isMin: true },
    "Strike Rate": { target: 300, reward: 1500, minBalls: 30 },
    Fours: { target: 30, reward: 1500 },
    "Balls Faced": { target: 150, reward: 1500 },
    "Dot Balls Bowled": { target: 31, reward: 1500 },
    "Boundary Saves": { target: 25, reward: 1500 },
    Economy: { target: 0.5, reward: 1500, isEconomy: true },
  },
};

const ALL_CHALLENGE_TYPES: ChallengeType[] = [
  "Runs",
  "Strike Rate",
  "Fours",
  "Balls Faced",
  "Dot Balls Bowled",
  "Boundary Saves",
  "Economy",
];

const TIER_ORDER: ChallengeTier[] = ["EASY", "MEDIUM", "HARD", "EXTREME", "LEGENDARY"];

export class ChallengesEngine {
  static getFormatTargets(
    format: FormatId,
  ):
    | Record<ChallengeTier, Record<ChallengeType, TargetInfo>>
    | Record<ChallengeTier, FormatATargetRow> {
    return format === "A" ? FORMAT_A_TARGETS : FORMAT_BC_TARGETS;
  }

  static getAvailableTypes(format: FormatId): ChallengeType[] {
    if (format === "A") {
      return ALL_CHALLENGE_TYPES.filter((t) => t !== "Balls Faced");
    }
    return ALL_CHALLENGE_TYPES;
  }

  static shuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  static assignChallengesForFormat(
    format: FormatId,
    isBatting: boolean,
    cycleNumber: number = 0,
  ): ChallengeAssignment[] {
    const availableTypes = this.getAvailableTypes(format);
    const targets = this.getFormatTargets(format);

    const shuffledTypes = this.shuffle([...availableTypes]);

    const assignments: ChallengeAssignment[] = [];
    for (let i = 0; i < TIER_ORDER.length; i++) {
      const tier = TIER_ORDER[i];
      const type = shuffledTypes[i] as ChallengeType;

      if (format === "A") {
        const row = targets as Record<ChallengeTier, FormatATargetRow>;
        const info = row[tier][type as FormatAType];
        if (!info) continue; // safety guard if type is unexpected
        assignments.push({
          type,
          tier,
          target: info.target,
          reward: info.reward,
          progress: 0,
          completed: false,
          cycleNumber,
        });
      } else {
        const row = targets as Record<ChallengeTier, Record<ChallengeType, TargetInfo>>;
        const info = row[tier][type];
        assignments.push({
          type,
          tier,
          target: info.target,
          reward: info.reward,
          progress: 0,
          completed: false,
          cycleNumber,
        });
      }
    }
    return assignments;
  }

  static updateChallengeProgress(
    assignment: ChallengeAssignment,
    match: Match,
    playerId: string,
    inningsIndex: number,
    isBatting: boolean,
  ): ChallengeAssignment {
    if (assignment.completed) return assignment;

    const innings = match.innings[inningsIndex];

    // Explicit team determination — no chained boolean/string comparisons
    const playerTeam = match.teamA.playerIds.includes(playerId) ? "A" : "B";
    const inningsBattingTeam = innings.battingTeam;
    const inningsBowlingTeam: "A" | "B" = inningsBattingTeam === "A" ? "B" : "A";

    // Determine if the player participates in this innings based on batting/bowling context
    if (isBatting) {
      const playerBatsInInnings = inningsBattingTeam === playerTeam;
      if (!playerBatsInInnings) return assignment;
    } else {
      const playerBowlsInInnings = inningsBowlingTeam === playerTeam;
      if (!playerBowlsInInnings) return assignment;
    }

    let progress = 0;

    switch (assignment.type) {
      case "Runs": {
        const batter = innings.batters.find((b) => b.playerId === playerId);
        progress = batter ? batter.runs : 0;
        break;
      }
      case "Fours": {
        const batter4s = innings.batters.find((b) => b.playerId === playerId);
        progress = batter4s ? batter4s.fours : 0;
        break;
      }
      case "Balls Faced": {
        const batterBalls = innings.batters.find((b) => b.playerId === playerId);
        progress = batterBalls ? batterBalls.balls : 0;
        break;
      }
      case "Dot Balls Bowled":
      case "Boundary Saves": {
        if (assignment.type === "Dot Balls Bowled") {
          const bowler = innings.bowlers.find((b) => b.playerId === playerId);
          progress = bowler ? bowler.dots : 0;
        } else {
          const boundarySaves =
            match.fieldingEvents?.filter(
              (ev) =>
                ev.inningsIndex === inningsIndex &&
                ev.playerId === playerId &&
                ev.kind === "boundary-save",
            ).length ?? 0;
          progress = boundarySaves;
        }
        break;
      }
      case "Strike Rate": {
        const batterSR = innings.batters.find((b) => b.playerId === playerId);
        if (batterSR && batterSR.balls >= 0) {
          progress = batterSR.balls > 0 ? Math.floor((batterSR.runs / batterSR.balls) * 100) : 0;
        }
        break;
      }
      case "Economy": {
        progress = 0;
        break;
      }
    }

    return { ...assignment, progress };
  }

  static checkChallengeCompletion(
    assignment: ChallengeAssignment,
    match: Match,
    playerId: string,
    inningsIndex: number,
    isBatting: boolean,
    isInningsComplete: boolean,
  ): { completed: boolean; actualValue?: number } {
    if (assignment.completed) return { completed: true, actualValue: assignment.actualValue };

    const innings = match.innings[inningsIndex];

    const playerTeam = match.teamA.playerIds.includes(playerId) ? "A" : "B";
    const inningsBattingTeam = innings.battingTeam;
    const inningsBowlingTeam: "A" | "B" = inningsBattingTeam === "A" ? "B" : "A";

    if (isBatting) {
      const playerBatsInInnings = inningsBattingTeam === playerTeam;
      if (!playerBatsInInnings) return { completed: false };
    } else {
      const playerBowlsInInnings = inningsBowlingTeam === playerTeam;
      if (!playerBowlsInInnings) return { completed: false };
    }

    if (assignment.type === "Economy") {
      if (!isInningsComplete) return { completed: false };

      const bowler = innings.bowlers.find((b) => b.playerId === playerId);
      if (!bowler || bowler.balls === 0) return { completed: false };

      const economy = (bowler.runs / bowler.balls) * 6;
      const targets = this.getFormatTargets(match.format);
      const targetRow = targets[assignment.tier] as
        FormatATargetRow | Record<ChallengeType, TargetInfo>;
      const targetInfo = (targetRow as any)[assignment.type] as TargetInfo | undefined;
      if (!targetInfo) return { completed: false };

      const completed = economy < targetInfo.target;
      return {
        completed,
        actualValue: completed ? Math.round(economy * 100) / 100 : undefined,
      };
    }

    const batter = innings.batters.find((b) => b.playerId === playerId);
    const bowler = innings.bowlers.find((b) => b.playerId === playerId);

    let actualValue = 0;
    let meetsTarget = false;

    switch (assignment.type) {
      case "Runs": {
        actualValue = batter ? batter.runs : 0;
        meetsTarget = actualValue >= assignment.target;
        break;
      }
      case "Fours": {
        actualValue = batter ? batter.fours : 0;
        meetsTarget = actualValue >= assignment.target;
        break;
      }
      case "Balls Faced": {
        actualValue = batter ? batter.balls : 0;
        meetsTarget = actualValue >= assignment.target;
        break;
      }
      case "Dot Balls Bowled":
      case "Boundary Saves": {
        if (assignment.type === "Dot Balls Bowled") {
          const bowlerDots = innings.bowlers.find((b) => b.playerId === playerId);
          actualValue = bowlerDots ? bowlerDots.dots : 0;
        } else {
          const saves =
            match.fieldingEvents?.filter(
              (ev) =>
                ev.inningsIndex === inningsIndex &&
                ev.playerId === playerId &&
                ev.kind === "boundary-save",
            ).length ?? 0;
          actualValue = saves;
        }
        meetsTarget = actualValue >= assignment.target;
        break;
      }
      case "Strike Rate": {
        const targets = this.getFormatTargets(match.format);
        const targetRow = targets[assignment.tier] as
          FormatATargetRow | Record<ChallengeType, TargetInfo>;
        const targetInfoRaw = (targetRow as any)[assignment.type] as TargetInfo | undefined;
        if (batter && targetInfoRaw && batter.balls >= (targetInfoRaw.minBalls ?? 0)) {
          actualValue = batter.balls > 0 ? Math.floor((batter.runs / batter.balls) * 100) : 0;
          meetsTarget = actualValue >= assignment.target;
        }
        break;
      }
    }

    if (meetsTarget) {
      return { completed: true, actualValue };
    }

    return { completed: false };
  }
}

export default ChallengesEngine;
