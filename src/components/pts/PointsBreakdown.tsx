import { useEffect, useMemo, useState } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { buildPointsBreakdown, type PointsBreakdownEntry } from "@/lib/pts/pointsBreakdown";
import { achievementById } from "@/lib/pts/achievements";
import {
  legacyLevelFromAchievements,
  meltdownLevelFromAchievements,
  multiplierFor,
} from "@/lib/pts/legacyMeltdown";

/* ─── Shared helpers ──────────────────────────────────────────────────────────── */
const fmt = (n: number) => {
  const r = Math.round(n * 100) / 100;
  return (r > 0 ? "+" : "") + (Number.isInteger(r) ? r.toString() : r.toFixed(2));
};

/** Animated ranking-points transition (Old → New). */
function CountUp({ from, to }: { from: number; to: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    const start = Date.now();
    const dur = 900;
    const id = setInterval(() => {
      const t = Math.min(1, (Date.now() - start) / dur);
      setV(Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3))));
      if (t >= 1) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [from, to]);
  return <span className="tabular-nums">{v}</span>;
}

function Section({ title, total, lines }: { title: string; total: number; lines: { label: string; detail?: string; value: number }[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-widest text-primary/80">
        <span>{title}</span>
        <span className="tabular-nums font-bold">{fmt(total)}</span>
      </div>
      <div className="mt-1 space-y-1">
        {lines.map((l, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-xs">
            <div className="min-w-0">
              <div className="truncate">{l.label}</div>
              {l.detail && <div className="text-[10px] text-muted-foreground truncate">{l.detail}</div>}
            </div>
            <div className="tabular-nums shrink-0">{fmt(l.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Glowing Heading ───────────────────────────────────────────────────────── */
function GlowingHeading({ text }: { text: string }) {
  return (
    <>
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { text-shadow: 0 0 4px rgba(255,215,0,0.2), 0 0 8px rgba(255,215,0,0.1); }
          50% { text-shadow: 0 0 8px rgba(255,215,0,0.5), 0 0 16px rgba(255,215,0,0.3), 0 0 24px rgba(255,215,0,0.15); }
        }
        .glow-heading {
          animation: glow-pulse 3s ease-in-out infinite;
        }
        .glow-underline {
          display: block;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.7), rgba(255,165,0,0.9), rgba(255,215,0,0.7), transparent);
          border-radius: 1px;
          animation: glow-pulse 2.5s ease-in-out infinite;
        }
        @keyframes glow-reveal {
          0% { opacity: 0; text-shadow: none; }
          30% { opacity: 1; text-shadow: 0 0 12px rgba(255,215,0,0.8), 0 0 24px rgba(255,215,0,0.5), 0 0 36px rgba(255,215,0,0.25); }
          100% { opacity: 1; text-shadow: 0 0 4px rgba(255,215,0,0.2), 0 0 8px rgba(255,215,0,0.1); }
        }
        .glow-heading-reveal {
          animation: glow-reveal 1.2s ease-out forwards, glow-pulse 3s ease-in-out 1.2s infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .glow-heading, .glow-underline, .glow-heading-reveal { animation: none; }
          .glow-heading { text-shadow: 0 0 4px rgba(255,215,0,0.15); }
          .glow-underline { background: linear-gradient(90deg, transparent, rgba(255,215,0,0.4), transparent); }
          .glow-heading-reveal { opacity: 1; }
        }
      `}</style>
      <div className="glow-heading-reveal">
        <h3 className="text-sm font-bold tracking-widest text-yellow-400 mb-1">{text}</h3>
        <span className="glow-underline" />
      </div>
    </>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export function PointsBreakdown({ match, players, priorMatches }: {
  match: Match; players: Player[]; priorMatches: Match[];
}) {
  const entries: PointsBreakdownEntry[] = useMemo(
    () => match.pointsBreakdown ?? buildPointsBreakdown(match, players, priorMatches.filter((m) => m.id !== match.id)),
    [match, players, priorMatches],
  );
  const [openId, setOpenId] = useState<string | null>(null);

  /** ACH / Hall Of Shame points earned in this exact match. */
  const achFor = (playerId: string) => {
    const p = players.find((x) => x.id === playerId);
    const list = (p?.achievements ?? []).filter((u) => !u.baseline && u.matchId === match.id);
    let ach = 0, shame = 0;
    for (const u of list) {
      if (achievementById(u.achId)?.shame) shame += u.points;
      else ach += u.points;
    }
    return { ach, shame, list };
  };

  if (entries.length === 0) {
    return <div className="text-sm text-muted-foreground">No points recorded for this match.</div>;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        Points are calculated with decimals; only the final Net Match Points are rounded before they are added to a
        player&apos;s career ranking. Tap a player for the full calculation.
      </p>
      {entries.map((e) => {
        const open = openId === e.playerId;
        const { ach, shame, list } = achFor(e.playerId);
        const finalPoints = e.newPoints + ach + shame;
        return (
          <div key={e.playerId} className="card-gold rounded-xl p-3">
            <button className="w-full text-left" onClick={() => setOpenId(open ? null : e.playerId)}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-bold truncate">{e.playerName}</div>
                  <div className="text-[11px] text-muted-foreground tabular-nums">
                    {e.oldPoints} → <CountUp from={e.oldPoints} to={finalPoints} />
                  </div>
                </div>
                <div className="text-right shrink-0 tabular-nums">
                  <div className={`text-lg font-black ${e.netRounded >= 0 ? "text-primary" : "text-red-500"}`}>
                    {e.netRounded >= 0 ? "+" : ""}{e.netRounded}
                  </div>
                  <div className="text-[10px] text-muted-foreground">net match pts</div>
                </div>
              </div>
            </button>
            {open && (
              <div className="mt-2 border-t border-border/40 pt-2">
                <Section title="Batting Points" total={e.sections.batting.total} lines={e.sections.batting.lines} />
                <Section title="Bowling Points" total={e.sections.bowling.total} lines={e.sections.bowling.lines} />
                <Section title="Fielding Points" total={e.sections.fielding.total} lines={e.sections.fielding.lines} />
                <Section title="Award Points" total={e.sections.awards.total} lines={e.sections.awards.lines} />
                <WhyDidIGetThesePoints entry={e} player={players.find((p) => p.id === e.playerId)!} />
                <HowDoILevelUp player={players.find((p) => p.id === e.playerId)!} baseNet={e.baseNet} />
                {(ach !== 0 || shame !== 0) && (
                  <div className="mt-3">
                    <div className="text-[11px] uppercase tracking-widest text-primary/80">Achievements</div>
                    <div className="mt-1 space-y-1">
                      {list.map((u) => (
                        <div key={u.id} className="flex items-baseline justify-between gap-3 text-xs">
                          <div className="min-w-0 truncate">
                            {achievementById(u.achId)?.name ?? u.achId}
                            {achievementById(u.achId)?.shame ? " · Hall Of Shame" : ""}
                          </div>
                          <div className={`tabular-nums shrink-0 ${u.points < 0 ? "text-red-500" : "text-primary"}`}>
                            {u.points > 0 ? "+" : ""}{u.points} ACH
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 border-t border-border/40 pt-2 text-xs space-y-1 tabular-nums">
                  <div className="flex justify-between"><span>Exact Net Match Points</span><span>{fmt(e.netPoints)}</span></div>
                  <div className="flex justify-between"><span>Rounded Net Match Points</span><span>{fmt(e.netRounded)}</span></div>
                  <div className="flex justify-between"><span>Achievement Points</span><span>{fmt(ach)}</span></div>
                  <div className="flex justify-between"><span>Hall Of Shame</span><span className={shame < 0 ? "text-red-500" : ""}>{fmt(shame)}</span></div>
                  <div className="flex justify-between"><span>Old Ranking Points</span><span>{e.oldPoints}</span></div>
                  <div className="flex justify-between font-bold text-primary">
                    <span>New Ranking Points</span>
                    <span>
                      <CountUp from={e.oldPoints} to={finalPoints} />{" "}
                      ({finalPoints - e.oldPoints >= 0 ? "+" : ""}{finalPoints - e.oldPoints})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── WHY DID I GET THESE POINTS? ───────────────────────────────────────────── */
function WhyDidIGetThesePoints({ entry, player }: { entry: PointsBreakdownEntry; player: Player }) {
  // Use authoritative achievement-count from the same source as level calculation.
  const legacyCount = legacyLevelFromAchievements(player);
  const meltdownCount = meltdownLevelFromAchievements(player);
  const isPositive = entry.baseNet > 0;

  return (
    <div className="mt-4 p-3 rounded-lg border border-yellow-600/30 bg-yellow-950/20">
      <GlowingHeading text="WHY DID I GET THESE POINTS?" />
      <div className="mt-3 space-y-1.5 text-sm">
        {/* Base */}
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Base PTS</span>
          <span className="tabular-nums font-mono font-semibold text-foreground">{fmt(entry.baseNet)}</span>
        </div>

        {/* Legacy */}
        <div className="mt-3 pt-2 border-t border-yellow-600/20">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-yellow-400">★</span>
            <span className="text-xs font-bold tracking-wider text-yellow-400 uppercase">Legacy</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Achievements</span>
            <span className="tabular-nums text-yellow-300 text-xs">{legacyCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Level</span>
            <span className="tabular-nums font-bold text-yellow-300 text-xs">
              {entry.legacyLevel > 0 ? `L${entry.legacyLevel}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Multiplier</span>
            <span className="tabular-nums text-yellow-300 text-xs">
              {entry.legacyLevel > 0 ? `×${entry.legacyMultiplier.toFixed(4)}` : "×1.0000"}
            </span>
          </div>
        </div>

        {/* Meltdown */}
        <div className="mt-3 pt-2 border-t border-red-600/30">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-red-400">☠</span>
            <span className="text-xs font-bold tracking-wider text-red-400 uppercase">Meltdown</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Achievements</span>
            <span className="tabular-nums text-red-300 text-xs">{meltdownCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Level</span>
            <span className="tabular-nums font-bold text-red-300 text-xs">
              {entry.meltdownLevel > 0 ? `M${entry.meltdownLevel}` : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground text-xs">Multiplier</span>
            <span className="tabular-nums text-red-300 text-xs">
              {entry.meltdownLevel > 0 ? `×${entry.meltdownMultiplier.toFixed(2)}` : "×1.0000"}
            </span>
          </div>
        </div>

        {/* Calculation */}
        <div className="mt-3 pt-2 border-t border-border/40">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-xs">Calculation</span>
          </div>
          <div className={`mt-1 font-mono text-xs text-center py-1.5 px-2 rounded ${
            isPositive ? "bg-yellow-950/40 text-yellow-200" : "bg-red-950/40 text-red-200"
          }`}>
            {entry.calculation}
          </div>
        </div>

        {/* FINAL PTS */}
        <div className="mt-2 flex justify-between items-center">
          <span className="font-bold text-foreground">FINAL PTS</span>
          <span className={`tabular-nums font-black text-lg ${
            entry.netPoints >= 0 ? "text-yellow-400" : "text-red-400"
          }`}>
            {fmt(entry.netPoints)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── HOW DO I LEVEL UP? ───────────────────────────────────────────────────── */
function HowDoILevelUp({ player, baseNet }: { player: Player; baseNet: number }) {
  const legacyCount = legacyLevelFromAchievements(player);
  const meltdownCount = meltdownLevelFromAchievements(player);
  const legacyLevel = Math.min(legacyCount, 19);
  const meltdownLevel = Math.min(meltdownCount, 11);
  const nextLegacyLevel = Math.min(legacyLevel + 1, 19);
  const nextMeltdownLevel = Math.min(meltdownLevel + 1, 11);
  const legacyMaxed = legacyLevel >= 19;
  const meltdownMaxed = meltdownLevel >= 11;
  const isPositive = baseNet > 0;

  // Use the authoritative multiplierFor() from legacyMeltdown.
  const legacyCurrMult = multiplierFor("legacy", legacyLevel, isPositive);
  const legacyNextMult = !legacyMaxed ? multiplierFor("legacy", nextLegacyLevel, isPositive) : legacyCurrMult;
  const meltdownCurrMult = multiplierFor("meltdown", meltdownLevel, isPositive);
  const meltdownNextMult = !meltdownMaxed ? multiplierFor("meltdown", nextMeltdownLevel, isPositive) : meltdownCurrMult;

  return (
    <div className="mt-4 p-3 rounded-lg border border-border/40 bg-secondary/20">
      <h3 className="text-sm font-semibold tracking-widest text-muted-foreground mb-3">HOW DO I LEVEL UP?</h3>
      <div className="space-y-3 text-sm">
        {/* Legacy */}
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-yellow-400">★</span>
            <span className="text-xs font-bold tracking-wider text-yellow-400 uppercase">Legacy</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Earn <span className="text-yellow-400 font-semibold">Legacy achievements</span> to increase your Legacy level.
          </p>
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Current:</span>
              <span className="tabular-nums text-yellow-300">
                {legacyMaxed ? (
                  <span className="text-yellow-500 font-bold">MAX (L19)</span>
                ) : (
                  <>L{legacyLevel} <span className="text-yellow-500">×{legacyCurrMult.toFixed(4)}</span> ({legacyCount} achievements)</>
                )}
              </span>
            </div>
            {!legacyMaxed && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Next:</span>
                <span className="tabular-nums text-yellow-400">L{nextLegacyLevel} <span className="text-yellow-500">×{legacyNextMult.toFixed(4)}</span> ({legacyCount + 1} achievements)</span>
              </div>
            )}
            {!legacyMaxed && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Needed:</span>
                <span className="text-yellow-400 font-medium">1 more Legacy achievement</span>
              </div>
            )}
          </div>
        </div>

        {/* Meltdown */}
        <div className="border-t border-red-900/30 pt-3">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-red-400">☠</span>
            <span className="text-xs font-bold tracking-wider text-red-400 uppercase">Meltdown</span>
          </div>
          <p className="text-xs text-muted-foreground mb-2">
            Earn <span className="text-red-400 font-semibold">Meltdown achievements</span> to increase your Meltdown level.
          </p>
          <div className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Current:</span>
              <span className="tabular-nums text-red-300">
                {meltdownMaxed ? (
                  <span className="text-red-500 font-bold">MAX (M11)</span>
                ) : (
                  <>M{meltdownLevel} <span className="text-red-500">×{meltdownCurrMult.toFixed(2)}</span> ({meltdownCount} achievements)</>
                )}
              </span>
            </div>
            {!meltdownMaxed && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Next:</span>
                <span className="tabular-nums text-red-400">M{nextMeltdownLevel} <span className="text-red-500">×{meltdownNextMult.toFixed(2)}</span> ({meltdownCount + 1} achievements)</span>
              </div>
            )}
            {!meltdownMaxed && (
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Needed:</span>
                <span className="text-red-400 font-medium">1 more Meltdown achievement</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
