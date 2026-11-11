import { Shield, ShieldAlert, ShieldCheck, AlertTriangle, Activity, CheckCircle2, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData } from "@/lib/gridApi";

interface SafetyMonitoringPanelProps {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  frequencyHz: number;
}

export function SafetyMonitoringPanel({
  buses,
  lines,
  frequencyHz,
}: SafetyMonitoringPanelProps) {
  // Voltage safety analysis (0.90 - 1.10 pu configured limits)
  const voltageViolations = buses.filter((b) => b.voltage_violation ?? (b.vm_pu < 0.90 || b.vm_pu > 1.10));
  const minVm = buses.length > 0 ? Math.min(...buses.map((b) => b.vm_pu)) : 1.0;
  const maxVm = buses.length > 0 ? Math.max(...buses.map((b) => b.vm_pu)) : 1.0;

  // Thermal loading safety analysis
  const overloadedLines = lines.filter((l) => l.loading_percent > 100);
  const maxLoading = lines.length > 0 ? Math.max(...lines.map((l) => l.loading_percent)) : 0;

  // Frequency constraint analysis
  const isFreqNormal = frequencyHz >= 49.8 && frequencyHz <= 50.2;
  const isUflsTriggered = frequencyHz < 49.2;

  // Control Barrier Function (CBF) Margin h(x)
  // Distance to nearest statutory boundary
  const cbfVoltageMargin = Math.min(1.10 - maxVm, minVm - 0.90);
  const cbfThermalMargin = 1.0 - (maxLoading / 100);
  const isCbfSatisfied = cbfVoltageMargin >= 0 && cbfThermalMargin >= 0 && isFreqNormal;

  // Overall Safety Status
  const isCritical = voltageViolations.length > 0 || overloadedLines.length > 0 || !isFreqNormal;

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {isCritical ? (
            <ShieldAlert className="size-4 text-destructive animate-pulse" />
          ) : (
            <ShieldCheck className="size-4 text-success" />
          )}
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            Safety-Critical Monitoring / Control Barrier Functions
          </h4>
        </div>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-bold border",
            isCritical
              ? "border-destructive/50 bg-destructive/15 text-destructive animate-pulse"
              : "border-success/40 bg-success/15 text-success"
          )}
        >
          {isCritical ? "SAFETY BREACH DETECTED" : "NERC / IEEE COMPLIANT"}
        </span>
      </div>

      {/* 4 Constraints Breakdown (Voltage, Thermal, Frequency, CBF Invariance) */}
      <div className="mt-3.5 grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {/* 1. Voltage Limits (0.90 - 1.10 pu) */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all",
            voltageViolations.length > 0
              ? "border-destructive/60 bg-destructive/10"
              : "border-border/60 bg-void/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Voltage Envelope
            </span>
            {voltageViolations.length > 0 ? (
              <AlertTriangle className="size-3 text-destructive" />
            ) : (
              <CheckCircle2 className="size-3 text-success" />
            )}
          </div>
          <p className="mt-1.5 text-sm font-bold text-foreground">
            {minVm.toFixed(3)} - {maxVm.toFixed(3)} <span className="text-[10px] text-muted-foreground font-normal">pu</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Limits: [0.90, 1.10] pu
          </p>
          <div className="mt-1.5 pt-1 border-t border-border/40 text-[9px] flex items-center justify-between">
            <span>Violations:</span>
            <span className={cn("font-bold", voltageViolations.length > 0 ? "text-destructive" : "text-success")}>
              {voltageViolations.length} {voltageViolations.length === 1 ? "Bus" : "Buses"}
            </span>
          </div>
        </div>

        {/* 2. Thermal Limits (<= 100%) */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all",
            overloadedLines.length > 0
              ? "border-destructive/60 bg-destructive/10"
              : "border-border/60 bg-void/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Thermal Constraints
            </span>
            {overloadedLines.length > 0 ? (
              <AlertTriangle className="size-3 text-destructive animate-pulse" />
            ) : (
              <CheckCircle2 className="size-3 text-success" />
            )}
          </div>
          <p className="mt-1.5 text-sm font-bold text-foreground">
            {maxLoading.toFixed(1)}% <span className="text-[10px] text-muted-foreground font-normal">Peak</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Thermal Limit: 100%
          </p>
          <div className="mt-1.5 pt-1 border-t border-border/40 text-[9px] flex items-center justify-between">
            <span>Overloaded:</span>
            <span className={cn("font-bold", overloadedLines.length > 0 ? "text-destructive" : "text-success")}>
              {overloadedLines.length} {overloadedLines.length === 1 ? "Line" : "Lines"}
            </span>
          </div>
        </div>

        {/* 3. Frequency Limits (49.8 - 50.2 Hz) */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all",
            !isFreqNormal
              ? "border-destructive/60 bg-destructive/10"
              : "border-border/60 bg-void/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Frequency Limits
            </span>
            {!isFreqNormal ? (
              <AlertTriangle className="size-3 text-destructive" />
            ) : (
              <CheckCircle2 className="size-3 text-success" />
            )}
          </div>
          <p className="mt-1.5 text-sm font-bold text-foreground">
            {frequencyHz.toFixed(2)} <span className="text-[10px] text-muted-foreground font-normal">Hz</span>
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Band: 49.8 - 50.2 Hz
          </p>
          <div className="mt-1.5 pt-1 border-t border-border/40 text-[9px] flex items-center justify-between">
            <span>UFLS:</span>
            <span className={cn("font-bold", isUflsTriggered ? "text-destructive" : "text-success")}>
              {isUflsTriggered ? "ACTIVE" : "STANDBY"}
            </span>
          </div>
        </div>

        {/* 4. Control Barrier Function (CBF) Status */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-all",
            !isCbfSatisfied
              ? "border-destructive/60 bg-destructive/10 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
              : "border-primary/40 bg-void/50"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              CBF Barrier h(x)
            </span>
            <Lock className={cn("size-3", isCbfSatisfied ? "text-primary" : "text-destructive")} />
          </div>
          <p className={cn("mt-1.5 text-sm font-bold", isCbfSatisfied ? "text-primary-glow" : "text-destructive")}>
            h(x) = {cbfVoltageMargin.toFixed(3)}
          </p>
          <p className="text-[9px] text-muted-foreground mt-0.5">
            Safe Set Invariance
          </p>
          <div className="mt-1.5 pt-1 border-t border-border/40 text-[9px] flex items-center justify-between">
            <span>State:</span>
            <span className={cn("font-bold", isCbfSatisfied ? "text-success" : "text-destructive font-black")}>
              {isCbfSatisfied ? "IN SAFE SET C" : "BARRIER VIOLATED"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
