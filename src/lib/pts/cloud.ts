import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import { usePtsStore, type SyncedState } from "./store";

const DEVICE_KEY = "pts-device-id";

export function deviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export type SyncStatus = "idle" | "loading" | "synced" | "saving" | "offline" | "error";

interface CloudState {
  ready: boolean;
  userId: string | null;
  email: string | null;
  role: "admin" | "viewer" | null;
  status: SyncStatus;
  version: number;
  scoringDevice: string | null;
  scoringHeartbeat: string | null;
  pendingWrites: number;
  lastError: string | null;
}

export const useCloud = create<CloudState>(() => ({
  ready: false,
  userId: null,
  email: null,
  role: null,
  status: "idle",
  version: -1,
  scoringDevice: null,
  scoringHeartbeat: null,
  pendingWrites: 0,
  lastError: null,
}));

/** True when this device may write (admin + holds the lock or lock is free/stale). */
export function canScoreHere(s = useCloud.getState()) {
  if (s.role !== "admin") return false;
  if (!s.scoringDevice) return true;
  if (s.scoringDevice === deviceId()) return true;
  const hb = s.scoringHeartbeat ? Date.parse(s.scoringHeartbeat) : 0;
  return Date.now() - hb > 90_000;
}

// ---------------------------------------------------------------- sync engine

let applyingRemote = false;
let dirty = false;
let pushing = false;
let timer: ReturnType<typeof setTimeout> | null = null;
let unsubStore: (() => void) | null = null;
let channel: ReturnType<typeof supabase.channel> | null = null;
let heartbeat: ReturnType<typeof setInterval> | null = null;

function snapshot(): SyncedState & { __origin: string } {
  const s = usePtsStore.getState();
  return {
    players: s.players,
    matches: s.matches,
    current: s.current,
    achievements: s.achievements,
    settings: s.settings,
    milestoneFeed: s.milestoneFeed,
    recordFeed: s.recordFeed,
    awardFeed: s.awardFeed,
    __origin: deviceId(),
  };
}

function applyRemote(data: unknown) {
  if (!data || typeof data !== "object") return;
  const d = data as Partial<SyncedState>;
  if (!Array.isArray(d.players)) return;
  applyingRemote = true;
  try {
    usePtsStore.setState({
      players: d.players ?? [],
      matches: d.matches ?? [],
      current: d.current,
      achievements: d.achievements ?? [],
      settings: d.settings ?? { defaultFollowOn: 200 },
      milestoneFeed: d.milestoneFeed ?? [],
      recordFeed: d.recordFeed ?? [],
      awardFeed: d.awardFeed ?? [],
    });
  } finally {
    applyingRemote = false;
  }
}

async function doPush() {
  if (pushing) {
    dirty = true;
    return;
  }
  const s = useCloud.getState();
  if (s.role !== "admin" || !s.userId) return;
  pushing = true;
  dirty = false;
  useCloud.setState({ status: "saving" });
  try {
    const claiming = !!usePtsStore.getState().current;
    const { data, error } = await supabase.rpc("pts_push_state", {
      _expected_version: -1,
      _data: snapshot() as never,
      _device: (claiming ? deviceId() : null) as unknown as string,
    });
    if (error) throw error;
    const row = (Array.isArray(data) ? data[0] : data) as
      | { version?: number; scoring_device?: string | null; scoring_heartbeat?: string | null }
      | null;
    if (row) {
      useCloud.setState({
        version: Number(row.version ?? 0),
        scoringDevice: row.scoring_device ?? null,
        scoringHeartbeat: row.scoring_heartbeat ?? null,
      });
    }
    useCloud.setState({ status: "synced", pendingWrites: 0, lastError: null });
  } catch (err) {
    dirty = true;
    const offline = typeof navigator !== "undefined" && !navigator.onLine;
    useCloud.setState({
      status: offline ? "offline" : "error",
      pendingWrites: useCloud.getState().pendingWrites + 1,
      lastError: err instanceof Error ? err.message : String(err),
    });
  } finally {
    pushing = false;
    if (dirty) schedulePush(1000);
  }
}

function schedulePush(delay = 200) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void doPush();
  }, delay);
}

/** Force an immediate flush. */
export function flushNow() {
  if (timer) clearTimeout(timer);
  timer = null;
  void doPush();
}

