import { Play, Pause, RotateCcw, SkipForward, Cpu, Activity, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulationStatus, TopologySummary } from "@/lib/gridApi";

interface GridControlBarProps {
  topologies: TopologySummary[];
  activeTopology: string;
  onSelectTopology: (id: string) => void;
  status: SimulationStatus | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStep: () => void;
  frequencyHz: number;
  isLoading?: boolean;
}

export function GridControlBar({
  topologies,
  activeTopology,
  onSelectTopology,
  status,
  onStart,
  onPause,
  onResume,
  onReset,
  onStep,
  frequencyHz,
  isLoading = false,
}: GridControlBarProps) {
  const isRunning = status?.status === "RUNNING";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg">
      {/* 1. Topology Selection & Initialize */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            Virtual Grid:
          </span>
        </div>
        <select
          value={activeTopology}
          onChange={(e) => onSelectTopology(e.target.value)}
          disabled={isLoading}
          className="rounded-md border border-primary/40 bg-void px-3 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
        >
          {topologies.map((t) => (
            <option key={t.id} value={t.id} className="bg-void text-foreground">
              {t.name} ({t.voltage_level})
            </option>
          ))}
        </select>
        <span className="hidden sm:inline-block rounded border border-primary/20 bg-primary/5 px-2 py-1 font-mono text-[10px] text-primary">
          AC Newton-Raphson
        </span>
      </div>

      {/* 2. Simulation Playback Controls */}
      <div className="flex items-center gap-2">
        {isRunning ? (
          <button
            type="button"
            onClick={onPause}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-warning/50 bg-warning/10 px-3 py-1.5 font-mono text-xs text-warning hover:bg-warning/20 transition-all cursor-pointer"
            title="Pause continuous simulation"
          >
            <Pause className="size-3.5" />
            <span>Pause</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={status?.status === "PAUSED" ? onResume : onStart}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-success/50 bg-success/10 px-3 py-1.5 font-mono text-xs text-success hover:bg-success/20 transition-all cursor-pointer"
            title="Start continuous time stepping"
          >
            <Play className="size-3.5 fill-current" />
            <span>{status?.status === "PAUSED" ? "Resume" : "Start"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onStep}
          disabled={isLoading || isRunning}
          className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-1.5 font-mono text-xs text-primary hover:bg-primary/20 disabled:opacity-50 transition-all cursor-pointer"
          title="Advance simulation by single time interval"
        >
          <SkipForward className="size-3.5" />
          <span>Step</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/30 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-all cursor-pointer"
          title="Reset simulation time and nominal setpoints"
        >
          <RotateCcw className="size-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* 3. Live Frequency & Step Telemetry */}
      <div className="flex items-center gap-4">
        {/* Frequency Meter */}
        <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-void/60 px-3 py-1 font-mono text-xs">
          <Activity className={cn("size-3.5", Math.abs(frequencyHz - 50.0) > 0.4 ? "text-destructive animate-pulse" : "text-primary")} />
          <span className="text-muted-foreground">Freq:</span>
          <span
            className={cn(
              "font-bold tabular-nums",
              Math.abs(frequencyHz - 50.0) > 0.4
                ? "text-destructive"
                : Math.abs(frequencyHz - 50.0) > 0.15
                ? "text-warning"
                : "text-primary-glow"
            )}
          >
            {frequencyHz.toFixed(2)} Hz
          </span>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span
            className={cn(
              "size-2 rounded-full",
              isRunning
                ? "bg-success animate-pulse-soft"
                : "bg-warning"
            )}
          />
          <span className="text-muted-foreground uppercase text-[11px]">
            {status?.status || "PAUSED"}
          </span>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            Step {status?.step_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

