import { useEffect, useState } from "react";
import { usePtsStore, playerName } from "@/lib/pts/store";
import type { Achievement } from "@/lib/pts/types";

type ThemeKey = "hat4" | "wkt3" | "hatWkt" | "pr" | "fifty" | "hundred" | "150" | "200" | "default";

const THEMES: Record<
  ThemeKey,
  {
    title: string;
    duration: number;
    gradient: string;
    ring: string;
    accent: string;
    tagline: string;
  }
> = {
  hat4: {
    title: "HAT-TRICK OF FOURS",
    duration: 6000,
    gradient: "from-[#2F80ED] via-[#56CCF2] to-[#0B0B0A]",
    ring: "#56CCF2",
    accent: "#56CCF2",
    tagline: "Three boundaries in a row. The bowler has no answer.",
  },
  wkt3: {
    title: "THREE-WICKET HAUL",
    duration: 6000,
    gradient: "from-[#27AE60] via-[#6FCF97] to-[#0B0B0A]",
    ring: "#6FCF97",
    accent: "#6FCF97",
    tagline: "A spell that has changed the match.",
  },
  hatWkt: {
    title: "BOWLING HAT-TRICK",
    duration: 6000,
    gradient: "from-[#F2C94C] via-[#F4C542] to-[#0B0B0A]",
    ring: "#F4C542",
    accent: "#F4C542",
    tagline: "Three in three. A piece of history.",
  },
  pr: {
    title: "NEW PERSONAL RECORD",
    duration: 8000,
    gradient: "from-[#9B51E0] via-[#BB6BD9] to-[#0B0B0A]",
    ring: "#BB6BD9",
    accent: "#BB6BD9",
    tagline: "A career-best performance.",
  },
  fifty: {
    title: "HALF CENTURY",
    duration: 10000,
    gradient: "from-[#F4C542] via-[#D9A928] to-[#0B0B0A]",
    ring: "#F4C542",
    accent: "#F4C542",
    tagline: "Fifty up. The platform is set.",
  },
  hundred: {
    title: "CENTURY — RED HOT",
    duration: 16000,
    gradient: "from-[#EB5757] via-[#C62828] to-[#0B0B0A]",
    ring: "#EB5757",
    accent: "#EB5757",
    tagline: "Pure fire. Total control.",
  },
  "150": {
    title: "150 RUNS",
    duration: 24000,
    gradient: "from-[#FF5FA2] via-[#E84393] to-[#0B0B0A]",
    ring: "#FF5FA2",
    accent: "#FF5FA2",
    tagline: "An elite PTS innings.",
  },
  "200": {
    title: "DOUBLE CENTURY",
    duration: 30000,
    gradient: "from-[#F4F1EA] via-[#F4C542] to-[#0B0B0A]",
    ring: "#F4F1EA",
    accent: "#F4C542",
    tagline: "A historic PTS masterpiece.",
  },
  default: {
    title: "MILESTONE",
    duration: 6000,
    gradient: "from-[#F4C542] via-[#D9A928] to-[#0B0B0A]",
    ring: "#F4C542",
    accent: "#F4C542",
    tagline: "",
  },
};

function themeFor(a: Achievement): ThemeKey {
  const k = a.kind.toLowerCase();
  const t = a.text.toLowerCase();
  if (k.includes("200") || t.includes("double century")) return "200";
  if (k.includes("150") || t.includes("150")) return "150";
  if (k.includes("100") || t.includes("century")) return "hundred";
  if (k.includes("50") || t.includes("fifty") || t.includes("half-century")) return "fifty";
  if (k.includes("hat") && k.includes("four")) return "hat4";
  if (k.includes("hat") && (k.includes("wkt") || k.includes("wicket"))) return "hatWkt";
  if (k.includes("3wkt") || (k.includes("wicket") && k.includes("3"))) return "wkt3";
  if (k.includes("personal") || k.includes("pr") || k.includes("highest")) return "pr";
  return "default";
}

