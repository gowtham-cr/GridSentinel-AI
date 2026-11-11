import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  ShieldAlert,
  Sun,
  Wind,
  BatteryCharging,
  Building2,
  Factory,
  Home,
  TowerControl,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData, LineElectricalData, ActiveAttack } from "@/lib/gridApi";
import { GridCanvas3D } from "./GridCanvas3D";

interface MicrogridTwinViewProps {
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  activeAttacks: ActiveAttack[];
  onSelectBus?: (busId: number) => void;
  stateMode?: "NORMAL" | "ATTACKED" | "RECOVERED";
  onStateModeChange?: (mode: "NORMAL" | "ATTACKED" | "RECOVERED") => void;
}

const BUS_ICONS: Record<number, any> = {
  0: TowerControl,
  1: Zap,
  2: Sun,
  3: Wind,
  4: BatteryCharging,
  5: Factory,
  6: Building2,
  7: Home,
};

const BUS_ROLES: Record<number, string> = {
  0: "Slack Bus / External Grid Intertie",
  1: "Main 20 kV Distribution Switchgear",
  2: "Solar PV (1.5MW) & Inverters",
  3: "Wind Turbine Farm (1.8MW)",
  4: "BESS Inverter Storage (0.8MW)",
  5: "Heavy Industrial Factory (2.1MW)",
  6: "Commercial Center & Mall (1.35MW)",
  7: "Residential Community Hub (0.5MW)",
};

