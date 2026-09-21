import { useEffect, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import {
  getOwnerAccess,
  unlockOwnerAccess,
} from "@/lib/ownerGate.functions";

// PTS closure: app is under maintenance until Feb 1, 2027 (local system time).
const REOPEN_AT = new Date(2027, 1, 1, 0, 0, 0).getTime();

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function MaintenanceGate({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(() => Date.now());
  const [ownerUnlocked, setOwnerUnlocked] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [showOwnerLogin, setShowOwnerLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(false);
  const [busy, setBusy] = useState(false);
  const resetClicksTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const getAccess = useServerFn(getOwnerAccess);
  const unlockAccess = useServerFn(unlockOwnerAccess);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    void getAccess().then(({ unlocked }) => {
      if (active) setOwnerUnlocked(unlocked);
    });
    return () => {
      active = false;
    };
  }, [getAccess]);

  useEffect(() => {
    return () => {
      if (resetClicksTimer.current) clearTimeout(resetClicksTimer.current);
    };
  }, []);

  function handleLogoClick() {
    const nextClicks = clicks + 1;
    if (resetClicksTimer.current) clearTimeout(resetClicksTimer.current);
    if (nextClicks >= 15) {
      setClicks(0);
      setShowOwnerLogin(true);
      setLoginError(false);
      setUsername("");
      setPassword("");
      return;
    }
    setClicks(nextClicks);
    resetClicksTimer.current = setTimeout(() => setClicks(0), 3000);
  }

  async function handleOwnerLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setLoginError(false);
    try {
      const result = await unlockAccess({ data: { username, password } });
      if (result.ok) {
        setOwnerUnlocked(true);
        setShowOwnerLogin(false);
        setUsername("");
        setPassword("");
      } else {
        setLoginError(true);
      }
    } catch {
      setLoginError(true);
    } finally {
      setBusy(false);
    }
  }

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
  if (anchor.getTime() > target.getTime()) {
    months -= 1;
    anchor = new Date(nowDate);
    anchor.setMonth(anchor.getMonth() + months);
  }
  const daysAfterMonths = Math.max(
    0,
    Math.floor((target.getTime() - anchor.getTime()) / (24 * 3600 * 1000))
  );

  if (ownerUnlocked) return <>{children}</>;

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-md text-center">
        <button
          type="button"
          aria-label="PTS"
          onClick={handleLogoClick}
          className="mx-auto block size-16 rounded-2xl gradient-gold text-primary-foreground font-black text-xl shadow-gold"
        >
          PTS
        </button>
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
      {showOwnerLogin && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 px-5 backdrop-blur-sm">
          <form
            onSubmit={handleOwnerLogin}
            className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card p-5 text-left shadow-gold"
          >
            <h2 className="text-lg font-black text-gradient-gold">Owner access</h2>
            <div className="mt-4 space-y-3">
              <input
                autoFocus
                required
                autoComplete="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
              />
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
              />
            </div>
            {loginError && (
              <p className="mt-3 text-sm text-destructive">Incorrect username or password.</p>
            )}
            <div className="mt-4 flex gap-2">
              <Button type="submit" variant="gold" className="flex-1" disabled={busy}>
                {busy ? "Checking…" : "Continue"}
              </Button>
              <Button
                type="button"
                variant="ghostGold"
                onClick={() => setShowOwnerLogin(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
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
