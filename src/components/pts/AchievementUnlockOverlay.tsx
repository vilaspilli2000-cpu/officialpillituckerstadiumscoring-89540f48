import { useEffect, useState } from "react";
import { usePtsStore, playerName } from "@/lib/pts/store";
import { achievementById, RARITIES, HOS_TIER_EMOJI, HOS_TIER_LABELS } from "@/lib/pts/achievements";
import type { AchUnlock } from "@/lib/pts/types";

/**
 * Achievement milestone queue (§13). One popup at a time, a 2 second gap
 * between unlocks, rarity-specific particles, duration and sound.
 */
export function AchievementUnlockOverlay() {
  const feed = usePtsStore((s) => s.achFeed);
  const players = usePtsStore((s) => s.players);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<AchUnlock[]>([]);
  const [active, setActive] = useState<AchUnlock | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const now = Date.now();
    const fresh = feed.filter((u) => !u.baseline && !seen.has(u.id) && now - u.ts < 20_000);
    if (fresh.length === 0) return;
    setSeen((prev) => { const n = new Set(prev); fresh.forEach((f) => n.add(f.id)); return n; });
    setQueue((q) => [...q, ...fresh.slice().reverse()]);
  }, [feed, seen]);

  useEffect(() => {
    if (active || queue.length === 0) return;
    const next = queue[0];
    const t = setTimeout(() => {
      setQueue((q) => q.slice(1));
      setActive(next);
      setProgress(0);
      playSound(next);
    }, 250);
    return () => clearTimeout(t);
  }, [queue, active]);

  useEffect(() => {
    if (!active) return;
    const def = achievementById(active.achId);
    const dur = def ? RARITIES[def.rarity].duration : 12000;
    const start = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / dur);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tick);
        // 2 second gap before the next achievement in the queue.
        setTimeout(() => setActive(null), 2000);
      }
    }, 80);
    return () => clearInterval(tick);
  }, [active]);

  if (!active) return null;
  const def = achievementById(active.achId);
  if (!def) return null;
  const r = RARITIES[def.rarity];
  const name = playerName(players, active.playerId);
  const shame = def.shame;
  const accent = shame ? "#EB5757" : r.accent;
  const tierEmoji = shame ? HOS_TIER_EMOJI[def.rarity] : null;
  const tierLabelText = shame ? HOS_TIER_LABELS[def.rarity] : r.label;

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[10000] flex items-center justify-center overflow-hidden"
      style={{ background: "#050505", animation: def.legacy ? "achShake 700ms ease-in-out 2" : undefined }}
      onClick={() => setActive(null)}
    >
      <div
        className="absolute inset-0 opacity-80"
        style={{ background: shame
          ? `radial-gradient(circle at 50% 40%, ${accent}44, #050505 65%)`
          : `radial-gradient(circle at 50% 40%, ${r.accent2}55, ${accent}33 35%, #050505 70%)` }}
      />
      {/* moving light rays */}
      <div className="pointer-events-none absolute -top-1/2 left-1/2 h-[200vmax] w-[45vmax] -translate-x-1/2 rotate-12 opacity-30 blur-3xl"
           style={{ background: `linear-gradient(180deg, ${accent}88, transparent 70%)` }} />
      <Particles accent={accent} accent2={shame ? "#7A1F1F" : r.accent2} rarity={def.rarity} />

      <div className="relative z-10 max-w-lg px-8 text-center text-[#F4F1EA]">
        <div className="text-[10px] uppercase tracking-[0.45em] text-white/60">
          {shame ? "Hall Of Shame" : def.legacy ? "First Player In PTS History" : "Achievement Unlocked"}
        </div>
        <div className="mt-4 text-6xl" style={{ filter: `drop-shadow(0 0 24px ${accent})` }}>
          {def.legacy && !shame ? "👑" : def.icon}
        </div>
        <h1
          className="mt-4 font-black leading-tight"
          style={{ fontFamily: "Cinzel, serif", fontSize: "clamp(1.8rem,8vw,3.4rem)", textShadow: `0 0 40px ${accent}` }}
        >
          {def.name}
        </h1>
        <div className="mt-2 text-sm uppercase tracking-[0.3em]" style={{ color: accent }}>
          {tierEmoji ?? r.emoji} {tierLabelText}
        </div>
        <div className="mt-5 text-2xl font-bold">{name}</div>
        <p className="mt-2 text-sm text-white/75">{active.reason}</p>
        <div
          className="mt-5 text-5xl font-black tabular-nums"
          style={{ color: accent, textShadow: `0 0 28px ${accent}aa` }}
        >
          {def.points > 0 ? "+" : ""}{def.points} ACH
        </div>
        <div className="mx-auto mt-8 h-1.5 w-44 overflow-hidden rounded-full bg-white/10">
          <div className="h-full transition-[width] duration-100"
               style={{ width: `${progress * 100}%`, background: accent, boxShadow: `0 0 16px ${accent}` }} />
        </div>
        <div className="mt-3 text-[10px] uppercase tracking-[0.3em] text-white/40">Tap to continue</div>
      </div>

      <style>{`
        @keyframes achFloat { 0% { transform: translateY(20vh) translateX(var(--x,0)) scale(1); opacity: 0 } 12% { opacity: 1 } 100% { transform: translateY(-110vh) translateX(var(--x,0)) scale(.4); opacity: 0 } }
        @keyframes achShake { 0%,100% { transform: translate(0,0) } 25% { transform: translate(-6px,4px) } 50% { transform: translate(5px,-5px) } 75% { transform: translate(-4px,-3px) } }
        @keyframes achRing { from { transform: scale(.2); opacity: .9 } to { transform: scale(3.2); opacity: 0 } }
      `}</style>
    </div>
  );
}

