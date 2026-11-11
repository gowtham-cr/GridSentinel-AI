import { useState } from "react";
import {
  ShieldAlert,
  Flame,
  AlertOctagon,
  Clock,
  Play,
  RotateCcw,
  Sliders,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AttackScenario, ActiveAttack } from "@/lib/gridApi";

interface AttackInjectionDeckProps {
  scenarios: AttackScenario[];
  activeAttacks: ActiveAttack[];
  onLaunchAttack: (params: {
    attack_type: string;
    target_bus_id: number;
    intensity: number;
    duration_seconds: number;
  }) => Promise<void>;
  onStopAllAttacks: () => Promise<void>;
  isLoading?: boolean;
}

export function AttackInjectionDeck({
  scenarios,
  activeAttacks,
  onLaunchAttack,
  onStopAllAttacks,
  isLoading = false,
}: AttackInjectionDeckProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    scenarios[0]?.id || "fdia_voltage_der"
  );
  const [customIntensity, setCustomIntensity] = useState<number>(1.2);
  const [customDuration, setCustomDuration] = useState<number>(90);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const selectedScenario =
    scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleScenarioChange = (id: string) => {
    setSelectedScenarioId(id);
    const scen = scenarios.find((s) => s.id === id);
    if (scen) {
      setCustomIntensity(scen.default_intensity);
      setCustomDuration(scen.default_duration_seconds);
    }
  };

  const handleLaunch = async () => {
    if (!selectedScenario || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onLaunchAttack({
        attack_type: selectedScenario.attack_type,
        target_bus_id: selectedScenario.target_bus_id,
        intensity: customIntensity,
        duration_seconds: customDuration,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-destructive/40 bg-card p-5 backdrop-blur-xl shadow-xl space-y-4">
      {/* Header with Safety Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-destructive animate-pulse" />
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-destructive">
            Controlled Cyberattack Simulation Deck
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-destructive/50 bg-destructive/10 px-2 py-0.5 font-mono text-[10px] text-destructive">
            🔒 LOCAL VIRTUAL ONLY · ZERO PHYSICAL CONNECTION
          </span>
        </div>
      </div>

      {/* Active Attack Banner (if any) */}
      {activeAttacks.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive bg-destructive/15 p-3 font-mono text-xs text-destructive animate-pulse">
          <div className="flex items-center gap-2">
            <AlertOctagon className="size-5 shrink-0" />
            <div>
              <p className="font-bold">
                ACTIVE VIRTUAL ATTACK IN PROGRESS ({activeAttacks.length} Vector)
              </p>
              <p className="text-[11px] text-destructive/80">
                Target: {activeAttacks[0].target_component} · Type: {activeAttacks[0].attack_type} · Intensity: {activeAttacks[0].intensity}x
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onStopAllAttacks}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-destructive bg-destructive text-destructive-foreground px-3 py-1.5 font-bold hover:bg-destructive/90 transition-all cursor-pointer shadow-md"
          >
            <RotateCcw className="size-3.5" />
            <span>NEUTRALIZE ALL ATTACKS</span>
          </button>
        </div>
      )}

      {/* Scenario Selector Grid */}
      <div className="space-y-2">
        <label className="block font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Select Predefined Attack Scenario:
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {scenarios.map((scen) => {
            const isSelected = scen.id === selectedScenario?.id;
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => handleScenarioChange(scen.id)}
                className={cn(
                  "text-left rounded-lg border p-3 font-mono transition-all duration-150 cursor-pointer",
                  isSelected
                    ? "border-destructive bg-destructive/15 shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                    : "border-border/60 bg-void/50 hover:border-destructive/40 hover:bg-void/80"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                      scen.severity === "CRITICAL"
                        ? "bg-destructive/30 text-destructive border border-destructive/50"
                        : scen.severity === "HIGH"
                        ? "bg-accent/30 text-accent border border-accent/50"
                        : "bg-warning/30 text-warning border border-warning/50"
                    )}
                  >
                    {scen.severity}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Target: Bus {scen.target_bus_id}
                  </span>
                </div>
                <h4 className="mt-1.5 text-xs font-bold text-foreground truncate">
                  {scen.name}
                </h4>
                <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">
                  {scen.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Scenario Details & Injection Controls */}
      {selectedScenario && (
        <div className="rounded-lg border border-border bg-void/60 p-4 font-mono text-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="text-muted-foreground text-[10px] block">Target Component</span>
              <span className="font-semibold text-foreground text-sm">
                {selectedScenario.target_name}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground text-[10px] block">Physical Power Impact</span>
              <span className="text-accent text-[11px] leading-tight block">
                {selectedScenario.physical_impact}
              </span>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border/50 pt-3">
            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Sliders className="size-3 text-destructive" />
                  Perturbation Intensity:
                </span>
                <span className="font-bold text-destructive tabular-nums">
                  {customIntensity.toFixed(2)}x ({((customIntensity - 1.0) * 100).toFixed(0)}% delta)
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={customIntensity}
                onChange={(e) => setCustomIntensity(parseFloat(e.target.value))}
                className="w-full accent-destructive cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>0.5x (Sub-nominal)</span>
                <span>1.0x (Nominal)</span>
                <span>2.5x (Severe Spoofing)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-[11px] mb-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3 text-muted-foreground" />
                  Attack Duration:
                </span>
                <span className="font-bold text-foreground tabular-nums">
                  {customDuration} Seconds
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="300"
                step="15"
                value={customDuration}
                onChange={(e) => setCustomDuration(parseInt(e.target.value, 10))}
                className="w-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-muted-foreground mt-0.5">
                <span>15s (Burst)</span>
                <span>120s (Medium)</span>
                <span>300s (Sustained)</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <CheckCircle className="size-3 text-success" />
              Injected into virtual Pandapower simulation bus {selectedScenario.target_bus_id} only
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLaunch}
                disabled={isSubmitting || isLoading}
                className="inline-flex items-center gap-2 rounded-md border border-destructive bg-destructive/20 hover:bg-destructive/30 text-destructive px-4 py-2 font-bold transition-all duration-150 cursor-pointer shadow-[0_0_12px_rgba(239,68,68,0.2)] disabled:opacity-50"
              >
                <ShieldAlert className="size-4" />
                <span>
                  {isSubmitting ? "Injecting Perturbation..." : "INJECT ATTACK INTO VIRTUAL GRID"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
