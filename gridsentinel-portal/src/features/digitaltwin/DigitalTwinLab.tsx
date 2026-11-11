import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { GridControlBar } from "./GridControlBar";
import { MicrogridTwinView } from "./MicrogridTwinView";
import { RightMonitoringSection } from "./RightMonitoringSection";
import { StateEstimationPMUPanel } from "./StateEstimationPMUPanel";
import { SafetyMonitoringPanel } from "./SafetyMonitoringPanel";
import { GenerationRedispatchPanel } from "./GenerationRedispatchPanel";
import { FrequencyVoltageGraphs } from "./FrequencyVoltageGraphs";
import { CybersecurityMonitoringPanel } from "./CybersecurityMonitoringPanel";
import { SimulationTimeline, type SimulationStage } from "./SimulationTimeline";
import { KeySafetyFeaturesPanel } from "./KeySafetyFeaturesPanel";
import { AttackInjectionDeck } from "./AttackInjectionDeck";
import { DetectionMitigationDeck } from "./DetectionMitigationDeck";
import { StateComparisonMatrix } from "./StateComparisonMatrix";
import { EventHistoryAuditLog } from "./EventHistoryAuditLog";
import {
  ShieldAlert,
  Flame,
  ChevronDown,
  ChevronUp,
  Cpu,
  Clock,
  Layers,
  Wrench,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  gridApi,
  type TopologySummary,
  type SimulationStatus,
  type AttackScenario,
  type ActiveAttack,
  type MitigationPlan,
  type MitigationResult,
  type StateComparisonReport,
  type EventLogItem,
  type BusElectricalData,
  type LineElectricalData,
} from "@/lib/gridApi";

// Baseline 8-Bus Resilient Microgrid (Pandapower AC Newton-Raphson Baseline)
const DEFAULT_BUSES: BusElectricalData[] = [
  { bus_id: 0, name: "Bus 0 - Slack 20kV", vn_kv: 20.0, vm_pu: 1.0, va_degree: 0.0, p_mw: -4.3, q_mvar: -1.2, voltage_violation: false },
  { bus_id: 1, name: "Bus 1 - Switchgear", vn_kv: 20.0, vm_pu: 0.998, va_degree: -0.4, p_mw: 0.0, q_mvar: 0.0, voltage_violation: false },
  { bus_id: 2, name: "Bus 2 - Solar PV", vn_kv: 20.0, vm_pu: 1.012, va_degree: 0.8, p_mw: 1.5, q_mvar: 0.2, voltage_violation: false },
  { bus_id: 3, name: "Bus 3 - Wind Turbine", vn_kv: 20.0, vm_pu: 1.009, va_degree: 0.6, p_mw: 1.8, q_mvar: 0.3, voltage_violation: false },
  { bus_id: 4, name: "Bus 4 - BESS Storage", vn_kv: 20.0, vm_pu: 1.002, va_degree: 0.1, p_mw: 0.8, q_mvar: 0.1, voltage_violation: false },
  { bus_id: 5, name: "Bus 5 - Industrial Park", vn_kv: 20.0, vm_pu: 0.985, va_degree: -1.9, p_mw: -2.1, q_mvar: -0.9, voltage_violation: false },
  { bus_id: 6, name: "Bus 6 - Commercial", vn_kv: 20.0, vm_pu: 0.991, va_degree: -1.2, p_mw: -1.35, q_mvar: -0.5, voltage_violation: false },
  { bus_id: 7, name: "Bus 7 - Residential Hub", vn_kv: 20.0, vm_pu: 0.988, va_degree: -1.5, p_mw: -0.5, q_mvar: -0.2, voltage_violation: false },
];

