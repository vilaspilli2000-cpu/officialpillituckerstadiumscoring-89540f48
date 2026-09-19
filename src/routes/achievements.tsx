import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { AchievementBadge } from "@/components/pts/AchievementBadge";
import { usePtsStore } from "@/lib/pts/store";
import {
  ACHIEVEMENT_GROUPS,
  CATEGORY_META,
  RARITIES,
  RARITY_ORDER,
  achievementById,
  groupProgress,
  liveAchStats,
  type AchCategory,
  type AchProgress,
} from "@/lib/pts/achievements";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievement Gallery — PTS Scorer" },
      {
        name: "description",
        content:
          "Every PTS achievement, rarity, Hall Of Shame penalty and Achievement Point in one collectible gallery.",
      },
      { property: "og:title", content: "PTS Achievement Gallery" },
      {
        property: "og:description",
        content:
          "Collectible badges, rarities and Hall Of Shame penalties across Pilli Tucker Stadium.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (s: Record<string, unknown>) => ({
    player: typeof s.player === "string" ? s.player : undefined,
  }),
  component: Gallery,
});

const CATS: AchCategory[] = ["batting", "bowling", "fielding", "awards", "shame"];

function Gallery() {
  const search = Route.useSearch();
  const players = usePtsStore((s) => s.players);
  const current = usePtsStore((s) => s.current);
  const [pid, setPid] = useState<string>(search.player ?? players[0]?.id ?? "");
  const [cat, setCat] = useState<AchCategory>("batting");
  const player = players.find((p) => p.id === pid) ?? players[0];

  const stats = useMemo(() => (player ? liveAchStats(player, current) : null), [player, current]);

  const groups = useMemo(() => {
    if (!player || !stats) return [];
    return ACHIEVEMENT_GROUPS.map((g) => ({ g, ...groupProgress(g, stats, player, players) }));
  }, [player, stats, players]);

  const all: AchProgress[] = groups.flatMap((x) => x.all);
  const unlocked = all.filter((a) => a.unlocked);
  const byRarity = (r: string) => unlocked.filter((a) => a.def.rarity === r && !a.def.shame).length;
  const shameCount = unlocked.filter((a) => a.def.shame).length;
  const completion = all.length ? Math.round((unlocked.length / all.length) * 100) : 0;
  const next = [...all]
    .filter((a) => !a.unlocked && !a.legacyLockedOut)
    .sort((a, b) => b.pct - a.pct)[0];

  if (!player) {
    return (
      <AppShell title="Achievements">
        <p className="text-muted-foreground">No players yet.</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Achievements">
      <h1 className="text-2xl font-black text-gradient-gold">Achievement Gallery</h1>
      <p className="text-[11px] text-muted-foreground mt-1">
        The official home of every PTS achievement. Achievement Points (ACH) count permanently
        towards the ranking.
      </p>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setPid(p.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition ${
              p.id === player.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/60 text-muted-foreground hover:text-primary"
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>

      <section className="card-gold mt-4 rounded-2xl p-4">
        <div className="flex items-baseline justify-between">
          <div className="font-bold text-lg">{player.name}</div>
          <Link
            to="/players/$id"
            params={{ id: player.id }}
            className="text-xs text-primary underline"
          >
            Profile
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center sm:grid-cols-4">
          <Kpi label="Achievements" value={`${unlocked.length}/${all.length}`} />
          <Kpi
            label="ACH Points"
            value={`${(player.achPoints ?? 0) > 0 ? "+" : ""}${player.achPoints ?? 0}`}
          />
          <Kpi label="Completion" value={`${completion}%`} />
          {RARITY_ORDER.map((r) => (
            <Kpi key={r} label={`${RARITIES[r].emoji} ${RARITIES[r].label}`} value={byRarity(r)} />
          ))}
          <Kpi label="👹 Hall Of Shame" value={shameCount} />
        </div>
        {next && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-secondary/40 p-3">
            <div className="text-[10px] uppercase tracking-widest text-primary/80">
              Next Closest Achievement
            </div>
            <div className="mt-1 flex items-baseline justify-between text-sm">
              <span className="font-bold">{next.def.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.floor(next.value).toLocaleString()} / {next.def.requirement.toLocaleString()}{" "}
                {next.def.unit}
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
              <div
                className="h-full bg-primary"
                style={{ width: `${Math.round(next.pct * 100)}%` }}
              />
            </div>
          </div>
        )}
      </section>

      <div className="mt-4 grid grid-cols-5 gap-1 rounded-xl border border-border/60 bg-secondary/40 p-1 text-[11px]">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`rounded-lg px-1 py-2 font-bold transition ${
              cat === c
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-primary"
            }`}
          >
            <span className="block text-base leading-none">{CATEGORY_META[c].icon}</span>
            <span className="mt-1 block truncate">{CATEGORY_META[c].label}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-5">
        {groups
          .filter((x) => x.g.category === cat)
          .map(({ g, all: tiers }) => (
            <section key={g.id}>
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="text-sm font-bold">
                  {g.icon} {g.name}
                </h2>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {tiers.filter((t) => t.unlocked).length}/5 unlocked
                </span>
              </div>
              {g.note && <p className="mb-2 text-[10px] text-muted-foreground">{g.note}</p>}
              <div className="grid gap-2 sm:grid-cols-2">
                {tiers.map((t) => (
                  <AchievementBadge key={t.def.id} p={t} />
                ))}
              </div>
            </section>
          ))}
      </div>

      <section className="mt-8">
        <h2 className="text-sm uppercase tracking-widest text-primary/80 mb-2">
          Achievement History
        </h2>
        <div className="space-y-2">
          {(player.achievements ?? [])
            .filter((u) => !u.baseline)
            .slice()
            .reverse()
            .map((u) => {
              const def = achievementById(u.achId);
              if (!def) return null;
              return (
                <div key={u.id} className="card-gold rounded-xl p-3 text-xs">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold truncate">
                      {RARITIES[def.rarity].emoji} {def.name}
                    </span>
                    <span
                      className={`tabular-nums font-bold ${u.points < 0 ? "text-red-500" : "text-primary"}`}
                    >
                      {u.points > 0 ? "+" : ""}
                      {u.points} ACH
                    </span>
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(u.ts).toLocaleString()} · {u.reason}
                    {u.matchLabel ? ` · ${u.matchLabel}` : ""}
                    {u.opponent ? ` · vs ${u.opponent}` : ""}
                  </div>
                </div>
              );
            })}
          {(player.achievements ?? []).filter((u) => !u.baseline).length === 0 && (
            <p className="text-xs text-muted-foreground">
              No achievements earned yet — every unlock is stored here permanently.
            </p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border/50 bg-secondary/40 p-2">
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground truncate">
        {label}
      </div>
      <div className="text-base font-black text-primary tabular-nums">{value}</div>
    </div>
  );
}
