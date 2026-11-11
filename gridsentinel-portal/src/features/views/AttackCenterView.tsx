import React from "react";
import { AttackInjectionDeck } from "../digitaltwin/AttackInjectionDeck";
import { useSimulation } from "../simulation/SimulationContext";
import {
  Flame,
  ShieldAlert,
  AlertTriangle,
  StopCircle,
  Radio,
  Lock,
  Layers,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AttackCenterView() {
  const {
    scenarios,
    activeAttacks,
    launchAttack,
    stopAllAttacks,
    isLoading,
    eventHistory,
    buses,
  } = useSimulation();

  // Filter history to attack events
  const attackLogs = eventHistory.filter(
    (e) => e.type === "ATTACK_INJECTION" || e.title.toLowerCase().includes("attack")
  );

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: Cyber-Physical Red-Team Sandbox Disclaimer */}
      <div className="rounded-xl border border-destructive/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-destructive/50 bg-destructive/10 text-destructive shadow-[0_0_12px_rgba(239,68,68,0.3)]">
            <Flame className="size-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
              CYBERATTACK INJECTION WORKBENCH & RED-TEAM CONFINEMENT
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ISOLATED IEEE 14-BUS / 8-BUS VIRTUAL SIMULATOR · LOCAL CONTAINMENT VERIFIED · ZERO EXTERNAL HARDWARE COUPLING
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeAttacks.length > 0 && (
            <button
              type="button"
              onClick={stopAllAttacks}
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-destructive bg-destructive/20 px-3.5 py-1.5 font-bold text-destructive hover:bg-destructive/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)]"
            >
              <StopCircle className="size-4 animate-spin" />
              <span>EMERGENCY DISARM (STOP ALL)</span>
            </button>
          )}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-400">
            <Lock className="size-3" />
            <span>SANDBOX CONFINED</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Attack Deck (Left) + Active Attack Monitor (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Attack Injection Controls */}
        <div className="lg:col-span-7">
          <AttackInjectionDeck
            scenarios={scenarios}
            activeAttacks={activeAttacks}
            onLaunchAttack={launchAttack}
            onStopAllAttacks={stopAllAttacks}
            isLoading={isLoading}
          />
        </div>

        {/* Right Column: Live Attack Telemetry & Physical Impact Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Attacks Telemetry Card */}
          <div className="rounded-xl border border-destructive/40 bg-card/95 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-border/80 pb-2">
              <div className="flex items-center gap-2 text-destructive font-bold text-xs uppercase tracking-wider">
                <Radio className="size-4 animate-ping text-destructive" />
                <span>Active Intrusions Monitor ({activeAttacks.length})</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">
                {activeAttacks.length > 0 ? "LIVE INJECTION" : "IDLE"}
              </span>
            </div>

            {activeAttacks.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="size-8 mx-auto text-emerald-400/70" />
                <p className="font-bold text-foreground text-xs">No Active Cyberattacks</p>
                <p className="text-[10px] text-muted-foreground max-w-xs mx-auto">
                  All telemetry sensors transmitting nominal Pandapower AC power-flow readings without perturbation.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeAttacks.map((atk) => (
                  <div
                    key={atk.attack_id}
                    className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-destructive text-xs">{atk.attack_type.toUpperCase()}</span>
                      <span className="rounded bg-destructive/30 px-1.5 py-0.5 text-[9px] text-destructive font-bold">
                        {atk.remaining_seconds}s REMAINING
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-muted-foreground">Target Component:</span>
                        <p className="font-bold text-foreground">{atk.target_component}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Perturbation Factor:</span>
                        <p className="font-bold text-destructive">{atk.intensity}x Magnitude</p>
                      </div>
                    </div>

                    <div className="rounded border border-border/60 bg-void/80 p-2 text-[9px] space-y-1">
                      <span className="text-muted-foreground font-semibold">Mathematical Injection Model:</span>
                      <p className="font-mono text-cyan-400">
                        {atk.attack_type.includes("voltage")
                          ? `V_measured = V_pandapower * α  [Bias: +${(
                              (atk.magnitude !== undefined && atk.magnitude > 0
                                ? atk.magnitude
                                : atk.intensity > 1
                                ? atk.intensity - 1
                                : 0.15) * 100
                            ).toFixed(0)}%]`
                          : atk.attack_type.includes("power")
                          ? `P_injected = P_nominal + ΔP  [KCL Imbalance: +${(
                              (atk.magnitude !== undefined && atk.magnitude > 0
                                ? atk.magnitude
                                : atk.intensity > 1
                                ? atk.intensity - 1
                                : 0.5) * 100
                            ).toFixed(0)}%]`
                          : atk.attack_type.includes("replay")
                          ? "Z(t) = Z(t - τ)  [Stale SCADA buffer substitution]"
                          : "Demand(t) = Demand(t) * 1.60  [Pandapower physical demand surge]"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Impacts Matrix Card */}
          <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xl space-y-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
              <Activity className="size-4 text-warning" />
              <span>Simulated Impact Across Grid Assets</span>
            </h3>

            <div className="space-y-2 text-[10px]">
              {buses
                .filter((b) => b.is_compromised || b.voltage_violation)
                .slice(0, 4)
                .map((b) => (
                  <div
                    key={b.bus_id}
                    className="flex items-center justify-between p-2 rounded-lg border border-destructive/30 bg-destructive/5"
                  >
                    <div>
                      <span className="font-bold text-foreground">{b.name}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[9px]">
                        <span className="text-muted-foreground">
                          Physical (Pandapower): <span className="text-emerald-400 font-bold">1.0100 pu</span>
                        </span>
                        <span className="text-muted-foreground">
                          Spoofed Telemetry: <span className="text-destructive font-bold">{b.vm_pu.toFixed(4)} pu</span>
                        </span>
                        <span className="text-muted-foreground">
                          (Limit: 0.95 - 1.05 pu)
                        </span>
                      </div>
                    </div>
                    <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[9px] text-destructive font-bold uppercase">
                      VIOLATION
                    </span>
                  </div>
                ))}
              {buses.every((b) => !b.is_compromised && !b.voltage_violation) && (
                <div className="p-3 text-center text-muted-foreground text-[10px]">
                  All bus voltages currently within safety limits (0.95 - 1.05 p.u.).
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attack Incident History Log */}
      <div className="rounded-xl border border-border/70 bg-card/90 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-border/70 pb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-foreground flex items-center gap-2">
            <Layers className="size-4 text-primary" />
            <span>Attack Injections Forensic Record</span>
          </h3>
          <span className="text-[10px] text-muted-foreground">
            {attackLogs.length} logged injection attempts
          </span>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-1.5">
          {attackLogs.length === 0 ? (
            <div className="py-4 text-center text-muted-foreground text-[10px]">
              No attack incidents recorded in this session.
            </div>
          ) : (
            attackLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start justify-between p-2.5 rounded-lg border border-border/60 bg-void/60 text-[10px]"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground tabular-nums">[{log.timestamp}]</span>
                    <span className="font-bold text-destructive">{log.title}</span>
                  </div>
                  <p className="text-foreground/90">{log.details}</p>
                </div>
                <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[9px] text-destructive font-bold">
                  {log.severity}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

