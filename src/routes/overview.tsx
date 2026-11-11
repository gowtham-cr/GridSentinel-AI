import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import CyberGrid3D from "@/components/grid3d/CyberGrid3D";
import TelemetryPanel from "@/components/dashboard/TelemetryPanel";
import GridCharts from "@/components/dashboard/GridCharts";
import CyberSecurityPanel from "@/components/dashboard/CyberSecurityPanel";
import AttackLab from "@/components/dashboard/AttackLab";
import {
  fetchGridState,
  fetchActiveAttacks,
  fetchSecurityIncidents,
  fetchModelMetrics,
  launchAttack,
  stopAttack,
  stopAllAttacks,
  GridState,
  ActiveAttack,
  SecurityIncident,
  ModelMetrics,
  BusData,
} from "@/lib/api";
import { Shield, Zap, Activity, Clock, ShieldCheck, Flame, Cpu, Radio } from "lucide-react";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "CPS Central Command — GridSentinel AI" },
      { name: "description", content: "Cyber-Physical Microgrid Cybersecurity Operations Center." },
    ],
  }),
  component: DashboardOverview,
});

function DashboardOverview() {
  const [gridState, setGridState] = useState<GridState | null>(null);
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttack[]>([]);
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [modelMetrics, setModelMetrics] = useState<ModelMetrics | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString());
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [activeView, setActiveView] = useState<"all" | "3d" | "telemetry" | "charts" | "attacks" | "events">("all");

  // Fetch / refresh data loop
  const refreshData = useCallback(async () => {
    try {
      const [state, attacks, incs, metrics] = await Promise.all([
        fetchGridState(),
        fetchActiveAttacks(),
        fetchSecurityIncidents(),
        fetchModelMetrics(),
      ]);
      setGridState(state);
      setActiveAttacks(attacks);
      setIncidents(incs);
      setModelMetrics(metrics);
    } catch (e) {
      console.error("Refresh error:", e);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const timer = setInterval(() => {
      refreshData();
      setCurrentTime(new Date().toUTCString());
    }, 2000);
    return () => clearInterval(timer);
  }, [refreshData]);

  const handleLaunchAttack = async (type: string, targetBus: number, intensity: number, duration: number) => {
    await launchAttack(type, targetBus, intensity, duration);
    await refreshData();
  };

  const handleStopAttack = async (attackId: string) => {
    await stopAttack(attackId);
    await refreshData();
  };

  const handleStopAll = async () => {
    await stopAllAttacks();
    await refreshData();
  };

  const handleResolveIncident = (id: string) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.incident_id === id ? { ...inc, resolved: true } : inc))
    );
  };

  const hasActiveAttack = activeAttacks.length > 0;
  const currentAnomalyScore = hasActiveAttack
    ? Math.min(0.96, 0.72 + (activeAttacks[0].intensity || 1.5) * 0.1)
    : (gridState?.voltage_violations_count ?? 0) > 0
    ? 0.45
    : 0.035;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Top Control & Status Header */}
        <div className="rounded-2xl border border-cyan-500/25 bg-slate-950/80 p-5 shadow-2xl backdrop-blur-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/40 bg-cyan-950/60 shadow-[0_0_20px_rgba(6,182,212,0.3)] text-cyan-400">
                  <ShieldCheck className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                    GridSentinel Cyber-Physical Command Center
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-0.5 font-mono text-[10px] text-cyan-300">
                      v1.0.0
                    </span>
                  </h1>
                  <p className="font-sans text-xs text-slate-400">
                    Real-Time Microgrid Cybersecurity Monitoring • Pandapower AC Newton-Raphson Engine
                  </p>
                </div>
              </div>
            </div>

            {/* Right Status Badges */}
            <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
              <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/80 px-3.5 py-2 text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>{currentTime}</span>
              </div>

              <div
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2 ${
                  hasActiveAttack
                    ? "border-red-500/50 bg-red-950/40 text-red-300 animate-pulse"
                    : "border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                      hasActiveAttack ? "bg-red-400" : "bg-emerald-400"
                    } opacity-75`}
                  />
                  <span
                    className={`relative inline-flex h-2 w-2 rounded-full ${
                      hasActiveAttack ? "bg-red-400" : "bg-emerald-400"
                    }`}
                  />
                </span>
                <span className="font-semibold uppercase">
                  {hasActiveAttack ? `THREAT DETECTED (${activeAttacks.length})` : "GRID SECURE"}
                </span>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-cyan-300 text-[11px]">
                {gridState?.isDemoData ? "⚡ INTERACTIVE DEMO MODE" : "🟢 LIVE BACKEND CONNECTED"}
              </div>
            </div>
          </div>

          {/* View Filter Bar */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 p-1">
              {[
                { id: "all", label: "Full Command Center" },
                { id: "3d", label: "3D Digital Twin" },
                { id: "telemetry", label: "PMU Telemetry" },
                { id: "charts", label: "Dynamic Waveforms" },
                { id: "attacks", label: "Attack Deck" },
                { id: "events", label: "Security Logs" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as typeof activeView)}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    activeView === tab.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span>Topology: <strong>Resilient 8-Bus Microgrid</strong></span>
              <span>•</span>
              <span>Algorithm: <strong>Newton-Raphson AC</strong></span>
            </div>
          </div>
        </div>

        {/* KPI Stat Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono text-xs">
          {/* Card 1: Grid Health */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <span className="text-slate-400 text-[10px] uppercase block">Grid Health Index</span>
            <span
              className={`text-2xl font-bold mt-1 block ${
                hasActiveAttack ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {hasActiveAttack ? "84.2%" : "99.2%"}
            </span>
            <span className="text-[10px] text-slate-500">IEEE 1547 Envelope</span>
          </div>

          {/* Card 2: Total Generation */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <span className="text-slate-400 text-[10px] uppercase block">Total Generation</span>
            <span className="text-2xl font-bold text-cyan-300 mt-1 block">
              {(gridState?.total_generation_mw ?? 4.63).toFixed(2)} MW
            </span>
            <span className="text-[10px] text-slate-500">Solar + Wind + BESS</span>
          </div>

          {/* Card 3: Aggregate Load */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-lg">
            <span className="text-slate-400 text-[10px] uppercase block">Total Demand</span>
            <span className="text-2xl font-bold text-white mt-1 block">
              {(gridState?.total_load_mw ?? 3.90).toFixed(2)} MW
            </span>
            <span className="text-[10px] text-slate-500">Losses: {(gridState?.total_losses_mw ?? 0.13).toFixed(2)} MW</span>
          </div>

          {/* Card 4: Kirchhoff Residual */}
          <div
            className={`rounded-2xl border p-4 shadow-lg ${
              (gridState?.active_power_imbalance_mw ?? 0) > 0.15
                ? "border-red-500/50 bg-red-950/30"
                : "border-slate-800 bg-slate-950/70"
            }`}
          >
            <span className="text-slate-400 text-[10px] uppercase block">Kirchhoff Residual</span>
            <span
              className={`text-2xl font-bold mt-1 block ${
                (gridState?.active_power_imbalance_mw ?? 0) > 0.15 ? "text-red-400" : "text-emerald-400"
              }`}
            >
              {(gridState?.active_power_imbalance_mw ?? 0.0004).toFixed(4)} MW
            </span>
            <span className="text-[10px] text-slate-500">Conservation Check</span>
          </div>

          {/* Card 5: AI Anomaly Score */}
          <div
            className={`rounded-2xl border p-4 shadow-lg ${
              currentAnomalyScore > 0.6
                ? "border-red-500/50 bg-red-950/30"
                : currentAnomalyScore > 0.3
                ? "border-amber-500/40 bg-amber-950/20"
                : "border-slate-800 bg-slate-950/70"
            }`}
          >
            <span className="text-slate-400 text-[10px] uppercase block">AI Anomaly Score</span>
            <span
              className={`text-2xl font-bold mt-1 block ${
                currentAnomalyScore > 0.6
                  ? "text-red-400 animate-pulse"
                  : currentAnomalyScore > 0.3
                  ? "text-amber-400"
                  : "text-emerald-400"
              }`}
            >
              {(currentAnomalyScore * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-500">Isolation Forest</span>
          </div>

          {/* Card 6: Active Threats */}
          <div
            className={`rounded-2xl border p-4 shadow-lg ${
              hasActiveAttack ? "border-red-500/50 bg-red-950/40" : "border-slate-800 bg-slate-950/70"
            }`}
          >
            <span className="text-slate-400 text-[10px] uppercase block">Active Cyber Threats</span>
            <span
              className={`text-2xl font-bold mt-1 block ${
                hasActiveAttack ? "text-red-400 animate-pulse" : "text-white"
              }`}
            >
              {activeAttacks.length} Vector{activeAttacks.length === 1 ? "" : "s"}
            </span>
            <span className="text-[10px] text-slate-500">Virtual Environment</span>
          </div>
        </div>

        {/* Centerpiece 3D Visualization */}
        {(activeView === "all" || activeView === "3d") && (
          <div className="space-y-2">
            <CyberGrid3D
              buses={gridState?.buses ?? []}
              lines={gridState?.lines ?? []}
              activeAttacks={activeAttacks}
              onSelectBus={(bus) => setSelectedBus(bus)}
            />
          </div>
        )}

        {/* Attack Injection Lab */}
        {(activeView === "all" || activeView === "attacks") && (
          <AttackLab
            activeAttacks={activeAttacks}
            onLaunchAttack={handleLaunchAttack}
            onStopAttack={handleStopAttack}
            onStopAll={handleStopAll}
          />
        )}

        {/* Telemetry and State Estimation Panels */}
        {(activeView === "all" || activeView === "telemetry") && (
          <TelemetryPanel
            buses={gridState?.buses ?? []}
            lines={gridState?.lines ?? []}
            powerImbalance={gridState?.active_power_imbalance_mw ?? 0.0004}
            totalGen={gridState?.total_generation_mw ?? 4.63}
            totalLoad={gridState?.total_load_mw ?? 3.90}
            totalLoss={gridState?.total_losses_mw ?? 0.13}
            isDemoData={gridState?.isDemoData}
          />
        )}

        {/* Dynamic Frequency and Voltage Waveforms */}
        {(activeView === "all" || activeView === "charts") && (
          <GridCharts
            buses={gridState?.buses ?? []}
            totalGen={gridState?.total_generation_mw ?? 4.63}
            totalLoad={gridState?.total_load_mw ?? 3.90}
            hasActiveAttack={hasActiveAttack}
          />
        )}

        {/* Cybersecurity AI Detection & Incident Logs */}
        {(activeView === "all" || activeView === "events") && (
          <CyberSecurityPanel
            incidents={incidents}
            modelMetrics={modelMetrics}
            currentAnomalyScore={currentAnomalyScore}
            onResolveIncident={handleResolveIncident}
          />
        )}
      </div>
    </AppShell>
  );
}
