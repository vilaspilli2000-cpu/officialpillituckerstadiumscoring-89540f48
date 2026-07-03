import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Achievement, AwardFeedEntry, BallEventType, FormatId, Match, MilestoneEntry,
  Player, RecordEntry, Team,
} from "./types";
import { SEED_PLAYERS } from "./seed";
import { applyEvent, type ApplyOptions } from "./engine";
import { advanceInnings, detectResult, newInnings, totalInningsFor } from "./formats";
import { computeAwards } from "./awards";
import { buildStory } from "./story";
import { computeProbability } from "./probability";
import { generateCommentaryFor } from "./commentary";
import { MILESTONE_STEPS, nextMilestoneTarget, totalAwards } from "./milestones";

function teamOfPlayer(m: Match, playerId: string): "A" | "B" {
  if (m.teamA.playerIds.includes(playerId)) return "A";
  return "B";
}

const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

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
      players: SEED_PLAYERS,
      matches: [],
      achievements: [],
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

        set({
          current: m,
          achievements: [...acks, ...get().achievements].slice(0, 500),
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

      completeMatch: () => {
        const { current, matches, players, milestoneFeed, recordFeed, awardFeed } = get();
        if (!current) return;
        // Snapshot pre-match career values (for milestone/personal-best detection).
        const preById = new Map(players.map((p) => [p.id, structuredClone(p)]));
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
            counted.add(b.playerId);
          }
          for (const ev of inn.events) {
            if (ev.catcherId && ev.dismissalType !== "run-out") {
              const pl = updated.find((x) => x.id === ev.catcherId);
              if (pl) pl.career.catches += 1;
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

        set({
          matches: [current, ...matches],
          players: updated,
          current: undefined,
          undoStack: [],
          milestoneFeed: [...newMilestones, ...milestoneFeed].slice(0, 2000),
          recordFeed: [...newRecords, ...recordFeed].slice(0, 2000),
          awardFeed: [...newAwards, ...awardFeed].slice(0, 2000),
        });
      },

      resetAll: () => set({
        players: SEED_PLAYERS, matches: [], current: undefined,
        achievements: [], undoStack: [],
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
            ? { ...p, seed: seed.seed, career: seed.career, ratings: undefined, manualOverride: false, edits: [] }
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
      version: 5,
      migrate: (persisted: unknown) => {
        const s = (persisted ?? {}) as {
          players?: Player[]; milestoneFeed?: MilestoneEntry[];
          recordFeed?: RecordEntry[]; awardFeed?: AwardFeedEntry[];
        };
        s.milestoneFeed = s.milestoneFeed ?? [];
        s.recordFeed = s.recordFeed ?? [];
        s.awardFeed = s.awardFeed ?? [];
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
              pomAwards: 0, batsmanAwards: 0, bowlerAwards: 0,
              fielderAwards: 0, fighterAwards: 0, worstAwards: 0,
              ...p.career,
            },
          });
        }
        // Sync with official seed: refresh every un-edited player with the
        // official record; never overwrite manual edits.
        for (const seed of SEED_PLAYERS) {
          const cur = byId.get(seed.id);
          if (!cur) {
            byId.set(seed.id, seed);
            continue;
          }
          if (cur.manualOverride) continue;
          byId.set(seed.id, {
            ...cur,
            role: seed.role,
            notes: seed.notes,
            ratings: { ...seed.ratings },
            career: { ...seed.career },
          });
        }
        s.players = Array.from(byId.values());
        return s as never;
      },
    },
  ),
);

export function playerName(players: Player[], id: string | undefined) {
  return players.find((p) => p.id === id)?.name ?? "—";
}