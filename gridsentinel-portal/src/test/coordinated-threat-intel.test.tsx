import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { gridApi } from "@/lib/gridApi";
import { CoordinatedThreatIntelligenceView } from "@/features/views/CoordinatedThreatIntelligenceView";
import { SimulationProvider } from "@/features/simulation/SimulationContext";

describe("Coordinated Threat Intelligence Engine (CTIE) Unit & Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(gridApi, "getCoordinatedModelStatus").mockResolvedValue({
      module_name: "Coordinated Threat Intelligence Engine (CTIE)",
      architecture: "Graph-Based Temporal Anomaly Correlation Model",
      version: "1.0.0",
      topology: "IEEE 14-bus Benchmark",
      num_graph_nodes: 14,
      num_graph_edges: 20,
      sliding_window_seconds: 15.0,
      spatial_affinity_scale_hops: 2.5,
      temporal_sync_half_life_seconds: 3.0,
      coordination_threshold: 0.55,
      supports_tgnn_extension: true,
      is_active: true,
    });

    vi.spyOn(gridApi, "getCoordinatedGraphTopology").mockResolvedValue({
      num_nodes: 14,
      num_edges: 20,
      nodes: Array.from({ length: 14 }, (_, i) => ({
        id: i,
        name: `Bus_${i}`,
        vn_kv: 13.8,
        bus_type: "b",
        degree: 2,
      })),
      edges: [
        { from_bus: 0, to_bus: 1, edge_id: "0_1", edge_type: "line", admittance: 5.2, r_ohm: 0.019, x_ohm: 0.059 },
        { from_bus: 1, to_bus: 3, edge_id: "1_3", edge_type: "line", admittance: 2.8, r_ohm: 0.058, x_ohm: 0.176 },
      ],
    });

    vi.spyOn(gridApi, "analyzeCoordinatedThreats").mockResolvedValue({
      correlation_id: "CTIE-TEST-CORR-01",
      timestamp: new Date().toISOString(),
      classification: "NORMAL_GRID",
      is_coordinated: false,
      affected_components: [],
      related_anomaly_ids: [],
      combined_evidence_score: 0.0,
      graph_topology_evidence: {
        subgraph_nodes: [],
        connected_components_count: 1,
        are_electrically_connected: false,
        mean_hop_distance: 0.0,
        min_hop_distance: 0,
        max_hop_distance: 0,
        mean_admittance_mhos: 0.0,
        graph_affinity_score: 0.0,
        shortest_paths: {},
      },
      temporal_evidence: {
        window_seconds: 15.0,
        time_span_seconds: 0.0,
        mean_inter_arrival_seconds: 0.0,
        time_variance_seconds2: 0.0,
        synchronization_score: 0.0,
        sequence_pattern: "NORMAL",
      },
      cross_component_evidence: {
        modalities_involved: [],
        cross_modal_synergy_score: 0.0,
        evasion_synergy_detected: false,
        uncertainty_penalty: 0.0,
      },
      explanation: "Nominal grid telemetry. All physical observations conform to AC power-flow conservation laws.",
      recommended_investigation: "Maintain routine SCADA/PMU monitoring.",
      statistical_validation_note: "Score represents uncalibrated composite heuristic evidence.",
    });

    vi.spyOn(gridApi, "getCoordinatedIncidents").mockResolvedValue([]);
  });

  it("exposes all 5 CTIE API methods on gridApi", () => {
    expect(typeof gridApi.analyzeCoordinatedThreats).toBe("function");
    expect(typeof gridApi.analyzeCoordinatedScenario).toBe("function");
    expect(typeof gridApi.getCoordinatedModelStatus).toBe("function");
    expect(typeof gridApi.getCoordinatedGraphTopology).toBe("function");
    expect(typeof gridApi.getCoordinatedIncidents).toBe("function");
  });

  it("renders CoordinatedThreatIntelligenceView with module header and topology elements", async () => {
    render(
      <SimulationProvider>
        <CoordinatedThreatIntelligenceView />
      </SimulationProvider>
    );

    // Module identity
    expect(screen.getByText(/COORDINATED THREAT INTELLIGENCE ENGINE/i)).toBeInTheDocument();
    expect(screen.getByText(/GRAPH-TEMPORAL v1.0/i)).toBeInTheDocument();

    // KPI cards
    expect(screen.getByText(/CTIE Classification/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence Score S_coord/i)).toBeInTheDocument();
    expect(screen.getByText(/Spatial Affinity S_graph/i)).toBeInTheDocument();
    expect(screen.getByText(/Temporal Sync S_temporal/i)).toBeInTheDocument();

    // 7 Mandatory Validation Suites
    expect(screen.getByText(/CTIE SCENARIO LABORATORY/i)).toBeInTheDocument();
    expect(screen.getByText(/1\. Normal Baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. Single Subtle Anomaly/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Multiple Unrelated Anomalies/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Coordinated Multi-Point Attack/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Related Anomalies Outside Window/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Missing & Delayed Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Topology Change/i)).toBeInTheDocument();

    // Transparency Note
    expect(screen.getByText(/Score represents uncalibrated composite heuristic evidence/i)).toBeInTheDocument();
  });

  it("handles scenario execution and updates model classification", async () => {
    vi.spyOn(gridApi, "analyzeCoordinatedScenario").mockResolvedValue({
      correlation_id: "CTIE-TEST-SCEN-4",
      timestamp: new Date().toISOString(),
      classification: "COORDINATED_MULTI_POINT_ATTACK",
      is_coordinated: true,
      affected_components: ["Bus_2", "Bus_4"],
      related_anomaly_ids: ["Bus_2", "Bus_4"],
      combined_evidence_score: 0.74,
      graph_topology_evidence: {
        subgraph_nodes: [1, 3],
        connected_components_count: 1,
        are_electrically_connected: true,
        mean_hop_distance: 1.0,
        min_hop_distance: 1,
        max_hop_distance: 1,
        mean_admittance_mhos: 4.8,
        graph_affinity_score: 1.0,
        shortest_paths: { "1-3": [1, 3] },
      },
      temporal_evidence: {
        window_seconds: 15.0,
        time_span_seconds: 0.40,
        mean_inter_arrival_seconds: 0.40,
        time_variance_seconds2: 0.08,
        synchronization_score: 0.88,
        sequence_pattern: "SYNCHRONOUS_BURST",
      },
      cross_component_evidence: {
        modalities_involved: ["voltage", "power", "replay"],
        cross_modal_synergy_score: 0.85,
        evasion_synergy_detected: true,
        uncertainty_penalty: 0.0,
      },
      explanation: "COORDINATED MULTI-POINT INTRUSION DETECTED: 2 suspicious components (Bus_2, Bus_4) exhibit strong spatial adjacency.",
      recommended_investigation: "URGENT: Isolate Substation Bus 2 and Bus 4 comm gateways.",
      statistical_validation_note: "Score represents uncalibrated composite heuristic evidence.",
    });

    render(
      <SimulationProvider>
        <CoordinatedThreatIntelligenceView />
      </SimulationProvider>
    );

    // Wait for initial load to settle
    const scen4Btn = screen.getByText(/4\. Coordinated Multi-Point Attack/i).closest("button")!;
    await waitFor(() => {
      expect(scen4Btn).not.toBeDisabled();
    });

    // Click Scenario 4 (Coordinated Multi-Point Attack)
    fireEvent.click(scen4Btn);

    await waitFor(() => {
      expect(screen.getByText(/COORDINATED MULTI POINT ATTACK/i)).toBeInTheDocument();
      expect(screen.getByText(/74.0%/i)).toBeInTheDocument();
    });
  });
});