function watchStore() {
  if (unsubStore) return;
  let prev = snapshot();
  unsubStore = usePtsStore.subscribe(() => {
    if (applyingRemote) return;
    const next = snapshot();
    const changed =
      prev.players !== next.players ||
      prev.matches !== next.matches ||
      prev.current !== next.current ||
      prev.settings !== next.settings ||
      prev.milestoneFeed !== next.milestoneFeed ||
      prev.recordFeed !== next.recordFeed ||
      prev.awardFeed !== next.awardFeed ||
      prev.achievements !== next.achievements;
    prev = next;
    if (!changed) return;
    if (useCloud.getState().role !== "admin") return;
    dirty = true;
    schedulePush(150);
  });
}

async function loadRole(userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role);
  return roles.includes("admin") ? "admin" : "viewer";
}

async function pullState() {
  const { data, error } = await supabase
    .from("pts_state")
    .select("version, data, scoring_device, scoring_heartbeat")
    .eq("id", "global")
    .maybeSingle();
  if (error) throw error;
  return data;
}

function subscribeRealtime() {
  if (channel) return;
  channel = supabase
    .channel("pts-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pts_state" },
      (payload) => {
        const row = payload.new as {
          version?: number;
          data?: Record<string, unknown>;
          scoring_device?: string | null;
          scoring_heartbeat?: string | null;
        };
        if (!row) return;
        useCloud.setState({
          version: Number(row.version ?? 0),
          scoringDevice: row.scoring_device ?? null,
          scoringHeartbeat: row.scoring_heartbeat ?? null,
        });
        const origin = (row.data as { __origin?: string } | undefined)?.__origin;
        if (origin === deviceId()) return;
        applyRemote(row.data);
        useCloud.setState({ status: "synced" });
      },
    )
    .subscribe();
}

/** Boot the cloud layer for the signed-in user. */
export async function initCloud(userId: string, email: string | null) {
  useCloud.setState({ status: "loading", userId, email });
  const role = await loadRole(userId);
  useCloud.setState({ role });

  try {
    const row = await pullState();
    const remote = (row?.data ?? undefined) as Record<string, unknown> | undefined;
    const players = (remote as { players?: unknown[] } | undefined)?.players;
    const matches = (remote as { matches?: unknown[] } | undefined)?.matches;
    const hasRemote =
      (Array.isArray(players) && players.length > 0) ||
      (Array.isArray(matches) && matches.length > 0);

    if (hasRemote) {
      // Cloud is the source of truth — discard whatever this device had.
      applyRemote(remote);
      useCloud.setState({
        version: Number(row?.version ?? 0),
        scoringDevice: row?.scoring_device ?? null,
        scoringHeartbeat: row?.scoring_heartbeat ?? null,
        status: "synced",
      });
    } else if (role === "admin") {
      // First launch: this device seeds the cloud database.
      await doPush();
    } else {
      useCloud.setState({ status: "synced" });
    }
  } catch (err) {
    useCloud.setState({
      status: typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error",
      lastError: err instanceof Error ? err.message : String(err),
    });
  }

  subscribeRealtime();
  watchStore();
  startHeartbeat();

  if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
      if (dirty) flushNow();
      else void refresh();
    });
  }
  useCloud.setState({ ready: true });
}

function startHeartbeat() {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    const s = useCloud.getState();
    if (s.role !== "admin") return;
    if (dirty) {
      flushNow();
      return;
    }
    if (s.scoringDevice === deviceId() && usePtsStore.getState().current) {
      void supabase.rpc("pts_claim_scoring", { _device: deviceId(), _force: false });
    }
  }, 30_000);
}

export async function refresh() {
  try {
    const row = await pullState();
    if (!row) return;
    useCloud.setState({
      version: Number(row.version ?? 0),
      scoringDevice: row.scoring_device ?? null,
      scoringHeartbeat: row.scoring_heartbeat ?? null,
      status: "synced",
    });
    const origin = (row.data as { __origin?: string } | null)?.__origin;
    if (origin !== deviceId()) applyRemote(row.data);
  } catch {
    /* offline — keep the local cache */
  }
}

export async function claimScoring(force = false) {
  const { error } = await supabase.rpc("pts_claim_scoring", { _device: deviceId(), _force: force });
  if (error) return { ok: false, error: error.message };
  await refresh();
  return { ok: true };
}

export async function releaseScoring() {
  await supabase.rpc("pts_release_scoring", { _device: deviceId() });
  await refresh();
}

export function teardownCloud() {
  if (channel) {
    void supabase.removeChannel(channel);
    channel = null;
  }
  if (unsubStore) {
    unsubStore();
    unsubStore = null;
  }
  if (heartbeat) {
    clearInterval(heartbeat);
    heartbeat = null;
  }
  useCloud.setState({
    ready: false, userId: null, email: null, role: null, status: "idle",
    version: -1, scoringDevice: null, scoringHeartbeat: null,
  });
}