import React from "react";
import { DetectionMitigationDeck } from "../digitaltwin/DetectionMitigationDeck";
import { StateComparisonMatrix } from "../digitaltwin/StateComparisonMatrix";
import { GenerationRedispatchPanel } from "../digitaltwin/GenerationRedispatchPanel";
import { useSimulation } from "../simulation/SimulationContext";
import { Wrench, ShieldCheck, Zap, Activity, CheckCircle2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export function MitigationCenterView() {
  const {
    detection,
    mitigationPlan,
    lastMitigationResult,
    applyMitigation,
    redispatch,
    comparison,
    isLoading,
    stateMode,
  } = useSimulation();

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: Autonomous Mitigation Workbench */}
      <div className="rounded-xl border border-primary/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <Wrench className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
              AUTONOMOUS MITIGATION & PHYSICAL RECOVERY CONTROLLER
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              PHYSICS-INFORMED COUNTERMEASURES · INVERTER VOLT-VAR REGULATION · AC NEWTON-RAPHSON POWER-FLOW RECALCULATION
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold shadow-sm",
              lastMitigationResult?.recovery_effective
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400"
                : mitigationPlan
                ? "border-cyan-500/50 bg-cyan-500/15 text-cyan-400 animate-pulse"
                : "border-border/60 bg-void/70 text-muted-foreground"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                lastMitigationResult?.recovery_effective
                  ? "bg-emerald-400"
                  : mitigationPlan
                  ? "bg-cyan-400 animate-ping"
                  : "bg-muted-foreground"
              )}
            />
            <span>
              {lastMitigationResult?.recovery_effective
                ? "RESTORED & RECALCULATED"
                : mitigationPlan
                ? "COUNTERMEASURE ARMED"
                : "NOMINAL OPERATION"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Mitigation Deck (Left) + DER Redispatch (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Recommended Strategy & Execution Button */}
        <div className="lg:col-span-7">
          <DetectionMitigationDeck
            detection={detection}
            mitigationPlan={mitigationPlan}
            onApplyMitigation={applyMitigation}
            lastMitigationResult={lastMitigationResult}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Generation Redispatch & Secondary Inverter Control */}
        <div className="lg:col-span-5">
          <GenerationRedispatchPanel
            onRedispatch={redispatch}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Full State Comparison Matrix: Baseline Nominal vs Attack Compromised vs Recovered Mitigated */}
      <div className="pt-1">
        <StateComparisonMatrix comparison={comparison} isLoading={isLoading} />
      </div>
    </div>
  );
}

