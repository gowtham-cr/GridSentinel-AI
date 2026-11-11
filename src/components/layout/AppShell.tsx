import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { appConfig, navItems } from "@/config/app";
import { isBackendConnected } from "@/lib/api";
import { Shield, Sparkles, User, Radio, Activity } from "lucide-react";

export function AppShell({ children }: { children: ReactNode }) {
  const connected = isBackendConnected();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Grid cyber background overlay */}
      <div className="grid-bg pointer-events-none fixed inset-0 opacity-40" />

      {/* Persistent Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-cyan-500/20 bg-slate-950/85 backdrop-blur-xl shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-white group">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-transform group-hover:scale-105">
                <Shield className="h-4 w-4" />
              </div>
              <span className="font-display font-bold tracking-wider">
                GRIDSENTINEL<span className="text-cyan-400"> AI</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 font-mono text-xs">
              {navItems.map((n) => {
                const isActive = currentPath === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`rounded-xl px-3.5 py-2 transition-all cursor-pointer ${
                      isActive
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/60"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Status & Profile Controls */}
          <div className="flex items-center gap-3 font-mono text-xs">
            {/* Link back to Galaxy Welcome Screen */}
            <Link
              to="/"
              className="hidden lg:flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-slate-400 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
              title="Return to Galaxy Welcome Portal"
            >
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Cosmic Portal</span>
            </Link>

            {/* Backend / Sandbox status */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-1.5">
              <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-cyan-400"}`} />
              <span className="text-[11px] text-slate-300 font-medium">
                {connected ? "LIVE BACKEND" : "SIMULATED SANDBOX"}
              </span>
            </div>

            {/* Commander Gowtham Profile Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/80 px-3 py-1.5 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/20 text-cyan-300">
                <User className="h-3 w-3" />
              </div>
              <span className="font-semibold text-white text-[11px]">Gowtham</span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden overflow-x-auto px-4 py-2 border-t border-slate-800/80 gap-1 font-mono text-xs">
          {navItems.map((n) => {
            const isActive = currentPath === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-[11px] ${
                  isActive ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400"
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

export function EmptyPanel({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-12 text-center backdrop-blur-xl">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-semibold">{title}</p>
      <p className="mt-3 text-sm text-slate-400 font-sans">{hint}</p>
    </div>
  );
}

export function PageHeader({ eyebrow, title, desc }: { eyebrow: string; title: string; desc: string }) {
  return (
    <div className="mb-8">
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400 font-semibold">{eyebrow}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-white font-display">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm text-slate-400 font-sans leading-relaxed">{desc}</p>
    </div>
  );
}
