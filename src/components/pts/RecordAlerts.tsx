import { useMemo } from "react";
import type { Match, Player } from "@/lib/pts/types";
import { computePriorityAlerts, computeRecordAlerts } from "@/lib/pts/recordAlerts";
import { computeLiveMilestoneAlerts } from "@/lib/pts/milestones";

/** Horizontal swipe-through carousel of record alerts.
 *  Alerts are prioritized (💯 → ⭐ → 👑 → 🎯 → 💥 → 🧤) and refresh whenever
 *  the `match` prop reference changes (i.e. after every ball). */
export function RecordAlerts({ match, players }: { match?: Match; players: Player[] }) {
  const focusIds = useMemo(() => {
    if (!match) return [] as string[];
    const inn = match.innings[match.currentInnings];
    return [inn?.currentBatterId, inn?.currentBowlerId].filter((x): x is string => !!x);
  }, [match]);

  const alerts = useMemo(() => {
    const priority = computePriorityAlerts(match, players);
    const focus = computeRecordAlerts(match, players, focusIds);
    const live = computeLiveMilestoneAlerts(match, players, focusIds).map((m) => ({
      id: m.id,
      icon: m.icon,
      tone: m.tone,
      text: m.text,
    }));
    const seen = new Set<string>();
    return [...priority, ...focus, ...live].filter((x) =>
      seen.has(x.id) ? false : (seen.add(x.id), true),
    );
  }, [match, players, focusIds]);

  if (alerts.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3 text-xs text-muted-foreground">
        No record alerts yet — records will appear here as players approach milestones.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1 px-0.5">
        <div className="text-[10px] uppercase tracking-widest text-primary">Record Alerts</div>
        <div className="text-[10px] text-muted-foreground">Swipe for more · {alerts.length}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1 scrollbar-none">
        {alerts.map((a) => {
          const toneClass =
            a.tone === "record"
              ? "border-primary/70 bg-primary/10 text-primary"
              : a.tone === "personal"
                ? "border-emerald-500/60 bg-emerald-500/5 text-emerald-500"
                : "border-primary/30 bg-card/60 text-foreground";
          return (
            <div
              key={a.id}
              className={`snap-center shrink-0 w-[85%] rounded-xl border p-3 ${toneClass}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl leading-none">{a.icon}</span>
                <p className="text-sm leading-snug font-medium">{a.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
