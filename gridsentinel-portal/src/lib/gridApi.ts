/**
 * GridSentinel AI - Digital Twin API & WebSocket Client.
 * Connects to the FastAPI backend at http://localhost:8000 with genuine
 * Pandapower electrical calculations and fallback demonstration simulation.
 */

export interface BusElectricalData {
  bus_id: number;
  name: string;
  vn_kv: number;
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
  voltage_violation: boolean;
  is_compromised?: boolean;
}

export interface LineElectricalData {
  line_id: number;
  name: string;
  from_bus: number;
  to_bus: number;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  pl_mw: number;
  loading_percent: number;
  thermal_overload: boolean;
}

export interface GridStateData {
  timestamp: string;
  topology_name: string;
  converged: boolean;
  algorithm: string;
  total_generation_mw: number;
  total_load_mw: number;
  total_losses_mw: number;
  active_power_imbalance_mw: number;
  min_voltage_pu: number;
  max_voltage_pu: number;
  max_line_loading_pct: number;
  voltage_violations_count: number;
  overloaded_lines_count: number;
  buses: BusElectricalData[];
  lines: LineElectricalData[];
}

export interface TopologySummary {
  id: string;
  name: string;
  voltage_level: string;
  num_buses: number;
  der_assets: string[];
  critical_loads: string[];
  description: string;
}

export interface AttackScenario {
  id: string;
  name: string;
  attack_type: string;
  target_bus_id: number;
  target_name: string;
  default_intensity: number;
  default_duration_seconds: number;
  description: string;
  physical_impact: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
}

export interface ActiveAttack {
  attack_id: string;
  attack_type: string;
  target_component: string;
  target_bus_id?: number;
  target_line_id?: number;
  intensity: number;
  magnitude?: number;
  remaining_seconds: number;
  is_confined_locally: boolean;
  baseline_values?: Record<string, number>;
  injected_values?: Record<string, number>;
}

export interface MitigationPlan {
  plan_id: string;
  attack_type: string;
  target_component: string;
  severity: string;
  strategy_name: string;
  engineering_rationale: string;
  action_steps: string[];
  can_auto_apply: boolean;
}

export interface MitigationResult {
  mitigation_id: string;
  applied_at: string;
  strategy_executed: string;
  actions_taken: string[];
  attack_neutralized: boolean;
  recalculation_converged: boolean;
  recovery_effective: boolean;
  message: string;
}

export interface StateComparisonReport {
  baseline_normal: {
    timestamp: string;
    total_generation_mw: number;
    total_load_mw: number;
    frequency_hz: number;
    min_voltage_pu: number;
    max_voltage_pu: number;
    voltage_violations_count: number;
    overloaded_lines_count: number;
  };
  attacked_compromised: {
    timestamp: string;
    total_generation_mw: number;
    total_load_mw: number;
    frequency_hz: number;
    min_voltage_pu: number;
    max_voltage_pu: number;
    voltage_violations_count: number;
    overloaded_lines_count: number;
    active_attacks_count: number;
  };
  recovered_mitigated?: {
    timestamp: string;
    total_generation_mw: number;
    total_load_mw: number;
    frequency_hz: number;
    min_voltage_pu: number;
    max_voltage_pu: number;
    voltage_violations_count: number;
    overloaded_lines_count: number;
  };
  delta_attack_impact: {
    voltage_drop_pu: number;
    voltage_violations_increase: number;
    overloaded_lines_increase: number;
    frequency_deviation_hz: number;
  };
  delta_recovery_improvement?: {
    voltage_restored_pu: number;
    voltage_violations_eliminated: number;
    overloaded_lines_cleared: number;
    frequency_restored_hz: number;
  };
  recovery_effective: boolean;
}

export interface SimulationStatus {
  status: "RUNNING" | "PAUSED" | "STOPPED";
  step_count: number;
  speed_hz: number;
  active_topology: string;
  converged: boolean;
  num_buses: number;
  num_lines: number;
  active_attacks_count: number;
}

