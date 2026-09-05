import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Achievement, AwardFeedEntry, BallEventType, FormatId, Match, MilestoneEntry,
  Player, RecordEntry, Team, FieldingEventKind, AchUnlock,
} from "./types";
import { SEED_PLAYERS, OFFICIAL_AWARD_SPLITS } from "./seed";
import { applyEvent, type ApplyOptions } from "./engine";
import { advanceInnings, detectResult, newInnings, totalInningsFor } from "./formats";
import { computeAwards } from "./awards";
import { buildStory } from "./story";
import { computeProbability } from "./probability";
import { generateCommentaryFor } from "./commentary";
import { MILESTONE_STEPS, totalAwards } from "./milestones";
import { computeMatchPoints, buildStreakSnapshot } from "./matchPoints";
import { layerResult, legacyLevelFromAchievements, meltdownLevelFromAchievements } from "./legacyMeltdown";
import { buildPointsBreakdown } from "./pointsBreakdown";
import { applyHistoricBaselineAll } from "./historicBaseline";
import {
  achievementCommentary, applyUnlocks, careerAchStats, evaluateAchievements,
  resetAchievementBaseline, addAchProgress, liveAchStats, RESULT_ONLY_STATS,
  type AchStats, type StatKey,
} from "./achievements";
import {
  OFFICIAL_BUCKETS, playerBuckets, addBuckets, matchBucketDeltas, ZERO_BUCKETS,
  OFFICIAL_CAREER,
} from "./buckets";

function teamOfPlayer(m: Match, playerId: string): "A" | "B" {
  if (m.teamA.playerIds.includes(playerId)) return "A";
  return "B";
}

