import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  Orbit,
  Flame,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Wrench,
  Activity,
  Clock,
  Database,
  Radio,
  LogOut,
  Zap,
  Menu,
  X,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  ChevronRight,
  Network,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { OperatorSession } from "@/features/auth/authStore";
import {
  SimulationProvider,
  useSimulation,
} from "../simulation/SimulationContext";
import { OverviewView } from "../views/OverviewView";
import { AttackCenterView } from "../views/AttackCenterView";
import { DetectionCenterView } from "../views/DetectionCenterView";
import { StateEstimationView } from "../views/StateEstimationView";
import { MitigationCenterView } from "../views/MitigationCenterView";
import { AgentNetworkView } from "../views/AgentNetworkView";
import { SimulationHistoryView } from "../views/SimulationHistoryView";
import { CoordinatedThreatIntelligenceView } from "../views/CoordinatedThreatIntelligenceView";
import {
  gridNodes,
  initialEvents,
  makeEvent,
  threatTimeline,
  threatVectors,
  type SecurityEvent,
  type Severity,
} from "./data";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type NavItemId =
  | "overview"
  | "attack"
  | "detection"
  | "estimation"
  | "mitigation"
  | "coordinated"
  | "agents"
  | "history"
  | "soc";

const ease = [0.16, 1, 0.3, 1] as const;

