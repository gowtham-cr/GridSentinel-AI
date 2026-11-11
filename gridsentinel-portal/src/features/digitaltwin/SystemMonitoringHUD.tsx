import { Activity, Zap, Radio, ShieldCheck, ShieldAlert, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemMonitoringHUDProps {
  totalGenerationMw: number;
  totalLoadMw: number;
  frequencyHz: number;
  avgVoltagePu: number;
  minVoltagePu: number;
  maxVoltagePu: number;
  converged: boolean;
  activeAttacksCount: number;
  nominalFrequencyHz?: number;
}

export function SystemMonitoringHUD({
  totalGenerationMw,
  totalLoadMw,
  frequencyHz,
  avgVoltagePu,
  minVoltagePu,
  maxVoltagePu,
  converged,
  activeAttacksCount,
  nominalFrequencyHz = 50.0,
}: SystemMonitoringHUDProps) {
  const freqDeviation = +(frequencyHz - nominalFrequencyHz).toFixed(2);
  const isFreqStable = Math.abs(freqDeviation) <= 0.2;
  const isVoltageStable = minVoltagePu >= 0.90 && maxVoltagePu <= 1.10;
  const reserveMw = +(totalGenerationMw - totalLoadMw).toFixed(2);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Total Generation */}
      <div className="rounded-xl border border-primary/30 bg-card p-3.5 backdrop-blur-xl shadow-md font-mono relative overflow-hidden">
        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
          <span className="uppercase tracking-wider">Total Generation</span>
          <Zap className="size-3.5 text-primary" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold tracking-tight text-primary-glow">
            {totalGenerationMw.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">MW</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>Reserve: {reserveMw > 0 ? `+${reserveMw}` : reserveMw} MW</span>
          <span className="text-success font-semibold">Online</span>
        </div>
      </div>

      {/* 2. Total Load */}
      <div className="rounded-xl border border-primary/30 bg-card p-3.5 backdrop-blur-xl shadow-md font-mono relative overflow-hidden">
        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
          <span className="uppercase tracking-wider">Total System Load</span>
          <Activity className="size-3.5 text-accent" />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span className="font-display text-2xl font-bold tracking-tight text-accent">
            {totalLoadMw.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">MW</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>PF: 0.92 Inductive</span>
          <span className="text-primary font-semibold">Dynamic</span>
        </div>
      </div>

      {/* 3. Grid Frequency */}
      <div className="rounded-xl border border-primary/30 bg-card p-3.5 backdrop-blur-xl shadow-md font-mono relative overflow-hidden">
        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
          <span className="uppercase tracking-wider">Grid Frequency</span>
          <Radio
            className={cn(
              "size-3.5 animate-pulse",
              isFreqStable ? "text-success" : "text-destructive"
            )}
          />
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-2xl font-bold tracking-tight",
              isFreqStable ? "text-foreground" : "text-destructive"
            )}
          >
            {frequencyHz.toFixed(2)}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">Hz</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] border-t border-border/50 pt-1">
          <span className="text-muted-foreground">Δf: {freqDeviation >= 0 ? `+${freqDeviation}` : freqDeviation} Hz</span>
          <span
            className={cn(
              "font-semibold",
              isFreqStable ? "text-success" : "text-destructive animate-pulse"
            )}
          >
            {isFreqStable ? "Nominal (50Hz)" : "Constraint Breach"}
          </span>
        </div>
      </div>

      {/* 4. System Voltage (pu) */}
      <div className="rounded-xl border border-primary/30 bg-card p-3.5 backdrop-blur-xl shadow-md font-mono relative overflow-hidden">
        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
          <span className="uppercase tracking-wider">System Voltage (pu)</span>
          {isVoltageStable ? (
            <ShieldCheck className="size-3.5 text-success" />
          ) : (
            <ShieldAlert className="size-3.5 text-destructive animate-pulse" />
          )}
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <span
            className={cn(
              "font-display text-2xl font-bold tracking-tight",
              isVoltageStable ? "text-primary-glow" : "text-destructive"
            )}
          >
            {avgVoltagePu.toFixed(3)}
          </span>
          <span className="text-xs text-muted-foreground font-semibold">p.u.</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/50 pt-1">
          <span>Min: {minVoltagePu.toFixed(3)} pu</span>
          <span>Max: {maxVoltagePu.toFixed(3)} pu</span>
        </div>
      </div>
    </div>
  );
}

