import { useCallback, useEffect, useState } from "react";
import {
  PTS_ADMIN_PASSWORD, PTS_ADMIN_USERNAME, claimScoring, enterAsAdmin,
  enterAsViewer, ptsSignOut, useCloud,
} from "@/lib/pts/cloud";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MODE_KEY = "pts-access-mode";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const ready = useCloud((s) => s.ready);
  const role = useCloud((s) => s.role);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const saved = window.localStorage.getItem(MODE_KEY);
      try {
        if (saved === "admin") await enterAsAdmin(PTS_ADMIN_USERNAME, PTS_ADMIN_PASSWORD);
        else if (saved === "viewer") await enterAsViewer();
      } catch {
        window.localStorage.removeItem(MODE_KEY);
      }
      if (active) setBooting(false);
    })();
    return () => { active = false; };
  }, []);

  if (booting) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Connecting to PTS Cloud…
      </div>
    );
  }
  if (!ready || !role) return <AccessScreen />;
  return <>{children}</>;
}

/** Clears the saved access mode and returns to the PTS access screen. */
export async function leavePts() {
  window.localStorage.removeItem(MODE_KEY);
  await ptsSignOut();
}

function AccessScreen() {
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState<string | null>(null);

  const finishAdmin = useCallback(async () => {
    window.localStorage.setItem(MODE_KEY, "admin");
    const res = await claimScoring(false);
    if (!res.ok && /locked_elsewhere/.test(res.error ?? "")) {
      setLocked("Another admin device is currently scoring.");
      return;
    }
    toast.success("Signed in as PTS Admin");
  }, []);

  async function loginAdmin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await enterAsAdmin(username.trim(), password);
      await finishAdmin();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewer() {
    setBusy(true);
    try {
      window.localStorage.setItem(MODE_KEY, "viewer");
      await enterAsViewer();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reach PTS Cloud");
    } finally {
      setBusy(false);
    }
  }

  async function forceTakeover() {
    setBusy(true);
    await claimScoring(true);
    setLocked(null);
    setBusy(false);
    toast.success("Scoring control taken over");
  }

  if (locked) {
    return (
      <div className="min-h-screen grid place-items-center px-5">
        <div className="w-full max-w-sm rounded-2xl border border-border/60 bg-card/70 p-5 text-center space-y-4">
          <h2 className="text-lg font-black text-gradient-gold">Scoring in progress</h2>
          <p className="text-sm text-muted-foreground">{locked}</p>
          <Button variant="gold" className="w-full" disabled={busy} onClick={forceTakeover}>
            Force Takeover
          </Button>
          <button
            type="button"
            onClick={() => { setLocked(null); void viewer(); }}
            className="w-full text-xs text-muted-foreground hover:text-primary"
          >
            Continue as Viewer instead
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid place-items-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="mx-auto size-14 rounded-2xl gradient-gold grid place-items-center text-primary-foreground font-black text-lg shadow-gold">
            PTS
          </div>
          <h1 className="mt-4 text-2xl font-black text-gradient-gold">Pilli Tucker Stadium</h1>
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
            Every Touch Counts
          </p>
        </div>
        {showLogin ? (
          <form
            onSubmit={loginAdmin}
            className="rounded-2xl border border-border/60 bg-card/70 p-5 space-y-3"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-primary/80">
              Admin Login
            </div>
            <input
              autoFocus
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <Button type="submit" variant="gold" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Login as Admin"}
            </Button>
            <button
              type="button"
              onClick={() => setShowLogin(false)}
              className="w-full text-xs text-muted-foreground hover:text-primary"
            >
              Back
            </button>
          </form>
        ) : (
          <div className="rounded-2xl border border-border/60 bg-card/70 p-5 space-y-3">
            <Button
              variant="gold"
              className="w-full"
              disabled={busy}
              onClick={() => setShowLogin(true)}
            >
              Login as Admin
            </Button>
            <button
              type="button"
              disabled={busy}
              onClick={viewer}
              className="w-full rounded-xl border border-border/60 bg-secondary/60 px-4 py-3 text-sm font-semibold hover:border-primary disabled:opacity-60"
            >
              Enter PTS
            </button>
            <p className="text-center text-[11px] text-muted-foreground">
              Admins score live matches. Everyone else follows along in read-only Viewer mode.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}