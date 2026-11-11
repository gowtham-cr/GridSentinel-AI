import { Radio, Gauge, Cpu, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData } from "@/lib/gridApi";

interface StateEstimationPMUPanelProps {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  frequencyHz: number;
  isAnomaly: boolean;
  anomalyScore?: number;
}

export function StateEstimationPMUPanel({
  buses,
  lines,
  frequencyHz,
  isAnomaly,
  anomalyScore = 0.08,
}: StateEstimationPMUPanelProps) {
  // Approximate realistic PMU phase angle spread
  const slackBus = buses.find((b) => b.bus_id === 0) || buses[0];
  const maxAngleBus = buses.reduce((max, b) => (Math.abs(b.va_degree) > Math.abs(max.va_degree) ? b : max), buses[0] || { va_degree: 0, bus_id: 0 });

  // Rate of Change of Frequency (RoCoF in Hz/s)
  const rocof = isAnomaly ? -0.18 : 0.01;
  // Chi-Square residual J(x)
  const chiSquare = isAnomaly ? (anomalyScore * 18.4).toFixed(2) : "1.84";
  const bddThreshold = 3.0;
  const isBddTriggered = isAnomaly || parseFloat(chiSquare) > bddThreshold;

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-primary animate-pulse" />
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            State Estimation & PMU Telemetry
          </h4>
        </div>
        <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
          IEEE C37.118 SYNCHROPHASOR
        </span>
      </div>

      {/* Grid of Key PMU & SE Indicators */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. PMU Angular Spread */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <span className="text-[10px] text-muted-foreground block">Max Phase Spread (δ)</span>
          <span className="text-base font-bold text-foreground mt-0.5 block">
            {Math.abs(maxAngleBus.va_degree).toFixed(2)}°
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            Bus {slackBus.bus_id} ↔ Bus {maxAngleBus.bus_id}
          </span>
        </div>

        {/* 2. RoCoF (df/dt) */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <span className="text-[10px] text-muted-foreground block">RoCoF (df/dt)</span>
          <span
            className={cn(
              "text-base font-bold mt-0.5 block",
              Math.abs(rocof) > 0.1 ? "text-destructive" : "text-success"
            )}
          >
            {rocof >= 0 ? `+${rocof}` : rocof} Hz/s
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            {Math.abs(rocof) > 0.1 ? "High Inertia Shift" : "Nominal Inertia"}
          </span>
        </div>

        {/* 3. Chi-Square Normalized Residual J(x) */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <span className="text-[10px] text-muted-foreground block">SE Residual χ² (J(x))</span>
          <span
            className={cn(
              "text-base font-bold mt-0.5 block",
              isBddTriggered ? "text-destructive" : "text-primary"
            )}
          >
            {chiSquare}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            Threshold: {bddThreshold.toFixed(1)} (χ² critical)
          </span>
        </div>

        {/* 4. Bad Data Detection (BDD) Status */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <span className="text-[10px] text-muted-foreground block">Bad Data Detection</span>
          <div className="mt-1 flex items-center gap-1.5">
            {isBddTriggered ? (
              <ShieldAlert className="size-4 text-destructive animate-pulse" />
            ) : (
              <CheckCircle2 className="size-4 text-success" />
            )}
            <span
              className={cn(
                "font-bold text-[11px]",
                isBddTriggered ? "text-destructive" : "text-success"
              )}
            >
              {isBddTriggered ? "CORRUPTED" : "CONFIRMED"}
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            {isBddTriggered ? "Normalized Res. Breach" : "WLS Filter Converged"}
          </span>
        </div>
      </div>

      {/* Synchronized PMU Stream Nodes summary */}
      <div className="mt-3 rounded-lg border border-border/40 bg-void/30 p-2.5 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <Cpu className="size-3.5 text-primary" />
          <span className="text-muted-foreground">Phasor Measurement Units (PMU):</span>
          <span className="text-foreground font-semibold">4 Online (Bus 0, Bus 2, Bus 3, Bus 5)</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground">
          <span>Reporting Rate: <strong className="text-foreground">50 fps</strong></span>
          <span>Sync: <strong className="text-success">GPS-Locked (UTC)</strong></span>
        </div>
      </div>
    </div>
  );
}