function LiveClock() {
  const [now, setNow] = useState<string>("--:--:--");
  useEffect(() => {
    const tick = () =>
      setNow(new Date().toLocaleTimeString("en-GB", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono tabular-nums">{now}</span>;
}

// Legacy SOC sub-view for backward compatibility
function SocOperationsView() {
  const {
    buses,
    lines,
    activeAttacks,
    eventHistory,
    telemetryLatencyMs,
    stateMode,
  } = useSimulation();

  const [events, setEvents] = useState<SecurityEvent[]>(initialEvents);
  useEffect(() => {
    let next = initialEvents.length;
    const id = setInterval(() => {
      setEvents((prev) => [makeEvent(next++), ...prev].slice(0, 8));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  const severityStyle: Record<Severity, string> = {
    critical: "text-destructive border-destructive/40 bg-destructive/10",
    high: "text-accent border-accent/40 bg-accent/10",
    medium: "text-warning border-warning/30 bg-warning/5",
    low: "text-primary border-primary/30 bg-primary/5",
  };

  const isAttacked = activeAttacks.length > 0;
  const kpis = [
    {
      label: "Threat Level",
      value: isAttacked ? "CRITICAL" : stateMode === "RECOVERED" ? "RECOVERED" : "NOMINAL",
      sub: isAttacked ? `${activeAttacks.length} Attack(s) Active` : "NERC CIP-005 Compliant",
      icon: ShieldAlert,
      tone: isAttacked ? "text-destructive" : "text-success",
    },
    {
      label: "Security Events Logged",
      value: `${eventHistory.length}`,
      sub: "Persisted in SQLite database",
      icon: ShieldCheck,
      tone: "text-primary",
    },
    {
      label: "Grid Substation Nodes",
      value: `${buses.length}`,
      sub: `${buses.length} Buses · ${lines.length} Lines Online`,
      icon: Cpu,
      tone: "text-success",
    },
    {
      label: "Telemetry Latency",
      value: `${telemetryLatencyMs} ms`,
      sub: "WebSocket SCADA Roundtrip",
      icon: Zap,
      tone: "text-primary-glow",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="panel p-4">
            <div className="flex items-center justify-between">
              <p className="hud-label">{k.label}</p>
              <k.icon className={cn("size-4", k.tone)} />
            </div>
            <p className={cn("mt-3 font-display text-2xl font-bold tracking-wider", k.tone)}>{k.value}</p>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="panel p-4 lg:col-span-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="hud-label">SCADA Historical Trends (24h Aggregate Reference)</p>
              <p className="mt-0.5 text-base font-semibold">Telemetry baseline variation vs. historical incidents</p>
            </div>
            <Activity className="size-4 text-primary" />
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={threatTimeline} margin={{ left: -18, right: 4, top: 8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="hour" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--foreground)" }} />
                <Area type="monotone" dataKey="blocked" stroke="var(--chart-1)" strokeWidth={2} fill="rgba(34, 211, 238, 0.2)" />
                <Area type="monotone" dataKey="anomalies" stroke="var(--chart-2)" strokeWidth={2} fill="rgba(245, 158, 11, 0.2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel flex flex-col p-4 lg:col-span-4">
          <div className="flex items-center justify-between">
            <p className="hud-label">Live SOC Event Stream</p>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-destructive">
              <span className="size-1.5 rounded-full bg-destructive animate-pulse" /> LIVE
            </span>
          </div>
          <ul className="mt-3 flex-1 space-y-2 overflow-hidden">
            {/* Show any recent simulated event from eventHistory first */}
            {eventHistory.slice(0, 2).map((ev) => (
              <li key={ev.id} className="rounded-md border border-primary/40 bg-primary/10 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded border border-primary/50 bg-primary/20 px-1.5 py-0.2 font-mono text-[9px] uppercase text-primary font-bold">
                    {ev.severity}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">{(ev as any).source_agent || ev.target || "Agent Network"}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/90 font-medium">{ev.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{ev.details}</p>
              </li>
            ))}
            {events.slice(0, 3).map((e) => (
              <li key={e.id} className="rounded-md border border-border bg-muted/40 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("rounded border px-1.5 py-0.2 font-mono text-[9px] uppercase", severityStyle[e.severity])}>
                    {e.severity}
                  </span>
                  <span className="font-mono text-[9px] text-muted-foreground">{e.source}</span>
                </div>
                <p className="mt-1 text-xs text-foreground/90">{e.message}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

// Inner Controller Layout that consumes the Simulation Context
function DashboardInner({
  effectiveOperator,
  session,
  onSignOut,
}: {
  effectiveOperator: string;
  session?: OperatorSession | null;
  onSignOut?: () => void;
}) {
  const [activeNav, setActiveNav] = useState<NavItemId>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    status,
    activeTopology,
    topologies,
    selectTopology,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    stepSimulation,
    frequencyHz,
    elapsedSeconds,
    formatTime,
    isLoading,
    activeAttacks,
    detection,
    badDataReport,
    lastMitigationResult,
    eventHistory,
  } = useSimulation();

  const isRunning = status?.status === "RUNNING";

  // Sidebar navigation items
  const navItems = [
    {
      id: "overview" as NavItemId,
      title: "Overview",
      sub: "3D Digital-Twin & KPIs",
      icon: Orbit,
      badge: "LIVE 3D",
      badgeColor: "bg-primary/20 text-primary border-primary/30",
    },
    {
      id: "attack" as NavItemId,
      title: "Attack Center",
      sub: "Red-Team Injection Deck",
      icon: Flame,
      badge: activeAttacks.length > 0 ? `${activeAttacks.length} ACTIVE` : undefined,
      badgeColor: "bg-destructive/20 text-destructive border-destructive/40 animate-pulse",
    },
    {
      id: "detection" as NavItemId,
      title: "Detection Center",
      sub: "KCL Physics & ML Models",
      icon: ShieldAlert,
      badge: detection?.is_anomaly ? "ALERT" : "NOMINAL",
      badgeColor: detection?.is_anomaly
        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse"
        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    },
    {
      id: "estimation" as NavItemId,
      title: "State Estimation",
      sub: "WLS & Bad Data (3σ)",
      icon: Cpu,
      badge: badDataReport?.bad_data_detected ? "FLAGGED" : "WLS 3σ",
      badgeColor: badDataReport?.bad_data_detected
        ? "bg-purple-500/20 text-purple-400 border-purple-500/40 animate-pulse"
        : "bg-void text-muted-foreground border-border",
    },
    {
      id: "mitigation" as NavItemId,
      title: "Mitigation Center",
      sub: "Volt-VAR & Autonomous Recovery",
      icon: Wrench,
      badge: lastMitigationResult?.recovery_effective ? "RESTORED" : undefined,
      badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    },
    {
      id: "coordinated" as NavItemId,
      title: "Coordinated Intel",
      sub: "Graph-Temporal Correlation",
      icon: Network,
      badge: "CTIE",
      badgeColor: "bg-indigo-500/20 text-indigo-400 border-indigo-500/40",
    },
    {
      id: "agents" as NavItemId,
      title: "AI Agent Network",
      sub: "Interactive Mind Map",
      icon: Activity,
      badge: "MIND MAP",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    },
    {
      id: "history" as NavItemId,
      title: "Simulation History",
      sub: "SQLite Forensic Audit Log",
      icon: Database,
      badge: `${eventHistory.length}`,
      badgeColor: "bg-void text-muted-foreground border-border",
    },
    {
      id: "soc" as NavItemId,
      title: "SOC Operations",
      sub: "Enterprise Security Overview",
      icon: ShieldCheck,
      badge: "SOC",
      badgeColor: "bg-void text-muted-foreground border-border",
    },
  ];

  return (
    <div className="relative min-h-dvh w-full max-w-full overflow-x-hidden bg-background bg-grid flex flex-col lg:flex-row text-foreground font-mono">
      {/* Mobile Top Header Bar with Hamburger */}
      <div className="lg:hidden flex items-center justify-between p-3 border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="grid size-7 place-items-center rounded border border-primary/40 bg-primary/10 text-primary">
            <Orbit className="size-4" />
          </div>
          <span className="font-display text-xs font-bold tracking-wider">
            GRIDSENTINEL <span className="text-primary-glow">AI</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded border border-border bg-void text-foreground"
        >
          {sidebarOpen ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {/* Persistent Sidebar (Control-Center Navigation) */}
      <aside
        className={cn(
          "w-full lg:w-72 border-r border-border/80 bg-card/95 backdrop-blur-2xl flex flex-col justify-between shrink-0 z-30 transition-all duration-300",
          sidebarOpen ? "fixed inset-0 top-12 overflow-y-auto" : "hidden lg:flex"
        )}
      >
        <div className="p-4 space-y-4">
          {/* Brand Header */}
          <div className="border-b border-border/70 pb-3 flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl border border-primary/50 bg-primary/10 text-primary shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              <Orbit className="size-6 animate-spin-slow" />
            </div>
            <div>
              <p className="font-display text-xs font-black tracking-[0.18em] text-foreground">
                GRIDSENTINEL <span className="text-primary-glow">AI</span>
              </p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">
                POWER SYSTEM CPS CONTROLLER
              </p>
            </div>
          </div>

          {/* Operator Clearance Badge */}
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5 space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">OPERATOR:</span>
              <span className="font-bold text-foreground truncate max-w-[120px]">{effectiveOperator}</span>
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground">CLEARANCE:</span>
              <span className="text-cyan-400 font-bold">{session?.clearanceLevel || "Level 4 Clearance"}</span>
            </div>
            <div className="flex items-center justify-between text-[9px] pt-0.5 border-t border-border/40">
              <span className="text-muted-foreground">NODE:</span>
              <span className="text-emerald-400">{session?.nodeId || "SENTINEL-ALPHA-07"}</span>
            </div>
          </div>

          {/* Navigation Links for 7 Dedicated Modules */}
          <div className="space-y-1">
            <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground px-2 py-1">
              CONTROL MODULES
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveNav(item.id);
                    setSidebarOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-lg border text-left transition-all cursor-pointer group",
                    isActive
                      ? "border-primary bg-primary/15 text-foreground shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                      : "border-transparent bg-transparent text-muted-foreground hover:bg-void hover:text-foreground"
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0 transition-colors",
                        isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
                        item.id === "attack" && activeAttacks.length > 0 && "text-destructive animate-pulse"
                      )}
                    />
                    <div className="truncate">
                      <p
                        className={cn(
                          "text-xs font-bold leading-none truncate",
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      >
                        {item.title}
                      </p>
                      <p className="text-[9px] text-muted-foreground/80 mt-1 truncate">{item.sub}</p>
                    </div>
                  </div>

                  {item.badge && (
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[8.5px] font-bold border shrink-0",
                        item.badgeColor
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border/80 space-y-3 bg-void/50">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AC Grid 50.00 Hz</span>
            </span>
            <LiveClock />
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <Link
              to="/"
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors py-1 px-2 rounded border border-border/50 hover:border-primary/50"
            >
              ← Portal Welcome
            </Link>

            {onSignOut ? (
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1 text-[10px] text-destructive hover:bg-destructive/10 py-1 px-2 rounded border border-destructive/40 transition-colors cursor-pointer"
              >
                <LogOut className="size-3" />
                <span>Lock Node</span>
              </button>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1 text-[10px] text-primary hover:bg-primary/10 py-1 px-2 rounded border border-primary/40 transition-colors"
              >
                <LogOut className="size-3" />
                <span>Switch</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main Control-Center Content Area */}
      <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-3 sm:p-5 lg:p-6 space-y-4">
        {/* Top Operational Header Bar */}
        <div className="rounded-xl border border-primary/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
          {/* Left: Active Module Title & Breadcrumbs */}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                GRIDSENTINEL CPS ·
              </span>
              <h1 className="font-display text-sm font-black tracking-wider text-foreground uppercase">
                {navItems.find((n) => n.id === activeNav)?.title || "OVERVIEW"}
              </h1>
            </div>
            <p className="text-[9px] text-muted-foreground mt-0.5 tracking-wider">
              {navItems.find((n) => n.id === activeNav)?.sub}
            </p>
          </div>

          {/* Center: Live Simulation Status & Elapsed Time */}
          <div className="flex items-center gap-2.5">
            {/* Status Pill */}
            <div
              className={cn(
                "rounded-full border px-3 py-1 text-[10px] font-bold flex items-center gap-1.5 shadow-sm",
                activeAttacks.length > 0
                  ? "border-destructive/60 bg-destructive/20 text-destructive animate-pulse"
                  : isRunning
                  ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                  : "border-warning/50 bg-warning/15 text-warning"
              )}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  activeAttacks.length > 0
                    ? "bg-destructive animate-ping"
                    : isRunning
                    ? "bg-emerald-400 animate-pulse"
                    : "bg-warning"
                )}
              />
              <span>
                {activeAttacks.length > 0
                  ? "🚨 ATTACK INJECTED"
                  : isRunning
                  ? "● 1 Hz AC POWER FLOW ACTIVE"
                  : "⏸ SIMULATION PAUSED"}
              </span>
            </div>

            {/* Elapsed Time */}
            <div className="rounded-md border border-border/70 bg-void/80 px-2.5 py-1 text-[10px] text-primary flex items-center gap-1.5">
              <Clock className="size-3 text-primary" />
              <span className="font-bold tabular-nums">{formatTime(elapsedSeconds)}</span>
              <span className="text-muted-foreground text-[8.5px]">(Step #{status?.step_count ?? 1})</span>
            </div>
          </div>

          {/* Right: Simulation Controls & Topology Switcher */}
          <div className="flex items-center gap-2">
            {/* Topology Selector */}
            <select
              value={activeTopology}
              onChange={(e) => selectTopology(e.target.value)}
              disabled={isLoading}
              className="rounded-lg border border-primary/40 bg-void/80 px-2.5 py-1 text-[10px] font-mono text-foreground focus:border-primary focus:outline-none cursor-pointer"
            >
              {topologies.map((t) => (
                <option key={t.id} value={t.id} className="bg-void text-foreground">
                  {t.name}
                </option>
              ))}
            </select>

            {/* Playback Controls */}
            {isRunning ? (
              <button
                type="button"
                onClick={pauseSimulation}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-warning/50 bg-warning/10 px-2.5 py-1 text-[10px] font-bold text-warning hover:bg-warning/20 transition-all cursor-pointer"
                title="Pause simulation"
              >
                <Pause className="size-3" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={status?.status === "PAUSED" ? resumeSimulation : startSimulation}
                disabled={isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                title="Start simulation"
              >
                <Play className="size-3 fill-current" />
                <span>{status?.status === "PAUSED" ? "Resume" : "Start"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={stepSimulation}
              disabled={isLoading || isRunning}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary hover:bg-primary/20 disabled:opacity-40 transition-all cursor-pointer"
              title="Single step"
            >
              <SkipForward className="size-3" />
              <span className="hidden sm:inline">Step</span>
            </button>

            <button
              type="button"
              onClick={resetSimulation}
              disabled={isLoading}
              className="inline-flex items-center gap-1 rounded-lg border border-destructive/40 bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive hover:bg-destructive/20 transition-all cursor-pointer"
              title="Reset grid"
            >
              <RotateCcw className="size-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* View Content Rendering with AnimatePresence */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeNav}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {activeNav === "overview" && <OverviewView />}
            {activeNav === "attack" && <AttackCenterView />}
            {activeNav === "detection" && <DetectionCenterView />}
            {activeNav === "estimation" && <StateEstimationView />}
            {activeNav === "mitigation" && <MitigationCenterView />}
            {activeNav === "coordinated" && <CoordinatedThreatIntelligenceView />}
            {activeNav === "agents" && <AgentNetworkView />}
            {activeNav === "history" && <SimulationHistoryView />}
            {activeNav === "soc" && <SocOperationsView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

// Master Dashboard with SimulationProvider
export interface DashboardProps {
  operatorName?: string;
  session?: OperatorSession | null;
  onSignOut?: () => void;
}

export function Dashboard({
  operatorName = "Commander Gowtham",
  session,
  onSignOut,
}: DashboardProps) {
  const effectiveOperator = session?.operatorName || operatorName;

  return (
    <SimulationProvider>
      <DashboardInner
        effectiveOperator={effectiveOperator}
        session={session}
        onSignOut={onSignOut}
      />
    </SimulationProvider>
  );
}
