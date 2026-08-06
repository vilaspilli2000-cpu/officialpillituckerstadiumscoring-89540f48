import type { Player, RankBuckets } from "./types";
import { historicWicketsPoints } from "./matchPoints";

/* ══════════════════════════════════════════════════════════════════════
   PTS v3.3.4 — OFFICIAL HISTORIC RANKING BASELINE
   These are the official STARTING bucket values. They are never
   recalculated from career statistics and never reset — every completed
   match only ever ADDS to them.
   ══════════════════════════════════════════════════════════════════════ */

export const BUCKET_KEYS = ["sr", "big", "cons", "awd", "fours", "wkt", "match"] as const;
export type BucketKey = (typeof BUCKET_KEYS)[number];

export const BUCKET_LABELS: Record<BucketKey, string> = {
  sr: "SR", big: "BIG", cons: "CONS", awd: "AWD",
  fours: "4S", wkt: "WKT", match: "MATCH",
};

export const ZERO_BUCKETS: RankBuckets = { sr: 0, big: 0, cons: 0, awd: 0, fours: 0, wkt: 0, match: 0 };

/** SR|BIG|CONS|AWD|4S|WKT|MATCH */
export const OFFICIAL_BUCKETS: Record<string, RankBuckets> = {
  sunny:   { sr: 335, big: 960, cons: 90, awd: 1731, fours: 730, wkt: 69, match: 1134 },
  sathvik: { sr: 302, big: 240, cons: 54, awd: 1110, fours: 430, wkt: 43, match: 1003 },
  rithu:   { sr: 240, big: 250, cons: 42, awd: 854,  fours: 296, wkt: 48, match: 513 },
  atharv:  { sr: 275, big: 110, cons: 6,  awd: 551,  fours: 240, wkt: 27, match: 462 },
  karthik: { sr: 256, big: 40,  cons: 30, awd: 616,  fours: 200, wkt: 39, match: 464 },
  deva:    { sr: 230, big: 10,  cons: 0,  awd: 430,  fours: 155, wkt: 30, match: 62 },
  mahesh:  { sr: 215, big: 20,  cons: 0,  awd: 164,  fours: 64,  wkt: 8,  match: -11 },
  karunya: { sr: 171, big: 0,   cons: 0,  awd: -37,  fours: 15,  wkt: 6,  match: -2 },
  madhu:   { sr: 0,   big: 0,   cons: 6,  awd: 0,    fours: 0,   wkt: 0,  match: 23 },
  himmu:   { sr: 0,   big: 0,   cons: 0,  awd: 0,    fours: 0,   wkt: 0,  match: 26 },
  chitti:  { ...ZERO_BUCKETS },
};

/** OFFICIAL CAREER DATABASE — 100s | 50s | Runs (single source of truth). */
export const OFFICIAL_CAREER: Record<string, { hundreds: number; fifties: number; runs: number }> = {
  sunny:   { hundreds: 23, fifties: 45, runs: 21398 },
  sathvik: { hundreds: 12, fifties: 28, runs: 15186 },
  rithu:   { hundreds: 6,  fifties: 15, runs: 13168 },
  atharv:  { hundreds: 2,  fifties: 8,  runs: 8124 },
  karthik: { hundreds: 1,  fifties: 2,  runs: 6842 },
  deva:    { hundreds: 0,  fifties: 2,  runs: 5648 },
  mahesh:  { hundreds: 0,  fifties: 2,  runs: 4186 },
  karunya: { hundreds: 0,  fifties: 0,  runs: 2397 },
  madhu:   { hundreds: 0,  fifties: 0,  runs: 0 },
  himmu:   { hundreds: 0,  fifties: 0,  runs: 0 },
  chitti:  { hundreds: 0,  fifties: 0,  runs: 0 },
};

export function playerBuckets(p: Player): RankBuckets {
  return { ...ZERO_BUCKETS, ...(p.buckets ?? OFFICIAL_BUCKETS[p.id] ?? ZERO_BUCKETS) };
}

export function bucketsTotal(b: RankBuckets): number {
  return b.sr + b.big + b.cons + b.awd + b.fours + b.wkt + b.match;
}

export function addBuckets(a: RankBuckets, b: RankBuckets): RankBuckets {
  return {
    sr: a.sr + b.sr, big: a.big + b.big, cons: a.cons + b.cons, awd: a.awd + b.awd,
    fours: a.fours + b.fours, wkt: a.wkt + b.wkt, match: a.match + b.match,
  };
}

const srOf = (p: Player) => (p.career.balls ? (p.career.runs / p.career.balls) * 100 : 0);

const awardPoints = (p: Player) =>
  (p.career.pomAwards ?? 0) * 6 + (p.career.batsmanAwards ?? 0) * 4 +
  (p.career.bowlerAwards ?? 0) * 4 + (p.career.fielderAwards ?? 0) * 2 +
  (p.career.fighterAwards ?? 0) * 2 - (p.career.worstAwards ?? 0) * 3;

const bigOf = (p: Player) =>
  p.career.hundreds * 20 + p.career.fifties * 10 +
  (p.career.hundred50s ?? 0) * 10 + (p.career.doubleHundreds ?? 0) * 20;

/**
 * Bucket points earned by ONE completed match. `pre` is the player before the
 * match was credited, `post` is the player after career stats were credited.
 */
export function matchBucketDeltas(
  pre: Player,
  post: Player,
  opts: { consistencyPoints: number; netMatchPoints: number },
): RankBuckets {
  return {
    sr: Math.round(srOf(post) * 2) - Math.round(srOf(pre) * 2),
    big: bigOf(post) - bigOf(pre),
    cons: opts.consistencyPoints,
    awd: awardPoints(post) - awardPoints(pre),
    fours: (post.career.fours ?? 0) - (pre.career.fours ?? 0),
    wkt: historicWicketsPoints(post.career.wickets ?? 0) - historicWicketsPoints(pre.career.wickets ?? 0),
    match: Math.round(opts.netMatchPoints),
  };
}