function Particles({ accent, accent2, rarity }: { accent: string; accent2: string; rarity: string }) {
  const count = rarity === "legacy" ? 90 : rarity === "legendary" ? 70 : rarity === "epic" ? 60 : 42;
  const square = rarity === "legacy" || rarity === "rare";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {(rarity === "epic" || rarity === "legendary" || rarity === "legacy") && (
        <span
          className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ border: `3px solid ${accent}`, animation: "achRing 1.6s ease-out 3" }}
        />
      )}
      {Array.from({ length: count }).map((_, i) => {
        const size = 2 + Math.random() * (rarity === "legacy" ? 7 : 5);
        const color = i % 3 === 0 ? accent2 : accent;
        return (
          <span
            key={i}
            className={square ? "absolute bottom-0" : "absolute bottom-0 rounded-full"}
            style={{
              left: `${Math.random() * 100}%`,
              width: size,
              height: size * (square ? 1.8 : 1),
              background: color,
              boxShadow: `0 0 ${size * 3}px ${color}`,
              animation: `achFloat ${4 + Math.random() * 5}s linear ${Math.random() * 3}s infinite`,
              ["--x" as string]: `${(Math.random() - 0.5) * 100}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}

/** Short synthesised unlock sound — richer chord for rarer achievements. */
function playSound(u: AchUnlock) {
  const def = achievementById(u.achId);
  if (!def || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const notes = def.shame
      ? [220, 165, 110]
      : def.rarity === "legacy" ? [523, 659, 784, 1046]
      : def.rarity === "legendary" ? [440, 587, 880]
      : def.rarity === "epic" ? [392, 523, 659]
      : def.rarity === "rare" ? [523, 659]
      : [659, 880];
    notes.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = def.shame ? "sawtooth" : "triangle";
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.05 + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9 + i * 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.12);
      osc.stop(ctx.currentTime + 1.4 + i * 0.12);
    });
    setTimeout(() => void ctx.close(), 2600);
  } catch { /* audio unavailable */ }
}
