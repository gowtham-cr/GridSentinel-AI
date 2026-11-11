import { useState } from "react";
import { BusData, LineData } from "@/lib/api";
import { Gauge, CheckCircle2, AlertTriangle, ShieldCheck, Zap, Radio, Database } from "lucide-react";

interface TelemetryPanelProps {
  buses: BusData[];
  lines: LineData[];
  powerImbalance: number;
  totalGen: number;
  totalLoad: number;
  totalLoss: number;
  isDemoData?: boolean;
}

export default function TelemetryPanel({
  buses,
  lines,
  powerImbalance,
  totalGen,
  totalLoad,
  totalLoss,
  isDemoData = false,
}: TelemetryPanelProps) {
  const [activeTab, setActiveTab] = useState<"buses" | "lines" | "state_estimation">("buses");

  // Statistical Bad Data Detection (BDD) evaluation
  const isBadDataDetected = powerImbalance > 0.15 || buses.some((b) => b.is_spoofed || b.voltage_violation);

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
            <Radio className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Substation PMU Telemetry & State Estimation
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              High-resolution synchrophasor sensor acquisition & Kirchhoff conservation
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 font-mono text-xs">
          <button
            onClick={() => setActiveTab("buses")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "buses" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Bus Telemetry ({buses.length})
          </button>
          <button
            onClick={() => setActiveTab("lines")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "lines" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Line Loadings ({lines.length})
          </button>
          <button
            onClick={() => setActiveTab("state_estimation")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "state_estimation" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            State Estimation (BDD)
          </button>
        </div>
      </div>

      {/* Tab 1: Bus Telemetry Table */}
      {activeTab === "buses" && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Node ID</th>
                <th className="py-2.5 px-3">Bus Description</th>
                <th className="py-2.5 px-3">Nominal kV</th>
                <th className="py-2.5 px-3">Voltage (Vm)</th>
                <th className="py-2.5 px-3">Angle (δ)</th>
                <th className="py-2.5 px-3">Active (P)</th>
                <th className="py-2.5 px-3">Reactive (Q)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {buses.map((bus) => {
                const isUnderVoltage = bus.vm_pu < 0.95;
                const isOverVoltage = bus.vm_pu > 1.05;
                const isCompromised = bus.is_spoofed;

                return (
                  <tr
                    key={bus.bus_id}
                    className={`transition-colors hover:bg-slate-900/40 ${
                      isCompromised
                        ? "bg-red-950/20 text-red-200"
                        : isUnderVoltage || isOverVoltage
                        ? "bg-amber-950/15"
                        : ""
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold text-cyan-400">Node_{bus.bus_id}</td>
                    <td className="py-2.5 px-3 text-slate-300">{bus.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{bus.vn_kv} kV</td>
                    <td className="py-2.5 px-3 font-semibold">
                      <span
                        className={
                          isCompromised
                            ? "text-red-400 font-bold animate-pulse"
                            : isUnderVoltage || isOverVoltage
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }
                      >
                        {bus.vm_pu.toFixed(4)} p.u.
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{bus.va_degree.toFixed(2)}°</td>
                    <td className="py-2.5 px-3 text-white">
                      {bus.p_mw >= 0 ? `+${bus.p_mw.toFixed(2)}` : bus.p_mw.toFixed(2)} MW
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{bus.q_mvar.toFixed(2)} MVAr</td>
                    <td className="py-2.5 px-3">
                      {isCompromised ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300 border border-red-500/40">
                          <AlertTriangle className="h-3 w-3" />
                          SPOOFED
                        </span>
                      ) : isUnderVoltage ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          UNDER-VOLT
                        </span>
                      ) : isOverVoltage ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          OVER-VOLT
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" />
                          NOMINAL
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Line Loadings */}
      {activeTab === "lines" && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-xs">
          {lines.map((line) => {
            const isOverload = line.loading_percent > 100;
            const isWarning = line.loading_percent > 80;

            return (
              <div
                key={line.line_id}
                className={`rounded-xl border p-3.5 transition-all ${
                  isOverload
                    ? "border-red-500/50 bg-red-950/20"
                    : isWarning
                    ? "border-amber-500/40 bg-amber-950/15"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white">{line.name}</span>
                  <span
                    className={`font-bold ${
                      isOverload ? "text-red-400 animate-pulse" : isWarning ? "text-amber-400" : "text-emerald-400"
                    }`}
                  >
                    {line.loading_percent.toFixed(1)}% Loading
                  </span>
                </div>

                {/* Loading Progress Bar */}
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isOverload ? "bg-red-500" : isWarning ? "bg-amber-400" : "bg-cyan-400"
                    }`}
                    style={{ width: `${Math.min(line.loading_percent, 100)}%` }}
                  />
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>From: Bus {line.from_bus} ➔ To: Bus {line.to_bus}</span>
                  <span>Losses: {line.pl_mw.toFixed(3)} MW</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: State Estimation & Physics Verification */}
      {activeTab === "state_estimation" && (
        <div className="mt-4 space-y-4 font-mono text-xs">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="text-slate-400 block text-[10px] uppercase">Total Active Gen (Σ Pgen)</span>
              <span className="text-xl font-bold text-cyan-300 mt-1 block">{totalGen.toFixed(2)} MW</span>
              <span className="text-[10px] text-slate-500">External Grid + Solar + Wind + BESS</span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="text-slate-400 block text-[10px] uppercase">Total Demand + Losses</span>
              <span className="text-xl font-bold text-white mt-1 block">{(totalLoad + totalLoss).toFixed(2)} MW</span>
              <span className="text-[10px] text-slate-500">Loads: {totalLoad.toFixed(2)} MW | Losses: {totalLoss.toFixed(2)} MW</span>
            </div>

            <div className={`rounded-xl border p-4 ${isBadDataDetected ? "border-red-500/50 bg-red-950/30" : "border-emerald-500/30 bg-emerald-950/20"}`}>
              <span className="text-slate-400 block text-[10px] uppercase">Kirchhoff Conservation Residual</span>
              <span className={`text-xl font-bold mt-1 block ${isBadDataDetected ? "text-red-400" : "text-emerald-400"}`}>
                {powerImbalance.toFixed(5)} MW
              </span>
              <span className="text-[10px] text-slate-400">
                {isBadDataDetected ? "⚠️ VIOLATION: Non-zero physical residual" : "✓ Physical conservation satisfied"}
              </span>
            </div>
          </div>

          {/* Bad Data Detection Engine Status */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-cyan-400" />
                <span className="font-semibold text-white">Weighted Least Squares (WLS) State Estimator</span>
              </div>
              <span className="rounded-full bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 text-[10px] text-cyan-300">
                r = ||z - h(x̂)||
              </span>
            </div>
            <p className="text-slate-300 font-sans text-xs leading-relaxed">
              State estimation runs physics-informed Chi-Squared (χ²) test against telemetry inputs. If an adversary injects false measurements that do not obey AC power flow Kirchhoff laws, the measurement residual spikes, triggering automated bad data elimination.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

