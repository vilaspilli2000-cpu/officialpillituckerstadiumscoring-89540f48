import { RARITIES, HOS_TIER_EMOJI, HOS_TIER_LABELS, type AchProgress } from "@/lib/pts/achievements";
import { CATEGORY_META } from "@/lib/pts/achievements";

/**
 * Premium collectible achievement badge.
 * Unlocked badges use their rarity metal + animated shine + premium glow;
 * locked badges are grey with "???" and live progress underneath.
 * Hall of Shame tiers show their tier emoji even when locked.
 */
export function AchievementBadge({ p, compact }: { p: AchProgress; compact?: boolean }) {
  const def = p.def;
  const r = RARITIES[def.rarity];
  const unlocked = p.unlocked;
  const shame = def.shame;
  const accent = unlocked ? r.accent : "#6B6B63";
  const accent2 = unlocked ? r.accent2 : "#8A8A80";
  const bg = unlocked
    ? shame
      ? `linear-gradient(145deg, #0A0A0A 0%, ${accent}22 45%, #0A0A0A 100%)`
      : `linear-gradient(145deg, #14120C 0%, ${accent}33 45%, #0A0A0A 100%)`
    : "linear-gradient(145deg, #121212 0%, #1A1A1A 55%, #0D0D0D 100%)";

  // Premium glow effect for unlocked achievements
  const glowStyle = unlocked ? {
    boxShadow: `
      0 0 20px ${accent}40,
      0 0 40px ${accent}20,
      0 0 60px ${accent}10,
      inset 0 1px 0 ${accent2}33
    `,
  } : {};

  // HOS tier emoji visible even when locked; normal achievements keep 🔒
  const tierEmoji = shame ? HOS_TIER_EMOJI[def.rarity] : null;
  const tierLabel = shame ? HOS_TIER_LABELS[def.rarity] : r.label;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
      style={{
        background: bg,
        border: `1px solid ${unlocked ? accent + "cc" : "#2A2A2A"}`,
        ...glowStyle,
      }}
    >
      {/* animated shine */}
      {unlocked && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(115deg, transparent 35%, ${accent2}44 50%, transparent 65%)`,
            backgroundSize: "250% 100%",
            animation: "achShine 3.2s linear infinite",
          }}
        />
      )}
      {def.legacy && unlocked && (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            padding: 1,
            background: "linear-gradient(90deg,#F4C542,#FFF7D6,#8A6B12,#F4C542)",
            backgroundSize: "300% 100%",
            animation: "achShine 4s linear infinite",
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}

      <div className="relative flex items-start gap-3">
        <div
          className="grid size-11 shrink-0 place-items-center rounded-xl text-xl"
          style={{
            background: unlocked ? `radial-gradient(circle at 30% 25%, ${accent2}55, #0A0A0A 70%)` : "#191919",
            border: `1px solid ${unlocked ? accent + "88" : "#2E2E2E"}`,
            filter: unlocked ? "none" : "grayscale(1)",
            // Icon glow for unlocked achievements
            boxShadow: unlocked ? `0 0 12px ${accent}60, 0 0 24px ${accent}30` : "none",
          }}
        >
          {unlocked ? def.icon : "🔒"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em]" style={{ color: accent }}>
            <span>{tierEmoji ?? r.emoji} {tierLabel}</span>
            <span className="text-muted-foreground">· {CATEGORY_META[def.category].icon} {CATEGORY_META[def.category].label}</span>
          </div>
          <div className="truncate font-bold" style={{ color: unlocked ? "#F4F1EA" : "#8A8A80" }}>
            {unlocked ? def.name : "???"}
          </div>
          <div className="text-[10px] text-muted-foreground truncate">
            {unlocked ? def.description : `${def.requirement.toLocaleString()} ${def.unit}`}
          </div>

          {!unlocked && (
            <>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/60">
                <div className="h-full rounded-full" style={{ width: `${Math.round(p.pct * 100)}%`, background: shame ? "#8A2C2C" : "#D9A928" }} />
              </div>
              <div className="mt-1 text-[10px] tabular-nums text-muted-foreground">
                {Math.floor(p.value).toLocaleString()} / {def.requirement.toLocaleString()} {def.unit}
                {p.legacyLockedOut && <span className="ml-1 text-[9px] uppercase tracking-widest text-primary/70">· claimed</span>}
              </div>
            </>
          )}

          {unlocked && !compact && (
            <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
              <span>
                {p.unlock?.baseline
                  ? "Historic baseline"
                  : p.unlock
                    ? new Date(p.unlock.ts).toLocaleDateString()
                    : ""}
              </span>
              <span className="font-bold tabular-nums" style={{ color: def.shame ? "#EB5757" : accent }}>
                {def.points > 0 ? "+" : ""}{def.points} ACH
              </span>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes achShine { from { background-position: 200% 0 } to { background-position: -100% 0 } }`}</style>
    </div>
  );
}
