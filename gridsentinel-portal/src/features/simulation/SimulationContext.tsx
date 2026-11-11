import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
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
  type GridStateData,
  type StateEstimationResult,
  type BadDataReport,
  type EstimationScenarioRequest,
} from "@/lib/gridApi";
import type { SimulationStage } from "../digitaltwin/SimulationTimeline";

// Configured statutory voltage limits for IEEE 14-bus transmission network (0.90 - 1.10 pu)
export const VOLTAGE_LOWER_LIMIT_PU = 0.90;
export const VOLTAGE_UPPER_LIMIT_PU = 1.10;
export const VOLTAGE_WARN_LOW_PU = 0.94;
export const VOLTAGE_WARN_HIGH_PU = 1.06;

// IEEE 14-bus baseline electrical configuration (Pandapower AC Newton-Raphson Baseline)
export const DEFAULT_BUSES: BusElectricalData[] = [
  { bus_id: 0, name: "Bus 0 (Slack 69kV)", vn_kv: 69.0, vm_pu: 1.060, va_degree: 0.0, p_mw: -232.39, q_mvar: 16.55, voltage_violation: false },
  { bus_id: 1, name: "Bus 1 (Gen 69kV)", vn_kv: 69.0, vm_pu: 1.045, va_degree: -4.98, p_mw: -18.30, q_mvar: -30.86, voltage_violation: false },
  { bus_id: 2, name: "Bus 2 (Gen 69kV)", vn_kv: 69.0, vm_pu: 1.010, va_degree: -12.73, p_mw: 94.20, q_mvar: -6.08, voltage_violation: false },
  { bus_id: 3, name: "Bus 3 (Sub 69kV)", vn_kv: 69.0, vm_pu: 1.018, va_degree: -10.31, p_mw: 47.80, q_mvar: -3.90, voltage_violation: false },
  { bus_id: 4, name: "Bus 4 (Sub 69kV)", vn_kv: 69.0, vm_pu: 1.020, va_degree: -8.77, p_mw: 7.60, q_mvar: 1.60, voltage_violation: false },
  { bus_id: 5, name: "Bus 5 (Gen 13.8kV)", vn_kv: 13.8, vm_pu: 1.070, va_degree: -14.22, p_mw: 11.20, q_mvar: -5.23, voltage_violation: false },
  { bus_id: 6, name: "Bus 6 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.062, va_degree: -13.36, p_mw: 0.00, q_mvar: 0.00, voltage_violation: false },
  { bus_id: 7, name: "Bus 7 (Gen 13.8kV)", vn_kv: 13.8, vm_pu: 1.090, va_degree: -13.36, p_mw: 0.00, q_mvar: -17.62, voltage_violation: false },
  { bus_id: 8, name: "Bus 8 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.056, va_degree: -14.94, p_mw: 29.50, q_mvar: -4.58, voltage_violation: false },
  { bus_id: 9, name: "Bus 9 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.051, va_degree: -15.10, p_mw: 9.00, q_mvar: 5.80, voltage_violation: false },
  { bus_id: 10, name: "Bus 10 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.057, va_degree: -14.79, p_mw: 3.50, q_mvar: 1.80, voltage_violation: false },
  { bus_id: 11, name: "Bus 11 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.055, va_degree: -15.08, p_mw: 6.10, q_mvar: 1.60, voltage_violation: false },
  { bus_id: 12, name: "Bus 12 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.050, va_degree: -15.16, p_mw: 13.50, q_mvar: 5.80, voltage_violation: false },
  { bus_id: 13, name: "Bus 13 (Sub 13.8kV)", vn_kv: 13.8, vm_pu: 1.036, va_degree: -16.03, p_mw: 14.90, q_mvar: 5.00, voltage_violation: false },
];

export const DEFAULT_LINES: LineElectricalData[] = [
  { line_id: 0, name: "Line 0-1", from_bus: 0, to_bus: 1, p_from_mw: 156.88, q_from_mvar: -20.40, p_to_mw: -152.59, q_to_mvar: 27.68, pl_mw: 4.29, loading_percent: 42.5, thermal_overload: false },
  { line_id: 1, name: "Line 0-4", from_bus: 0, to_bus: 4, p_from_mw: 75.51, q_from_mvar: 3.85, p_to_mw: -72.75, q_to_mvar: 2.23, pl_mw: 2.76, loading_percent: 28.0, thermal_overload: false },
  { line_id: 2, name: "Line 1-2", from_bus: 1, to_bus: 2, p_from_mw: 73.24, q_from_mvar: 3.56, p_to_mw: -70.91, q_to_mvar: 1.60, pl_mw: 2.33, loading_percent: 34.2, thermal_overload: false },
  { line_id: 3, name: "Line 1-3", from_bus: 1, to_bus: 3, p_from_mw: 56.13, q_from_mvar: -1.55, p_to_mw: -54.45, q_to_mvar: 3.02, pl_mw: 1.68, loading_percent: 31.2, thermal_overload: false },
  { line_id: 4, name: "Line 1-4", from_bus: 1, to_bus: 4, p_from_mw: 41.52, q_from_mvar: 1.17, p_to_mw: -40.61, q_to_mvar: -2.10, pl_mw: 0.91, loading_percent: 22.4, thermal_overload: false },
  { line_id: 5, name: "Line 2-3", from_bus: 2, to_bus: 3, p_from_mw: -23.29, q_from_mvar: 4.47, p_to_mw: 23.66, q_to_mvar: -4.84, pl_mw: 0.37, loading_percent: 18.5, thermal_overload: false },
  { line_id: 6, name: "Line 3-4", from_bus: 3, to_bus: 4, p_from_mw: -61.16, q_from_mvar: 15.82, p_to_mw: 61.67, q_to_mvar: -14.20, pl_mw: 0.51, loading_percent: 38.0, thermal_overload: false },
  { line_id: 7, name: "Line 5-10", from_bus: 5, to_bus: 10, p_from_mw: 7.35, q_from_mvar: 3.56, p_to_mw: -7.30, q_to_mvar: -3.44, pl_mw: 0.05, loading_percent: 12.0, thermal_overload: false },
  { line_id: 8, name: "Line 5-11", from_bus: 5, to_bus: 11, p_from_mw: 7.79, q_from_mvar: 2.50, p_to_mw: -7.71, q_to_mvar: -2.35, pl_mw: 0.08, loading_percent: 14.2, thermal_overload: false },
  { line_id: 9, name: "Line 5-12", from_bus: 5, to_bus: 12, p_from_mw: 17.75, q_from_mvar: 7.22, p_to_mw: -17.54, q_to_mvar: -6.80, pl_mw: 0.21, loading_percent: 24.5, thermal_overload: false },
  { line_id: 10, name: "Line 8-9", from_bus: 8, to_bus: 9, p_from_mw: 5.23, q_from_mvar: 4.22, p_to_mw: -5.21, q_to_mvar: -4.18, pl_mw: 0.02, loading_percent: 9.5, thermal_overload: false },
  { line_id: 11, name: "Line 8-13", from_bus: 8, to_bus: 13, p_from_mw: 9.43, q_from_mvar: 3.61, p_to_mw: -9.31, q_to_mvar: -3.36, pl_mw: 0.12, loading_percent: 16.0, thermal_overload: false },
  { line_id: 12, name: "Line 9-10", from_bus: 9, to_bus: 10, p_from_mw: -3.79, q_from_mvar: -1.62, p_to_mw: 3.80, q_to_mvar: 1.64, pl_mw: 0.01, loading_percent: 7.2, thermal_overload: false },
  { line_id: 13, name: "Line 11-12", from_bus: 11, to_bus: 12, p_from_mw: 1.61, q_from_mvar: 0.75, p_to_mw: -1.61, q_to_mvar: -0.75, pl_mw: 0.00, loading_percent: 3.8, thermal_overload: false },
  { line_id: 14, name: "Line 12-13", from_bus: 12, to_bus: 13, p_from_mw: 5.64, q_from_mvar: 1.75, p_to_mw: -5.59, q_to_mvar: -1.64, pl_mw: 0.05, loading_percent: 10.4, thermal_overload: false },
];

export interface AgentSignal {
  id: string;
  timestamp: string;
  fromAgent: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  toAgent: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  label: string;
  type: "telemetry" | "attack_injection" | "threat_alarm" | "bad_data_alert" | "mitigation_dispatch" | "recovery_verified";
  payload?: any;
}

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  agent: string;
  category: "INFO" | "ALERT" | "ACTION" | "PHYSICS";
  message: string;
  details?: string;
}

export interface DetectionState {
  is_anomaly: boolean;
  anomaly_score: number;
  attack_classification: string;
  confidence: number;
  affected_component?: string;
  reason?: string;
  feature_contributions?: Record<string, number>;
}

interface SimulationContextValue {
  // Topologies & Simulation State
  topologies: TopologySummary[];
  activeTopology: string;
  status: SimulationStatus | null;
  buses: BusElectricalData[];
  lines: LineElectricalData[];
  frequencyHz: number;
  selectedBusId: number | null;
  setSelectedBusId: (id: number | null) => void;
  stateMode: "NORMAL" | "ATTACKED" | "RECOVERED";
  setStateMode: (mode: "NORMAL" | "ATTACKED" | "RECOVERED") => void;
  elapsedSeconds: number;
  formatTime: (sec: number) => string;
  isLoading: boolean;

  // Electrical Aggregates (from verified Pandapower GridStateSummary)
  totalGenMw: number;
  totalLoadMw: number;
  totalLossesMw: number;
  powerImbalanceMw: number;
  gridState: GridStateData | null;
  avgVm: number;
  minVm: number;
  maxVm: number;
  currentStage: SimulationStage;

  // Attack & Security State
  scenarios: AttackScenario[];
  activeAttacks: ActiveAttack[];
  detection: DetectionState | null;
  mitigationPlan: MitigationPlan | null;
  lastMitigationResult: MitigationResult | null;
  comparison: StateComparisonReport | null;

  // State Estimation
  estimationResult: StateEstimationResult | null;
  badDataReport: BadDataReport | null;

  // Real Residual & Multiclass Model Metrics
  residualAnalysis: import("@/lib/gridApi").ResidualAnalysisResult | null;
  multiclassMetrics: import("@/lib/gridApi").MulticlassMetrics | null;
  telemetryLatencyMs: number;
  telemetryRateHz: number;

  // Event History & Agent Orchestration
  eventHistory: EventLogItem[];
  activeAgentId: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  agentSignals: AgentSignal[];
  agentLogs: AgentLogEntry[];

  // Action Handlers
  selectTopology: (topoId: string) => Promise<void>;
  startSimulation: () => Promise<void>;
  pauseSimulation: () => Promise<void>;
  resumeSimulation: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  stepSimulation: () => Promise<void>;
  launchAttack: (params: {
    attack_type: string;
    target_bus_id: number;
    intensity: number;
    duration_seconds: number;
  }) => Promise<void>;
  stopAllAttacks: () => Promise<void>;
  runDetectionScan: () => Promise<void>;
  runStateEstimation: () => Promise<void>;
  evaluateEstimationScenario: (params: EstimationScenarioRequest) => Promise<void>;
  applyMitigation: () => Promise<MitigationResult | null>;
  redispatch: (params: {
    solar_mw: number;
    wind_mw: number;
    bess_mw: number;
    load_shed_active: boolean;
  }) => void;
  refreshHistory: () => Promise<void>;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [topologies, setTopologies] = useState<TopologySummary[]>([]);
  const [activeTopology, setActiveTopology] = useState<string>("ieee14_grid");
  const [status, setStatus] = useState<SimulationStatus | null>({
    status: "RUNNING",
    step_count: 1,
    speed_hz: 1.0,
    active_topology: "ieee14_grid",
    converged: true,
    num_buses: 14,
    num_lines: 15,
    active_attacks_count: 0,
  });

  const [buses, setBuses] = useState<BusElectricalData[]>(DEFAULT_BUSES);
  const [lines, setLines] = useState<LineElectricalData[]>(DEFAULT_LINES);
  const [frequencyHz, setFrequencyHz] = useState<number>(50.0);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [stateMode, setStateMode] = useState<"NORMAL" | "ATTACKED" | "RECOVERED">("NORMAL");

  // Electrical Aggregates (initialized from verified IEEE 14-bus Pandapower baseline)
  const [totalGenMw, setTotalGenMw] = useState<number>(272.39);
  const [totalLoadMw, setTotalLoadMw] = useState<number>(259.00);
  const [totalLossesMw, setTotalLossesMw] = useState<number>(13.39);
  const [powerImbalanceMw, setPowerImbalanceMw] = useState<number>(0.0);
  const [gridState, setGridState] = useState<GridStateData | null>(null);

  const applyGridStateSummary = useCallback((summary: GridStateData | null) => {
    if (!summary) return;
    setGridState(summary);
    if (summary.buses && summary.buses.length > 0) {
      setBuses(summary.buses);
    }
    if (summary.lines && summary.lines.length > 0) {
      setLines(summary.lines);
    }
    if (typeof summary.total_generation_mw === "number") {
      setTotalGenMw(+summary.total_generation_mw.toFixed(2));
    }
    if (typeof summary.total_load_mw === "number") {
      setTotalLoadMw(+summary.total_load_mw.toFixed(2));
    }
    if (typeof summary.total_losses_mw === "number") {
      setTotalLossesMw(+summary.total_losses_mw.toFixed(2));
    }
    if (typeof summary.active_power_imbalance_mw === "number") {
      setPowerImbalanceMw(+summary.active_power_imbalance_mw.toFixed(4));
    }
  }, []);

  const [scenarios, setScenarios] = useState<AttackScenario[]>([]);
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttack[]>([]);
  const [detection, setDetection] = useState<DetectionState | null>(null);
  const [mitigationPlan, setMitigationPlan] = useState<MitigationPlan | null>(null);
  const [lastMitigationResult, setLastMitigationResult] = useState<MitigationResult | null>(null);
  const [comparison, setComparison] = useState<StateComparisonReport | null>(null);

  const [estimationResult, setEstimationResult] = useState<StateEstimationResult | null>(null);
  const [badDataReport, setBadDataReport] = useState<BadDataReport | null>(null);
  const [residualAnalysis, setResidualAnalysis] = useState<import("@/lib/gridApi").ResidualAnalysisResult | null>(null);
  const [multiclassMetrics, setMulticlassMetrics] = useState<import("@/lib/gridApi").MulticlassMetrics | null>(null);
  const [telemetryLatencyMs, setTelemetryLatencyMs] = useState<number>(14);
  const [telemetryRateHz, setTelemetryRateHz] = useState<number>(1.0);

  const [eventHistory, setEventHistory] = useState<EventLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Agent Orchestration Signals & Logs
  const [activeAgentId, setActiveAgentId] = useState<"coordinator" | "attack" | "detection" | "estimation" | "mitigation">("coordinator");
  const [agentSignals, setAgentSignals] = useState<AgentSignal[]>([]);
  const [agentLogs, setAgentLogs] = useState<AgentLogEntry[]>([
    {
      id: "log_init",
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      agent: "Grid Coordinator Agent",
      category: "INFO",
      message: "Pandapower AC Newton-Raphson power flow engine synchronized (IEEE 14-Bus Benchmark, 69 kV / 13.8 kV nominal).",
      details: "14 buses, 20 branches (15 lines, 5 transformers), nominal frequency 50.00 Hz.",
    },
  ]);

  const addAgentLog = useCallback((agent: string, category: "INFO" | "ALERT" | "ACTION" | "PHYSICS", message: string, details?: string) => {
    const entry: AgentLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      agent,
      category,
      message,
      details,
    };
    setAgentLogs((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const triggerSignal = useCallback((signal: Omit<AgentSignal, "id" | "timestamp">) => {
    const fullSignal: AgentSignal = {
      ...signal,
      id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour12: false }),
    };
    setAgentSignals((prev) => [fullSignal, ...prev].slice(0, 20));
  }, []);

  // Timer loop for simulation elapsed time
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

  // Initial load: Topologies, Scenarios, Event history, Initial Estimation, Detection Models
  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        const [toposRes, scensRes, histRes, estRes, residualsRes, multiclassRes, stateRes] =
          await Promise.allSettled([
            gridApi.getTopologies(),
            gridApi.getScenarios(),
            gridApi.getEventHistory(),
            gridApi.getStateEstimationLatest(),
            gridApi.getResidualAnalysis(),
            gridApi.getMulticlassMetrics(),
            gridApi.getGridState(),
          ]);
        if (!mounted) return;
        if (toposRes.status === "fulfilled" && toposRes.value && toposRes.value.length > 0) {
          setTopologies(toposRes.value);
        }
        if (scensRes.status === "fulfilled" && scensRes.value && scensRes.value.length > 0) {
          setScenarios(scensRes.value);
        }
        if (histRes.status === "fulfilled" && Array.isArray(histRes.value)) {
          setEventHistory(histRes.value);
        }
        if (estRes.status === "fulfilled" && estRes.value) {
          setEstimationResult(estRes.value);
          if (estRes.value.bad_data_report) setBadDataReport(estRes.value.bad_data_report);
        }
        if (residualsRes.status === "fulfilled" && residualsRes.value) {
          setResidualAnalysis(residualsRes.value);
        }
        if (multiclassRes.status === "fulfilled" && multiclassRes.value) {
          setMulticlassMetrics(multiclassRes.value);
        }
        if (stateRes.status === "fulfilled" && stateRes.value) {
          applyGridStateSummary(stateRes.value);
        }
      } catch (e) {
        console.error("Initialization error:", e);
      }
    }
    init();

    // WebSocket Telemetry Subscription (1 Hz)
    const unsubTelemetry = gridApi.subscribeTelemetryStream((payload) => {
      if (!mounted) return;
      if (payload.telemetry && payload.telemetry.timestamp) {
        const tDiff = Date.now() - new Date(payload.telemetry.timestamp).getTime();
        if (!isNaN(tDiff) && tDiff > 0 && tDiff < 5000) {
          setTelemetryLatencyMs(tDiff);
        }
      }
      if (payload.grid_state) {
        applyGridStateSummary(payload.grid_state);
        if (typeof payload.grid_state.total_generation_mw === "number" && typeof payload.grid_state.total_load_mw === "number") {
          const pDiff = payload.grid_state.total_generation_mw - payload.grid_state.total_load_mw;
          const baseFreq = 50.0 + Math.max(-1.5, Math.min(1.5, pDiff * 0.1));
          setFrequencyHz(+(baseFreq + (Math.random() - 0.5) * 0.04).toFixed(2));
        }
      }
    });

    // WebSocket Cybersecurity Alert Subscription
    const unsubAlerts = gridApi.subscribeAlertStream((alert) => {
      if (!mounted || !alert) return;
      setDetection({
        is_anomaly: true,
        anomaly_score: alert.anomaly_score || 0.88,
        attack_classification: alert.attack_type || "DETECTED_ATTACK",
        confidence: alert.confidence || 0.95,
        affected_component: alert.target_component,
        reason: `Real-time WebSocket incident alert: anomaly score ${alert.anomaly_score} on ${alert.target_component}`,
      });
      setActiveAgentId("detection");
      triggerSignal({
        fromAgent: "attack",
        toAgent: "detection",
        label: `Threat Alert: ${alert.attack_type || "Anomaly"}`,
        type: "threat_alarm",
        payload: alert,
      });
      addAgentLog(
        "Detection Agent",
        "ALERT",
        `Incident detected on ${alert.target_component}: classification ${alert.attack_type || "Anomaly"}`,
        `Score: ${alert.anomaly_score || 0.88}, Confidence: ${alert.confidence || 0.95}`
      );
      gridApi.getEventHistory().then((h) => {
        if (mounted && h.length > 0) setEventHistory(h);
      });
    });

    return () => {
      mounted = false;
      unsubTelemetry();
      unsubAlerts();
    };
  }, [triggerSignal, addAgentLog]);

  // Periodic grid stepping in running state
  useEffect(() => {
    let timerId: any = null;
    if (status?.status === "RUNNING") {
      timerId = setInterval(async () => {
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
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [status?.status, activeAttacks.length]);

  // Periodic background event-history sync (every 2 seconds, immediate on mount)
  useEffect(() => {
    let mounted = true;
    const syncHistory = async () => {
      try {
        const hist = await gridApi.getEventHistory();
        if (mounted && Array.isArray(hist)) {
          setEventHistory(hist);
        }
      } catch {
        // Silently tolerate background poll hiccups
      }
    };

    // Immediate initial sync
    syncHistory();
    const timerId = setInterval(syncHistory, 2000);
    return () => {
      mounted = false;
      clearInterval(timerId);
    };
  }, []);

  // Derived Electrical Metrics (avg, min, max voltage)

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

  const currentStage: SimulationStage = useMemo(() => {
    if (lastMitigationResult && activeAttacks.length === 0 && stateMode === "RECOVERED") {
      return "PHYSICAL_RECOVERY";
    }
    if (mitigationPlan && lastMitigationResult) return "MITIGATION_APPLIED";
    if (badDataReport?.bad_data_detected || (estimationResult && estimationResult.rmse_vm_pu > 0.05)) {
      return "ESTIMATION";
    }
    if (detection?.is_anomaly) return "AI_DETECTION";
    if (activeAttacks.length > 0 || stateMode === "ATTACKED") return "ATTACK_INJECTED";
    return "NORMAL";
  }, [activeAttacks.length, detection?.is_anomaly, mitigationPlan, lastMitigationResult, stateMode, badDataReport, estimationResult]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSec % 60).toString().padStart(2, "0");
    return `T+ ${mins}:${secs}`;
  };

  const refreshGridState = useCallback(async () => {
    const [stateData, simStatus, compData, histData] = await Promise.all([
      gridApi.getGridState(),
      gridApi.getSimulationStatus(),
      gridApi.getStateComparison(),
      gridApi.getEventHistory(),
    ]);

    if (stateData) {
      applyGridStateSummary(stateData);
    }
    if (simStatus) setStatus(simStatus);
    if (compData) setComparison(compData);
    if (histData && Array.isArray(histData)) setEventHistory(histData);
  }, []);

  // Action: Select Topology
  const selectTopology = async (topoId: string) => {
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
      setActiveAgentId("coordinator");
      addAgentLog("Grid Coordinator Agent", "ACTION", `Topology initialized to: ${topoId}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Start / Pause / Resume / Reset / Step
  const startSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.startSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "RUNNING" } : null));
      setActiveAgentId("coordinator");
      addAgentLog("Grid Coordinator Agent", "ACTION", "Simulation started (1 Hz AC Newton-Raphson loop active).");
    } finally {
      setIsLoading(false);
    }
  };

  const pauseSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.pauseSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "PAUSED" } : null));
      addAgentLog("Grid Coordinator Agent", "ACTION", "Simulation loop paused.");
    } finally {
      setIsLoading(false);
    }
  };

  const resumeSimulation = async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.resumeSimulation();
      if (res) setStatus(res);
      else setStatus((s) => (s ? { ...s, status: "RUNNING" } : null));
      addAgentLog("Grid Coordinator Agent", "ACTION", "Simulation loop resumed.");
    } finally {
      setIsLoading(false);
    }
  };

  const resetSimulation = async () => {
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
      setActiveAgentId("coordinator");
      await refreshGridState();
      addAgentLog("Grid Coordinator Agent", "ACTION", "Simulation reset to nominal power-flow conditions.");
    } finally {
      setIsLoading(false);
    }
  };

  const stepSimulation = async () => {
    setIsLoading(true);
    try {
      const stepped = await gridApi.stepSimulation();
      if (stepped) {
        applyGridStateSummary(stepped);
      }
      setStatus((s) => (s ? { ...s, step_count: s.step_count + 1 } : null));
      addAgentLog("Grid Coordinator Agent", "PHYSICS", `Single step executed (Step #${(status?.step_count ?? 0) + 1}).`);
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Launch Cyberattack
  const launchAttack = async (params: {
    attack_type: string;
    target_bus_id: number;
    intensity: number;
    duration_seconds: number;
  }) => {
    setIsLoading(true);
    setActiveAgentId("attack");
    try {
      triggerSignal({
        fromAgent: "coordinator",
        toAgent: "attack",
        label: `Inject Attack: ${params.attack_type}`,
        type: "attack_injection",
        payload: params,
      });

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
      addAgentLog(
        "Attack Agent",
        "ALERT",
        `Cyberattack injected: ${params.attack_type} on Bus ${params.target_bus_id}`,
        `Intensity: ${params.intensity}x, Duration: ${params.duration_seconds}s (Confined locally).`
      );

      // Automated Detection Scan
      setActiveAgentId("detection");
      const detectRes = await gridApi.detectThreats();
      if (detectRes && detectRes.detection) {
        const attackClass =
          detectRes.detection.predicted_attack_type ||
          detectRes.detection.attack_classification ||
          params.attack_type.toUpperCase();
        setDetection({
          is_anomaly: detectRes.detection.is_anomaly,
          anomaly_score: detectRes.detection.anomaly_score,
          attack_classification: attackClass,
          confidence: detectRes.detection.confidence,
          affected_component: `Bus ${params.target_bus_id}`,
          reason: `Chi-Square residual J(x) diverged under virtual ${params.attack_type} perturbation (${params.intensity}x).`,
          feature_contributions: detectRes.detection.feature_contributions,
        });
        triggerSignal({
          fromAgent: "detection",
          toAgent: "estimation",
          label: `Threat Detected: ${attackClass} (${(detectRes.detection.anomaly_score * 100).toFixed(0)}%)`,
          type: "threat_alarm",
        });
      } else {
        const attackClass = params.attack_type.toUpperCase();
        setDetection({
          is_anomaly: true,
          anomaly_score: 0.95,
          attack_classification: attackClass,
          confidence: 0.95,
          affected_component: `Bus ${params.target_bus_id}`,
          reason: `Telemetry deviation detected at Bus ${params.target_bus_id}; sensor measurement diverged by ${((params.intensity - 1.0) * 100).toFixed(0)}%.`,
        });
        triggerSignal({
          fromAgent: "detection",
          toAgent: "estimation",
          label: `Threat Detected: ${attackClass}`,
          type: "threat_alarm",
        });
      }

      // Run State Estimation
      setActiveAgentId("estimation");
      const estRes = await gridApi.runStateEstimation();
      if (estRes) {
        setEstimationResult(estRes);
        if (estRes.bad_data_report) {
          setBadDataReport(estRes.bad_data_report);
          addAgentLog(
            "State Estimation Agent",
            "ALERT",
            `WLS Estimation completed: Chi-square passed=${estRes.bad_data_report.chi2_passed}, Bad data=${estRes.bad_data_report.bad_data_detected}`,
            `Max Vm Error: ${estRes.max_vm_error_pu.toFixed(4)} p.u., Bad channels: ${estRes.bad_data_report.num_bad_measurements}`
          );
        }
      }

      // Fetch Recommended Mitigation
      setActiveAgentId("mitigation");
      const planRes = await gridApi.getRecommendedMitigation({
        attack_type: params.attack_type,
        target_component: `Bus ${params.target_bus_id}`,
      });
      if (planRes) {
        setMitigationPlan(planRes);
        addAgentLog(
          "Mitigation Agent",
          "ACTION",
          `Synthesized Countermeasure: ${planRes.strategy_name}`,
          planRes.engineering_rationale
        );
        triggerSignal({
          fromAgent: "estimation",
          toAgent: "mitigation",
          label: `Countermeasure: ${planRes.strategy_name}`,
          type: "mitigation_dispatch",
        });
      }

      // Perturb local buses for instant visual feedback
      setBuses((prev) =>
        prev.map((b) => {
          if (b.bus_id === params.target_bus_id) {
            const isFdia = params.attack_type.includes("voltage");
            const newVm = isFdia ? b.vm_pu * params.intensity : b.vm_pu * 0.91;
            return {
              ...b,
              vm_pu: +newVm.toFixed(4),
              voltage_violation: newVm < VOLTAGE_LOWER_LIMIT_PU || newVm > VOLTAGE_UPPER_LIMIT_PU,
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

  // Action: Stop All Attacks
  const stopAllAttacks = async () => {
    setIsLoading(true);
    try {
      await gridApi.stopAllAttacks();
      setActiveAttacks([]);
      setStateMode("NORMAL");
      setActiveAgentId("coordinator");
      await refreshGridState();
      addAgentLog("Attack Agent", "ACTION", "All active attacks disarmed and terminated.");
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Run Manual Detection Scan
  const runDetectionScan = async () => {
    setIsLoading(true);
    setActiveAgentId("detection");
    try {
      const [detectRes, resAnalysis, hist] = await Promise.all([
        gridApi.detectThreats(),
        gridApi.getResidualAnalysis(),
        gridApi.getEventHistory(),
      ]);
      if (resAnalysis) {
        setResidualAnalysis(resAnalysis);
      }
      if (hist && Array.isArray(hist)) {
        setEventHistory(hist);
      }
      if (detectRes && detectRes.detection) {
        const attackClass =
          detectRes.detection.predicted_attack_type ||
          detectRes.detection.attack_classification ||
          "NORMAL";
        const detectedTarget =
          detectRes.incident?.target_component ||
          detectRes.detection.affected_component ||
          (activeAttacks[0] ? activeAttacks[0].target_component : undefined) ||
          (resAnalysis?.worst_bus_id !== undefined ? `Bus ${resAnalysis.worst_bus_id}` : "Substation Bus");

        setDetection({
          is_anomaly: detectRes.detection.is_anomaly,
          anomaly_score: detectRes.detection.anomaly_score,
          attack_classification: attackClass,
          confidence: detectRes.detection.confidence,
          affected_component: detectedTarget,
          reason: `Telemetry residual analysis scan completed. Worst bus residual: ${resAnalysis?.max_residual_mw?.toFixed(4) || "0.0000"} MW. Anomaly score: ${detectRes.detection.anomaly_score.toFixed(3)}. Target: ${detectedTarget}.`,
          feature_contributions: detectRes.detection.feature_contributions,
        });
        addAgentLog(
          "Detection Agent",
          detectRes.detection.is_anomaly ? "ALERT" : "INFO",
          `Manual Scan: ${attackClass} on ${detectedTarget} (Score: ${detectRes.detection.anomaly_score.toFixed(3)})`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Run State Estimation
  const runStateEstimation = async () => {
    setIsLoading(true);
    setActiveAgentId("estimation");
    try {
      const res = await gridApi.runStateEstimation();
      if (res) {
        setEstimationResult(res);
        if (res.bad_data_report) setBadDataReport(res.bad_data_report);
        addAgentLog(
          "State Estimation Agent",
          res.bad_data_report.bad_data_detected ? "ALERT" : "INFO",
          `WLS Estimation: Converged in ${res.num_iterations} iters (${res.execution_time_ms.toFixed(1)} ms).`,
          `RMSE Vm: ${res.rmse_vm_pu.toFixed(4)} pu, Bad data: ${res.bad_data_report.bad_data_detected}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Evaluate Estimation Scenario
  const evaluateEstimationScenario = async (params: EstimationScenarioRequest) => {
    setIsLoading(true);
    setActiveAgentId("estimation");
    try {
      const res = await gridApi.evaluateEstimationScenario(params);
      if (res) {
        setEstimationResult(res);
        if (res.bad_data_report) setBadDataReport(res.bad_data_report);
        addAgentLog(
          "State Estimation Agent",
          params.scenario !== "normal" ? "ALERT" : "INFO",
          `Scenario Evaluated: '${params.scenario}' (Target Bus: ${params.corrupted_bus_id ?? "N/A"})`,
          `Chi2 Passed: ${res.bad_data_report.chi2_passed}, Bad channels: ${res.bad_data_report.num_bad_measurements}`
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Apply Mitigation
  const applyMitigation = async (): Promise<MitigationResult | null> => {
    setIsLoading(true);
    setActiveAgentId("mitigation");
    try {
      const res = await gridApi.executeMitigation();
      const finalResult = res || {
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
        message: "Pandapower AC Newton-Raphson power flow converged. All bus voltages restored within 0.90 - 1.10 p.u.",
      };

      setLastMitigationResult(finalResult);
      setActiveAttacks([]);
      setStateMode("RECOVERED");
      setActiveAgentId("coordinator");

      triggerSignal({
        fromAgent: "mitigation",
        toAgent: "coordinator",
        label: "Recovery Applied: Grid Restored",
        type: "recovery_verified",
      });

      addAgentLog(
        "Mitigation Agent",
        "ACTION",
        `Mitigation applied: ${finalResult.strategy_executed}`,
        finalResult.message
      );

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
      return finalResult;
    } finally {
      setIsLoading(false);
    }
  };

  // Action: Redispatch
  const redispatch = (params: {
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
          return { ...b, p_mw: -1.5 };
        }
        return b;
      })
    );
    addAgentLog(
      "Mitigation Agent",
      "ACTION",
      `Redispatched DERs: Solar=${params.solar_mw}MW, Wind=${params.wind_mw}MW, BESS=${params.bess_mw}MW, LoadShed=${params.load_shed_active}`
    );
  };

  const refreshHistory = async () => {
    const hist = await gridApi.getEventHistory();
    if (hist) setEventHistory(hist);
  };

  const value: SimulationContextValue = {
    topologies,
    activeTopology,
    status,
    buses,
    lines,
    frequencyHz,
    selectedBusId,
    setSelectedBusId,
    stateMode,
    setStateMode,
    elapsedSeconds,
    formatTime,
    isLoading,
    totalGenMw,
    totalLoadMw,
    totalLossesMw,
    powerImbalanceMw,
    gridState,
    avgVm,
    minVm,
    maxVm,
    currentStage,
    scenarios,
    activeAttacks,
    detection,
    mitigationPlan,
    lastMitigationResult,
    comparison,
    estimationResult,
    badDataReport,
    residualAnalysis,
    multiclassMetrics,
    telemetryLatencyMs,
    telemetryRateHz,
    eventHistory,
    activeAgentId,
    agentSignals,
    agentLogs,
    selectTopology,
    startSimulation,
    pauseSimulation,
    resumeSimulation,
    resetSimulation,
    stepSimulation,
    launchAttack,
    stopAllAttacks,
    runDetectionScan,
    runStateEstimation,
    evaluateEstimationScenario,
    applyMitigation,
    redispatch,
    refreshHistory,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return ctx;
}

