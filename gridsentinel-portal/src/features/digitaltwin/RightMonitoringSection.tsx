import { useState } from "react";
import {
  Zap,
  Activity,
  Radio,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Terminal,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData, EventLogItem } from "@/lib/gridApi";

interface RightMonitoringSectionProps {
  totalGenerationMw: number;
  totalLoadMw: number;
  frequencyHz: number;
  avgVoltagePu: number;
  minVoltagePu: number;
  maxVoltagePu: number;
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  events: EventLogItem[];
  selectedBusId?: number | null;
  onSelectBus?: (id: number) => void;
}

export function RightMonitoringSection({
  totalGenerationMw,
  totalLoadMw,
  frequencyHz,
  avgVoltagePu,
  minVoltagePu,
  maxVoltagePu,
  buses,
  lines,
  events,
  selectedBusId,
  onSelectBus,
}: RightMonitoringSectionProps) {
  const [activeTab, setActiveTab] = useState<"buses" | "lines" | "log">("buses");

  const freqDev = +(frequencyHz - 50.0).toFixed(2);
  const isFreqStable = Math.abs(freqDev) <= 0.2;
  const isVoltageStable = minVoltagePu >= 0.90 && maxVoltagePu <= 1.10;

  return (
    <div className="flex flex-col space-y-3.5 h-full font-mono text-xs">
      {/* 1. TOP 4 SYSTEM MONITORING GAUGES */}
      <div className="grid grid-cols-2 gap-2">
        {/* Total Generation */}
        <div className="rounded-lg border border-primary/30 bg-card/90 p-2.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wider">Total Generation</span>
            <Zap className="size-3 text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-display text-primary-glow">
              {totalGenerationMw.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">MW</span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5 flex justify-between">
            <span>Online: 100%</span>
            <span className="text-success font-semibold">Active</span>
          </div>
        </div>

        {/* Total Load */}
        <div className="rounded-lg border border-primary/30 bg-card/90 p-2.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wider">Total Load</span>
            <Activity className="size-3 text-accent" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-bold font-display text-accent">
              {totalLoadMw.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">MW</span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5 flex justify-between">
            <span>PF: 0.92 Ind</span>
            <span className="text-primary font-semibold">Dynamic</span>
          </div>
        </div>

        {/* Grid Frequency */}
        <div className="rounded-lg border border-primary/30 bg-card/90 p-2.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wider">Grid Frequency</span>
            <Radio
              className={cn(
                "size-3 animate-pulse",
                isFreqStable ? "text-success" : "text-destructive"
              )}
            />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-bold font-display",
                isFreqStable ? "text-foreground" : "text-destructive"
              )}
            >
              {frequencyHz.toFixed(2)}
            </span>
            <span className="text-[10px] text-muted-foreground">Hz</span>
          </div>
          <div className="text-[9px] mt-0.5 flex justify-between">
            <span className="text-muted-foreground">
              Δf: {freqDev >= 0 ? `+${freqDev}` : freqDev} Hz
            </span>
            <span className={isFreqStable ? "text-success" : "text-destructive font-bold"}>
              {isFreqStable ? "Nominal" : "Breach"}
            </span>
          </div>
        </div>

        {/* System Voltage */}
        <div className="rounded-lg border border-primary/30 bg-card/90 p-2.5 backdrop-blur-md shadow-sm">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="uppercase tracking-wider">System Voltage</span>
            {isVoltageStable ? (
              <ShieldCheck className="size-3 text-success" />
            ) : (
              <ShieldAlert className="size-3 text-destructive animate-pulse" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span
              className={cn(
                "text-xl font-bold font-display",
                isVoltageStable ? "text-primary-glow" : "text-destructive"
              )}
            >
              {avgVoltagePu.toFixed(3)}
            </span>
            <span className="text-[10px] text-muted-foreground">pu</span>
          </div>
          <div className="text-[9px] text-muted-foreground mt-0.5 flex justify-between">
            <span>Min: {minVoltagePu.toFixed(2)}</span>
            <span>Max: {maxVoltagePu.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* 2. DENSE TABBED MONITORING: BUS VOLTAGES TABLE, LINE FLOWS TABLE, REAL-TIME EVENT LOG */}
      <div className="flex-1 rounded-xl border border-primary/30 bg-card/95 p-3.5 backdrop-blur-xl shadow-lg flex flex-col min-h-[380px]">
        {/* Tab navigation */}
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <div className="flex items-center gap-1 rounded-md border border-border bg-void/60 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setActiveTab("buses")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer",
                activeTab === "buses"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Bus Voltages ({buses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("lines")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer",
                activeTab === "lines"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Line Flows ({lines.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("log")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer",
                activeTab === "log"
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Real-Time Log
            </button>
          </div>

          <span className="text-[9px] text-muted-foreground">
            ⚡ Pandapower IEEE 14-Bus
          </span>
        </div>

        {/* Tab Content */}
        <div className="mt-2.5 flex-1 overflow-y-auto max-h-[340px] pr-1 custom-scrollbar">
          {activeTab === "buses" && (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1">Bus</th>
                  <th className="py-1">Name</th>
                  <th className="py-1 text-right">V_m (pu)</th>
                  <th className="py-1 text-right">θ (deg)</th>
                  <th className="py-1 text-right">P (MW)</th>
                  <th className="py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {buses.map((bus) => {
                  const isViolation = bus.voltage_violation ?? (bus.vm_pu < 0.90 || bus.vm_pu > 1.10);
                  const isWarning =
                    !isViolation &&
                    ((bus.vm_pu >= 0.90 && bus.vm_pu < 0.94) ||
                     (bus.vm_pu > 1.06 && bus.vm_pu <= 1.10));
                  const isSelected = selectedBusId === bus.bus_id;

                  return (
                    <tr
                      key={bus.bus_id}
                      onClick={() => onSelectBus?.(bus.bus_id)}
                      className={cn(
                        "cursor-pointer hover:bg-void/80 transition-colors",
                        isSelected && "bg-primary/20",
                        isViolation && "bg-destructive/10"
                      )}
                    >
                      <td className="py-1.5 font-bold text-foreground">B{bus.bus_id}</td>
                      <td className="py-1.5 text-muted-foreground truncate max-w-[90px]" title={bus.name}>
                        {bus.name.replace(/Bus \d+ - /, "")}
                      </td>
                      <td
                        className={cn(
                          "py-1.5 text-right font-bold tabular-nums",
                          isViolation
                            ? "text-destructive font-black"
                            : isWarning
                            ? "text-warning"
                            : "text-primary"
                        )}
                      >
                        {bus.vm_pu.toFixed(4)}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground tabular-nums">
                        {bus.va_degree >= 0 ? `+${bus.va_degree.toFixed(1)}` : bus.va_degree.toFixed(1)}°
                      </td>
                      <td className="py-1.5 text-right font-semibold tabular-nums text-foreground/90">
                        {bus.p_mw >= 0 ? `+${bus.p_mw.toFixed(2)}` : bus.p_mw.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-center">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.2 text-[8px] font-bold uppercase",
                            isViolation
                              ? "bg-destructive/20 text-destructive border border-destructive/40 animate-pulse"
                              : isWarning
                              ? "bg-warning/20 text-warning"
                              : "bg-success/20 text-success"
                          )}
                        >
                          {isViolation ? "BREACH" : isWarning ? "WARN" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === "lines" && (
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="border-b border-border/80 text-[9px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-1">Line</th>
                  <th className="py-1">Path</th>
                  <th className="py-1 text-right">P (MW)</th>
                  <th className="py-1 text-right">Loss (kW)</th>
                  <th className="py-1 text-right">Loading</th>
                  <th className="py-1 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {lines.map((line) => {
                  const isOverload = line.loading_percent > 100;
                  const isHigh = line.loading_percent > 80 && line.loading_percent <= 100;

                  return (
                    <tr
                      key={line.line_id}
                      className={cn(
                        "hover:bg-void/80 transition-colors",
                        isOverload && "bg-destructive/15 animate-pulse"
                      )}
                    >
                      <td className="py-1.5 font-bold text-foreground">
                        {line.line_id >= 1000 ? `T${line.line_id - 1000}` : `L${line.line_id}`}
                      </td>
                      <td className="py-1.5 text-muted-foreground text-[10px]">
                        B{line.from_bus} → B{line.to_bus}
                      </td>
                      <td className="py-1.5 text-right text-foreground font-semibold tabular-nums">
                        {Math.abs(line.p_from_mw).toFixed(2)}
                      </td>
                      <td className="py-1.5 text-right text-muted-foreground tabular-nums">
                        {(line.pl_mw * 1000).toFixed(0)}
                      </td>
                      <td className="py-1.5 text-right tabular-nums">
                        <span
                          className={cn(
                            "font-bold",
                            isOverload ? "text-destructive" : isHigh ? "text-warning" : "text-primary"
                          )}
                        >
                          {line.loading_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-1.5 text-center">
                        <span
                          className={cn(
                            "rounded px-1 py-0.2 text-[8px] font-bold uppercase",
                            isOverload
                              ? "bg-destructive/20 text-destructive border border-destructive/40"
                              : isHigh
                              ? "bg-warning/20 text-warning"
                              : "bg-success/20 text-success"
                          )}
                        >
                          {isOverload ? "OVERLOAD" : isHigh ? "WARN" : "OK"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {activeTab === "log" && (
            <div className="space-y-1.5 font-mono text-[10px]">
              {events.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-[11px]">
                  No security incidents recorded. System nominal.
                </div>
              ) : (
                events.slice(0, 10).map((ev) => (
                  <div
                    key={ev.id}
                    className={cn(
                      "p-2 rounded border border-border/50 bg-void/50 flex flex-col gap-0.5",
                      ev.severity === "CRITICAL" && "border-destructive/50 bg-destructive/10",
                      ev.severity === "HIGH" && "border-warning/50 bg-warning/10"
                    )}
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span className="font-bold text-primary-glow">{(ev as any).action || ev.title}</span>
                      <span className="text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-foreground/90 truncate">{ev.details}</p>
                    <div className="flex items-center justify-between text-[8px] text-muted-foreground pt-0.5">
                      <span>Node: {(ev as any).component || ev.target}</span>
                      <span
                        className={cn(
                          "font-bold",
                          ev.severity === "CRITICAL"
                            ? "text-destructive"
                            : ev.severity === "HIGH"
                            ? "text-warning"
                            : "text-success"
                        )}
                      >
                        {ev.severity}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

