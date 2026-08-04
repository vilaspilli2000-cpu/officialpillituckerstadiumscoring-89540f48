import { canScoreHere, claimScoring, deviceId, useCloud } from "@/lib/pts/cloud";
import { leavePts } from "@/components/pts/AuthGate";
import { toast } from "sonner";

export function CloudBar() {
  const { status, role, email, scoringDevice, pendingWrites } = useCloud();
  const holdsLock = scoringDevice === deviceId();
  const scoring = canScoreHere();

  const tone =
    status === "synced"
      ? "bg-emerald-500"
      : status === "saving" || status === "loading"
        ? "bg-primary animate-pulse"
        : status === "offline"
          ? "bg-amber-500"
          : status === "error"
            ? "bg-red-500"
            : "bg-muted-foreground";

  const label =
    status === "synced"
      ? "Cloud synced"
      : status === "saving"
        ? "Saving…"
        : status === "loading"
          ? "Loading…"
          : status === "offline"
            ? `Offline${pendingWrites ? ` · ${pendingWrites} queued` : ""}`
            : status === "error"
              ? "Sync retrying"
              : "Connecting";

  return (
    <div className="mx-auto max-w-5xl px-4 pb-2 flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.15em]">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
        <span className="text-muted-foreground truncate">{label}</span>
        <span className="text-primary font-bold">{role === "admin" ? "Admin" : "Viewer"}</span>
        {role === "admin" && !holdsLock && scoringDevice && (
          <button
            onClick={async () => {
              const r = await claimScoring(true);
              toast[r.ok ? "success" : "error"](
                r.ok ? "Scoring control taken over" : "Could not take control",
              );
            }}
            className="rounded-full border border-primary/50 px-2 py-0.5 text-primary"
          >
            {scoring ? "Take control" : "Locked · take over"}
          </button>
        )}
      </div>
      <button
        onClick={() => void leavePts()}
        className="text-muted-foreground hover:text-primary shrink-0"
        title={email ?? undefined}
      >
        {role === "admin" ? "Sign out" : "Exit"}
      </button>
    </div>
  );
}