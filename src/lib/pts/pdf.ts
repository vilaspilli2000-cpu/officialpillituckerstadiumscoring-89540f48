import { usePtsStore } from "./store";

export async function exportMatchPdf(matchId: string) {
  const state = usePtsStore.getState();
  const match = state.current?.id === matchId ? state.current : state.matches.find((m) => m.id === matchId);
  if (!match) return;
  const lines: string[] = [];
  lines.push(`PTS — Pilli Tucker Stadium`);
  lines.push(`${match.teamA.name} vs ${match.teamB.name} (${match.format})`);
  if (match.result) lines.push(match.result.summary);
  for (const inn of match.innings) {
    const t = inn.battingTeam === "A" ? match.teamA.name : match.teamB.name;
    lines.push(`\n${t}: ${inn.runs}/${inn.wickets} (${Math.floor(inn.legalBalls/6)}.${inn.legalBalls%6})`);
    for (const b of inn.batters) {
      lines.push(`  ${state.players.find((p) => p.id === b.playerId)?.name ?? b.playerId}  ${b.runs} (${b.balls})  4s:${b.fours}  ${b.out ? "out" : "not out"}`);
    }
    for (const bw of inn.bowlers) {
      lines.push(`  ${state.players.find((p) => p.id === bw.playerId)?.name ?? bw.playerId}  ${Math.floor(bw.balls/6)}.${bw.balls%6}-${bw.wickets}/${bw.runs}`);
    }
  }
  if (match.story) lines.push(`\n${match.story}`);
  // Open as printable HTML — simpler & dependency-free, prints via browser to PDF
  const html = `<html><head><title>PTS Scorecard</title><style>body{font-family:ui-monospace,monospace;white-space:pre;padding:24px;background:#111;color:#eee}</style></head><body>${escapeHtml(lines.join("\n"))}</body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}