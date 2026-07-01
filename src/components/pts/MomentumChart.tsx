import type { Match } from "@/lib/pts/types";
import { momentumSeries } from "@/lib/pts/insights";

const W = 320, H = 90, PAD = 18;

export function MomentumChart({ match, inningsIndex, title }: { match: Match; inningsIndex: number; title: string }) {
  const pts = momentumSeries(match, inningsIndex);
  if (pts.length === 0) {
    return (
      <div className="card-gold rounded-xl p-3">
        <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
        <div className="text-xs text-muted-foreground">No data yet.</div>
      </div>
    );
  }
  const xMax = Math.max(1, pts[pts.length - 1].ballIndex);
  const sx = (x: number) => PAD + (x / xMax) * (W - PAD * 2);
  const sy = (v: number) => H / 2 - (v / 100) * ((H - PAD * 2) / 2);
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.ballIndex).toFixed(1)} ${sy(p.value).toFixed(1)}`).join(" ");
  return (
    <div className="card-gold rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary/80 mb-1">{title}</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
        <line x1={PAD} x2={W - PAD} y1={H / 2} y2={H / 2} stroke="currentColor" opacity="0.3" strokeDasharray="3 3" />
        <path d={`${d} L ${sx(xMax).toFixed(1)} ${(H / 2).toFixed(1)} L ${sx(0).toFixed(1)} ${(H / 2).toFixed(1)} Z`} fill="url(#momGrad)" opacity="0.35" />
        <path d={d} fill="none" stroke="#D9A928" strokeWidth={2} />
        <defs>
          <linearGradient id="momGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#D9A928" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#D9A928" stopOpacity="0" />
          </linearGradient>
        </defs>
        <text x={PAD} y={12} fontSize={8} fill="currentColor" opacity="0.6">Batting +</text>
        <text x={PAD} y={H - 4} fontSize={8} fill="currentColor" opacity="0.6">Bowling +</text>
      </svg>
    </div>
  );
}