import { useEffect, useState, type ReactNode } from "react";

// PTS closure: app is under maintenance until Feb 1, 2027 (local system time).
const REOPEN_AT = new Date(2027, 1, 1, 0, 0, 0).getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, REOPEN_AT - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const totalHours = Math.floor(totalMinutes / 60);
  const hours = totalHours % 24;
  const totalDays = Math.floor(totalHours / 24);
  // Months/days split based on calendar math from today to reopen date.
  const nowDate = new Date(now);
  const target = new Date(REOPEN_AT);
  let months =
    (target.getFullYear() - nowDate.getFullYear()) * 12 +
    (target.getMonth() - nowDate.getMonth());
  let anchor = new Date(nowDate);
  anchor.setMonth(anchor.getMonth() + months);
  if (anchor.getTime() > nowDate.getTime() + (totalDays * 24 * 3600 * 1000 - totalDays * 24 * 3600 * 1000)) {
    // no-op guard; calendar logic handled below
  }
  if (anchor.getTime() > target.getTime()) {
    months -= 1;
    anchor = new Date(nowDate);
    anchor.setMonth(anchor.getMonth() + months);
  }
  const daysAfterMonths = Math.max(
    0,
    Math.floor((target.getTime() - anchor.getTime()) / (24 * 3600 * 1000))
  );

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto size-16 rounded-2xl gradient-gold grid place-items-center text-primary-foreground font-black text-xl shadow-gold">
          PTS
        </div>
        <h1 className="mt-5 text-2xl font-black text-gradient-gold leading-snug">
          The PTS app is closed and is under maintainance
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Will be under maintainance till Jan 31. The app will start working normally
          and the <span className="font-semibold text-primary">PILLI TUCKER STADIUM</span>{" "}
          will reopen on <span className="font-semibold text-primary">Feb 1 2027</span>.
        </p>

        <div className="mt-6 rounded-2xl border border-primary/30 bg-card/70 p-5 shadow-gold">
          <div className="text-[10px] uppercase tracking-[0.25em] text-primary/80 mb-3">
            Countdown to reopening
          </div>
          <div className="grid grid-cols-5 gap-2">
            <Unit value={pad(months)} label="Months" />
            <Unit value={pad(daysAfterMonths)} label="Days" />
            <Unit value={pad(hours)} label="Hours" />
            <Unit value={pad(minutes)} label="Minutes" />
            <Unit value={pad(seconds)} label="Seconds" />
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            <span className="text-lg font-black text-primary">{totalDays}</span> days
            remaining until Feb 1, 2027
          </div>
        </div>

        <p className="mt-6 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Every Touch Counts
        </p>
      </div>
      <div className="hidden">{children}</div>
    </div>
  );
}

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/50 py-3">
      <div className="text-xl font-black text-primary tabular-nums">{value}</div>
      <div className="text-[9px] uppercase tracking-widest text-muted-foreground mt-1">
        {label}
      </div>
    </div>
  );
}
