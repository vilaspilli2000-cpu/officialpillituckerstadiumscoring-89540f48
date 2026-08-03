import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { initCloud, teardownCloud, useCloud } from "@/lib/pts/cloud";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [session, setSession] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!active) return;
      setSession(!!s?.user);
      if (s?.user) {
        if (useCloud.getState().userId !== s.user.id) {
          void initCloud(s.user.id, s.user.email ?? null);
        }
      } else {
        teardownCloud();
      }
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(!!data.session?.user);
      setChecked(true);
      const u = data.session?.user;
      if (u && useCloud.getState().userId !== u.id) {
        void initCloud(u.id, u.email ?? null);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!checked) {
    return (
      <div className="min-h-screen grid place-items-center text-muted-foreground text-sm">
        Connecting to PTS Cloud…
      </div>
    );
  }
  if (!session) return <SignIn />;
  return <>{children}</>;
}

function SignIn() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) toast.success("Check your email to confirm your account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) toast.error("Google sign-in failed");
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
        <form
          onSubmit={submit}
          className="rounded-2xl border border-border/60 bg-card/70 p-5 space-y-3"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border/60 bg-secondary/50 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {mode === "in" ? "Sign in" : "Create account"}
          </Button>
          <button
            type="button"
            onClick={google}
            className="w-full rounded-xl border border-border/60 bg-secondary/60 px-4 py-3 text-sm font-semibold hover:border-primary"
          >
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "in" ? "up" : "in")}
            className="w-full text-xs text-muted-foreground hover:text-primary"
          >
            {mode === "in" ? "No account? Create one" : "Already have an account? Sign in"}
          </button>
        </form>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          The first account becomes Admin. Everyone else joins as a live Viewer.
        </p>
      </div>
    </div>
  );
}