export interface EventLogItem {
  id: string;
  type: "DETECTION_INCIDENT" | "ATTACK_INJECTION" | "MITIGATION_APPLIED" | "SIMULATION_STEP" | "INITIALIZE" | "ESTIMATION_EVALUATED" | "RECOVERY";
  timestamp: string;
  title: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";
  target: string;
  details: string;
  status: string;
}

export interface MeasurementChannel {
  channel_id: number;
  name: string;
  meas_type: string;
  element_type: string;
  element_id: number;
  side?: string | null;
  measured_value: number;
  estimated_value?: number | null;
  std_dev: number;
  raw_residual?: number | null;
  normalized_residual?: number | null;
  is_bad_data: boolean;
  is_missing: boolean;
  is_simulated: boolean;
  sensor_source: string;
}

export interface BusStateEstimate {
  bus_id: number;
  name: string;
  estimated_vm_pu: number;
  ground_truth_vm_pu: number;
  vm_error_pu: number;
  estimated_va_degree: number;
  ground_truth_va_degree: number;
  va_error_degree: number;
}

export interface BranchFlowEstimate {
  branch_id: number;
  name: string;
  branch_type: string;
  from_bus: number;
  to_bus: number;
  estimated_p_from_mw: number;
  ground_truth_p_from_mw: number;
  p_error_mw: number;
  estimated_q_from_mvar: number;
  ground_truth_q_from_mvar: number;
  q_error_mvar: number;
}

export interface BadDataReport {
  chi2_passed: boolean;
  bad_data_detected: boolean;
  chi2_threshold_exceeded: boolean;
  num_bad_measurements: number;
  suspicious_channels: MeasurementChannel[];
  identified_buses: number[];
  evidence_summary: string[];
  recovered_with_filtering: boolean;
}

export interface StateEstimationResult {
  timestamp: string;
  topology_name: string;
  converged: boolean;
  algorithm: string;
  num_iterations: number;
  execution_time_ms: number;
  num_measurements: number;
  num_missing_measurements: number;
  max_vm_error_pu: number;
  rmse_vm_pu: number;
  max_va_error_degree: number;
  rmse_va_degree: number;
  bad_data_report: BadDataReport;
  bus_estimates: BusStateEstimate[];
  branch_estimates: BranchFlowEstimate[];
  data_source_disclaimer: string;
}

export interface EstimationScenarioRequest {
  scenario: "normal" | "corrupted" | "missing";
  corrupted_bus_id?: number;
  corruption_type?: "voltage" | "power" | "both";
  corruption_magnitude?: number;
  missing_channel_ratio?: number;
}

export interface NodalResidual {
  bus_id: number;
  p_inj_mw: number;
  p_leaving_mw: number;
  residual_mw: number;
  is_violation: boolean;
}

export interface ResidualAnalysisResult {
  timestamp: string;
  max_residual_mw: number;
  worst_bus_id?: number | null;
  system_imbalance_mw: number;
  residual_threshold_mw: number;
  residual_violation: boolean;
  nodal_residuals: NodalResidual[];
}

export interface MulticlassMetrics {
  model_type: string;
  dataset_source: string;
  dataset_note?: string;
  trained_at: string;
  embargo_rows: number;
  num_training_samples: number;
  num_validation_samples?: number;
  num_test_samples: number;
  num_features: number;
  num_classes: number;
  accuracy: number;
  balanced_accuracy: number;
  macro_precision: number;
  macro_recall: number;
  macro_f1: number;
  weighted_f1: number;
  binary_accuracy: number;
  binary_precision: number;
  binary_recall: number;
  binary_f1: number;
  features_used: string[];
  per_class_metrics?: Record<string, any>;
  label_taxonomy?: Record<string, string>;
}

export interface ComponentAnomalyObservation {
  component_id: string;
  bus_id?: number | null;
  timestamp?: string;
  anomaly_types?: string[];
  severity_score?: number;
  metrics?: Record<string, number>;
  is_telemetry_delayed?: boolean;
  is_telemetry_missing?: boolean;
}

