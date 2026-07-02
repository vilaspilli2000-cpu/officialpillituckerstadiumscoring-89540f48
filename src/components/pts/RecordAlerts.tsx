import { useEffect, useMemo, useState } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { computeRecordAlerts } from "@/lib/pts/recordAlerts";

/** Rotating record-alert card. Refreshes on every ball via `match` prop
 *  (which changes reference after each scoreEvent) and cycles through the
 *  relevant alerts every few seconds so the fan always sees a fresh line. */
export function RecordAlerts({ match, players }: { match?: Match; players: Player[] }) {
  const focusIds = useMemo(() => {
    if (!match) return [] as string[];
    const inn = match.innings[match.currentInnings];
    return [inn?.currentBatterId, inn?.currentBowlerId].filter((x): x is string => !!x);
  }, [match]);

  const alerts = useMemo(
    () => computeRecordAlerts(match, players, focusIds),
    [match, players, focusIds],
  );

  const ballCount = match?.innings.reduce((s, i) => s + i.events.length, 0) ?? 0;
  const [idx, setIdx] = useState(0);

  // Advance to a new alert every ball, and every 6s while idle.
  useEffect(() => {
    if (alerts.length === 0) return;
    setIdx((i) => (i + 1) % alerts.length);
  }, [ballCount, alerts.length]);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const t = window.setInterval(() => setIdx((i) => (i + 1) % alerts.length), 6000);
    return () => window.clearInterval(t);
  }, [alerts.length]);

  if (alerts.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3 text-xs text-muted-foreground">
        No record alerts yet — records will appear here as players approach milestones.
      </div>
    );
  }

  const cur = alerts[idx % alerts.length];
  const toneClass =
    cur.tone === "record"
      ? "border-primary/70 bg-primary/10 text-primary"
      : cur.tone === "personal"
        ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-500"
        : "border-primary/30 bg-card/60 text-foreground";

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] uppercase tracking-widest opacity-80">Record Alert</div>
        <div className="text-[10px] tabular-nums opacity-60">{(idx % alerts.length) + 1}/{alerts.length}</div>
      </div>
      <div className="flex items-start gap-2">
        <span className="text-xl leading-none">{cur.icon}</span>
        <p className="text-sm leading-snug font-medium">{cur.text}</p>
      </div>
    </div>
  );
}