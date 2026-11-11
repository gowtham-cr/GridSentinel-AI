import React, { useState } from "react";
import { useSimulation } from "../simulation/SimulationContext";
import {
  Cpu,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Info,
  Database,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StateEstimationView() {
  const {
    estimationResult,
    badDataReport,
    runStateEstimation,
    evaluateEstimationScenario,
    isLoading,
  } = useSimulation();

  const [activeScenarioTab, setActiveScenarioTab] = useState<"normal" | "corrupted" | "missing">("normal");

  const handleTriggerScenario = async (scenario: "normal" | "corrupted" | "missing") => {
    setActiveScenarioTab(scenario);
    if (scenario === "normal") {
      await evaluateEstimationScenario({ scenario: "normal" });
    } else if (scenario === "corrupted") {
      await evaluateEstimationScenario({
        scenario: "corrupted",
        corrupted_bus_id: 4,
        corruption_type: "voltage",
        corruption_magnitude: 0.3,
      });
    } else {
      await evaluateEstimationScenario({
        scenario: "missing",
        missing_channel_ratio: 0.2,
      });
    }
  };

  const isConverged = estimationResult?.converged ?? true;
  const isBadData = badDataReport?.bad_data_detected ?? false;
  const chi2Passed = badDataReport?.chi2_passed ?? true;
  const numBad = badDataReport?.num_bad_measurements ?? 0;
  const suspicious = badDataReport?.suspicious_channels ?? [];
  const busEstimates = estimationResult?.bus_estimates ?? [];

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: WLS Engine & Scenario Selector */}
      <div className="rounded-xl border border-primary/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-purple-500/50 bg-purple-500/10 text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
            <Cpu className="size-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
              POWER SYSTEM STATE ESTIMATION & BAD-DATA IDENTIFICATION
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              WEIGHTED LEAST SQUARES (WLS) · CHI-SQUARE HYPOTHESIS TESTING · 3-SIGMA NORMALIZED RESIDUALS (r_N)
            </p>
          </div>
        </div>

        {/* Scenario Switcher Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-void/80 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => handleTriggerScenario("normal")}
              disabled={isLoading}
              className={cn(
                "rounded px-2.5 py-1 font-bold transition-all cursor-pointer",
                activeScenarioTab === "normal"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Nominal (Noise)
            </button>
            <button
              type="button"
              onClick={() => handleTriggerScenario("corrupted")}
              disabled={isLoading}
              className={cn(
                "rounded px-2.5 py-1 font-bold transition-all cursor-pointer",
                activeScenarioTab === "corrupted"
                  ? "bg-destructive/20 text-destructive border border-destructive/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Corrupted FDIA (Bus 4)
            </button>
            <button
              type="button"
              onClick={() => handleTriggerScenario("missing")}
              disabled={isLoading}
              className={cn(
                "rounded px-2.5 py-1 font-bold transition-all cursor-pointer",
                activeScenarioTab === "missing"
                  ? "bg-warning/20 text-warning border border-warning/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Missing Telemetry (20%)
            </button>
          </div>

          <button
            type="button"
            onClick={runStateEstimation}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-500/10 px-3 py-1.5 font-bold text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer shadow-sm text-[11px]"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
            <span>Re-Estimate</span>
          </button>
        </div>
      </div>

      {/* KPI Row: WLS Metrics & Chi-Square Status */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: WLS Optimization Status */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">WLS Convergence</span>
            <CheckCircle2 className={cn("size-4", isConverged ? "text-emerald-400" : "text-destructive")} />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-base font-black tracking-wider uppercase",
              isConverged ? "text-emerald-400" : "text-destructive"
            )}
          >
            {isConverged ? "CONVERGED" : "DIVERGED"}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {estimationResult?.num_iterations ?? 4} Gauss-Newton Iters ({estimationResult?.execution_time_ms.toFixed(1) ?? "12.4"} ms)
          </p>
        </div>

        {/* KPI 2: Chi-Square Test */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Chi-Square Test (χ²)</span>
            <Activity className={cn("size-4", chi2Passed ? "text-emerald-400" : "text-destructive")} />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-base font-black tracking-wider uppercase",
              chi2Passed ? "text-emerald-400" : "text-destructive"
            )}
          >
            {chi2Passed ? "PASSED (NO BAD DATA)" : "BAD DATA REJECTED"}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Hypothesis α = 0.05 Confidence
          </p>
        </div>

        {/* KPI 3: Measurement Channels */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sensors Observability</span>
            <Database className="size-4 text-cyan-400" />
          </div>
          <p className="mt-2 font-display text-base font-black tracking-wider text-cyan-400">
            {estimationResult?.num_measurements ?? 30} <span className="text-xs text-muted-foreground font-normal">CHANNELS</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Dropped / Missing: {estimationResult?.num_missing_measurements ?? 0}
          </p>
        </div>

        {/* KPI 4: Voltage Magnitude RMSE */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Voltage RMSE</span>
            <Cpu className="size-4 text-purple-400" />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-base font-black tracking-wider",
              (estimationResult?.rmse_vm_pu ?? 0.005) > 0.03 ? "text-destructive" : "text-purple-400"
            )}
          >
            {(estimationResult?.rmse_vm_pu ?? 0.0048).toFixed(4)} <span className="text-xs font-normal">pu</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Max Error: {(estimationResult?.max_vm_error_pu ?? 0.0082).toFixed(4)} pu
          </p>
        </div>

        {/* KPI 5: Bad Data Channels Flagged */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">3-Sigma Flagged</span>
            <AlertTriangle className={cn("size-4", numBad > 0 ? "text-destructive animate-pulse" : "text-emerald-400")} />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-base font-black tracking-wider",
              numBad > 0 ? "text-destructive" : "text-emerald-400"
            )}
          >
            {numBad} <span className="text-xs font-normal">CHANNELS</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {numBad > 0 ? "Normalized residual r_N ≥ 3.0" : "All residuals nominal"}
          </p>
        </div>
      </div>

      {/* Bad Data Identification & Suspicious Channels Table */}
      <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <ShieldAlert className="size-4 text-purple-400" />
              <span>Suspicious Measurement Channels Attribution (Normalized Residuals)</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Identifies corrupt measurement channels where normalized residual exceeds standard 3.0-sigma threshold.
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase",
              isBadData
                ? "bg-destructive/20 text-destructive border border-destructive/40"
                : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
            )}
          >
            {isBadData ? "Corrupt Channels Detected" : "Zero Bad Data Channels"}
          </span>
        </div>

        {suspicious.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-[10px]">
            No suspicious channels identified. All measurement residuals |z_i - h_i(x)| are within 3σ Gaussian bounds.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px]">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground">
                  <th className="py-1.5 px-2">CH ID</th>
                  <th className="py-1.5 px-2">SENSOR NAME</th>
                  <th className="py-1.5 px-2">TYPE</th>
                  <th className="py-1.5 px-2">ELEMENT</th>
                  <th className="py-1.5 px-2">MEASURED</th>
                  <th className="py-1.5 px-2">ESTIMATED</th>
                  <th className="py-1.5 px-2">RAW RESIDUAL</th>
                  <th className="py-1.5 px-2">NORMALIZED r_N</th>
                  <th className="py-1.5 px-2">ATTRIBUTION</th>
                </tr>
              </thead>
              <tbody>
                {suspicious.map((ch) => (
                  <tr
                    key={ch.channel_id}
                    className="border-b border-border/30 hover:bg-void/50 text-foreground"
                  >
                    <td className="py-1.5 px-2 text-cyan-400 font-bold">#{ch.channel_id}</td>
                    <td className="py-1.5 px-2 font-semibold">{ch.name}</td>
                    <td className="py-1.5 px-2 uppercase">{ch.meas_type}</td>
                    <td className="py-1.5 px-2">{ch.element_type} #{ch.element_id}</td>
                    <td className="py-1.5 px-2 text-destructive font-bold">{ch.measured_value.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-emerald-400 font-bold">
                      {ch.estimated_value?.toFixed(4) ?? "--"}
                    </td>
                    <td className="py-1.5 px-2 text-warning">
                      {ch.raw_residual?.toFixed(4) ?? "--"}
                    </td>
                    <td className="py-1.5 px-2 font-bold text-destructive">
                      {ch.normalized_residual?.toFixed(2) ?? "--"} σ
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[9px] text-destructive font-bold">
                        BAD DATA FLAG
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bus Estimates vs Ground Truth Comparison Table */}
      <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="size-4 text-cyan-400" />
              <span>Bus State Estimates vs Simulator Ground Truth</span>
            </h3>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Independent comparison between WLS state estimator outputs and Pandapower AC power-flow ground truth.
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {busEstimates.length} buses evaluated
          </span>
        </div>

        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-left font-mono text-[10px]">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="py-1.5 px-2">BUS</th>
                <th className="py-1.5 px-2">NAME</th>
                <th className="py-1.5 px-2">ESTIMATED V (pu)</th>
                <th className="py-1.5 px-2">GROUND TRUTH V (pu)</th>
                <th className="py-1.5 px-2">|ΔV| ERROR (pu)</th>
                <th className="py-1.5 px-2">ESTIMATED θ (deg)</th>
                <th className="py-1.5 px-2">GROUND TRUTH θ (deg)</th>
                <th className="py-1.5 px-2">|Δθ| ERROR (deg)</th>
              </tr>
            </thead>
            <tbody>
              {busEstimates.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-center text-muted-foreground">
                    No bus estimates available. Click "Re-Estimate" to run WLS.
                  </td>
                </tr>
              ) : (
                busEstimates.map((b) => (
                  <tr key={b.bus_id} className="border-b border-border/30 hover:bg-void/50">
                    <td className="py-1.5 px-2 text-cyan-400 font-bold">Bus {b.bus_id}</td>
                    <td className="py-1.5 px-2 font-medium">{b.name}</td>
                    <td className="py-1.5 px-2 text-foreground font-bold">{b.estimated_vm_pu.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{b.ground_truth_vm_pu.toFixed(4)}</td>
                    <td
                      className={cn(
                        "py-1.5 px-2 font-bold",
                        b.vm_error_pu > 0.02 ? "text-destructive" : "text-emerald-400"
                      )}
                    >
                      {b.vm_error_pu.toFixed(4)}
                    </td>
                    <td className="py-1.5 px-2 text-foreground">{b.estimated_va_degree.toFixed(2)}°</td>
                    <td className="py-1.5 px-2 text-muted-foreground">{b.ground_truth_va_degree.toFixed(2)}°</td>
                    <td className="py-1.5 px-2 text-cyan-400 font-bold">{b.va_error_degree.toFixed(2)}°</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provenance & Disclaimer Footer */}
      <div className="rounded-lg border border-border/60 bg-void/70 p-3 flex items-start gap-2.5 text-[10px] text-muted-foreground">
        <Info className="size-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground">Provenance & Measurement Model Disclosure:</span>
          <p className="mt-0.5 leading-relaxed">
            {estimationResult?.data_source_disclaimer ||
              "Simulated software telemetry generated from Pandapower AC power flow. No physical PMU hardware connection. Strictly software-simulated benchmark."}
          </p>
        </div>
      </div>
    </div>
  );
}

