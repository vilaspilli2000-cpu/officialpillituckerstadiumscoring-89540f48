import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Achievement, BallEventType, FormatId, Match, Player, Team } from "./types";
import { SEED_PLAYERS } from "./seed";
import { applyEvent, type ApplyOptions } from "./engine";
import { advanceInnings, detectResult, newInnings, totalInningsFor } from "./formats";
import { computeAwards } from "./awards";
import { buildStory } from "./story";
import { computeProbability } from "./probability";

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

        // probability snapshot
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
        const { current, matches, players } = get();
        if (!current) return;
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
            if (b.runs > pl.career.highest) {
              pl.career.highest = b.runs;
              pl.career.highestNotOut = !b.out;
            }
            if (!b.out) pl.career.notOuts += 1;
            counted.add(b.playerId);
          }
          for (const ev of inn.events) {
            if (ev.catcherId) {
              const pl = updated.find((x) => x.id === ev.catcherId);
              if (pl) pl.career.catches += 1;
            }
          }
          for (const bw of inn.bowlers) {
            const pl = updated.find((x) => x.id === bw.playerId);
            if (!pl) continue;
            pl.career.wickets += bw.wickets;
            pl.career.bowlBalls += bw.balls;
            pl.career.bowlRuns += bw.runs;
            counted.add(bw.playerId);
          }
        }
        for (const id of counted) {
          const pl = updated.find((x) => x.id === id);
          if (pl) pl.career.matches += 1;
        }
        for (const aw of current.awards ?? []) {
          const pl = updated.find((x) => x.id === aw.playerId);
          if (pl) pl.career.awards += 1;
        }
        set({
          matches: [current, ...matches],
          players: updated,
          current: undefined,
          undoStack: [],
        });
      },

      resetAll: () => set({ players: SEED_PLAYERS, matches: [], current: undefined, achievements: [], undoStack: [] }),

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

      importPlayers: (incoming) => {
        if (!Array.isArray(incoming)) return;
        set({ players: incoming });
      },

      importMatches: (incoming) => {
        if (!Array.isArray(incoming)) return;
        set({ matches: incoming });
      },

      setSetting: (k, v) => set({ settings: { ...get().settings, [k]: v } }),
    }),
    {
      name: "pts-scorer-v1",
      version: 3,
      migrate: (persisted: unknown) => {
        const s = (persisted ?? {}) as { players?: Player[] };
        const existing = s.players ?? [];
        // Upgrade existing players with any missing optional fields.
        const byId = new Map<string, Player>();
        for (const p of existing) {
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
              ...p.career,
            },
          });
        }
        // Add any new seed players that don't yet exist; never overwrite manual edits.
        for (const seed of SEED_PLAYERS) {
          if (byId.has(seed.id)) {
            const cur = byId.get(seed.id)!;
            if (!cur.manualOverride) {
              // Refresh notes/role/ratings/career baseline from seed for unedited players.
              byId.set(seed.id, {
                ...cur,
                role: cur.role && cur.role !== "—" ? cur.role : seed.role,
                notes: cur.notes && cur.notes.length > 0 ? cur.notes : seed.notes,
                ratings: { ...seed.ratings, ...(cur.ratings ?? {}) },
                career: { ...seed.career, ...cur.career },
              });
            }
          } else {
            byId.set(seed.id, seed);
          }
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