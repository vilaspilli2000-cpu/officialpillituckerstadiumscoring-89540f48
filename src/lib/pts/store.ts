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
  settings: { defaultFollowOn: number };

  startMatch: (input: SetupInput) => void;
  setCurrent: (m: Match | undefined) => void;
  scoreEvent: (type: BallEventType, opts?: ApplyOptions) => void;
  undo: () => void;
  setNextBatter: (id: string) => void;
  setNextBowler: (id: string) => void;
  completeMatch: () => void;
  resetAll: () => void;
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
    }),
    {
      name: "pts-scorer-v1",
      version: 1,
    },
  ),
);

export function playerName(players: Player[], id: string | undefined) {
  return players.find((p) => p.id === id)?.name ?? "—";
}