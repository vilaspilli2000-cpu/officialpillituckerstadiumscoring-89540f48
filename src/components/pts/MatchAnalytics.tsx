import type { Match } from "@/lib/pts/types";
import { overBuckets, worm } from "@/lib/pts/analytics";

const W = 320;
const H = 110;
const PAD = 22;

function LineChart({
  series,
  color,
  title,
  yMax,
  baseline,
}: {
  series: { x: number; y: number }[];
  color: string;
  title: string;
  yMax?: number;
  baseline?: { y: number; label: string; color?: string };
}) {
  if (series.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
        <div className="text-xs text-muted-foreground">No data yet.</div>
      </div>
    );
  }
  const xs = series.map((s) => s.x);
  const ys = series.map((s) => s.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const maxY = Math.max(yMax ?? 0, ...ys, baseline?.y ?? 0, 1);
  const sx = (x: number) => PAD + ((x - minX) / (maxX - minX || 1)) * (W - PAD * 2);
  const sy = (y: number) => H - PAD - (y / maxY) * (H - PAD * 2);
  const d = series.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(" ");
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="currentColor" opacity="0.2" />
        <line x1={PAD} x2={PAD} y1={PAD} y2={H - PAD} stroke="currentColor" opacity="0.2" />
        {baseline && (
          <line
            x1={PAD}
            x2={W - PAD}
            y1={sy(baseline.y)}
            y2={sy(baseline.y)}
            stroke={baseline.color ?? "#888"}
            strokeDasharray="3 3"
            opacity="0.7"
          />
        )}
        <path d={d} fill="none" stroke={color} strokeWidth={2} />
        {series.map((p, i) => (
          <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={1.8} fill={color} />
        ))}
        <text x={PAD} y={PAD - 6} fontSize={8} fill="currentColor" opacity="0.6">0–{Math.round(maxY)}</text>
        <text x={W - PAD} y={H - 6} fontSize={8} fill="currentColor" opacity="0.6" textAnchor="end">
          Ov {Math.round(maxX)}
        </text>
      </svg>
    </div>
  );
}

function BarChart({ data, color, title }: { data: { x: number; y: number; flag?: boolean }[]; color: string; title: string }) {
  if (data.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
        <div className="text-xs text-muted-foreground">No data yet.</div>
      </div>
    );
  }
  const maxY = Math.max(...data.map((d) => d.y), 1);
  const bw = (W - PAD * 2) / data.length;
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} stroke="currentColor" opacity="0.2" />
        {data.map((d, i) => {
          const x = PAD + i * bw + bw * 0.15;
          const h = (d.y / maxY) * (H - PAD * 2);
          return (
            <g key={i}>
              <rect x={x} y={H - PAD - h} width={bw * 0.7} height={h} fill={d.flag ? "#dc2626" : color} rx={1.5} />
              <text x={x + bw * 0.35} y={H - PAD + 8} fontSize={7} textAnchor="middle" fill="currentColor" opacity="0.6">
                {d.x + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MatchAnalytics({ match }: { match: Match }) {
  return (
    <div className="space-y-4">
      {match.innings.map((inn, idx) => {
        const buckets = overBuckets(inn);
        const wormPoints = worm(inn).map((w) => ({ x: w.overNumber, y: w.runs }));
        const runsPerOver = buckets.map((b) => ({ x: b.overNumber, y: b.runs, flag: b.wickets > 0 }));
        const rrSeries = buckets.map((b, i) => {
          const cum = buckets.slice(0, i + 1).reduce((s, x) => s + x.runs, 0);
          const balls = buckets.slice(0, i + 1).reduce((s, x) => s + x.legalBalls, 0);
          return { x: b.overNumber + 1, y: balls ? (cum / balls) * 6 : 0 };
        });

        const rrrSeries: { x: number; y: number }[] = [];
        if (match.target && idx === match.currentInnings) {
          let cum = 0;
          let ballsAcc = 0;
          const cap = inn.oversCap ?? 36;
          for (let i = 0; i < buckets.length; i++) {
            cum += buckets[i].runs;
            ballsAcc += buckets[i].legalBalls;
            const ballsLeft = cap - ballsAcc;
            const need = match.target - cum;
            if (ballsLeft > 0 && need > 0) rrrSeries.push({ x: i + 1, y: (need / ballsLeft) * 6 });
          }
        }

        // probability series for this innings
        const probForInning = match.probability
          .map((p, i) => ({ i, ...p }))
          .map((p) => ({
            x: p.ballIndex,
            y: inn.battingTeam === "A" ? p.teamA : p.teamB,
          }));

        const wktsSeries: { x: number; y: number }[] = buckets
          .filter((b) => b.wickets > 0)
          .map((b) => ({ x: b.overNumber + 1, y: b.wickets }));

        const battingName = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;

        return (
          <div key={idx} className="space-y-3">
            <h3 className="text-sm uppercase tracking-widest text-primary/80">
              {battingName} · Innings {idx + 1}
            </h3>
            <LineChart series={wormPoints} color="#D9A928" title="Worm — cumulative runs" />
            <BarChart data={runsPerOver} color="#D9A928" title="Runs per over (red = wicket over)" />
            <LineChart
              series={rrSeries}
              color="#22c55e"
              title="Run rate"
              baseline={
                rrrSeries.length
                  ? { y: rrrSeries[rrrSeries.length - 1].y, label: "RRR", color: "#dc2626" }
                  : undefined
              }
            />
            {rrrSeries.length > 0 && (
              <LineChart series={rrrSeries} color="#dc2626" title="Required run rate" />
            )}
            {wktsSeries.length > 0 && (
              <BarChart data={wktsSeries} color="#dc2626" title="Wickets timeline" />
            )}
            {idx === match.currentInnings && match.probability.length > 0 && (
              <LineChart series={probForInning} color="#D9A928" title={`Win probability — ${battingName}`} yMax={100} baseline={{ y: 50, label: "50", color: "#888" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}