export interface GraphTopologyEvidence {
  subgraph_nodes: number[];
  connected_components_count: number;
  are_electrically_connected: boolean;
  mean_hop_distance: number;
  min_hop_distance: number;
  max_hop_distance: number;
  mean_admittance_mhos: number;
  graph_affinity_score: number;
  shortest_paths: Record<string, number[]>;
}

export interface TemporalEvidence {
  window_seconds: number;
  time_span_seconds: number;
  mean_inter_arrival_seconds: number;
  time_variance_seconds2: number;
  synchronization_score: number;
  sequence_pattern: string;
}

export interface CrossComponentEvidence {
  modalities_involved: string[];
  cross_modal_synergy_score: number;
  evasion_synergy_detected: boolean;
  uncertainty_penalty: number;
}

export interface CoordinatedIncidentReport {
  correlation_id: string;
  timestamp: string;
  classification:
    | "COORDINATED_MULTI_POINT_ATTACK"
    | "CONCURRENT_INDEPENDENT_ANOMALIES"
    | "ISOLATED_ANOMALY"
    | "NORMAL_GRID";
  is_coordinated: boolean;
  affected_components: string[];
  related_anomaly_ids: string[];
  combined_evidence_score: number;
  graph_topology_evidence: GraphTopologyEvidence;
  temporal_evidence: TemporalEvidence;
  cross_component_evidence: CrossComponentEvidence;
  explanation: string;
  recommended_investigation: string;
  statistical_validation_note: string;
}

export interface ModelStatusResponse {
  module_name: string;
  architecture: string;
  version: string;
  topology: string;
  num_graph_nodes: number;
  num_graph_edges: number;
  sliding_window_seconds: number;
  spatial_affinity_scale_hops: number;
  temporal_sync_half_life_seconds: number;
  coordination_threshold: number;
  supports_tgnn_extension: boolean;
  is_active: boolean;
}

export interface GraphTopologyNode {
  id: number;
  name: string;
  vn_kv: number;
  bus_type: string;
  degree: number;
}

export interface GraphTopologyEdge {
  from_bus: number;
  to_bus: number;
  edge_id: string;
  edge_type: string;
  admittance: number;
  r_ohm: number;
  x_ohm: number;
}

export interface GraphTopologyData {
  num_nodes: number;
  num_edges: number;
  nodes: GraphTopologyNode[];
  edges: GraphTopologyEdge[];
}

export interface CustomAnalysisRequest {
  observations: ComponentAnomalyObservation[];
  topology_name?: string;
  window_seconds?: number;
}

export interface CoordinatedIncidentRecord {
  correlation_id: string;
  timestamp: string;
  classification: string;
  affected_components: string[];
  severity: string;
  combined_evidence_score: number;
  confidence: number;
  resolved: boolean;
  details: Record<string, any>;
}

const API_BASE = "http://localhost:8000/api/v1";

