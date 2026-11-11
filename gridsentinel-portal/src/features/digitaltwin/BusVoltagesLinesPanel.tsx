import { useState } from "react";
import { Zap, Activity, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData } from "@/lib/gridApi";

interface BusVoltagesLinesPanelProps {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  selectedBusId?: number | null;
  onSelectBus?: (id: number) => void;
}

export function BusVoltagesLinesPanel({
  buses,
  lines,
  selectedBusId,
  onSelectBus,
}: BusVoltagesLinesPanelProps) {
  const [tab, setTab] = useState<"buses" | "lines">("buses");

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header with Tab switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {tab === "buses" ? (
            <Zap className="size-4 text-primary" />
          ) : (
            <Activity className="size-4 text-accent" />
          )}
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            {tab === "buses" ? "Bus Voltage Profiles & Angles" : "Transmission Line Power Flows"}
          </h4>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-void/60 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setTab("buses")}
            className={cn(
              "rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer",
              tab === "buses" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Bus Voltages ({buses.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("lines")}
            className={cn(
              "rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer",
              tab === "lines" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Line Flows ({lines.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="mt-3.5 max-h-[290px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {tab === "buses" ? (
          buses.map((b) => {
            const isSelected = selectedBusId === b.bus_id;
            const isViolation = b.voltage_violation ?? (b.vm_pu < 0.90 || b.vm_pu > 1.10);
            const isWarning =
              !isViolation &&
              ((b.vm_pu >= 0.90 && b.vm_pu < 0.94) || (b.vm_pu > 1.06 && b.vm_pu <= 1.10));

            // Normalized percentage for bar width [0.85 to 1.15 pu range]
            const barPercent = Math.max(0, Math.min(100, ((b.vm_pu - 0.85) / 0.3) * 100));

            return (
              <div
                key={b.bus_id}
                onClick={() => onSelectBus?.(b.bus_id)}
                className={cn(
                  "p-2.5 rounded-lg border transition-all cursor-pointer select-none",
                  isSelected
                    ? "border-primary bg-primary/15 shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                    : "border-border/60 bg-void/40 hover:border-border hover:bg-void",
                  isViolation && "border-destructive/60 bg-destructive/10"
                )}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{b.name}</span>
                    <span className="text-[10px] text-muted-foreground">({b.vn_kv} kV)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      θ: {b.va_degree >= 0 ? `+${b.va_degree.toFixed(2)}` : b.va_degree.toFixed(2)}°
                    </span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        isViolation ? "text-destructive font-black" : isWarning ? "text-warning" : "text-primary"
                      )}
                    >
                      {b.vm_pu.toFixed(4)} pu
                    </span>
                  </div>
                </div>

                {/* Voltage Range Bar with statutory limits markers */}
                <div className="mt-2 relative h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isViolation ? "bg-destructive" : isWarning ? "bg-warning" : "bg-primary"
                    )}
                    style={{ width: `${barPercent}%` }}
                  />
                  {/* Nominal 1.0 p.u. marker (50% on 0.85-1.15 scale) */}
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-foreground/40" title="Nominal 1.00 pu" />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>
                    P: {b.p_mw >= 0 ? `+${b.p_mw.toFixed(2)}` : b.p_mw.toFixed(2)} MW
                  </span>
                  <span>
                    Q: {b.q_mvar >= 0 ? `+${b.q_mvar.toFixed(2)}` : b.q_mvar.toFixed(2)} MVAR
                  </span>
                  <span className={cn(isViolation ? "text-destructive font-semibold" : "text-success")}>
                    {isViolation ? "LIMIT BREACH" : isWarning ? "WARN (0.90-1.10 pu)" : "NOMINAL (0.90-1.10 pu)"}
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          lines.map((l) => {
            const isOverload = l.loading_percent > 100;
            const isHeavy = l.loading_percent > 80 && l.loading_percent <= 100;

            return (
              <div
                key={l.line_id}
                className={cn(
                  "p-2.5 rounded-lg border border-border/60 bg-void/40 transition-all font-mono",
                  isOverload && "border-destructive bg-destructive/10 animate-pulse"
                )}
              >
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-foreground">{l.name}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      Bus {l.from_bus} <ArrowRight className="size-2.5" /> Bus {l.to_bus}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "font-bold",
                      isOverload ? "text-destructive" : isHeavy ? "text-warning" : "text-primary"
                    )}
                  >
                    {l.loading_percent.toFixed(1)}% Loading
                  </span>
                </div>

                {/* Line Loading Progress Bar */}
                <div className="mt-2 h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-300",
                      isOverload ? "bg-destructive" : isHeavy ? "bg-warning" : "bg-primary"
                    )}
                    style={{ width: `${Math.min(100, l.loading_percent)}%` }}
                  />
                </div>

                <div className="mt-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>P Flow: {Math.abs(l.p_from_mw).toFixed(2)} MW</span>
                  <span>Losses: {l.pl_mw.toFixed(3)} MW</span>
                  <span className={cn(isOverload ? "text-destructive font-bold" : "text-muted-foreground")}>
                    {isOverload ? "THERMAL OVERLOAD" : "Capacity OK"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

