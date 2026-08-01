import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/pts/AppShell";
import { Button } from "@/components/ui/button";
import { usePtsStore } from "@/lib/pts/store";
import type { Player } from "@/lib/pts/types";
import { toast } from "sonner";
import { RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/players/$id/edit")({
  head: () => ({ meta: [{ title: "Edit Player Records — PTS Scorer" }] }),
  component: EditPlayer,
  notFoundComponent: () => (
    <AppShell>
      <div className="text-muted-foreground">Player not found.</div>
    </AppShell>
  ),
});

function EditPlayer() {
  const { id } = Route.useParams();
  const player = usePtsStore((s) => s.players.find((p) => p.id === id));
  const update = usePtsStore((s) => s.updatePlayer);
  const reset = usePtsStore((s) => s.resetPlayerToCalculated);
  const remove = usePtsStore((s) => s.deletePlayer);
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Player | undefined>(player);

  // Keep the form in sync if the store player changes (initial hydration, undo elsewhere).
  useEffect(() => {
    if (player && !draft) setDraft(player);
  }, [player, draft]);

  if (!player || !draft) {
    return (
      <AppShell title="Edit">
        <p>
          Player not found.{" "}
          <Link to="/players" className="text-primary underline">Back</Link>
        </p>
      </AppShell>
    );
  }

  function save() {
    if (!draft) return;
    // Strip id/createdAt so the patch only mutates real fields.
    const { id: _i, createdAt: _c, ...patch } = draft;
    update(draft.id, patch);
    toast.success("Player records saved");
    navigate({ to: "/players/$id", params: { id: draft.id } });
  }

  function setCareer<K extends keyof Player["career"]>(k: K, v: number | boolean) {
    setDraft((d) => (d ? { ...d, career: { ...d.career, [k]: v } } : d));
  }
  function setSeed<K extends keyof Player["seed"]>(k: K, v: number | boolean) {
    setDraft((d) => (d ? { ...d, seed: { ...d.seed, [k]: v } } : d));
  }
  function setRating(k: keyof NonNullable<Player["ratings"]>, v: number) {
    setDraft((d) => (d ? { ...d, ratings: { ...(d.ratings ?? {}), [k]: v } } : d));
  }

  const c = draft.career;
  const r = draft.ratings ?? {};

  return (
    <AppShell title="">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-primary">Edit records</div>
          <h1 className="text-2xl font-black text-gradient-gold">{draft.name}</h1>
          {draft.manualOverride && (
            <span className="mt-1 inline-block rounded-full border border-primary/50 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
              Edited
            </span>
          )}
        </div>
        <button
          onClick={() => {
            if (confirm("Reset to calculated values from match history?")) {
              reset(draft.id);
              toast.success("Reset to calculated values");
              navigate({ to: "/players/$id", params: { id: draft.id } });
            }
          }}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <Section title="Identity">
        <Text label="Name" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} />
        <Select
          label="Role"
          value={draft.role ?? "—"}
          options={["—", "Batter", "Bowler", "All-rounder", "Wicketkeeper"]}
          onChange={(v) => setDraft({ ...draft, role: v as Player["role"] })}
        />
        <Text label="Notes" value={draft.notes ?? ""} onChange={(v) => setDraft({ ...draft, notes: v })} />
      </Section>

      <Section title="Batting">
        <Num label="Matches" v={c.matches} on={(v) => setCareer("matches", v)} />
        <Num label="Innings" v={c.innings ?? 0} on={(v) => setCareer("innings", v)} />
        <Num label="Runs" v={c.runs} on={(v) => setCareer("runs", v)} />
        <Num label="Balls" v={c.balls} on={(v) => setCareer("balls", v)} />
        <Num label="Highest" v={Math.max(draft.seed.highest, c.highest)} on={(v) => { setSeed("highest", v); setCareer("highest", v); }} />
        <Num label="50s" v={draft.seed.fifties + c.fifties} on={(v) => { setSeed("fifties", v); setCareer("fifties", 0); }} />
        <Num label="100s" v={draft.seed.hundreds + c.hundreds} on={(v) => { setSeed("hundreds", v); setCareer("hundreds", 0); }} />
        <Num label="150s" v={c.hundred50s ?? 0} on={(v) => setCareer("hundred50s", v)} />
        <Num label="200s" v={c.doubleHundreds ?? 0} on={(v) => setCareer("doubleHundreds", v)} />
        <Num label="Fours" v={c.fours} on={(v) => setCareer("fours", v)} />
        <Num label="Sixes" v={c.sixes} on={(v) => setCareer("sixes", v)} />
        <Num label="Not outs" v={c.notOuts} on={(v) => setCareer("notOuts", v)} />
        <Num label="Ducks" v={c.ducks ?? 0} on={(v) => setCareer("ducks", v)} />
      </Section>

      <Section title="Bowling">
        <Num label="Wickets" v={c.wickets} on={(v) => setCareer("wickets", v)} />
        <Num label="Runs conceded" v={c.bowlRuns} on={(v) => setCareer("bowlRuns", v)} />
        <Num label="Balls bowled" v={c.bowlBalls} on={(v) => setCareer("bowlBalls", v)} />
        <Num label="Maidens" v={c.maidens ?? 0} on={(v) => setCareer("maidens", v)} />
        <Num label="Dot balls" v={c.dots ?? 0} on={(v) => setCareer("dots", v)} />
        <Num label="Wides" v={c.wides ?? 0} on={(v) => setCareer("wides", v)} />
        <Num label="No balls" v={c.noBalls ?? 0} on={(v) => setCareer("noBalls", v)} />
        <Num label="Best — wkts" v={c.bestBowlingWkts ?? 0} on={(v) => setCareer("bestBowlingWkts", v)} />
        <Num label="Best — runs" v={c.bestBowlingRuns ?? 0} on={(v) => setCareer("bestBowlingRuns", v)} />
      </Section>

      <Section title="Fielding & Awards">
        <Num label="Catches" v={c.catches} on={(v) => setCareer("catches", v)} />
        <Num label="Run outs" v={c.runOuts} on={(v) => setCareer("runOuts", v)} />
        <Num label="Boundary saves" v={c.boundarySaves ?? 0} on={(v) => setCareer("boundarySaves", v)} />
        <Num label="Catch drops" v={c.catchDrops ?? 0} on={(v) => setCareer("catchDrops", v)} />
        <Num label="Total Awards" v={c.awards} on={(v) => setCareer("awards", v)} />
        <Num label="POM" v={c.pomAwards ?? 0} on={(v) => setCareer("pomAwards", v)} />
        <Num label="Batsman of Match" v={c.batsmanAwards ?? 0} on={(v) => setCareer("batsmanAwards", v)} />
        <Num label="Bowler of Match" v={c.bowlerAwards ?? 0} on={(v) => setCareer("bowlerAwards", v)} />
        <Num label="Fielder of Match" v={c.fielderAwards ?? 0} on={(v) => setCareer("fielderAwards", v)} />
        <Num label="Fighter of Match" v={c.fighterAwards ?? 0} on={(v) => setCareer("fighterAwards", v)} />
        <Num label="Worst of Match" v={c.worstAwards ?? 0} on={(v) => setCareer("worstAwards", v)} />
      </Section>

      <Section title="Ratings (0–100)">
        {([
          ["overall", "Overall"], ["batting", "Batting"], ["bowling", "Bowling"],
          ["fielding", "Fielding"], ["pressure", "Pressure"], ["matchWinning", "Match-winning"],
          ["wicketTaking", "Wicket-taking"], ["sixHitting", "Six-hitting"],
          ["deathBat", "Death bat"], ["deathBowl", "Death bowl"], ["recentForm", "Recent form"],
        ] as Array<[keyof NonNullable<Player["ratings"]>, string]>).map(([k, label]) => (
          <Num key={k} label={label} v={r[k] ?? 0} on={(v) => setRating(k, Math.min(100, Math.max(0, v)))} />
        ))}
      </Section>

      <div className="sticky bottom-3 mt-6 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => navigate({ to: "/players/$id", params: { id: draft.id } })}>
          Cancel
        </Button>
        <Button variant="gold" className="flex-1" onClick={save}>
          Save changes
        </Button>
      </div>

      <button
        onClick={() => {
          if (confirm(`Delete ${draft.name}? This cannot be undone.`)) {
            remove(draft.id);
            toast.success("Player deleted");
            navigate({ to: "/players" });
          }
        }}
        className="mt-4 flex items-center justify-center gap-2 w-full rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
      >
        <Trash2 size={14} /> Delete player
      </button>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-gold rounded-2xl p-4 mt-4">
      <h2 className="text-[11px] uppercase tracking-[0.2em] text-primary mb-3">{title}</h2>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Num({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <label className="block min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={Number.isFinite(v) ? v : 0}
        onChange={(e) => on(Math.max(0, Number(e.target.value) || 0))}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-base tabular-nums font-bold focus:border-primary outline-none"
      />
    </label>
  );
}

function Text({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block col-span-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-base focus:border-primary outline-none"
      />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block col-span-2 min-w-0">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-base focus:border-primary outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </label>
  );
}