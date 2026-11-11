import { useState } from "react";
import { Sliders, Zap, BatteryCharging, Sun, Wind, Power, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerationRedispatchPanelProps {
  onRedispatch?: (params: {
    solar_mw: number;
    wind_mw: number;
    bess_mw: number;
    load_shed_active: boolean;
  }) => void;
  isLoading?: boolean;
}

export function GenerationRedispatchPanel({
  onRedispatch,
  isLoading = false,
}: GenerationRedispatchPanelProps) {
  const [solarMw, setSolarMw] = useState<number>(1.5);
  const [windMw, setWindMw] = useState<number>(1.8);
  const [bessMw, setBessMw] = useState<number>(0.8);
  const [loadShedActive, setLoadShedActive] = useState<boolean>(false);
  const [ffrEnabled, setFfrEnabled] = useState<boolean>(true);
  const [appliedMsg, setAppliedMsg] = useState<string | null>(null);

  const handleApplyRedispatch = () => {
    onRedispatch?.({
      solar_mw: solarMw,
      wind_mw: windMw,
      bess_mw: bessMw,
      load_shed_active: loadShedActive,
    });
    setAppliedMsg(
      `Dispatched setpoints: Solar ${solarMw}MW, Wind ${windMw}MW, BESS ${bessMw}MW${
        loadShedActive ? ", Load Shedding: -0.6MW" : ""
      }`
    );
    setTimeout(() => setAppliedMsg(null), 3500);
  };

  const handleToggleLoadShed = () => {
    const nextState = !loadShedActive;
    setLoadShedActive(nextState);
    onRedispatch?.({
      solar_mw: solarMw,
      wind_mw: windMw,
      bess_mw: bessMw,
      load_shed_active: nextState,
    });
    setAppliedMsg(
      nextState
        ? "Emergency Load Shedding executed: 0.60 MW non-critical feeder disconnected."
        : "Load shedding restored to normal demand."
    );
    setTimeout(() => setAppliedMsg(null), 3500);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="size-4 text-primary" />
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            Control Actions & Generation Redispatch
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            AGC / GOVERNOR CONTROL
          </span>
        </div>
      </div>

      {/* Redispatch Sliders & Controls */}
      <div className="mt-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* 1. Solar PV Dispatch */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Sun className="size-3.5 text-warning" />
              Solar PV Setpoint
            </span>
            <span className="font-bold text-warning">{solarMw.toFixed(2)} MW</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="2.5"
            step="0.1"
            value={solarMw}
            onChange={(e) => setSolarMw(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-warning"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0.0 MW (Curtailed)</span>
            <span>2.5 MW (Peak)</span>
          </div>
        </div>

        {/* 2. Wind Turbine Dispatch */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Wind className="size-3.5 text-primary" />
              Wind Turbine Dispatch
            </span>
            <span className="font-bold text-primary">{windMw.toFixed(2)} MW</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="3.0"
            step="0.1"
            value={windMw}
            onChange={(e) => setWindMw(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>0.0 MW (Stall)</span>
            <span>3.0 MW (Rated)</span>
          </div>
        </div>

        {/* 3. BESS Storage Power Dispatch */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <BatteryCharging className="size-3.5 text-success" />
              BESS Inverter Dispatch
            </span>
            <span className="font-bold text-success">{bessMw.toFixed(2)} MW</span>
          </div>
          <input
            type="range"
            min="-1.0"
            max="1.5"
            step="0.1"
            value={bessMw}
            onChange={(e) => setBessMw(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-success"
          />
          <div className="flex justify-between text-[9px] text-muted-foreground">
            <span>-1.0 MW (Charging)</span>
            <span>+1.5 MW (Discharge)</span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Apply Redispatch + Fast Frequency Response + Emergency Load Shedding */}
      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          {/* Fast Frequency Response toggle */}
          <button
            type="button"
            onClick={() => setFfrEnabled(!ffrEnabled)}
            className={cn(
              "rounded px-2.5 py-1.5 border text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors",
              ffrEnabled
                ? "border-primary/50 bg-primary/15 text-primary"
                : "border-border bg-void text-muted-foreground"
            )}
          >
            <Zap className="size-3" />
            <span>FFR Governor: {ffrEnabled ? "ACTIVE (Droop 4%)" : "DISABLED"}</span>
          </button>

          {/* Emergency Load Shedding */}
          <button
            type="button"
            onClick={handleToggleLoadShed}
            className={cn(
              "rounded px-2.5 py-1.5 border text-[10px] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors",
              loadShedActive
                ? "border-destructive bg-destructive/20 text-destructive animate-pulse"
                : "border-warning/40 bg-warning/10 text-warning hover:bg-warning/20"
            )}
          >
            <AlertOctagon className="size-3" />
            <span>{loadShedActive ? "LOAD SHED ACTIVE (-0.6 MW)" : "TRIGGER LOAD SHED (0.6 MW)"}</span>
          </button>
        </div>

        <button
          type="button"
          onClick={handleApplyRedispatch}
          disabled={isLoading}
          className="rounded-md border border-primary/50 bg-primary/20 hover:bg-primary/30 text-primary-glow px-4 py-1.5 font-bold transition-all shadow-[0_0_12px_rgba(34,211,238,0.2)] cursor-pointer"
        >
          Dispatch Redispatch (AC Newton-Raphson)
        </button>
      </div>

      {appliedMsg && (
        <div className="mt-2 text-[10px] text-success font-semibold animate-fade-in">
          ✓ {appliedMsg}
        </div>
      )}
    </div>
  );
}