export function MicrogridTwinView({
  buses,
  lines,
  activeAttacks,
  onSelectBus,
  stateMode = "NORMAL",
  onStateModeChange,
}: MicrogridTwinViewProps) {
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [displayMode, setDisplayMode] = useState<"3D_AND_SCHEMATIC" | "3D_ONLY" | "SCHEMATIC_ONLY">("3D_AND_SCHEMATIC");

  const targetedBusIds = new Set<number>();
  activeAttacks.forEach((a) => {
    const match = a.target_component.match(/Bus[_\s](\d+)/i);
    if (match) targetedBusIds.add(parseInt(match[1], 10));
  });

  const selectedBus = buses.find((b) => b.bus_id === selectedBusId);

  const handleBusClick = (id: number) => {
    setSelectedBusId(id);
    onSelectBus?.(id);
  };

  return (
    <div className="relative rounded-xl border border-primary/30 bg-card p-5 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header with Origin Tag & Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <div className="flex items-center gap-2">
            <Radio className="size-4 text-primary animate-pulse" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-primary">
              Microgrid Digital-Twin Schematic
            </h3>
          </div>
          <p className="font-mono text-[11px] text-muted-foreground mt-0.5">
            Real-time multi-bus topology mapped to AC Newton-Raphson electrical state
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-void/60 p-0.5 font-mono text-[10px]">
            <button
              type="button"
              onClick={() => setDisplayMode("3D_AND_SCHEMATIC")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer flex items-center gap-1",
                displayMode === "3D_AND_SCHEMATIC" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Layers className="size-3" />
              <span>Twin + Schematic</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("3D_ONLY")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer flex items-center gap-1",
                displayMode === "3D_ONLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Box className="size-3" />
              <span>3D Full View</span>
            </button>
            <button
              type="button"
              onClick={() => setDisplayMode("SCHEMATIC_ONLY")}
              className={cn(
                "rounded px-2 py-1 font-semibold transition-colors cursor-pointer flex items-center gap-1",
                displayMode === "SCHEMATIC_ONLY" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Zap className="size-3" />
              <span>2D Matrix</span>
            </button>
          </div>

          <span className="rounded border border-primary/40 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary-glow">
            ⚡ PANDAPOWER AC NEWTON-RAPHSON
          </span>

          {activeAttacks.length > 0 && (
            <span className="rounded border border-destructive/40 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] text-destructive animate-pulse">
              🚨 {activeAttacks.length} ATTACK VECTOR ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* 1. 3D Interactive Cyber-Physical Canvas */}
      {(displayMode === "3D_AND_SCHEMATIC" || displayMode === "3D_ONLY") && (
        <GridCanvas3D
          buses={buses}
          lines={lines}
          activeAttacks={activeAttacks}
          selectedBusId={selectedBusId}
          onSelectBus={handleBusClick}
          stateMode={stateMode}
          onStateModeChange={onStateModeChange}
        />
      )}

      {/* 2. 2D Electrical Node Cards (Preserved for full telemetry and testing) */}
      {(displayMode === "3D_AND_SCHEMATIC" || displayMode === "SCHEMATIC_ONLY") && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
          {buses.map((bus) => {
            const Icon = BUS_ICONS[bus.bus_id] || Zap;
            const isTargeted = targetedBusIds.has(bus.bus_id);
            const isSelected = selectedBusId === bus.bus_id;

            const isViolation = bus.voltage_violation ?? (bus.vm_pu < 0.90 || bus.vm_pu > 1.10);
            const isWarning =
              !isViolation &&
              ((bus.vm_pu >= 0.90 && bus.vm_pu < 0.94) || (bus.vm_pu > 1.06 && bus.vm_pu <= 1.10));

            return (
              <motion.div
                key={bus.bus_id}
                onClick={() => handleBusClick(bus.bus_id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative cursor-pointer rounded-lg border p-3.5 transition-all duration-200 select-none",
                  isSelected
                    ? "border-primary bg-primary/15 shadow-[0_0_16px_rgba(34,211,238,0.35)]"
                    : "border-border/70 bg-void/70 hover:border-primary/50 hover:bg-void",
                  isTargeted &&
                    "border-destructive bg-destructive/10 shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse"
                )}
              >
                {isTargeted && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 font-mono text-[9px] font-bold text-destructive-foreground shadow">
                    <ShieldAlert className="size-3" />
                    SPOOFED
                  </span>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-7 items-center justify-center rounded border",
                        isTargeted
                          ? "border-destructive bg-destructive/20 text-destructive"
                          : "border-primary/40 bg-primary/10 text-primary"
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <h4 className="font-mono text-xs font-bold text-foreground truncate max-w-[140px]">
                        {bus.name.replace(/Bus \d+ - /, "")}
                      </h4>
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Bus {bus.bus_id} · {bus.vn_kv} kV
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums",
                      isViolation
                        ? "bg-destructive/20 text-destructive border border-destructive/40"
                        : isWarning
                        ? "bg-warning/20 text-warning border border-warning/40"
                        : "bg-success/20 text-success border border-success/40"
                    )}
                    title="Voltage magnitude in per-unit (nominal = 1.0 p.u.)"
                  >
                    {bus.vm_pu.toFixed(3)} pu
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-1 border-t border-border/50 pt-2 font-mono text-[10px]">
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Angle</span>
                    <span className="tabular-nums text-foreground/90">{bus.va_degree.toFixed(1)}°</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">P (MW)</span>
                    <span
                      className={cn(
                        "tabular-nums font-semibold",
                        bus.p_mw > 0 ? "text-primary" : bus.p_mw < 0 ? "text-accent" : "text-foreground"
                      )}
                    >
                      {bus.p_mw > 0 ? `+${bus.p_mw.toFixed(2)}` : bus.p_mw.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[9px]">Q (MVAr)</span>
                    <span className="tabular-nums text-foreground/80">{bus.q_mvar.toFixed(2)}</span>
                  </div>
                </div>

                <p className="mt-2 font-mono text-[9px] text-muted-foreground/80 truncate">
                  {BUS_ROLES[bus.bus_id] || "Distribution Feeder"}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* 3. Feeder Thermal Loadings Strip */}
      {(displayMode === "3D_AND_SCHEMATIC" || displayMode === "SCHEMATIC_ONLY") && (
        <div className="mt-4 rounded-lg border border-border/60 bg-void/50 p-3.5">
          <h4 className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 flex items-center justify-between">
            <span>Feeder Line Thermal Loading (% Max Capacity)</span>
            <span className="text-[10px] text-muted-foreground">Limits: &lt;60% Nominal · &gt;100% Trip</span>
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {lines.slice(0, 6).map((line) => {
              const isOverload = line.loading_percent > 100;
              const isHigh = line.loading_percent > 80;
              return (
                <div key={line.line_id} className="space-y-1 font-mono text-[10px]">
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span className="truncate">L{line.line_id} (B{line.from_bus}→B{line.to_bus})</span>
                    <span
                      className={cn(
                        "tabular-nums font-bold",
                        isOverload ? "text-destructive" : isHigh ? "text-warning" : "text-primary"
                      )}
                    >
                      {line.loading_percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        isOverload ? "bg-destructive" : isHigh ? "bg-warning" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(100, line.loading_percent)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Bus Detailed Drawer */}
      <AnimatePresence>
        {selectedBus && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="mt-4 rounded-lg border border-primary/40 bg-void/90 p-4 font-mono text-xs shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-primary" />
                <span className="font-bold text-foreground">
                  Physical Inspector: {selectedBus.name} (Bus {selectedBus.bus_id})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBusId(null)}
                className="text-muted-foreground hover:text-foreground text-[11px] underline cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Nominal Voltage</span>
                <span className="font-semibold text-foreground">{selectedBus.vn_kv} kV</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Measured V_m</span>
                <span className="font-semibold text-primary">
                  {selectedBus.vm_pu.toFixed(4)} p.u. ({(selectedBus.vm_pu * selectedBus.vn_kv).toFixed(2)} kV)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Active Power Flow</span>
                <span className="font-semibold text-foreground">{selectedBus.p_mw.toFixed(3)} MW</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Reactive Power Flow</span>
                <span className="font-semibold text-foreground">{selectedBus.q_mvar.toFixed(3)} MVAr</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
