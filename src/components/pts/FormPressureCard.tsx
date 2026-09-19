import type { Match, Player } from "@/lib/pts/types";
import { computePlayerForm, computePressure } from "@/lib/pts/formPressure";

function Meter({ value, label, tone }: { value: number; label: string; tone: "gold" | "cool" }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
        <span className="tabular-nums text-sm font-black text-primary">{value}<span className="text-[10px] text-muted-foreground">/100</span></span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-secondary/70">
        <div
          className={`h-full rounded-full transition-all duration-500 ${tone === "gold" ? "bg-primary" : "bg-primary/60"}`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function FormPressureCard({ player, matches }: { player: Player; matches: Match[] }) {
  const form = computePlayerForm(player, matches);
  const pressure = computePressure(player, matches);
  const trendTone =
    form.trend === "Improving" ? "text-primary"
      : form.trend === "Declining" ? "text-red-500" : "text-muted-foreground";

  return (
    <section className="mt-4 card-gold rounded-2xl p-4 space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm uppercase tracking-[0.2em] text-primary">Form &amp; Pressure</h2>
        <span className={`text-[11px] font-bold ${trendTone}`}>{form.trend}</span>
      </div>

      <div className="space-y-3">
        <Meter value={form.score} label={`Current Form — ${form.label}`} tone="gold" />
        <p className="text-[11px] text-muted-foreground">{form.summary}</p>
      </div>

      <div className="space-y-3">
        <Meter value={pressure.score} label={`Pressure Rating — ${pressure.label}`} tone="cool" />
        <p className="text-[11px] text-muted-foreground">{pressure.summary}</p>
      </div>

      {form.recent.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">Last {form.recent.length} Matches</div>
          <div className="space-y-1">
            {form.recent.map((r) => (
              <div key={r.matchId} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-muted-foreground">{r.label}</span>
                <span className="tabular-nums shrink-0">
                  {r.balls > 0 && `${r.runs}${r.out ? "" : "*"}(${r.balls})`}
                  {r.balls > 0 && r.bowlBalls > 0 && " · "}
                  {r.bowlBalls > 0 && `${r.wickets}/${r.bowlRuns}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}