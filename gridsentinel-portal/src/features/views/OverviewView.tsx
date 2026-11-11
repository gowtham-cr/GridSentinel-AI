import React from "react";
import { MicrogridTwinView } from "../digitaltwin/MicrogridTwinView";
import { RightMonitoringSection } from "../digitaltwin/RightMonitoringSection";
import { SimulationTimeline } from "../digitaltwin/SimulationTimeline";
import { useSimulation, DEFAULT_BUSES } from "../simulation/SimulationContext";
import { Activity, ShieldAlert, Zap, Cpu, Orbit } from "lucide-react";
import { cn } from "@/lib/utils";

export function OverviewView() {
  const {
    buses,
    lines,
    activeAttacks,
    selectedBusId,
    setSelectedBusId,
    stateMode,
    setStateMode,
    totalGenMw,
    totalLoadMw,
    totalLossesMw,
    powerImbalanceMw,
    frequencyHz,
    avgVm,
    minVm,
    maxVm,
    eventHistory,
    currentStage,
    detection,
    mitigationPlan,
    status,
  } = useSimulation();

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* High-Level Overview KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* KPI 1: Cybersecurity Threat Status */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Cyber Threat Level</span>
            <ShieldAlert
              className={cn(
                "size-4",
                activeAttacks.length > 0 ? "text-destructive animate-pulse" : "text-emerald-400"
              )}
            />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-lg font-black tracking-wider uppercase",
              activeAttacks.length > 0 ? "text-destructive" : "text-emerald-400"
            )}
          >
            {activeAttacks.length > 0 ? "ATTACK ACTIVE" : "GUARDED (NOMINAL)"}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {activeAttacks.length > 0
              ? `${activeAttacks.length} compromised component`
              : "Zero active cyber intrusions"}
          </p>
        </div>

        {/* KPI 2: Grid Frequency */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">System Frequency</span>
            <Activity className="size-4 text-primary" />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-lg font-black tracking-wider",
              Math.abs(frequencyHz - 50.0) > 0.2 ? "text-warning" : "text-primary-glow"
            )}
          >
            {frequencyHz.toFixed(2)} <span className="text-xs font-normal">Hz</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Nominal 50.00 Hz (±0.20 Hz Deadband)
          </p>
        </div>

        {/* KPI 3: Generation & Load Balance */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Power Balance</span>
            <Zap className="size-4 text-yellow-400" />
          </div>
          <p className="mt-2 font-display text-lg font-black tracking-wider text-foreground">
            {totalGenMw.toFixed(2)} <span className="text-xs text-muted-foreground font-normal">/ {totalLoadMw.toFixed(2)} MW</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Net Intertie: 0.00 MW · Losses: {totalLossesMw.toFixed(2)} MW
          </p>
        </div>

        {/* KPI 4: Voltage Envelope */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Voltage Margin</span>
            <Cpu className="size-4 text-cyan-400" />
          </div>
          <p
            className={cn(
              "mt-2 font-display text-lg font-black tracking-wider",
              minVm < 0.90 || maxVm > 1.10 ? "text-destructive" : "text-cyan-400"
            )}
          >
            {minVm.toFixed(3)} - {maxVm.toFixed(3)} <span className="text-xs font-normal">pu</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Avg: {avgVm.toFixed(3)} pu (Limit: 0.90 - 1.10 pu)
          </p>
        </div>

        {/* KPI 5: AC Power Flow Engine */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-3 shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Pandapower Solver</span>
            <Orbit className="size-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-display text-lg font-black tracking-wider text-emerald-400">
            CONVERGED
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Newton-Raphson · Step #{status?.step_count ?? 1}
          </p>
        </div>
      </div>

      {/* Central 3D Grid (~65%) + Right Monitoring Section (~35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-7 space-y-3">
          <MicrogridTwinView
            buses={buses}
            lines={lines}
            activeAttacks={activeAttacks}
            onSelectBus={(id) => setSelectedBusId(id)}
            stateMode={stateMode}
            onStateModeChange={(m) => {
              setStateMode(m);
              if (m === "NORMAL") {
                // Return to normal
              } else if (m === "ATTACKED") {
                // Attacked preview
              } else if (m === "RECOVERED") {
                // Recovered
              }
            }}
          />
        </div>

        <div className="lg:col-span-5 h-full">
          <RightMonitoringSection
            totalGenerationMw={totalGenMw}
            totalLoadMw={totalLoadMw}
            frequencyHz={frequencyHz}
            avgVoltagePu={avgVm}
            minVoltagePu={minVm}
            maxVoltagePu={maxVm}
            buses={buses}
            lines={lines}
            events={eventHistory}
            selectedBusId={selectedBusId}
            onSelectBus={(id) => setSelectedBusId(id)}
          />
        </div>
      </div>

      {/* Bottom: Simulation Stage Timeline */}
      <div className="pt-1">
        <SimulationTimeline
          currentStage={currentStage}
          activeAttackType={activeAttacks[0]?.attack_type}
          anomalyScore={detection?.anomaly_score}
          mitigationStrategy={mitigationPlan?.strategy_name}
          stepCount={status?.step_count ?? 1}
        />
      </div>
    </div>
  );
}