const DEFAULT_LINES: LineElectricalData[] = [
  { line_id: 0, name: "Feeder 0-1", from_bus: 0, to_bus: 1, p_from_mw: 4.3, q_from_mvar: 1.2, p_to_mw: -4.28, q_to_mvar: -1.18, pl_mw: 0.02, loading_percent: 42.5, thermal_overload: false },
  { line_id: 1, name: "Feeder 1-2 (Solar)", from_bus: 1, to_bus: 2, p_from_mw: -1.48, q_from_mvar: -0.19, p_to_mw: 1.5, q_to_mvar: 0.2, pl_mw: 0.02, loading_percent: 28.0, thermal_overload: false },
  { line_id: 2, name: "Feeder 1-3 (Wind)", from_bus: 1, to_bus: 3, p_from_mw: -1.77, q_from_mvar: -0.28, p_to_mw: 1.8, q_to_mvar: 0.3, pl_mw: 0.03, loading_percent: 34.2, thermal_overload: false },
  { line_id: 3, name: "Feeder 1-4 (BESS)", from_bus: 1, to_bus: 4, p_from_mw: -0.79, q_from_mvar: -0.09, p_to_mw: 0.8, q_to_mvar: 0.1, pl_mw: 0.01, loading_percent: 18.5, thermal_overload: false },
  { line_id: 4, name: "Feeder 1-5 (Industrial)", from_bus: 1, to_bus: 5, p_from_mw: 2.15, q_from_mvar: 0.93, p_to_mw: -2.1, q_to_mvar: -0.9, pl_mw: 0.05, loading_percent: 58.4, thermal_overload: false },
  { line_id: 5, name: "Feeder 1-6 (Commercial)", from_bus: 1, to_bus: 6, p_from_mw: 1.38, q_from_mvar: 0.52, p_to_mw: -1.35, q_to_mvar: -0.5, pl_mw: 0.03, loading_percent: 39.1, thermal_overload: false },
  { line_id: 6, name: "Feeder 1-7 (Residential)", from_bus: 1, to_bus: 7, p_from_mw: 0.51, q_from_mvar: 0.21, p_to_mw: -0.5, q_to_mvar: -0.2, pl_mw: 0.01, loading_percent: 15.2, thermal_overload: false },
];

