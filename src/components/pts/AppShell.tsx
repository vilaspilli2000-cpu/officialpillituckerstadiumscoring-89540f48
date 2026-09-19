import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AuthGate } from "./AuthGate";
import { CloudBar } from "./CloudBar";
import { AchievementUnlockOverlay } from "./AchievementUnlockOverlay";

export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <AuthGate>
      <Shell title={title}>{children}</Shell>
    </AuthGate>
  );
}

function Shell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-background/80 border-b border-primary/20">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-lg gradient-gold grid place-items-center text-primary-foreground font-black shrink-0 shadow-gold">
              PTS
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-gradient-gold truncate">
                Pilli Tucker Stadium
              </div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Every Touch Counts
              </div>
            </div>
          </Link>
          {title && (
            <div className="text-xs uppercase tracking-widest text-primary/80 truncate">
              {title}
            </div>
          )}
        </div>
        <CloudBar />
      </header>
      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 pb-24">{children}</main>
      <AchievementUnlockOverlay />
      <nav className="fixed bottom-0 inset-x-0 z-30 backdrop-blur-md bg-background/90 border-t border-primary/20 md:hidden">
        <div className="grid grid-cols-6 text-[11px]">
          <NavTab to="/" label="Home" />
          <NavTab to="/records" label="Records" />
          <NavTab to="/players" label="Players" />
          <NavTab to="/achievements" label="Badges" />
          <NavTab to="/almanac" label="Almanac" />
          <NavTab to="/history" label="History" />
        </div>
      </nav>
    </div>
  );
}

function NavTab({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="py-3 text-center text-muted-foreground hover:text-primary transition-colors"
      activeProps={{ className: "py-3 text-center text-primary font-semibold" }}
      activeOptions={{ exact: to === "/" }}
    >
      {label}
    </Link>
  );
}