/**
 * Fetch helper with timeout and fallback support
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const gridApi = {
  async getTopologies(): Promise<TopologySummary[]> {
    const res = await apiFetch<TopologySummary[]>("/grid/topologies");
    if (res) return res;
    return [
      {
        id: "ieee14_grid",
        name: "IEEE 14-Bus Test System",
        voltage_level: "69 kV / 13.8 kV",
        num_buses: 14,
        der_assets: ["Multi-Generator Dispatch (Thermal, Hydro, DERs)"],
        critical_loads: ["Transmission & Subtransmission Substations"],
        description: "IEEE 14-bus electrical benchmark for power system stability, state estimation, and CPS intrusion detection.",
      },
      {
        id: "resilient_microgrid",
        name: "8-Bus Resilient Smart Microgrid",
        voltage_level: "20 kV / 0.4 kV",
        num_buses: 8,
        der_assets: ["1.5 MW Solar PV", "1.8 MW Wind Turbine", "0.8 MW BESS"],
        critical_loads: ["Hospital Critical Care", "Industrial Manufacturing"],
        description: "Standard benchmark cyber-physical microgrid with mixed DERs and critical loads.",
      },
      {
        id: "cigre_microgrid",
        name: "CIGRE Medium Voltage Microgrid",
        voltage_level: "20 kV",
        num_buses: 14,
        der_assets: ["Solar PV", "Wind Park", "Fuel Cells", "Storage"],
        critical_loads: ["Mixed Industrial & Urban Feeders"],
        description: "CIGRE benchmark MV distribution network with multi-inverter DER penetration.",
      },
    ];
  },

  async initializeGrid(topologyName: string) {
    return await apiFetch<{ status: string; message: string }>("/grid/initialize", {
      method: "POST",
      body: JSON.stringify({ topology_name: topologyName }),
    });
  },

  async getSimulationStatus(): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/status");
  },

  async startSimulation(): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/start", { method: "POST" });
  },

  async pauseSimulation(): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/pause", { method: "POST" });
  },

  async resumeSimulation(): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/resume", { method: "POST" });
  },

  async resetSimulation(): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/reset", { method: "POST" });
  },

  async setSpeed(speedHz: number): Promise<SimulationStatus | null> {
    return await apiFetch<SimulationStatus>("/grid/simulation/speed", {
      method: "POST",
      body: JSON.stringify({ speed_hz: speedHz }),
    });
  },

  async stepSimulation(): Promise<GridStateData | null> {
    return await apiFetch<GridStateData>("/grid/step", {
      method: "POST",
      body: JSON.stringify({ load_variation: 0.02, der_variation: 0.03 }),
    });
  },

  async getGridState(): Promise<GridStateData | null> {
    return await apiFetch<GridStateData>("/grid/state");
  },

  async getScenarios(): Promise<AttackScenario[]> {
    const res = await apiFetch<AttackScenario[]>("/attacks/scenarios");
    if (res) return res;
    return [
      {
        id: "fdia_voltage_der",
        name: "FDIA Voltage Tampering (Renewable Bus)",
        attack_type: "fdia_voltage",
        target_bus_id: 2,
        target_name: "Bus 2 - Renewable DER",
        default_intensity: 1.15,
        default_duration_seconds: 120,
        description: "Biases voltage sensor telemetry by +15% on Bus 2 to mask local physical voltage drop.",
        physical_impact: "State Estimation residual J(x) divergence; deceived Volt-VAR inverter controllers.",
        severity: "CRITICAL",
      },
      {
        id: "fdia_power_industrial",
        name: "FDIA Active Power Spoofing (Industrial Hub)",
        attack_type: "fdia_power",
        target_bus_id: 5,
        target_name: "Bus 5 - Industrial Park",
        default_intensity: 2.2,
        default_duration_seconds: 90,
        description: "Injects false active/reactive power measurements at Bus 5 to trigger false load shedding.",
        physical_impact: "Kirchhoff Current Law (KCL) conservation residual violation on adjacent feeder lines.",
        severity: "HIGH",
      },
      {
        id: "dos_freeze_switchgear",
        name: "Telemetry DoS Freeze (Main Incomer)",
        attack_type: "dos_freeze",
        target_bus_id: 1,
        target_name: "Bus 1 - Main Incomer Switchgear",
        default_intensity: 1.0,
        default_duration_seconds: 60,
        description: "Simulates RTU communication freeze; transmits static measurements while physical state varies.",
        physical_impact: "Loss of dynamic situational awareness; delayed breaker response to downstream faults.",
        severity: "HIGH",
      },
      {
        id: "replay_commercial",
        name: "Sensor Replay Attack (Commercial District)",
        attack_type: "replay_attack",
        target_bus_id: 6,
        target_name: "Bus 6 - Commercial District",
        default_intensity: 1.0,
        default_duration_seconds: 75,
        description: "Replays 30-second stale nominal measurement buffer to mask progressive physical degradation.",
        physical_impact: "Zero-variance pattern over moving window despite renewable generation changes.",
        severity: "MEDIUM",
      },
      {
        id: "load_tampering_surge",
        name: "Coordinated Demand Tampering (Heavy Industrial)",
        attack_type: "load_tampering",
        target_bus_id: 5,
        target_name: "Bus 5 - Industrial Park",
        default_intensity: 1.6,
        default_duration_seconds: 90,
        description: "Physically tampers with industrial demand, spiking active load +60% in Pandapower calculation.",
        physical_impact: "Feeder line thermal overload (>100%), bus voltage drop (<0.95 p.u.), frequency dip.",
        severity: "CRITICAL",
      },
      {
        id: "der_disconnect_solar",
        name: "Unauthorized DER Trip (Solar PV Array)",
        attack_type: "der_disconnect",
        target_bus_id: 2,
        target_name: "Bus 2 - Solar PV Array",
        default_intensity: 1.0,
        default_duration_seconds: 120,
        description: "Sends unauthorized breaker open command disconnecting 1.5 MW Solar PV generation.",
        physical_impact: "Instantaneous power deficit; increased import from substation slack bus; frequency dip.",
        severity: "CRITICAL",
      },
    ];
  },

  async launchAttack(params: {
    attack_type: string;
    target_bus_id: number;
    intensity: number;
    duration_seconds: number;
  }): Promise<ActiveAttack | null> {
    return await apiFetch<ActiveAttack>("/attacks/launch", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  async stopAllAttacks() {
    return await apiFetch<{ status: string; terminated_count: number }>("/attacks/stop-all", {
      method: "POST",
    });
  },

  async detectThreats() {
    return await apiFetch<{
      detection: {
        is_anomaly: boolean;
        anomaly_score: number;
        predicted_attack_type: string;
        attack_classification?: string;
        confidence: number;
        affected_component?: string;
        worst_residual_bus_id?: number;
        feature_contributions?: Record<string, number>;
    };
      incident?: {
        incident_id: string;
        timestamp: string;
        attack_type: string;
        severity: string;
        target_component: string;
        anomaly_score: number;
        confidence: number;
        voltage_violation: boolean;
        thermal_overload: boolean;
        power_imbalance_violation: boolean;
        details?: any;
    };
    }>("/security/detect", {
      method: "POST",
    });
  },

  /**
   * Retrieves real-time Kirchhoff active power nodal residual calculations for every bus.
   */
  async getResidualAnalysis(): Promise<ResidualAnalysisResult | null> {
    return await apiFetch<ResidualAnalysisResult>("/security/residual-analysis");
  },

  /**
   * Retrieves authentic, evaluated Scikit-learn Multiclass (31-Class) metrics
   * trained on the Mendeley IEEE 14-bus dataset with 5-row embargo gap.
   */
  async getMulticlassMetrics(): Promise<MulticlassMetrics | null> {
    return await apiFetch<MulticlassMetrics>("/security/multiclass-metrics");
  },

  async getRecommendedMitigation(params?: {
    attack_type?: string;
    target_component?: string;
  }): Promise<MitigationPlan | null> {
    const q = new URLSearchParams();
    if (params?.attack_type) q.append("attack_type", params.attack_type);
    if (params?.target_component) q.append("target_component", params.target_component);
    const query = q.toString() ? `?${q.toString()}` : "";
    return await apiFetch<MitigationPlan>(`/security/recommend-mitigation${query}`);
  },

  async executeMitigation(): Promise<MitigationResult | null> {
    return await apiFetch<MitigationResult>("/security/mitigate", {
      method: "POST",
    });
  },

  async getStateComparison(): Promise<StateComparisonReport | null> {
    return await apiFetch<StateComparisonReport>("/security/state-comparison");
  },

  async getEventHistory(): Promise<EventLogItem[]> {
    const res = await apiFetch<EventLogItem[]>("/security/event-history?limit=500");
    if (res) return res;
    return [];
  },

  /**
   * Retrieves the latest WLS state estimation result.
   */
  async getStateEstimationLatest(): Promise<StateEstimationResult | null> {
    return await apiFetch<StateEstimationResult>("/estimation/latest");
  },

  /**
   * Runs WLS state estimation on current telemetry.
   */
  async runStateEstimation(): Promise<StateEstimationResult | null> {
    return await apiFetch<StateEstimationResult>("/estimation/estimate", {
      method: "POST",
    });
  },

  /**
   * Retrieves the bad data identification report including Chi-square and normalized residuals.
   */
  async getBadDataReport(): Promise<BadDataReport | null> {
    return await apiFetch<BadDataReport>("/estimation/bad-data");
  },

  /**
   * Evaluates state estimation under controlled scenarios (normal, corrupted, missing).
   */
  async evaluateEstimationScenario(
    params: EstimationScenarioRequest
  ): Promise<StateEstimationResult | null> {
    return await apiFetch<StateEstimationResult>("/estimation/scenarios/evaluate", {
      method: "POST",
      body: JSON.stringify(params),
    });
  },

  /**
   * Subscribes to live PMU/SCADA telemetry and Pandapower power-flow calculations
   * streamed through WebSockets at 1 Hz intervals.
   */
  subscribeTelemetryStream(
    onMessage: (payload: { telemetry: any; grid_state: GridStateData }) => void,
    onError?: (err: Event) => void
  ): () => void {
    if (typeof window === "undefined" || !("WebSocket" in window)) {
      return () => {};
    }
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:8000/ws/telemetry");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.grid_state || data.telemetry)) {
            onMessage(data);
          }
        } catch {
          // ignore parse errors
        }
      };
      ws.onerror = (e) => {
        onError?.(e);
      };
    } catch (err) {
      onError?.(err as any);
    }

    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  },

  /**
   * Subscribes to real-time cybersecurity incident alert notifications via WebSockets.
   */
  subscribeAlertStream(
    onAlert: (alert: any) => void
  ): () => void {
    if (typeof window === "undefined" || !("WebSocket" in window)) {
      return () => {};
    }
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:8000/ws/alerts");
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onAlert(data);
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }

    return () => {
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
    };
  },

  /**
   * Evaluates live digital twin telemetry using the Graph-Based Temporal Anomaly Correlation Model.
   */
  async analyzeCoordinatedThreats(
    windowSeconds = 15.0
  ): Promise<CoordinatedIncidentReport | null> {
    return await apiFetch<CoordinatedIncidentReport>(
      `/coordinated-intelligence/analyze?window_seconds=${windowSeconds}`,
      { method: "POST" }
    );
  },

  /**
   * Evaluates controlled scenarios (e.g. 7 CTIE test scenarios) against the correlation model.
   */
  async analyzeCoordinatedScenario(
    req: CustomAnalysisRequest
  ): Promise<CoordinatedIncidentReport | null> {
    return await apiFetch<CoordinatedIncidentReport>(
      "/coordinated-intelligence/analyze-scenario",
      {
        method: "POST",
        body: JSON.stringify(req),
      }
    );
  },

  /**
   * Retrieves CTIE model architecture parameters, graph edge counts, and operational status.
   */
  async getCoordinatedModelStatus(): Promise<ModelStatusResponse | null> {
    return await apiFetch<ModelStatusResponse>("/coordinated-intelligence/model-status");
  },

  /**
   * Retrieves active electrical graph topology (nodes, edges, admittances) for visualization.
   */
  async getCoordinatedGraphTopology(): Promise<GraphTopologyData | null> {
    return await apiFetch<GraphTopologyData>("/coordinated-intelligence/graph-topology");
  },

  /**
   * Retrieves historical coordinated threat incident records persisted in SQLite.
   */
  async getCoordinatedIncidents(
    limit = 50
  ): Promise<CoordinatedIncidentRecord[] | null> {
    return await apiFetch<CoordinatedIncidentRecord[]>(
      `/coordinated-intelligence/incidents?limit=${limit}`
    );
  },
};