/** Run the achievement engine for a set of players and return the new state. */
function runAchievements(
  players: Player[],
  targets: Array<{ id: string; only?: StatKey[] }>,
  ctx: { matchId?: string; matchLabel?: string; opponent?: (t: "A" | "B") => string; match?: Match },
  mode: "live" | "final",
): { players: Player[]; unlocks: AchUnlock[] } {
  let out = players;
  const unlocks: AchUnlock[] = [];
  for (const t of targets) {
    const p = out.find((x) => x.id === t.id);
    if (!p) continue;
    const stats = mode === "live" ? liveAchStats(p, ctx.match) : careerAchStats(p);
    const team = ctx.match ? teamOfPlayer(ctx.match, p.id) : "A";
    const u = evaluateAchievements(
      p, stats, out,
      { matchId: ctx.matchId, matchLabel: ctx.matchLabel, opponent: ctx.opponent?.(team) },
      t.only,
    );
    if (u.length === 0) continue;
    const np = applyUnlocks(p, u);
    out = out.map((x) => (x.id === p.id ? np : x));
    unlocks.push(...u);
  }
  return { players: out, unlocks };
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

/** Seed players with official career values, official ranking buckets and a
 *  zeroed achievement progress baseline (v3.3.4). */
function withOfficialBaseline(players: Player[]): Player[] {
  return resetAchievementBaseline(players).map((p) => {
    const career = OFFICIAL_CAREER[p.id];
    return {
      ...p,
      career: career ? { ...p.career, ...career } : p.career,
      buckets: p.buckets ?? OFFICIAL_BUCKETS[p.id] ?? { ...ZERO_BUCKETS },
    };
  });
}
const BASE_PLAYERS: Player[] = withOfficialBaseline(SEED_PLAYERS);

export interface SyncedState {
  players: Player[];
  matches: Match[];
  current?: Match;
  achievements: Achievement[];
  achFeed: AchUnlock[];
  settings: { defaultFollowOn: number; commentaryEnabled?: boolean };
  milestoneFeed: MilestoneEntry[];
  recordFeed: RecordEntry[];
  awardFeed: AwardFeedEntry[];
}

interface SetupInput {
  format: FormatId;
  teamA: Team;
  teamB: Team;
  jokerId?: string;
  followOnMargin: number;
  firstBattingTeam: "A" | "B";
  openingBatterId: string;
  openingBowlerId: string;
  lineupA: string[]; // ordered
  lineupB: string[];
}

interface State {
  players: Player[];
  matches: Match[];
  current?: Match;
  achievements: Achievement[];
  achFeed: AchUnlock[];
  undoStack: Match[];
  settings: { defaultFollowOn: number; commentaryEnabled?: boolean };
  milestoneFeed: MilestoneEntry[];
  recordFeed: RecordEntry[];
  awardFeed: AwardFeedEntry[];



  startMatch: (input: SetupInput) => void;
  setCurrent: (m: Match | undefined) => void;
  scoreEvent: (type: BallEventType, opts?: ApplyOptions) => void;
  undo: () => void;
  setNextBatter: (id: string) => void;
  setNextBowler: (id: string) => void;
  declareInnings: () => void;
  concedeMatch: (declaringTeam: "A" | "B") => void;
  addFieldingEvent: (kind: FieldingEventKind, playerId: string) => void;
  completeMatch: () => void;
  resetAll: () => void;
  addPlayer: (name: string, role?: Player["role"]) => void;
  updatePlayer: (id: string, patch: Partial<Player>) => void;
  resetPlayerToCalculated: (id: string) => void;
  deletePlayer: (id: string) => void;
  importPlayers: (players: Player[]) => void;
  importMatches: (matches: Match[]) => void;
  setSetting: <K extends keyof State["settings"]>(k: K, v: State["settings"][K]) => void;
}

export const usePtsStore = create<State>()(
  persist(
    (set, get) => ({
      players: BASE_PLAYERS,
      matches: [],
      achievements: [],
      achFeed: [],
      undoStack: [],
      settings: { defaultFollowOn: 200 },
      milestoneFeed: [],
      recordFeed: [],
      awardFeed: [],

      startMatch: (input) => {
        const lineup = input.firstBattingTeam === "A" ? input.lineupA : input.lineupB;
        const battingTeam = input.firstBattingTeam;
        const bowlingTeam: "A" | "B" = battingTeam === "A" ? "B" : "A";
        const firstInnings = newInnings(battingTeam, bowlingTeam, lineup, input.format);
        firstInnings.currentBatterId = input.openingBatterId;
        firstInnings.currentBowlerId = input.openingBowlerId;
        const match: Match = {
          id: uid(),
          createdAt: Date.now(),
          format: input.format,
          teamA: input.teamA,
          teamB: input.teamB,
          jokerId: input.jokerId,
          followOnMargin: input.followOnMargin,
          innings: [firstInnings],
          currentInnings: 0,
          probability: [],
        };
        set({ current: match, undoStack: [] });
      },

      setCurrent: (m) => set({ current: m }),

      scoreEvent: (type, opts) => {
        const { current, players, undoStack } = get();
        if (!current) return;
        const snapshot = structuredClone(current);
        const prevProb = computeProbability(current, players);
        const prevBatPct = current.innings[current.currentInnings]
          ? (current.innings[current.currentInnings].battingTeam === "A" ? prevProb.teamA : prevProb.teamB)
          : 50;
        const res = applyEvent(current, type, opts);
        let m = res.match;

        // achievements
        const acks: Achievement[] = res.achievements.map((a) => ({
          id: uid(),
          ts: Date.now(),
          matchId: m.id,
          playerId: a.playerId,
          kind: a.kind,
          text: a.text,
        }));

        // probability snapshot (deterministic)
        const prob = computeProbability(m, players);
        m.probability = [
          ...m.probability,
          {
            ballIndex: m.innings[m.currentInnings].events.length,
            teamA: prob.teamA,
            teamB: prob.teamB,
            note: prob.note,
          },
        ];

        // commentary for the most recent event
        const inn = m.innings[res.inningsClosed ? m.currentInnings : m.currentInnings];
        const lastEv = inn?.events[inn.events.length - 1];
        if (lastEv) {
          const newBatPct = lastEv.inningsIndex >= 0
            ? ((m.innings[lastEv.inningsIndex].battingTeam === "A") ? prob.teamA : prob.teamB)
            : 50;
          const entry = generateCommentaryFor(m, players, lastEv, prevBatPct, newBatPct);
          m.commentary = [...(m.commentary ?? []), entry];
        }

        // innings closed → maybe advance
        if (res.inningsClosed) {
          const teams = { A: m.teamA, B: m.teamB };
          m = advanceInnings(m, teams, m.followOnMargin ?? 200);
        }

        // result detection
        const result = detectResult(m);
        if (result) {
          m.result = result;
          m.completedAt = Date.now();
          // compute awards + story
          m.awards = computeAwards(m, players);
          m.story = buildStory(m, players);
        }

        // ── Live Achievement Engine (§10) — only the stats this ball touched.
        let playersOut = players;
        let newUnlocks: AchUnlock[] = [];
        if (lastEv) {
          const matchLabel = `${m.teamA.name} vs ${m.teamB.name}`;
          const opponent = (t: "A" | "B") => (t === "A" ? m.teamB.name : m.teamA.name);
          const targets: Array<{ id: string; only?: StatKey[] }> = [];
          if (lastEv.batterId) {
            targets.push({
              id: lastEv.batterId,
              only: ["runs", "fours", "fifties", "hundreds", "matchSR", "streak30"],
            });
          }
          if (lastEv.isWicket && lastEv.bowlerId) targets.push({ id: lastEv.bowlerId, only: ["wickets"] });
          if (lastEv.catcherId) targets.push({ id: lastEv.catcherId, only: ["catches", "oneBounceCatches"] });
          const ran = runAchievements(players, targets, { matchId: m.id, matchLabel, opponent, match: m }, "live");
          playersOut = ran.players;
          newUnlocks = ran.unlocks;
          for (const u of newUnlocks) {
            const nm = playerName(playersOut, u.playerId);
            const first = true;
            const innAt = m.innings[m.currentInnings];
            m.commentary = [
              ...(m.commentary ?? []),
              {
                id: uid(), ts: Date.now(), inningsIndex: m.currentInnings,
                ballIndex: innAt?.events.length ?? 0,
                overLabel: innAt ? `${Math.floor(innAt.legalBalls / 6)}.${innAt.legalBalls % 6}` : "0.0",
                text: achievementCommentary(nm, u.achId, first),
                kind: "milestone",
              },
            ];
          }
        }

        set({
          current: m,
          players: playersOut,
          achievements: [...acks, ...get().achievements].slice(0, 500),
          achFeed: [...newUnlocks, ...get().achFeed].slice(0, 5000),
          undoStack: [...undoStack, snapshot].slice(-50),
        });
      },

      undo: () => {
        const { undoStack } = get();
        if (undoStack.length === 0) return;
        const prev = undoStack[undoStack.length - 1];
        set({ current: prev, undoStack: undoStack.slice(0, -1) });
      },

      setNextBatter: (id) => {
        const { current } = get();
        if (!current) return;
        const m = structuredClone(current);
        const innings = m.innings[m.currentInnings];
        innings.currentBatterId = id;
        innings.nextBatterIndex = Math.max(innings.nextBatterIndex, innings.lineup.indexOf(id) + 1);
        set({ current: m });
      },

      setNextBowler: (id) => {
        const { current } = get();
        if (!current) return;
        const m = structuredClone(current);
        const innings = m.innings[m.currentInnings];
        innings.currentBowlerId = id;
        set({ current: m });
      },

      declareInnings: () => {
        const { current, players, undoStack } = get();
        if (!current || current.result) return;
        const snapshot = structuredClone(current);
        let m = structuredClone(current);
        const inn = m.innings[m.currentInnings];
        if (!inn || inn.closed) return;
        inn.closed = true;
        inn.declared = true;
        inn.closeReason = "declared";
        const battingName = inn.battingTeam === "A" ? m.teamA.name : m.teamB.name;
        m.commentary = [
          ...(m.commentary ?? []),
          {
            id: uid(), ts: Date.now(), inningsIndex: m.currentInnings,
            ballIndex: inn.events.length,
            overLabel: `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}`,
            text: `${battingName} declare at ${inn.runs}/${inn.wickets}.`,
            kind: "phase",
          },
        ];
        inn.currentBatterId = undefined;
        inn.currentBowlerId = undefined;
        m = advanceInnings(m, { A: m.teamA, B: m.teamB }, m.followOnMargin ?? 200);
        const result = detectResult(m);
        if (result) {
          m.result = result;
          m.completedAt = Date.now();
          m.awards = computeAwards(m, players);
          m.story = buildStory(m, players);
        }
        set({ current: m, undoStack: [...undoStack, snapshot].slice(-50) });
      },

      /** WIN-D: `declaringTeam` declared the win to the opponent and the
       *  opponent accepted defeat — the declaring team therefore LOSES. */
      concedeMatch: (declaringTeam) => {
        const { current, players, undoStack } = get();
        if (!current || current.result) return;
        const snapshot = structuredClone(current);
        const m = structuredClone(current);
        const inn = m.innings[m.currentInnings];
        if (inn && !inn.closed) {
          inn.closed = true;
          inn.closeReason = "declared";
          inn.currentBatterId = undefined;
          inn.currentBowlerId = undefined;
        }
        const winner: "A" | "B" = declaringTeam === "A" ? "B" : "A";
        const winnerName = winner === "A" ? m.teamA.name : m.teamB.name;
        const loserName = declaringTeam === "A" ? m.teamA.name : m.teamB.name;
        m.winDeclared = { declaringTeam, ts: Date.now() };
        m.result = {
          winner,
          summary: `${winnerName} won — ${loserName} declared the win (WIN-D)`,
        };
        m.completedAt = Date.now();
        m.commentary = [
          ...(m.commentary ?? []),
          {
            id: uid(), ts: Date.now(), inningsIndex: m.currentInnings,
            ballIndex: inn?.events.length ?? 0,
            overLabel: inn ? `${Math.floor(inn.legalBalls / 6)}.${inn.legalBalls % 6}` : "0.0",
            text: `${loserName} declared the win to ${winnerName}. The opposing team accepted the win declaration and conceded the match.`,
            kind: "phase",
          },
        ];
        m.awards = computeAwards(m, players);
        m.story = buildStory(m, players);
        set({ current: m, undoStack: [...undoStack, snapshot].slice(-50) });
      },

      addFieldingEvent: (kind, playerId) => {
        const { current, undoStack } = get();
        if (!current || current.result) return;
        const snapshot = structuredClone(current);
        const m = structuredClone(current);
        m.fieldingEvents = [
          ...(m.fieldingEvents ?? []),
          { id: uid(), ts: Date.now(), inningsIndex: m.currentInnings, playerId, kind },
        ];
        set({ current: m, undoStack: [...undoStack, snapshot].slice(-50) });
      },

      completeMatch: () => {
        const { current, matches, players, milestoneFeed, recordFeed, awardFeed } = get();
        if (!current) return;
        // Snapshot pre-match career values (for milestone/personal-best detection).
        const preById = new Map(players.map((p) => [p.id, structuredClone(p)]));
        // Streak snapshot BEFORE this match (needed to award +12 consistency).
        const priorStreaks = buildStreakSnapshot(matches);
        // credit career stats
        const updated = players.map((p) => ({ ...p, career: { ...p.career } }));
        const counted = new Set<string>();
        for (const inn of current.innings) {
          for (const b of inn.batters) {
            const pl = updated.find((x) => x.id === b.playerId);
            if (!pl) continue;
            pl.career.runs += b.runs;
            pl.career.balls += b.balls;
            pl.career.fours += b.fours;
            pl.career.sixes += b.sixes;
            if (b.runs >= 100) pl.career.hundreds += 1;
            else if (b.runs >= 50) pl.career.fifties += 1;
            if (b.runs >= 150 && b.runs < 200) pl.career.hundred50s = (pl.career.hundred50s ?? 0) + 1;
            if (b.runs >= 200) pl.career.doubleHundreds = (pl.career.doubleHundreds ?? 0) + 1;
            if (b.runs > pl.career.highest) {
              pl.career.highest = b.runs;
              pl.career.highestNotOut = !b.out;
            }
            if (!b.out) pl.career.notOuts += 1;
            pl.career.innings = (pl.career.innings ?? 0) + 1;
            if (b.runs === 0 && b.out) pl.career.ducks = (pl.career.ducks ?? 0) + 1;
            if (b.runs === 0 && b.out && b.balls <= 1) pl.career.goldenDucks = (pl.career.goldenDucks ?? 0) + 1;
            if (b.dismissalType === "six-and-out") pl.career.sixOuts = (pl.career.sixOuts ?? 0) + 1;
            if (b.dismissalType === "hit-wicket") pl.career.hitWickets = (pl.career.hitWickets ?? 0) + 1;
            if (b.dismissalType === "caught" || b.dismissalType === "caught-one-bounce") {
              pl.career.caughtOuts = (pl.career.caughtOuts ?? 0) + 1;
            }
            if (b.balls >= 20) {
              const isr = (b.runs / b.balls) * 100;
              if (isr > (pl.career.bestMatchSR ?? 0)) pl.career.bestMatchSR = isr;
            }
            // Consistency streak (consecutive innings of 30+).
            if (b.runs >= 30) {
              pl.career.streak30Current = (pl.career.streak30Current ?? 0) + 1;
              pl.career.streak30Best = Math.max(pl.career.streak30Best ?? 0, pl.career.streak30Current);
            } else {
              pl.career.streak30Current = 0;
            }
            counted.add(b.playerId);
          }
          for (const ev of inn.events) {
            if (ev.catcherId && ev.dismissalType !== "run-out") {
              const pl = updated.find((x) => x.id === ev.catcherId);
              if (pl) {
                if (ev.dismissalType === "caught-one-bounce") {
                  pl.career.oneBounceCatches = (pl.career.oneBounceCatches ?? 0) + 1;
                } else {
                  pl.career.catches += 1;
                }
              }
            }
            if (ev.isWicket && ev.dismissalType === "run-out" && ev.catcherId) {
              const pl = updated.find((x) => x.id === ev.catcherId);
              if (pl) pl.career.runOuts += 1;
            }
          }
          for (const bw of inn.bowlers) {
            const pl = updated.find((x) => x.id === bw.playerId);
            if (!pl) continue;
            pl.career.wickets += bw.wickets;
            pl.career.bowlBalls += bw.balls;
            pl.career.bowlRuns += bw.runs;
            pl.career.dots = (pl.career.dots ?? 0) + bw.dots;
            pl.career.wides = (pl.career.wides ?? 0) + bw.wides;
            pl.career.noBalls = (pl.career.noBalls ?? 0) + bw.noBalls;
            if (bw.wickets > (pl.career.bestBowlingWkts ?? 0)) {
              pl.career.bestBowlingWkts = bw.wickets;
              pl.career.bestBowlingRuns = bw.runs;
            } else if (bw.wickets === (pl.career.bestBowlingWkts ?? 0) && bw.wickets > 0 &&
                       bw.runs < (pl.career.bestBowlingRuns ?? Infinity)) {
              pl.career.bestBowlingRuns = bw.runs;
            }
            counted.add(bw.playerId);
          }
        }
        for (const id of counted) {
          const pl = updated.find((x) => x.id === id);
          if (pl) pl.career.matches += 1;
        }
        // Expensive match (§12): ONE entry per player per match when the
        // final economy across the whole match is greater than 10.00.
        const bowlAgg = new Map<string, { balls: number; runs: number }>();
        for (const inn of current.innings) {
          for (const bw of inn.bowlers) {
            const a = bowlAgg.get(bw.playerId) ?? { balls: 0, runs: 0 };
            a.balls += bw.balls; a.runs += bw.runs;
            bowlAgg.set(bw.playerId, a);
          }
        }
        for (const [pid, a] of bowlAgg) {
          if (a.balls <= 0) continue;
          if ((a.runs / a.balls) * 6 <= 10) continue;
          const pl = updated.find((x) => x.id === pid);
          if (pl) pl.career.expensiveMatches = (pl.career.expensiveMatches ?? 0) + 1;
        }
        // Fielding extras: dropped catches & boundary saves.
        for (const fe of current.fieldingEvents ?? []) {
          const pl = updated.find((x) => x.id === fe.playerId);
          if (!pl) continue;
          if (fe.kind === "catch-drop") pl.career.catchDrops = (pl.career.catchDrops ?? 0) + 1;
          else pl.career.boundarySaves = (pl.career.boundarySaves ?? 0) + 1;
        }
        // Per-award-type counters + total.
        for (const aw of current.awards ?? []) {
          const pl = updated.find((x) => x.id === aw.playerId);
          if (!pl) continue;
          pl.career.awards += 1;
          const map: Record<string, keyof Player["career"]> = {
            pom: "pomAwards", batsman: "batsmanAwards", bowler: "bowlerAwards",
            fielder: "fielderAwards", fighter: "fighterAwards", worst: "worstAwards",
          };
          const k = map[aw.type];
          if (k) (pl.career as unknown as Record<string, number>)[k] =
            ((pl.career as unknown as Record<string, number>)[k] ?? 0) + 1;
        }

        // --- Build permanent feed entries ---------------------------------
        const opponent = (t: "A" | "B") => (t === "A" ? current.teamB.name : current.teamA.name);
        const matchLabel = `${current.teamA.name} vs ${current.teamB.name}`;
        const now = Date.now();
        const newMilestones: MilestoneEntry[] = [];
        const newRecords: RecordEntry[] = [];
        const newAwards: AwardFeedEntry[] = [];

        // Milestones (crossed a fixed step of MILESTONE_STEPS).
        for (const pl of updated) {
          const pre = preById.get(pl.id);
          if (!pre) continue;
          const check = (key: keyof typeof MILESTONE_STEPS, label: string) => {
            const step = MILESTONE_STEPS[key];
            const preVal = key === "awards" ? totalAwards(pre) :
              (pre.career as unknown as Record<string, number | undefined>)[key] ?? 0;
            const postVal = key === "awards" ? totalAwards(pl) :
              (pl.career as unknown as Record<string, number | undefined>)[key] ?? 0;
            const crossed = Math.floor(postVal / step) - Math.floor(preVal / step);
            for (let i = 1; i <= crossed; i++) {
              const value = (Math.floor(preVal / step) + i) * step;
              // team for opponent — use last innings this player batted/bowled in.
              const team = teamOfPlayer(current, pl.id);
              newMilestones.push({
                id: `${pl.id}-${key}-${value}-${now}-${i}`,
                ts: now, matchId: current.id, playerId: pl.id, statKey: key,
                statLabel: label, value, opponent: opponent(team),
                matchLabel,
              });
              newRecords.push({
                id: `mr-${pl.id}-${key}-${value}-${now}-${i}`,
                ts: now, matchId: current.id, playerId: pl.id,
                kind: "career-milestone",
                recordName: `${value.toLocaleString()} ${label}`,
                value: String(value),
                opponent: opponent(team),
                matchLabel,
              });
            }
          };
          check("runs", "career runs");
          check("fours", "career fours");
          check("sixes", "career sixes");
          check("wickets", "career wickets");
          check("catches", "career catches");
          check("runOuts", "career run outs");
          check("awards", "career awards");
          check("pomAwards", "POTM awards");
          check("batsmanAwards", "BOTM awards");
          check("bowlerAwards", "BOWLTM awards");
          check("fielderAwards", "FOTM awards");
          check("fighterAwards", "Fighter awards");

          // Personal bests
          if ((pre.career.highest ?? 0) < pl.career.highest) {
            const team = teamOfPlayer(current, pl.id);
            newRecords.push({
              id: `pb-hs-${pl.id}-${now}`,
              ts: now, matchId: current.id, playerId: pl.id,
              kind: "highest-score",
              recordName: "New Highest Score",
              value: `${pl.career.highest}${pl.career.highestNotOut ? "*" : ""}`,
              opponent: opponent(team),
              matchLabel,
            });
          }
          if ((pre.career.bestBowlingWkts ?? 0) < (pl.career.bestBowlingWkts ?? 0) ||
              ((pre.career.bestBowlingWkts ?? 0) === (pl.career.bestBowlingWkts ?? 0) &&
               (pl.career.bestBowlingRuns ?? 0) < (pre.career.bestBowlingRuns ?? Infinity) &&
               (pl.career.bestBowlingWkts ?? 0) > 0)) {
            const team = teamOfPlayer(current, pl.id);
            newRecords.push({
              id: `pb-bb-${pl.id}-${now}`,
              ts: now, matchId: current.id, playerId: pl.id,
              kind: "best-bowling",
              recordName: "New Best Bowling",
              value: `${pl.career.bestBowlingWkts}/${pl.career.bestBowlingRuns}`,
              opponent: opponent(team),
              matchLabel,
            });
          }
        }

        // Award feed
        for (const aw of current.awards ?? []) {
          newAwards.push({
            id: `af-${current.id}-${aw.type}-${aw.playerId}`,
            ts: now, matchId: current.id, matchLabel,
            awardType: aw.type, playerId: aw.playerId, headline: aw.headline,
            reason: aw.reason, team: aw.team,
          });
        }

        // --- Achievement Progress (§ v3.3.4) -------------------------------
        // Progress counters only ever grow from matches played after the
        // achievement system was installed — never from career statistics.
        const progress = new Map<string, Partial<AchStats>>();
        const bump = (id: string, k: keyof AchStats, v: number, max = false) => {
          const d = progress.get(id) ?? {};
          d[k] = max ? Math.max(d[k] ?? 0, v) : (d[k] ?? 0) + v;
          progress.set(id, d);
        };
        const consPts = new Map<string, number>();
        const streakNow = new Map<string, number>(
          players.map((p) => [p.id, p.career.streak30Current ?? 0]),
        );
        for (const inn of current.innings) {
          for (const b of inn.batters) {
            bump(b.playerId, "runs", b.runs);
            bump(b.playerId, "fours", b.fours);
            if (b.runs >= 100) bump(b.playerId, "hundreds", 1);
            else if (b.runs >= 50) bump(b.playerId, "fifties", 1);
            if (b.balls >= 20) bump(b.playerId, "matchSR", (b.runs / b.balls) * 100, true);
            if (b.runs === 0 && b.out) bump(b.playerId, "ducks", 1);
            if (b.runs === 0 && b.out && b.balls <= 1) bump(b.playerId, "goldenDucks", 1);
            if (b.dismissalType === "six-and-out") bump(b.playerId, "sixOuts", 1);
            if (b.dismissalType === "hit-wicket") bump(b.playerId, "hitWickets", 1);
            if (b.dismissalType === "caught" || b.dismissalType === "caught-one-bounce") {
              bump(b.playerId, "caughtOuts", 1);
            }
            // Consistency: consecutive 30+ innings only.
            const s = b.runs >= 30 ? (streakNow.get(b.playerId) ?? 0) + 1 : 0;
            streakNow.set(b.playerId, s);
            if (b.runs >= 30) {
              consPts.set(b.playerId, (consPts.get(b.playerId) ?? 0) + (s >= 3 ? 18 : 6));
              bump(b.playerId, "streak30", s, true);
            }
          }
          for (const bw of inn.bowlers) bump(bw.playerId, "wickets", bw.wickets);
          for (const ev of inn.events) {
            if (!ev.catcherId) continue;
            if (ev.dismissalType === "caught") bump(ev.catcherId, "catches", 1);
            if (ev.dismissalType === "caught-one-bounce") bump(ev.catcherId, "oneBounceCatches", 1);
          }
        }
        for (const [pid, a] of bowlAgg) {
          if (a.balls > 0 && (a.runs / a.balls) * 6 > 10) bump(pid, "expensiveMatches", 1);
        }
        for (const fe of current.fieldingEvents ?? []) {
          if (fe.kind === "catch-drop") bump(fe.playerId, "catchDrops", 1);
        }
        for (const aw of current.awards ?? []) {
          if (aw.type === "pom") bump(aw.playerId, "pom", 1);
          if (aw.type === "fighter") bump(aw.playerId, "fighter", 1);
          if (aw.type === "fielder") bump(aw.playerId, "fielder", 1);
        }

        // --- New v4 Achievement Stats ------------------------------------
        // Duck Dodger: No-duck streak (a duck resets the streak)
        const duckStreak: Record<string, number> = {};
        for (const pl of players) duckStreak[pl.id] = pl.achievementStreaks?.duckDodge ?? 0;
        for (const b of current.innings.flatMap(i => i.batters)) {
          if (b.runs === 0 && b.out) {
            // Duck - reset streak
            duckStreak[b.playerId] = 0;
          } else if (b.runs > 0) {
            // Scored runs - increment streak
            duckStreak[b.playerId] = (duckStreak[b.playerId] ?? 0) + 1;
            bump(b.playerId, "duckDodgeStreak", duckStreak[b.playerId], true);
          }
        }
        // Persist duck streak back to player.achievementStreaks
        for (const pl of updated) {
          const streak = duckStreak[pl.id] ?? 0;
          pl.achievementStreaks = { duckDodge: streak, economyGuardian: pl.achievementStreaks?.economyGuardian ?? 0 };
        }

        // Economy Guardian: Economy ≤8 streak (economy > 8 resets streak)
        const economyStreak: Record<string, number> = {};
        for (const pl of players) economyStreak[pl.id] = pl.achievementStreaks?.economyGuardian ?? 0;
        for (const [pid, a] of bowlAgg) {
          const econ = a.balls > 0 ? (a.runs / a.balls) * 6 : 0;
          if (econ > 8) {
            // Expensive - reset streak
            economyStreak[pid] = 0;
          } else if (econ <= 8 && econ > 0) {
            // Good economy - increment streak
            economyStreak[pid] = (economyStreak[pid] ?? 0) + 1;
            bump(pid, "economyGuardianStreak", economyStreak[pid], true);
          }
        }
        // Persist economy streak back to player.achievementStreaks
        for (const pl of updated) {
          const streak = economyStreak[pl.id] ?? 0;
          pl.achievementStreaks = { duckDodge: pl.achievementStreaks?.duckDodge ?? 0, economyGuardian: streak };
        }

        // Match Appearances: one per player who participated in the match
        for (const id of counted) {
          bump(id, "matchAppearances", 1);
        }

        // Chase Survivor: Not-out innings while chasing
        const target = current.target;
        for (const inn of current.innings) {
          const isChase = target !== undefined && inn.battingTeam === (current.innings[0].battingTeam === "A" ? "B" : "A");
          if (!isChase) continue;
          for (const b of inn.batters) {
            if (!b.out) {
              bump(b.playerId, "chasingNotOuts", 1);
            }
          }
        }

        // Boundary Saves (already tracked in fielding events, but also track here for consistency)
        for (const fe of current.fieldingEvents ?? []) {
          if (fe.kind === "boundary-save") bump(fe.playerId, "boundarySaves", 1);
        }

        // Botm/Bowltm awards (batsman/bowler awards)
        for (const aw of current.awards ?? []) {
          if (aw.type === "batsman") bump(aw.playerId, "botmAwards", 1);
          if (aw.type === "bowler") bump(aw.playerId, "bowltmAwards", 1);
        }

        // Low Scores: scores below 10
        for (const inn of current.innings) {
          for (const b of inn.batters) {
            if (b.runs > 0 && b.runs < 10) bump(b.playerId, "lowScores", 1);
          }
        }

        // Worst Awards
        for (const aw of current.awards ?? []) {
          if (aw.type === "worst") bump(aw.playerId, "worstAwards", 1);
        }

        // Bowled Dismissals
        for (const inn of current.innings) {
          for (const b of inn.batters) {
            if (b.dismissalType === "bowled") bump(b.playerId, "bowledDismissals", 1);
          }
        }

        // Extras Given (wides + no-balls from bowler)
        for (const inn of current.innings) {
          for (const bw of inn.bowlers) {
            const extras = (bw.wides ?? 0) + (bw.noBalls ?? 0);
            if (extras > 0) bump(bw.playerId, "extrasGiven", extras);
          }
        }
        for (let i = 0; i < updated.length; i++) {
          const d = progress.get(updated[i].id);
          if (d) updated[i] = addAchProgress(updated[i], d);
        }

        // --- Net Match Points (base, before multipliers) -------------------
        // Used by ranking buckets; multiplier applied later with final achievements.
        const mp = computeMatchPoints(current, updated, priorStreaks);

        // --- Ranking buckets: never reset, only ever extended --------------
        for (let i = 0; i < updated.length; i++) {
          const pre = preById.get(updated[i].id);
          if (!pre) continue;
          const pm = mp.get(updated[i].id);
          if (!pm && !consPts.get(updated[i].id)) continue;
          const delta = matchBucketDeltas(pre, updated[i], {
            consistencyPoints: consPts.get(updated[i].id) ?? 0,
            netMatchPoints: pm?.net ?? 0,
          });
          updated[i] = { ...updated[i], buckets: addBuckets(playerBuckets(updated[i]), delta) };
        }

        // --- Result Achievement Engine (§11 / §12) -------------------------
        // Awards, expensive matches and every Hall Of Shame achievement are
        // only checked once the match is officially over. Live categories are
        // re-checked too so nothing is ever skipped.
        const participants = Array.from(counted).map((id) => ({
          id,
          only: [...RESULT_ONLY_STATS, "runs", "fifties", "hundreds", "matchSR",
                 "wickets", "fours", "catches", "oneBounceCatches", "streak30"] as StatKey[],
        }));
        const finalRun = runAchievements(
          updated, participants,
          { matchId: current.id, matchLabel, opponent, match: current },
          "final",
        );
        const finalPlayers = finalRun.players;

        // --- Net Match Points (with final Legacy/Meltdown levels) -------------
        // Awards the completed match's final achievements are included in the
        // Legacy/Meltdown level calculation, so the multiplier uses the player's
        // unlocked achievement count AFTER this match's achievements are applied.
        const finalWithPts = finalPlayers.map((pl) => {
          const pm = mp.get(pl.id);
          if (!pm) return pl;
          const ll = legacyLevelFromAchievements(pl);
          const ml = meltdownLevelFromAchievements(pl);
          const layered = layerResult(pm.net, ll, ml);
          return { ...pl, matchPoints: (pl.matchPoints ?? 0) + Math.round(layered.finalResult) };
        });

        // Permanent Points Breakdown saved with the scorecard.
        const completed: Match = {
          ...current,
          pointsBreakdown: buildPointsBreakdown(current, finalWithPts, matches),
          commentary: [
            ...(current.commentary ?? []),
            ...finalRun.unlocks.map((u, i) => ({
              id: `ach-${u.id}-${i}`, ts: u.ts, inningsIndex: current.currentInnings,
              ballIndex: 0, overLabel: "—",
              text: achievementCommentary(playerName(finalPlayers, u.playerId), u.achId, true),
              kind: "milestone" as const,
            })),
          ],
        };

        set({
          matches: [completed, ...matches],
          players: finalWithPts,
          current: undefined,
          undoStack: [],
          achFeed: [...finalRun.unlocks, ...get().achFeed].slice(0, 5000),
          milestoneFeed: [...newMilestones, ...milestoneFeed].slice(0, 2000),
          recordFeed: [...newRecords, ...recordFeed].slice(0, 2000),
          awardFeed: [...newAwards, ...awardFeed].slice(0, 2000),
        });
      },

      resetAll: () => set({
        players: BASE_PLAYERS, matches: [], current: undefined,
        achievements: [], achFeed: [], undoStack: [],
        milestoneFeed: [], recordFeed: [], awardFeed: [],
      }),

      addPlayer: (name, role) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        const newPlayer: Player = {
          id: uid(),
          name: trimmed,
          createdAt: Date.now(),
          role: role ?? "—",
          seed: { hundreds: 0, fifties: 0, highest: 0, highestNotOut: false },
          career: {
            matches: 0, runs: 0, balls: 0, fours: 0, sixes: 0,
            hundreds: 0, fifties: 0, highest: 0, highestNotOut: false,
            wickets: 0, bowlBalls: 0, bowlRuns: 0, catches: 0,
            runOuts: 0, awards: 0, notOuts: 0,
          },
          ratings: {
            overall: 50, batting: 50, bowling: 50, fielding: 50,
            pressure: 50, matchWinning: 50, wicketTaking: 50,
            sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50,
          },
          notes: "New player, default rating 50.",
        };
        set({ players: [...get().players, newPlayer] });
      },

      updatePlayer: (id, patch) => {
        const players = get().players.map((p) => {
          if (p.id !== id) return p;
          const edits = p.edits ? [...p.edits] : [];
          // Track top-level scalar changes for audit (shallow)
          for (const [k, v] of Object.entries(patch)) {
            if (k === "edits" || k === "career" || k === "ratings" || k === "seed") continue;
            const old = (p as unknown as Record<string, unknown>)[k];
            if (old !== v && (typeof v === "string" || typeof v === "number")) {
              edits.push({ ts: Date.now(), field: k, from: String(old ?? ""), to: v });
            }
          }
          return {
            ...p,
            ...patch,
            seed: patch.seed ? { ...p.seed, ...patch.seed } : p.seed,
            career: patch.career ? { ...p.career, ...patch.career } : p.career,
            ratings: patch.ratings ? { ...(p.ratings ?? {}), ...patch.ratings } : p.ratings,
            manualOverride: true,
            edits,
          };
        });
        set({ players });
      },

      resetPlayerToCalculated: (id) => {
        const seed = SEED_PLAYERS.find((p) => p.id === id);
        if (!seed) return;
        const players = get().players.map((p) =>
          p.id === id
            ? {
                ...p, seed: seed.seed, career: seed.career, ratings: undefined,
                manualOverride: false, edits: [],
                historicRankingPoints: seed.historicRankingPoints ?? 0,
              }
            : p,
        );
        set({ players });
      },

      deletePlayer: (id) => {
        set({ players: get().players.filter((p) => p.id !== id) });
      },

      importPlayers: (incoming) => {
        if (!Array.isArray(incoming)) return;
        const byId = new Map<string, Player>();
        for (const p of get().players) byId.set(p.id, p);
        for (const p of incoming) {
          if (!p || typeof p !== "object" || !(p as Player).id) continue;
          const existing = byId.get((p as Player).id);
          byId.set((p as Player).id, existing ? { ...existing, ...(p as Player) } : (p as Player));
        }
        set({ players: Array.from(byId.values()) });
      },

      importMatches: (incoming) => {
        if (!Array.isArray(incoming)) return;
        set({ matches: incoming });
      },

      setSetting: (k, v) => set({ settings: { ...get().settings, [k]: v } }),
    }),
    {
      name: "pts-scorer-v1",
      version: 12,
      migrate: (persisted: unknown) => {
        const s = (persisted ?? {}) as {
          players?: Player[]; matches?: Match[]; milestoneFeed?: MilestoneEntry[];
          recordFeed?: RecordEntry[]; awardFeed?: AwardFeedEntry[];
          achFeed?: AchUnlock[];
          awardsSeededV6?: boolean; historicRankingFrozenV7?: boolean;
          historicBonusV9?: boolean; achBaselineV334?: boolean;
        };
        s.milestoneFeed = s.milestoneFeed ?? [];
        s.recordFeed = s.recordFeed ?? [];
        s.awardFeed = s.awardFeed ?? [];
        s.achFeed = s.achFeed ?? [];
        const existing = s.players ?? [];
        const seedIds = new Set(SEED_PLAYERS.map((p) => p.id));
        // Upgrade existing players with any missing optional fields.
        const byId = new Map<string, Player>();
        for (const p of existing) {
          // Drop old beginner/placeholder rows that are no longer in the
          // official seed and have not been manually edited or used.
          if (!seedIds.has(p.id) && !p.manualOverride && (p.career?.matches ?? 0) === 0) continue;
          byId.set(p.id, {
            ...p,
            role: p.role ?? "—",
            notes: p.notes ?? "",
            edits: p.edits ?? [],
            manualOverride: p.manualOverride ?? false,
            ratings: p.ratings && Object.keys(p.ratings).length > 0
              ? p.ratings
              : {
                  overall: 50, batting: 50, bowling: 50, fielding: 50,
                  pressure: 50, matchWinning: 50, wicketTaking: 50,
                  sixHitting: 50, deathBat: 50, deathBowl: 50, recentForm: 50,
                },
            career: {
              innings: 0, ducks: 0, hundred50s: 0, doubleHundreds: 0,
              maidens: 0, dots: 0, wides: 0, noBalls: 0,
              bestBowlingWkts: 0, bestBowlingRuns: 0,
              catchDrops: 0, boundarySaves: 0,
              pomAwards: 0, batsmanAwards: 0, bowlerAwards: 0,
              fielderAwards: 0, fighterAwards: 0, worstAwards: 0,
              ...p.career,
            },
          });
        }
        // Ensure every official seed player exists (adds Himmu/Madhu/Chitti).
        // Never overwrite manually-edited careers, and never overwrite once
        // real match history exists.
        const hasHistory = (s.matches?.length ?? 0) > 0;
        for (const seed of SEED_PLAYERS) {
          const cur = byId.get(seed.id);
          if (!cur) {
            byId.set(seed.id, seed);
            continue;
          }
          if (cur.manualOverride || hasHistory) continue;
          byId.set(seed.id, {
            ...cur,
            role: seed.role,
            notes: seed.notes,
            ratings: { ...seed.ratings },
            career: { ...seed.career },
          });
        }
        // One-time official award-split seed. Only applies when the player
        // has never been manually edited AND no per-type awards exist yet.
        // Preserves any cloud-edited award counts.
        if (!s.awardsSeededV6) {
          for (const [pid, split] of Object.entries(OFFICIAL_AWARD_SPLITS)) {
            const cur = byId.get(pid);
            if (!cur) continue;
            const hasCustomAwards =
              (cur.career.pomAwards ?? 0) + (cur.career.batsmanAwards ?? 0) +
              (cur.career.bowlerAwards ?? 0) + (cur.career.fielderAwards ?? 0) +
              (cur.career.fighterAwards ?? 0) + (cur.career.worstAwards ?? 0) > 0;
            if (hasCustomAwards) continue;
            const total = split.pom + split.batsman + split.bowler + split.fielder + split.fighter + split.worst;
            byId.set(pid, {
              ...cur,
              career: {
                ...cur.career,
                pomAwards: split.pom,
                batsmanAwards: split.batsman,
                bowlerAwards: split.bowler,
                fielderAwards: split.fielder,
                fighterAwards: split.fighter,
                worstAwards: split.worst,
                awards: Math.max(cur.career.awards ?? 0, total),
              },
            });
          }
          s.awardsSeededV6 = true;
        }
        s.players = Array.from(byId.values());
        // v7: freeze historic four/wicket snapshot & init matchPoints.
        if (!s.historicRankingFrozenV7) {
          s.players = s.players.map((p) => ({
            ...p,
            historicFours: p.historicFours ?? p.career?.fours ?? 0,
            historicWickets: p.historicWickets ?? p.career?.wickets ?? 0,
            matchPoints: p.matchPoints ?? 0,
          }));
          s.historicRankingFrozenV7 = true;
        }
        // v9: restore legacy historic ranking contributions from the seed.
        if (!s.historicBonusV9) {
          const bonusById = new Map(
            SEED_PLAYERS.map((p) => [p.id, p.historicRankingPoints ?? 0]),
          );
          s.players = s.players.map((p) => ({
            ...p,
            historicRankingPoints: p.historicRankingPoints ?? bonusById.get(p.id) ?? 0,
          }));
          s.historicBonusV9 = true;
        }
        // v10: official PTS historic baseline (fours, wickets, catches,
        // awards & consistency streaks restored + calibrated totals).
        s.players = applyHistoricBaselineAll(s.players);
        // v12 (v3.3.4): the Achievement System starts now — every progress
        // counter at zero, official career totals and official ranking
        // buckets restored. Buckets are never recalculated afterwards.
        if (!s.achBaselineV334) {
          s.players = withOfficialBaseline(s.players).map((p) => ({
            ...p,
            buckets: OFFICIAL_BUCKETS[p.id] ?? p.buckets ?? { ...ZERO_BUCKETS },
          }));
          s.achBaselineV334 = true;
        }
        return s as never;
      },
    },
  ),
);

export function playerName(players: Player[], id: string | undefined) {
  return players.find((p) => p.id === id)?.name ?? "—";
}