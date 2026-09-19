import type { Player } from "./types";
import { computeOvertakeScore } from "./overtakeRanking";

/**
 * OFFICIAL PTS HISTORIC BASELINE (v10)
 *
 * Missing historical achievements restored as permanent career statistics.
 * Strike Rate, 50s and 100s are never touched. Atharv and Mahesh were
 * corrected in an earlier update and receive NO further additions here —
 * they still take part in every ranking with their corrected statistics.
 */
export interface HistoricAddition {
  fours: number;
  topWickets: number;
  middleWickets: number;
  lowerWickets: number;
  directCatches: number;
  oneBounceCatches: number;
  pom: number;
  botm: number;
  fielder: number;
  fighter: number;
  consistency: number;
}

export const HISTORIC_ADDITIONS: Record<string, HistoricAddition> = {
  sunny:   { fours: 1700, topWickets: 40, middleWickets: 20, lowerWickets: 10, directCatches: 50, oneBounceCatches: 30, pom: 25, botm: 18, fielder: 15, fighter: 12, consistency: 100 },
  sathvik: { fours: 900,  topWickets: 18, middleWickets: 15, lowerWickets: 8,  directCatches: 28, oneBounceCatches: 15, pom: 12, botm: 10, fielder: 8,  fighter: 8,  consistency: 56 },
  rithu:   { fours: 560,  topWickets: 16, middleWickets: 12, lowerWickets: 6,  directCatches: 22, oneBounceCatches: 10, pom: 8,  botm: 6,  fielder: 5,  fighter: 5,  consistency: 43 },
  karthik: { fours: 380,  topWickets: 10, middleWickets: 10, lowerWickets: 6,  directCatches: 16, oneBounceCatches: 10, pom: 5,  botm: 4,  fielder: 4,  fighter: 4,  consistency: 28 },
  deva:    { fours: 70,   topWickets: 2,  middleWickets: 2,  lowerWickets: 2,  directCatches: 6,  oneBounceCatches: 3,  pom: 1,  botm: 1,  fielder: 1,  fighter: 1,  consistency: 6 },
};

/** Permanent PTS Historic Points baseline after the additions are applied. */
export const HISTORIC_TARGETS: Record<string, number> = {
  sunny: 5049,
  sathvik: 3182,
  rithu: 2243,
  atharv: 1671,
  karthik: 1645,
  deva: 917,
  mahesh: 460,
  karunya: 153,
  madhu: 29,
  himmu: 26,
  chitti: 0,
};

/** Engine points for a player, ignoring live match points & calibration. */
function enginePoints(p: Player): number {
  return computeOvertakeScore(
    { ...p, matchPoints: 0, historicRankingPoints: 0 },
    [],
  ).total;
}

/** Apply the historic stat additions + calibrate to the official baseline. */
export function applyHistoricBaseline(player: Player): Player {
  if (player.ptsBaselineV10) return player;
  const add = HISTORIC_ADDITIONS[player.id];
  let p: Player = { ...player, career: { ...player.career } };

  if (add) {
    const wkts = add.topWickets + add.middleWickets + add.lowerWickets;
    p.career.fours += add.fours;
    p.career.wickets += wkts;
    p.career.catches += add.directCatches;
    p.career.oneBounceCatches = (p.career.oneBounceCatches ?? 0) + add.oneBounceCatches;
    p.career.pomAwards = (p.career.pomAwards ?? 0) + add.pom;
    p.career.batsmanAwards = (p.career.batsmanAwards ?? 0) + add.botm;
    p.career.fielderAwards = (p.career.fielderAwards ?? 0) + add.fielder;
    p.career.fighterAwards = (p.career.fighterAwards ?? 0) + add.fighter;
    p.career.awards = (p.career.awards ?? 0) + add.pom + add.botm + add.fielder + add.fighter;
    p.historicWicketTiers = {
      top: add.topWickets, middle: add.middleWickets, lower: add.lowerWickets,
    };
    p.historicWicketBonus =
      add.topWickets * 7 + add.middleWickets * 4 + add.lowerWickets * 3;
    p.historicConsistency = add.consistency;
  }

  // Historic snapshots always track the restored career figures.
  p.historicFours = p.career.fours;
  p.historicWickets = (player.historicWickets ?? player.career.wickets ?? 0);
  p.matchPoints = p.matchPoints ?? 0;

  const target = HISTORIC_TARGETS[p.id];
  if (target !== undefined) {
    p.historicRankingPoints = target - enginePoints(p);
  }
  p.ptsBaselineV10 = true;
  return p;
}

export function applyHistoricBaselineAll(players: Player[]): Player[] {
  return players.map(applyHistoricBaseline);
}