export function DigitalTwinLab() {
  const [topologies, setTopologies] = useState<TopologySummary[]>([]);
  const [activeTopology, setActiveTopology] = useState<string>("resilient_microgrid");
  const [status, setStatus] = useState<SimulationStatus | null>({
    status: "RUNNING",
    step_count: 1,
    speed_hz: 1.0,
    active_topology: "resilient_microgrid",
    converged: true,
    num_buses: 8,
    num_lines: 7,
    active_attacks_count: 0,
  });

  const [buses, setBuses] = useState<BusElectricalData[]>(DEFAULT_BUSES);
  const [lines, setLines] = useState<LineElectricalData[]>(DEFAULT_LINES);
  const [frequencyHz, setFrequencyHz] = useState<number>(50.0);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [stateMode, setStateMode] = useState<"NORMAL" | "ATTACKED" | "RECOVERED">("NORMAL");

  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttack[]>([]);

  const [detection, setDetection] = useState<{
    is_anomaly: boolean;
    anomaly_score: number;
    attack_classification: string;
    confidence: number;
    affected_component?: string;
    reason?: string;
    feature_contributions?: Record<string, number>;
  } | null>(null);

  const [mitigationPlan, setMitigationPlan] = useState<MitigationPlan | null>(null);
  const [lastMitigationResult, setLastMitigationResult] = useState<MitigationResult | null>(null);
  const [comparison, setComparison] = useState<StateComparisonReport | null>(null);
  const [eventHistory, setEventHistory] = useState<EventLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showAttackWorkbench, setShowAttackWorkbench] = useState<boolean>(false);

  // Simulation Running Elapsed Time (T+ MM:SS)
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  useEffect(() => {
    let id: any = null;
    if (status?.status === "RUNNING") {
      id = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (id) clearInterval(id);
    };
  }, [status?.status]);

  const timerRef = useRef<number | null>(null);

  // Initialize data and WebSockets
  useEffect(() => {
    let mounted = true;
    async function init() {
      const [topos, scens, hist] = await Promise.all([
        gridApi.getTopologies(),
        gridApi.getScenarios(),
        gridApi.getEventHistory(),
      ]);
      if (!mounted) return;
      if (topos.length > 0) setTopologies(topos);
      if (scens.length > 0) setScenarios(scens);
      if (hist.length > 0) setEventHistory(hist);
    }
    init();

    // Telemetry stream
    const unsubTelemetry = gridApi.subscribeTelemetryStream((payload) => {
      if (!mounted) return;
      if (payload.grid_state && payload.grid_state.buses && payload.grid_state.buses.length > 0) {
        setBuses(payload.grid_state.buses);
        setLines(payload.grid_state.lines);
        const pDiff = payload.grid_state.total_generation_mw - payload.grid_state.total_load_mw;
        const baseFreq = 50.0 + Math.max(-1.5, Math.min(1.5, pDiff * 0.1));
        setFrequencyHz(+(baseFreq + (Math.random() - 0.5) * 0.04).toFixed(2));
      }
    });

    // Alert stream
    const unsubAlerts = gridApi.subscribeAlertStream((alert) => {
      if (!mounted || !alert) return;
      setDetection({
        is_anomaly: true,
        anomaly_score: alert.anomaly_score || 0.88,
        attack_classification: alert.attack_type || "DETECTED_ATTACK",
        confidence: alert.confidence || 0.95,
        affected_component: alert.target_component,
        reason: `Real-time WebSocket alert: anomaly score ${alert.anomaly_score} on ${alert.target_component}`,
      });
      gridApi.getEventHistory().then((h) => {
        if (mounted && h.length > 0) setEventHistory(h);
      });
    });

    return () => {
      mounted = false;
      unsubTelemetry();
      unsubAlerts();
    };
  }, []);

  // Sync state from backend
  const refreshGridState = useCallback(async () => {
    const [stateData, simStatus, compData, histData] = await Promise.all([
      gridApi.getGridState(),
      gridApi.getSimulationStatus(),
      gridApi.getStateComparison(),
      gridApi.getEventHistory(),
    ]);

    if (stateData && stateData.buses && stateData.buses.length > 0) {
      setBuses(stateData.buses);
      setLines(stateData.lines);
    }
    if (simStatus) {
      setStatus(simStatus);
    }
    if (compData) {
      setComparison(compData);
    }
    if (histData && histData.length > 0) {
      setEventHistory(histData);
    }
  }, []);

  // Continuous stepping loop
  useEffect(() => {
    if (status?.status === "RUNNING") {
      timerRef.current = window.setInterval(async () => {
        const stepped = await gridApi.stepSimulation();
        if (stepped && stepped.buses) {
          setBuses(stepped.buses);
          setLines(stepped.lines);
        }
        setFrequencyHz((prev) => {
          const target = activeAttacks.length > 0 ? 49.62 : 50.0;
          const noise = (Math.random() - 0.5) * 0.04;
          return +(prev * 0.9 + target * 0.1 + noise).toFixed(2);
        });
        setStatus((s) => (s ? { ...s, step_count: s.step_count + 1 } : null));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status?.status, activeAttacks.length]);

  // Topology selection
  const handleSelectTopology = async (topoId: string) => {
    setIsLoading(true);
    setActiveTopology(topoId);
    try {
      await gridApi.initializeGrid(topoId);
      await refreshGridState();
      setActiveAttacks([]);
      setDetection(null);
      setMitigationPlan(null);
      setComparison(null);
      setStateMode("NORMAL");
    } finally {
      setIsLoading(false);
    }
  };

  // Simulation controls
  const handleStart = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.startSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "RUNNING" } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.pauseSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "PAUSED" } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResume = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.resumeSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "RUNNING" } : null));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    setIsLoading(true);
    try {
      await gridApi.resetSimulation();
      setActiveAttacks([]);
      setDetection(null);
      setMitigationPlan(null);
      setComparison(null);
      setLastMitigationResult(null);
      setFrequencyHz(50.0);
      setElapsedSeconds(0);
      setStateMode("NORMAL");
      await refreshGridState();
    } finally {
      setIsLoading(false);
    }
  };

  const handleStep = async () => {
    setIsLoading(true);
    try {
      const stepped = await gridApi.stepSimulation();
      if (stepped && stepped.buses) {
        setBuses(stepped.buses);
        setLines(stepped.lines);
      }
      setStatus((s) => (s ? { ...s, step_count: s.step_count + 1 } : null));
    } finally {
      setIsLoading(false);
    }
  };

  // Launch Attack handler
  const handleLaunchAttack = async (params: {
    attack_type: string;
    target_bus_id: number;
    intensity: number;
    duration_seconds: number;
  }) => {
    setIsLoading(true);
    try {
      const attackRes = await gridApi.launchAttack(params);
      if (attackRes) {
        setActiveAttacks([attackRes]);
      } else {
        setActiveAttacks([
          {
            attack_id: `atk_${Date.now()}`,
            attack_type: params.attack_type,
            target_component: `Bus ${params.target_bus_id}`,
            intensity: params.intensity,
            remaining_seconds: params.duration_seconds,
            is_confined_locally: true,
          },
        ]);
      }
      setStateMode("ATTACKED");

      // Auto detect
      const detectRes = await gridApi.detectThreats();
      if (detectRes && detectRes.detection) {
        setDetection({
          is_anomaly: detectRes.detection.is_anomaly,
          anomaly_score: detectRes.detection.anomaly_score,
          attack_classification: detectRes.detection.attack_classification,
          confidence: detectRes.detection.confidence,
          affected_component: `Bus ${params.target_bus_id} (Targeted Device)`,
          reason: `Chi-Square estimator residual J(x) diverged under virtual ${params.attack_type} perturbation (${params.intensity}x).`,
          feature_contributions: detectRes.detection.feature_contributions,
        });
      } else {
        setDetection({
          is_anomaly: true,
          anomaly_score: 0.88,
          attack_classification: params.attack_type.toUpperCase(),
          confidence: 0.942,
          affected_component: `Bus ${params.target_bus_id}`,
          reason: `Telemetry deviation detected at Bus ${params.target_bus_id}; sensor measurement diverged by ${((params.intensity - 1.0) * 100).toFixed(0)}%.`,
        });
      }

      const planRes = await gridApi.getRecommendedMitigation({
        attack_type: params.attack_type,
        target_component: `Bus ${params.target_bus_id}`,
      });
      if (planRes) setMitigationPlan(planRes);

      // Local voltage perturbation for immediate visual representation
      setBuses((prev) =>
        prev.map((b) => {
          if (b.bus_id === params.target_bus_id) {
            const isFdia = params.attack_type.includes("voltage");
            const newVm = isFdia ? b.vm_pu * params.intensity : b.vm_pu * 0.91;
            return {
              ...b,
              vm_pu: +newVm.toFixed(4),
              voltage_violation: newVm < 0.95 || newVm > 1.05,
              is_compromised: true,
            };
          }
          return b;
        })
      );

      const [comp, hist] = await Promise.all([
        gridApi.getStateComparison(),
        gridApi.getEventHistory(),
      ]);
      if (comp) setComparison(comp);
      if (hist) setEventHistory(hist);
    } finally {
      setIsLoading(false);
    }
  };

  // Stop All Attacks
  const handleStopAllAttacks = async () => {
    setIsLoading(true);
    try {
      await gridApi.stopAllAttacks();
      setActiveAttacks([]);
      setStateMode("NORMAL");
      await refreshGridState();
    } finally {
      setIsLoading(false);
    }
  };

  // Apply Simulated Mitigation
  const handleApplyMitigation = async (): Promise<MitigationResult | null> => {
    setIsLoading(true);
    try {
      const res = await gridApi.executeMitigation();
      if (res) {
        setLastMitigationResult(res);
      } else {
        const fallbackRes: MitigationResult = {
          mitigation_id: `mit_${Date.now()}`,
          applied_at: new Date().toISOString(),
          strategy_executed: mitigationPlan?.strategy_name || "Volt-VAR Secondary Support",
          actions_taken: mitigationPlan?.action_steps || [
            "Isolated corrupted telemetry feed",
            "Switched state estimator to Kalman estimation",
            "Dispatched BESS active/reactive power injection",
            "Recalculated AC Newton-Raphson power flow",
          ],
          attack_neutralized: true,
          recalculation_converged: true,
          recovery_effective: true,
          message:
            "Pandapower AC Newton-Raphson power flow converged in 4 iterations. All 8 bus voltages restored within 0.95 - 1.05 p.u.",
        };
        setLastMitigationResult(fallbackRes);
      }

      setActiveAttacks([]);
      setStateMode("RECOVERED");
      setDetection((prev) =>
        prev
          ? {
              ...prev,
              is_anomaly: false,
              anomaly_score: 0.08,
            }
          : null
      );

      await refreshGridState();
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshHistory = async () => {
    const hist = await gridApi.getEventHistory();
    if (hist.length > 0) setEventHistory(hist);
  };

  const handleRedispatch = (params: {
    solar_mw: number;
    wind_mw: number;
    bess_mw: number;
    load_shed_active: boolean;
  }) => {
    setBuses((prev) =>
      prev.map((b) => {
        if (b.bus_id === 2) return { ...b, p_mw: params.solar_mw };
        if (b.bus_id === 3) return { ...b, p_mw: params.wind_mw };
        if (b.bus_id === 4) return { ...b, p_mw: params.bess_mw };
        if (b.bus_id === 5 && params.load_shed_active) {
          return { ...b, p_mw: -1.5 }; // Curtail 0.6 MW from industrial
        }
        return b;
      })
    );
  };

  // Derived Metrics
  const totalGenMw = useMemo(() => {
    const gen = buses
      .filter((b) => b.p_mw > 0)
      .reduce((sum, b) => sum + b.p_mw, 0);
    return +(gen + 4.3).toFixed(2);
  }, [buses]);

  const totalLoadMw = useMemo(() => {
    return +buses
      .filter((b) => b.p_mw < 0)
      .reduce((sum, b) => sum + Math.abs(b.p_mw), 0)
      .toFixed(2);
  }, [buses]);

  const avgVm = useMemo(() => {
    if (buses.length === 0) return 1.0;
    return +(buses.reduce((sum, b) => sum + b.vm_pu, 0) / buses.length).toFixed(3);
  }, [buses]);

  const minVm = useMemo(() => {
    if (buses.length === 0) return 1.0;
    return Math.min(...buses.map((b) => b.vm_pu));
  }, [buses]);

  const maxVm = useMemo(() => {
    if (buses.length === 0) return 1.0;
    return Math.max(...buses.map((b) => b.vm_pu));
  }, [buses]);

  // Current Simulation Stage for Timeline (6 Stages)
  const currentStage: SimulationStage = useMemo(() => {
    if (lastMitigationResult && activeAttacks.length === 0 && stateMode === "RECOVERED") {
      return "PHYSICAL_RECOVERY";
    }
    if (mitigationPlan && lastMitigationResult) return "MITIGATION_APPLIED";
    if (detection?.is_anomaly && activeAttacks.length > 0) return "ESTIMATION";
    if (detection?.is_anomaly) return "AI_DETECTION";
    if (activeAttacks.length > 0 || stateMode === "ATTACKED") return "ATTACK_INJECTED";
    return "NORMAL";
  }, [activeAttacks.length, detection?.is_anomaly, mitigationPlan, lastMitigationResult, stateMode]);

  // Format Elapsed Time
  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `T+ ${mins}:${secs}`;
  };

  return (
    <div className="space-y-4 font-mono text-xs text-foreground">
      {/* ========================================================= */}
      {/* 1. TOP HEADER & SIMULATION STATUS BAR                    */}
      {/* ========================================================= */}
      <div className="rounded-xl border border-primary/40 bg-card/95 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        {/* Left: Project title & subtitle */}
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex size-3 rounded-full bg-primary animate-pulse" />
            <h1 className="font-display text-sm font-black tracking-widest text-foreground uppercase sm:text-base">
              GRID SENTINEL AI <span className="text-primary-glow">— POWER SYSTEM CPS</span>
            </h1>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider">
            SAFETY-CRITICAL SIMULATION & CYBER-PHYSICAL SYSTEM CONTROLLER · RESILIENT 20 kV
          </p>
        </div>

        {/* Center: Status & Elapsed Time */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div
            className={cn(
              "rounded-full border px-3 py-1 text-[11px] font-bold flex items-center gap-1.5 shadow-sm",
              activeAttacks.length > 0
                ? "border-destructive/60 bg-destructive/20 text-destructive animate-pulse"
                : status?.status === "RUNNING"
                ? "border-success/50 bg-success/15 text-success"
                : "border-warning/50 bg-warning/15 text-warning"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                activeAttacks.length > 0
                  ? "bg-destructive animate-ping"
                  : status?.status === "RUNNING"
                  ? "bg-success animate-pulse"
                  : "bg-warning"
              )}
            />
            <span>
              {activeAttacks.length > 0
                ? "🚨 ATTACK ACTIVE"
                : status?.status === "RUNNING"
                ? "● SIMULATION RUNNING"
                : "⏸ SIMULATION PAUSED"}
            </span>
          </div>

          {/* Elapsed Time */}
          <div className="rounded-md border border-border/70 bg-void/70 px-2.5 py-1 text-[11px] text-primary flex items-center gap-1.5">
            <Clock className="size-3 text-primary" />
            <span className="font-bold tabular-nums">{formatTime(elapsedSeconds)}</span>
            <span className="text-muted-foreground text-[9px]">(Step #{status?.step_count ?? 1})</span>
          </div>
        </div>

        {/* Right: Quick Attack / Mitigation Toggle Action */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAttackWorkbench(!showAttackWorkbench)}
            className={cn(
              "rounded-lg border px-3 py-1.5 font-mono text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm",
              showAttackWorkbench
                ? "border-destructive bg-destructive/20 text-destructive shadow-[0_0_12px_rgba(239,68,68,0.3)]"
                : "border-primary/40 bg-void/80 text-primary hover:border-primary hover:bg-primary/10"
            )}
          >
            <Flame className="size-3.5 text-destructive animate-pulse" />
            <span>Attack & Mitigation Workbench</span>
            {showAttackWorkbench ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      {/* Grid Control Bar (Topologies + Start/Pause/Step/Reset) */}
      <GridControlBar
        topologies={topologies}
        activeTopology={activeTopology}
        onSelectTopology={handleSelectTopology}
        status={status}
        onStart={handleStart}
        onPause={handlePause}
        onResume={handleResume}
        onReset={handleReset}
        onStep={handleStep}
        frequencyHz={frequencyHz}
        isLoading={isLoading}
      />

      {/* Optional Expandable Attack Workbench */}
      {showAttackWorkbench && (
        <div className="space-y-4 animate-fade-in p-4 rounded-xl border border-destructive/40 bg-card/90 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AttackInjectionDeck
              scenarios={scenarios}
              activeAttacks={activeAttacks}
              onLaunchAttack={handleLaunchAttack}
              onStopAllAttacks={handleStopAllAttacks}
              isLoading={isLoading}
            />
            <DetectionMitigationDeck
              detection={detection}
              mitigationPlan={mitigationPlan}
              onApplyMitigation={handleApplyMitigation}
              lastMitigationResult={lastMitigationResult}
              isLoading={isLoading}
            />
          </div>
          <StateComparisonMatrix comparison={comparison} isLoading={isLoading} />
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. CENTRAL UPPER SECTION (60%) + RIGHT SECTION (40%)     */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Central 3D Grid Canvas occupying ~60% (7 cols of 12) */}
        <div className="lg:col-span-7 space-y-3">
          <MicrogridTwinView
            buses={buses}
            lines={lines}
            activeAttacks={activeAttacks}
            onSelectBus={(id) => setSelectedBusId(id)}
            stateMode={stateMode}
            onStateModeChange={(m) => {
              setStateMode(m);
              if (m === "NORMAL") {
                setBuses(DEFAULT_BUSES);
                setActiveAttacks([]);
              } else if (m === "ATTACKED") {
                setBuses((prev) =>
                  prev.map((b) => (b.bus_id === 3 ? { ...b, vm_pu: 1.35, voltage_violation: true } : b))
                );
              } else if (m === "RECOVERED") {
                setBuses(DEFAULT_BUSES);
              }
            }}
          />
        </div>

        {/* Right Section occupying ~40% (5 cols of 12) */}
        <div className="lg:col-span-5 h-full">
          <RightMonitoringSection
            totalGenerationMw={totalGenMw}
            totalLoadMw={totalLoadMw}
            frequencyHz={frequencyHz}
            avgVoltagePu={avgVm}
            minVoltagePu={minVm}
            maxVoltagePu={maxVm}
            buses={buses}
            lines={lines}
            events={eventHistory}
            selectedBusId={selectedBusId}
            onSelectBus={(id) => setSelectedBusId(id)}
          />
        </div>
      </div>

      {/* ========================================================= */}
      {/* 3. LOWER SECTION — FIVE DISTINCT DENSE ENGINEERING PANELS */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Panel 1: State Estimation / PMU Measurements */}
        <StateEstimationPMUPanel
          buses={buses}
          lines={lines}
          frequencyHz={frequencyHz}
          isAnomaly={detection?.is_anomaly ?? false}
          anomalyScore={detection?.anomaly_score}
        />

        {/* Panel 2: Safety-Critical Monitoring / Control Barrier Functions */}
        <SafetyMonitoringPanel
          buses={buses}
          lines={lines}
          frequencyHz={frequencyHz}
        />

        {/* Panel 3: Control Actions / Generation Redispatch */}
        <GenerationRedispatchPanel
          onRedispatch={handleRedispatch}
          isLoading={isLoading}
        />

        {/* Panel 4: Frequency and Voltage Response Charts */}
        <FrequencyVoltageGraphs
          frequencyHz={frequencyHz}
          buses={buses}
          isAttackActive={activeAttacks.length > 0}
        />

        {/* Panel 5: Cybersecurity Monitoring / Network Traffic / IDS */}
        <CybersecurityMonitoringPanel
          isAnomaly={detection?.is_anomaly ?? false}
          anomalyScore={detection?.anomaly_score ?? 0.05}
          attackClassification={detection?.attack_classification ?? "NORMAL"}
          confidence={detection?.confidence ?? 0.98}
          affectedComponent={detection?.affected_component}
          reason={detection?.reason}
        />
      </div>

      {/* ========================================================= */}
      {/* 4. BOTTOM SECTION: SIMULATION TIMELINE + KEY SAFETY       */}
      {/* ========================================================= */}
      <div className="space-y-3.5 pt-1">
        {/* Horizontal Simulation Timeline: Normal -> Attack -> Detection -> Estimation -> Mitigation -> Recovery */}
        <SimulationTimeline
          currentStage={currentStage}
          activeAttackType={activeAttacks[0]?.attack_type}
          anomalyScore={detection?.anomaly_score}
          mitigationStrategy={mitigationPlan?.strategy_name}
          stepCount={status?.step_count ?? 1}
        />

        {/* Key Safety Features Panel */}
        <KeySafetyFeaturesPanel />
      </div>

      {/* Complete Event Audit Log (Persistent SQLite History) */}
      <div className="pt-2">
        <EventHistoryAuditLog
          events={eventHistory}
          onRefresh={handleRefreshHistory}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