export function MilestoneOverlay() {
  const achievements = usePtsStore((s) => s.achievements);
  const players = usePtsStore((s) => s.players);

  const [queue, setQueue] = useState<Achievement[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [active, setActive] = useState<Achievement | null>(null);
  const [progress, setProgress] = useState(0);

  // Enqueue newly-arrived achievements (only those <10s old to avoid replay on reload).
  useEffect(() => {
    const now = Date.now();
    const fresh = achievements.filter((a) => !seen.has(a.id) && now - a.ts < 10_000);
    if (fresh.length === 0) return;
    setSeen((prev) => {
      const next = new Set(prev);
      fresh.forEach((a) => next.add(a.id));
      return next;
    });
    setQueue((q) => [...fresh.slice().reverse(), ...q]);
  }, [achievements, seen]);

  // Drive the active overlay from the queue.
  useEffect(() => {
    if (active || queue.length === 0) return;
    const next = queue[0];
    setQueue((q) => q.slice(1));
    setActive(next);
    setProgress(0);
  }, [queue, active]);

  useEffect(() => {
    if (!active) return;
    const theme = THEMES[themeFor(active)];
    const start = Date.now();
    const tick = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / theme.duration);
      setProgress(p);
      if (p >= 1) {
        clearInterval(tick);
        setTimeout(() => setActive(null), 280);
      }
    }, 80);
    return () => clearInterval(tick);
  }, [active]);

  if (!active) return null;
  const theme = THEMES[themeFor(active)];
  const name = playerName(players, active.playerId);
  const score = extractScore(active.text);

  return (
    <div
      aria-live="assertive"
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: "#050505" }}
    >
      {/* Ambient gradient + vignette */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-70 animate-[fadeIn_400ms_ease-out]`}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.95) 100%)",
        }}
      />
      {/* Light beams */}
      <div
        className="pointer-events-none absolute -top-1/2 left-1/2 h-[200vmax] w-[60vmax] -translate-x-1/2 rotate-12 opacity-30 blur-3xl"
        style={{ background: `linear-gradient(180deg, ${theme.accent}66, transparent 70%)` }}
      />
      <div
        className="pointer-events-none absolute -bottom-1/2 left-1/2 h-[200vmax] w-[40vmax] -translate-x-1/2 -rotate-12 opacity-20 blur-3xl"
        style={{ background: `linear-gradient(0deg, ${theme.accent}66, transparent 70%)` }}
      />
      {/* Particles */}
      <Particles color={theme.accent} count={42} />

      <div className="relative z-10 px-8 text-center text-[#F4F1EA] max-w-xl">
        <div className="text-[10px] md:text-xs uppercase tracking-[0.45em] text-white/70 animate-[fadeUp_500ms_ease-out_both]">
          Pilli Tucker Stadium
        </div>
        <h1
          className="mt-3 font-black tracking-tight leading-[1.05] animate-[fadeUp_700ms_ease-out_150ms_both]"
          style={{
            fontFamily: "Cinzel, serif",
            fontSize:
              themeFor(active) === "200"
                ? "clamp(2.5rem, 11vw, 5.5rem)"
                : "clamp(1.8rem, 8vw, 4rem)",
            textShadow: `0 0 40px ${theme.accent}99`,
          }}
        >
          {theme.title}
        </h1>
        <div className="mt-6 text-2xl md:text-3xl font-bold animate-[fadeUp_700ms_ease-out_400ms_both]">
          {name}
        </div>
        {score && (
          <div
            className="mt-3 text-5xl md:text-7xl font-black tabular-nums animate-[scaleIn_900ms_cubic-bezier(.2,.9,.3,1.2)_650ms_both]"
            style={{ color: theme.accent, textShadow: `0 0 28px ${theme.accent}aa` }}
          >
            {score}
          </div>
        )}
        <p className="mt-6 max-w-md mx-auto text-sm md:text-base text-white/80 animate-[fadeUp_700ms_ease-out_900ms_both]">
          {active.text}
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50 animate-[fadeUp_700ms_ease-out_1100ms_both]">
          {theme.tagline}
        </p>

        {/* Progress ring */}
        <div className="mx-auto mt-10 h-1.5 w-48 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full transition-[width] duration-100"
            style={{
              width: `${progress * 100}%`,
              background: theme.accent,
              boxShadow: `0 0 16px ${theme.accent}`,
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(.6) } to { opacity: 1; transform: scale(1) } }
        @keyframes floatUp { 0% { transform: translateY(20vh) translateX(var(--x,0)); opacity: 0 } 15% { opacity: .9 } 100% { transform: translateY(-110vh) translateX(var(--x,0)); opacity: 0 } }
      `}</style>
    </div>
  );
}

function extractScore(text: string): string | null {
  // Try to find patterns like "100 (45)" or "200*" or "5/12".
  const m = text.match(/\b(\d{1,3}\*?\s*(?:\(\d+\))?)\b/);
  return m ? m[1] : null;
}

function Particles({ color, count }: { color: string; count: number }) {
  const parts = Array.from({ length: count });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {parts.map((_, i) => {
        const left = Math.random() * 100;
        const size = 2 + Math.random() * 4;
        const dur = 4 + Math.random() * 6;
        const delay = Math.random() * 4;
        const xDrift = (Math.random() - 0.5) * 80;
        return (
          <span
            key={i}
            className="absolute bottom-0 rounded-full"
            style={
              {
                left: `${left}%`,
                width: size,
                height: size,
                background: color,
                boxShadow: `0 0 ${size * 3}px ${color}`,
                opacity: 0.85,
                animation: `floatUp ${dur}s linear ${delay}s infinite`,
                ["--x" as string]: `${xDrift}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
