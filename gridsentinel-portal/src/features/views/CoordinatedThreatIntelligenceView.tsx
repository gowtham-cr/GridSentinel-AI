import React, { useEffect, useState, useCallback } from "react";
import {
  Network,
  Share2,
  Activity,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  RefreshCw,
  GitCommit,
  Info,
  Zap,
  Sliders,
  Play,
  Check,
  ChevronRight,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  gridApi,
  type CoordinatedIncidentReport,
  type ModelStatusResponse,
  type GraphTopologyData,
  type CoordinatedIncidentRecord,
  type CustomAnalysisRequest,
} from "@/lib/gridApi";
import { useSimulation } from "../simulation/SimulationContext";

// IEEE 14-bus benchmark standard 2D layout coordinates for SVG visualization (0-indexed)
const IEEE14_BUS_COORDS: Record<number, { x: number; y: number; label: string; type: string }> = {
  0: { x: 80, y: 320, label: "Bus 1 (Slack)", type: "slack" },
  1: { x: 190, y: 360, label: "Bus 2 (Gen)", type: "gen" },
  2: { x: 130, y: 200, label: "Bus 3 (Gen)", type: "gen" },
  3: { x: 260, y: 250, label: "Bus 4", type: "load" },
  4: { x: 210, y: 150, label: "Bus 5", type: "load" },
  5: { x: 380, y: 130, label: "Bus 6 (Gen)", type: "gen" },
  6: { x: 440, y: 240, label: "Bus 7", type: "load" },
  7: { x: 500, y: 330, label: "Bus 8 (Gen)", type: "gen" },
  8: { x: 480, y: 160, label: "Bus 9", type: "load" },
  9: { x: 570, y: 180, label: "Bus 10", type: "load" },
  10: { x: 480, y: 90, label: "Bus 11", type: "load" },
  11: { x: 610, y: 80, label: "Bus 12", type: "load" },
  12: { x: 560, y: 40, label: "Bus 13", type: "load" },
  13: { x: 650, y: 140, label: "Bus 14", type: "load" },
};

export function CoordinatedThreatIntelligenceView() {
  const { isRunning, buses } = useSimulation();

  // State
  const [report, setReport] = useState<CoordinatedIncidentReport | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusResponse | null>(null);
  const [graphTopology, setGraphTopology] = useState<GraphTopologyData | null>(null);
  const [incidents, setIncidents] = useState<CoordinatedIncidentRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedBusId, setSelectedBusId] = useState<number | null>(null);
  const [selectedScenarioIndex, setSelectedScenarioIndex] = useState<number>(0);
  const [windowSeconds, setWindowSeconds] = useState<number>(15.0);
  const [activeTab, setActiveTab] = useState<"topology" | "timeline" | "audit">("topology");

  // Load Model Status and Graph Topology on Mount
  const fetchMetadata = useCallback(async () => {
    try {
      const [statusRes, topoRes, incRes] = await Promise.all([
        gridApi.getCoordinatedModelStatus(),
        gridApi.getCoordinatedGraphTopology(),
        gridApi.getCoordinatedIncidents(15),
      ]);
      if (statusRes) setModelStatus(statusRes);
      if (topoRes) setGraphTopology(topoRes);
      if (incRes) setIncidents(incRes);
    } catch {
      // ignore
    }
  }, []);

  // Evaluate Live State
  const evaluateLive = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await gridApi.analyzeCoordinatedThreats(windowSeconds);
      if (res) {
        setReport(res);
        // Refresh incidents if coordinated
        if (res.is_coordinated) {
          const freshIncidents = await gridApi.getCoordinatedIncidents(15);
          if (freshIncidents) setIncidents(freshIncidents);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsLoading(false);
    }
  }, [windowSeconds]);

  // Initial fetch
  useEffect(() => {
    fetchMetadata();
    evaluateLive();
  }, [fetchMetadata, evaluateLive]);

  // Mandatory 7 Verification Scenarios
  const scenarios = [
    {
      id: "normal_baseline",
      name: "1. Normal Baseline (Negative Control)",
      description: "Nominal grid telemetry with zero anomalies. Model must confirm normal operation with 0.0 evidence score.",
      buildPayload: (): CustomAnalysisRequest => ({
        observations: [],
        window_seconds: windowSeconds,
      }),
    },
    {
      id: "isolated_subtle",
      name: "2. Single Subtle Anomaly (Isolated Bus 2)",
      description: "Subtle voltage deviation at Bus 2 only. Model must classify as ISOLATED_ANOMALY with no coordination false alarm.",
      buildPayload: (): CustomAnalysisRequest => {
        const now = new Date().toISOString();
        return {
          observations: [
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: now,
              anomaly_types: ["voltage_deviation"],
              severity_score: 0.35,
              metrics: { delta_vm_pu: 0.045 },
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
    {
      id: "multiple_unrelated",
      name: "3. Multiple Unrelated Anomalies (Bus 2 & Bus 13)",
      description: "Concurrent anomalies on topologically distant buses (5 hops apart). Model must classify as CONCURRENT_INDEPENDENT.",
      buildPayload: (): CustomAnalysisRequest => {
        const now = new Date().toISOString();
        return {
          observations: [
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: now,
              anomaly_types: ["voltage_deviation"],
              severity_score: 0.40,
              metrics: { delta_vm_pu: 0.05 },
            },
            {
              component_id: "Bus_13",
              bus_id: 12,
              timestamp: now,
              anomaly_types: ["power_fluctuation"],
              severity_score: 0.45,
              metrics: { delta_p_mw: 8.5 },
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
    {
      id: "coordinated_multipoint",
      name: "4. Coordinated Multi-Point Attack (Bus 2 & Bus 4)",
      description: "Synchronized cross-modal attack on adjacent buses within 0.4s. Model must detect COORDINATED_MULTI_POINT_ATTACK.",
      buildPayload: (): CustomAnalysisRequest => {
        const t0 = Date.now();
        return {
          observations: [
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: new Date(t0).toISOString(),
              anomaly_types: ["voltage_deviation", "replay_signature"],
              severity_score: 0.85,
              metrics: { delta_vm_pu: 0.09, replay_entropy: 0.12 },
            },
            {
              component_id: "Bus_4",
              bus_id: 3,
              timestamp: new Date(t0 + 400).toISOString(),
              anomaly_types: ["active_power_imbalance", "evasion_signature"],
              severity_score: 0.82,
              metrics: { delta_p_mw: 14.2, p_leaving_mw: -12.0 },
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
    {
      id: "out_of_window",
      name: "5. Related Anomalies Outside Window (Δt = 28s)",
      description: "Anomalies on adjacent buses occurring 28 seconds apart (>15s window). Temporal score must drop to 0.0.",
      buildPayload: (): CustomAnalysisRequest => {
        const t0 = Date.now();
        return {
          observations: [
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: new Date(t0).toISOString(),
              anomaly_types: ["voltage_deviation"],
              severity_score: 0.70,
              metrics: { delta_vm_pu: 0.07 },
            },
            {
              component_id: "Bus_4",
              bus_id: 3,
              timestamp: new Date(t0 + 28000).toISOString(),
              anomaly_types: ["active_power_imbalance"],
              severity_score: 0.65,
              metrics: { delta_p_mw: 11.0 },
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
    {
      id: "missing_and_delayed",
      name: "6. Missing & Delayed Telemetry (Uncertainty Penalty)",
      description: "Sensor packet drop + 800ms communication lag. Model must apply uncertainty penalty U to prevent false positives.",
      buildPayload: (): CustomAnalysisRequest => {
        const t0 = Date.now();
        return {
          observations: [
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: new Date(t0).toISOString(),
              anomaly_types: ["voltage_deviation"],
              severity_score: 0.60,
              metrics: { delta_vm_pu: 0.05 },
              is_telemetry_delayed: true,
            },
            {
              component_id: "Bus_4",
              bus_id: 3,
              timestamp: new Date(t0 + 500).toISOString(),
              anomaly_types: ["active_power_imbalance"],
              severity_score: 0.55,
              metrics: { delta_p_mw: 8.0 },
              is_telemetry_missing: true,
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
    {
      id: "topology_change_outage",
      name: "7. Topology Change (Line 1-2 Outage Partition)",
      description: "Line 1-2 removed from service, recomputing topological shortest paths and graph connectivity in real time.",
      buildPayload: (): CustomAnalysisRequest => {
        const t0 = Date.now();
        return {
          observations: [
            {
              component_id: "Bus_1",
              bus_id: 0,
              timestamp: new Date(t0).toISOString(),
              anomaly_types: ["line_outage_transient"],
              severity_score: 0.60,
              metrics: { delta_vm_pu: 0.03 },
            },
            {
              component_id: "Bus_2",
              bus_id: 1,
              timestamp: new Date(t0 + 300).toISOString(),
              anomaly_types: ["voltage_deviation"],
              severity_score: 0.70,
              metrics: { delta_vm_pu: 0.08 },
            },
          ],
          window_seconds: windowSeconds,
        };
      },
    },
  ];

  // Run Scenario
  const runScenario = async (index: number) => {
    setSelectedScenarioIndex(index);
    setIsLoading(true);
    try {
      const payload = scenarios[index].buildPayload();
      const res = await gridApi.analyzeCoordinatedScenario(payload);
      if (res) {
        setReport(res);
        if (res.is_coordinated) {
          const fresh = await gridApi.getCoordinatedIncidents(15);
          if (fresh) setIncidents(fresh);
        }
      }
    } catch {
      // error
    } finally {
      setIsLoading(false);
    }
  };

  const isCoordinated = report?.is_coordinated ?? false;
  const classification = report?.classification ?? "NORMAL_GRID";
  const coordScore = report?.combined_evidence_score ?? 0.0;
  const graphEvidence = report?.graph_topology_evidence;
  const temporalEvidence = report?.temporal_evidence;
  const crossEvidence = report?.cross_component_evidence;
  const affectedList = report?.affected_components ?? [];

  // Convert affected bus IDs to integers for node highlighting
  const affectedBusIds = new Set<number>();
  if (graphEvidence?.subgraph_nodes) {
    graphEvidence.subgraph_nodes.forEach((id) => affectedBusIds.add(id));
  }
  affectedList.forEach((c) => {
    const match = c.match(/Bus_?(\d+)/i);
    if (match) affectedBusIds.add(parseInt(match[1], 10) - 1);
  });

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: Module Identity & Operational State */}
      <div className="rounded-xl border border-indigo-500/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "grid size-9 place-items-center rounded-lg border shadow-sm transition-all",
              isCoordinated
                ? "border-destructive/60 bg-destructive/15 text-destructive shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                : "border-indigo-500/50 bg-indigo-500/10 text-indigo-400"
            )}
          >
            {isCoordinated ? (
              <ShieldAlert className="size-5 animate-pulse text-destructive" />
            ) : (
              <Network className="size-5 text-indigo-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
                COORDINATED THREAT INTELLIGENCE ENGINE (CTIE)
              </h2>
              <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 border border-indigo-500/30">
                GRAPH-TEMPORAL v1.0
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              IEEE 14-BUS TOPOLOGY GRAPH · SLIDING WINDOW TEMPORAL CORRELATION · CROSS-MODAL EVASION DETECTION
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/60 bg-void/60 px-2.5 py-1 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            <span>Nodes: {modelStatus?.num_graph_nodes ?? 14}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>Edges: {modelStatus?.num_graph_edges ?? 20}</span>
            <span className="text-muted-foreground/40">|</span>
            <span>Window: {windowSeconds}s</span>
          </div>

          <button
            type="button"
            onClick={evaluateLive}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/50 bg-indigo-500/15 px-3 py-1.5 text-[11px] font-bold text-indigo-300 hover:bg-indigo-500/25 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", isLoading && "animate-spin")} />
            <span>Scan Telemetry</span>
          </button>
        </div>
      </div>

      {/* KPI Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Classification Card */}
        <div
          className={cn(
            "rounded-xl border p-3.5 bg-card/80 backdrop-blur-sm transition-all",
            isCoordinated
              ? "border-destructive/60 bg-destructive/10 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              : classification === "CONCURRENT_INDEPENDENT_ANOMALIES"
              ? "border-amber-500/50 bg-amber-500/5"
              : classification === "ISOLATED_ANOMALY"
              ? "border-cyan-500/50 bg-cyan-500/5"
              : "border-border/80"
          )}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">CTIE Classification</span>
            <Activity className="size-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span
              className={cn(
                "text-xs font-black tracking-wider uppercase",
                isCoordinated
                  ? "text-destructive animate-pulse"
                  : classification === "CONCURRENT_INDEPENDENT_ANOMALIES"
                  ? "text-amber-400"
                  : classification === "ISOLATED_ANOMALY"
                  ? "text-cyan-400"
                  : "text-emerald-400"
              )}
            >
              {classification.replace(/_/g, " ")}
            </span>
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {isCoordinated
              ? `Multi-point attack detected on: ${affectedList.join(", ") || "None"}`
              : "No coordinated multi-point intrusion pattern"}
          </p>
        </div>

        {/* Combined Evidence Score */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Evidence Score S_coord</span>
            <span
              className={cn(
                "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                coordScore >= 0.55
                  ? "border-destructive/50 bg-destructive/15 text-destructive"
                  : "border-border bg-void text-muted-foreground"
              )}
            >
              {coordScore >= 0.55 ? "THRESHOLD BREACHED" : "SUB-THRESHOLD"}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-foreground">
              {(coordScore * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">/ 100% (θ = 55%)</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full bg-void rounded-full overflow-hidden border border-border/50">
            <div
              className={cn(
                "h-full transition-all duration-500",
                coordScore >= 0.55 ? "bg-destructive" : coordScore > 0.25 ? "bg-amber-400" : "bg-primary"
              )}
              style={{ width: `${Math.min(100, Math.max(0, coordScore * 100))}%` }}
            />
          </div>
        </div>

        {/* Spatial Graph Affinity */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Spatial Affinity S_graph</span>
            <Share2 className="size-3.5 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-indigo-300">
              {((graphEvidence?.graph_affinity_score ?? 0.0) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              {graphEvidence?.mean_hop_distance !== undefined
                ? `d̄ = ${graphEvidence.mean_hop_distance} hops`
                : "d̄ = 0.0"}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Electrically connected:</span>
            <span className={cn("font-bold", graphEvidence?.are_electrically_connected ? "text-emerald-400" : "text-amber-400")}>
              {graphEvidence?.are_electrically_connected ? "YES (Single Subgraph)" : "NO / PARTITIONED"}
            </span>
          </div>
        </div>

        {/* Temporal Synchronization */}
        <div className="rounded-xl border border-border/80 bg-card/80 p-3.5 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Temporal Sync S_temporal</span>
            <Clock className="size-3.5 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-cyan-300">
              {((temporalEvidence?.synchronization_score ?? 0.0) * 100).toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground">
              Δt = {temporalEvidence?.time_span_seconds?.toFixed(2) ?? "0.00"}s
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Pattern:</span>
            <span className="font-bold text-foreground">
              {temporalEvidence?.sequence_pattern ?? "NORMAL"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Analysis Deck: Tabs for Topology Graph, Timeline, and Audit Trail */}
      <div className="rounded-xl border border-border/80 bg-card/90 backdrop-blur-xl overflow-hidden shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/80 px-4 py-2.5 bg-void/40">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("topology")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                activeTab === "topology"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Network className="size-3.5" />
              <span>IEEE 14-Bus Electrical Topology</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                activeTab === "timeline"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Clock className="size-3.5" />
              <span>Temporal Window & Cross-Modal Evidence</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audit")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer",
                activeTab === "audit"
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Database className="size-3.5" />
              <span>SQLite Incident History ({incidents.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>Correlation ID:</span>
            <span className="font-mono text-foreground font-bold">
              {report?.correlation_id ?? "CTIE-BASELINE"}
            </span>
          </div>
        </div>

        {/* Tab 1: Topology Graph Visualizer */}
        {activeTab === "topology" && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Interactive SVG Electrical Network Diagram */}
              <div className="lg:col-span-2 rounded-xl border border-border/80 bg-void/80 p-3 relative min-h-[380px] flex flex-col justify-between overflow-hidden">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">Topological Shortest-Path Graph</span>
                    <span>(14 Buses · 20 Branches)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-cyan-400" />
                      <span>Nominal Bus</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-destructive animate-pulse" />
                      <span>Attacked / Correlated</span>
                    </div>
                  </div>
                </div>

                {/* SVG Visualizer */}
                <div className="w-full flex-1 relative flex items-center justify-center">
                  <svg
                    viewBox="0 0 720 400"
                    className="w-full h-full max-h-[360px] select-none"
                  >
                    <defs>
                      <filter id="glow-red" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                      <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>

                    {/* Transmission Lines / Branch Edges */}
                    {graphTopology?.edges.map((edge, i) => {
                      const uCoords = IEEE14_BUS_COORDS[edge.from_bus];
                      const vCoords = IEEE14_BUS_COORDS[edge.to_bus];
                      if (!uCoords || !vCoords) return null;

                      const isEdgeAttacked =
                        affectedBusIds.has(edge.from_bus) && affectedBusIds.has(edge.to_bus);

                      return (
                        <g key={`edge-${i}`}>
                          <line
                            x1={uCoords.x}
                            y1={uCoords.y}
                            x2={vCoords.x}
                            y2={vCoords.y}
                            stroke={isEdgeAttacked ? "rgba(239, 68, 68, 0.9)" : "rgba(100, 116, 139, 0.4)"}
                            strokeWidth={isEdgeAttacked ? 3 : 1.5}
                            strokeDasharray={isEdgeAttacked ? "4 2" : "none"}
                            className={cn(isEdgeAttacked && "animate-pulse")}
                          />
                        </g>
                      );
                    })}

                    {/* Electrical Buses / Nodes */}
                    {Object.entries(IEEE14_BUS_COORDS).map(([idStr, coord]) => {
                      const busId = parseInt(idStr, 10);
                      const isAttacked = affectedBusIds.has(busId);
                      const isSelected = selectedBusId === busId;
                      const busData = buses.find((b) => b.bus_id === busId + 1);

                      return (
                        <g
                          key={`bus-${busId}`}
                          onClick={() => setSelectedBusId(busId)}
                          className="cursor-pointer transition-transform hover:scale-110"
                        >
                          {/* Aura Circle */}
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r={isAttacked ? 16 : 11}
                            fill={
                              isAttacked
                                ? "rgba(239, 68, 68, 0.25)"
                                : isSelected
                                ? "rgba(99, 102, 241, 0.3)"
                                : "rgba(14, 165, 233, 0.15)"
                            }
                            stroke={
                              isAttacked
                                ? "#ef4444"
                                : isSelected
                                ? "#818cf8"
                                : "#06b6d4"
                            }
                            strokeWidth={isAttacked || isSelected ? 2.5 : 1.5}
                            filter={isAttacked ? "url(#glow-red)" : "url(#glow-cyan)"}
                          />

                          {/* Node Core */}
                          <circle
                            cx={coord.x}
                            cy={coord.y}
                            r={isAttacked ? 6 : 4}
                            fill={isAttacked ? "#ef4444" : "#22d3ee"}
                          />

                          {/* Bus Label Text */}
                          <text
                            x={coord.x}
                            y={coord.y - 18}
                            textAnchor="middle"
                            className="fill-foreground text-[10px] font-bold font-mono pointer-events-none"
                          >
                            Bus {busId + 1}
                          </text>

                          {/* Live Voltage Text */}
                          <text
                            x={coord.x}
                            y={coord.y + 24}
                            textAnchor="middle"
                            className="fill-muted-foreground text-[8px] font-mono pointer-events-none"
                          >
                            {busData?.vm_pu !== undefined ? `${busData.vm_pu.toFixed(3)} pu` : `${coord.type}`}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                <div className="text-[9px] text-muted-foreground flex items-center justify-between pt-2 border-t border-border/40">
                  <span>Admittance weighting active · Shortest paths evaluated via Dijkstra algorithm</span>
                  <span>Spatial Scale σ_spatial = 2.5 hops</span>
                </div>
              </div>

              {/* Side Subgraph Breakdown Panel */}
              <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                    <Share2 className="size-3.5 text-indigo-400" />
                    <span>Graph Topology Evidence</span>
                  </h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Spatial distance & topological coupling between candidate components
                  </p>

                  <div className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                      <span className="text-[10px] text-muted-foreground">Candidate Subgraph Buses</span>
                      <span className="font-bold text-foreground font-mono">
                        {graphEvidence?.subgraph_nodes && graphEvidence.subgraph_nodes.length > 0
                          ? graphEvidence.subgraph_nodes.map((b) => `Bus ${b + 1}`).join(", ")
                          : "None"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                      <span className="text-[10px] text-muted-foreground">Mean Shortest Path Hops</span>
                      <span className="font-bold text-indigo-300 font-mono">
                        {graphEvidence?.mean_hop_distance?.toFixed(2) ?? "0.00"} hops
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                      <span className="text-[10px] text-muted-foreground">Hop Distance Range</span>
                      <span className="font-bold text-foreground font-mono">
                        Min: {graphEvidence?.min_hop_distance ?? 0} · Max: {graphEvidence?.max_hop_distance ?? 0}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                      <span className="text-[10px] text-muted-foreground">Mean Branch Admittance</span>
                      <span className="font-bold text-cyan-300 font-mono">
                        {graphEvidence?.mean_admittance_mhos?.toFixed(3) ?? "0.000"} ℧ (mhos)
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                      <span className="text-[10px] text-muted-foreground">Graph Affinity S_graph</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        {((graphEvidence?.graph_affinity_score ?? 0.0) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Shortest Path Sequence Display */}
                  {graphEvidence?.shortest_paths && Object.keys(graphEvidence.shortest_paths).length > 0 && (
                    <div className="mt-3 p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-500/5 space-y-1.5">
                      <span className="text-[9.5px] font-bold text-indigo-300 uppercase">
                        Shortest Path Connectivity
                      </span>
                      {Object.entries(graphEvidence.shortest_paths).map(([pair, path]) => (
                        <div key={pair} className="text-[9px] text-muted-foreground font-mono">
                          <span className="text-foreground font-bold">{pair}:</span>{" "}
                          {path.map((node) => `Bus ${node + 1}`).join(" → ")}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-2.5 rounded-lg border border-border/60 bg-void/40 text-[9px] text-muted-foreground">
                  <span className="text-foreground font-bold">Selected Node: </span>
                  {selectedBusId !== null ? (
                    <span>
                      Bus {selectedBusId + 1} ({IEEE14_BUS_COORDS[selectedBusId]?.label}) · Degree:{" "}
                      {graphTopology?.nodes.find((n) => n.id === selectedBusId)?.degree ?? 2}
                    </span>
                  ) : (
                    <span>Click any bus in the topology to inspect local branches</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Temporal Window & Cross-Modal Evidence */}
        {activeTab === "timeline" && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Temporal Metrics Card */}
              <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Clock className="size-3.5 text-cyan-400" />
                  <span>Sliding Window Temporal Synchronization</span>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Sliding window τ_window = {temporalEvidence?.window_seconds ?? 15.0}s · Half-life τ_sync = 3.0s
                </p>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Observed Time Span (Earliest → Latest)</span>
                    <span className="font-bold text-cyan-300 font-mono">
                      {temporalEvidence?.time_span_seconds?.toFixed(3) ?? "0.000"} seconds
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Mean Inter-Arrival Delay</span>
                    <span className="font-bold text-foreground font-mono">
                      {temporalEvidence?.mean_inter_arrival_seconds?.toFixed(3) ?? "0.000"} seconds
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Arrival Time Variance</span>
                    <span className="font-bold text-foreground font-mono">
                      {temporalEvidence?.time_variance_seconds2?.toFixed(4) ?? "0.0000"} s²
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Sequence Classification</span>
                    <span className="font-bold text-purple-400 font-mono">
                      {temporalEvidence?.sequence_pattern ?? "NORMAL"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Temporal Score S_temporal</span>
                    <span className="font-bold text-emerald-400 font-mono">
                      {((temporalEvidence?.synchronization_score ?? 0.0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-void/60 border border-border/60 text-[9.5px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Formula:</span> S_temporal = exp(-(Δt + 0.5√Var) / 3.0) · 𝕀(Span ≤ 15s).
                  Arrivals outside the 15-second window strictly collapse S_temporal to 0.0.
                </div>
              </div>

              {/* Cross-Modal Synergy Card */}
              <div className="rounded-xl border border-border/80 bg-card/60 p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                  <Activity className="size-3.5 text-purple-400" />
                  <span>Cross-Modal Synergy & Uncertainty Penalty</span>
                </h3>
                <p className="text-[10px] text-muted-foreground">
                  Correlates physical voltage, power flow, and protocol replay signatures
                </p>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Modalities Involved</span>
                    <div className="flex items-center gap-1">
                      {crossEvidence?.modalities_involved && crossEvidence.modalities_involved.length > 0 ? (
                        crossEvidence.modalities_involved.map((m) => (
                          <span
                            key={m}
                            className="rounded bg-primary/10 border border-primary/30 px-1.5 py-0.5 text-[8.5px] font-bold text-primary uppercase"
                          >
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Coordinated Evasion Synergy</span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        crossEvidence?.evasion_synergy_detected ? "text-destructive" : "text-emerald-400"
                      )}
                    >
                      {crossEvidence?.evasion_synergy_detected ? "YES (Evasion Detected)" : "NO"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Synergy Score S_cross</span>
                    <span className="font-bold text-purple-300 font-mono">
                      {((crossEvidence?.cross_modal_synergy_score ?? 0.0) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Uncertainty Penalty U</span>
                    <span
                      className={cn(
                        "font-bold font-mono",
                        (crossEvidence?.uncertainty_penalty ?? 0) > 0 ? "text-amber-400" : "text-muted-foreground"
                      )}
                    >
                      -{((crossEvidence?.uncertainty_penalty ?? 0.0) * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-void/50 border border-border/60">
                    <span className="text-[10px] text-muted-foreground">Net Evidence Score S_coord</span>
                    <span className="font-bold text-foreground font-mono">
                      {((report?.combined_evidence_score ?? 0.0) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-void/60 border border-border/60 text-[9.5px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">Penalty Rule:</span> Missing telemetry channels deduct 0.15, delayed packets deduct 0.08 (capped at -0.40) to prevent false positives under noisy cyber-physical conditions.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: SQLite Incident History */}
        {activeTab === "audit" && (
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Persisted SQLite forensic records from `security_incidents` table:</span>
              <button
                type="button"
                onClick={async () => {
                  const fresh = await gridApi.getCoordinatedIncidents(25);
                  if (fresh) setIncidents(fresh);
                }}
                className="text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="size-3" />
                <span>Refresh Audit Log</span>
              </button>
            </div>

            <div className="rounded-xl border border-border/80 overflow-x-auto bg-void/50">
              <table className="w-full text-left text-[10px] border-collapse">
                <thead>
                  <tr className="border-b border-border/80 bg-card/40 text-muted-foreground uppercase tracking-wider text-[8.5px]">
                    <th className="p-2.5">Correlation UUID</th>
                    <th className="p-2.5">Timestamp</th>
                    <th className="p-2.5">Classification</th>
                    <th className="p-2.5">Target Components</th>
                    <th className="p-2.5">Score</th>
                    <th className="p-2.5">Severity</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-mono">
                  {incidents.length > 0 ? (
                    incidents.map((inc, i) => (
                      <tr key={inc.correlation_id || i} className="hover:bg-card/30 transition-colors">
                        <td className="p-2.5 font-bold text-primary">{inc.correlation_id}</td>
                        <td className="p-2.5 text-muted-foreground">
                          {new Date(inc.timestamp).toLocaleTimeString("en-GB", { hour12: false })}
                        </td>
                        <td className="p-2.5 text-foreground">{inc.classification}</td>
                        <td className="p-2.5 text-indigo-300">{inc.affected_components.join(", ")}</td>
                        <td className="p-2.5 font-bold text-foreground">
                          {(inc.combined_evidence_score * 100).toFixed(1)}%
                        </td>
                        <td className="p-2.5">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[8px] font-bold border",
                              inc.severity === "CRITICAL"
                                ? "border-destructive/40 bg-destructive/10 text-destructive"
                                : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                            )}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <span className="text-emerald-400 font-bold">RECORDED</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        No historical coordinated attacks recorded yet. Run Scenario 4 to generate a verified coordinated threat record.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Scenario Laboratory: Run the 7 Required Test Scenarios */}
      <div className="rounded-xl border border-indigo-500/30 bg-card/90 p-4 backdrop-blur-xl shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="size-4 text-indigo-400" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              CTIE SCENARIO LABORATORY (7 MANDATORY VALIDATION SUITES)
            </h3>
          </div>
          <span className="text-[10px] text-muted-foreground">
            Click any scenario to inject controlled anomalies into the Graph-Temporal correlation model
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {scenarios.map((scen, idx) => {
            const isSelected = selectedScenarioIndex === idx;
            return (
              <button
                key={scen.id}
                type="button"
                onClick={() => runScenario(idx)}
                disabled={isLoading}
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between group",
                  isSelected
                    ? "border-indigo-500 bg-indigo-500/15 text-foreground shadow-[0_0_12px_rgba(99,102,241,0.25)]"
                    : "border-border/60 bg-void/50 text-muted-foreground hover:bg-card hover:text-foreground"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-foreground truncate">
                      {scen.name}
                    </span>
                    {isSelected && <Check className="size-3 text-indigo-400 shrink-0" />}
                  </div>
                  <p className="text-[8.5px] text-muted-foreground mt-1 line-clamp-2">
                    {scen.description}
                  </p>
                </div>

                <div className="mt-2 pt-1 border-t border-border/40 flex items-center justify-between text-[8px] text-muted-foreground">
                  <span>Scenario #{idx + 1}</span>
                  <span className="text-indigo-400 group-hover:underline flex items-center gap-0.5">
                    Execute <ChevronRight className="size-2.5" />
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forensic Explainability, Actionable Rationale & Transparency Disclaimers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Rationale & Actions */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-4 space-y-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Info className="size-4 text-primary" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
              FORENSIC EXPLANATION & RECOMMENDED ACTION
            </h3>
          </div>

          <div className="p-3 rounded-lg bg-void/60 border border-border/60 space-y-2 text-[10px] text-muted-foreground leading-relaxed">
            <p className="text-foreground font-semibold">
              {report?.explanation || "Awaiting telemetry analysis..."}
            </p>
          </div>

          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5 text-[10px]">
            <span className="font-bold text-primary uppercase text-[9px]">
              Recommended Operator Action:
            </span>
            <p className="text-muted-foreground">
              {report?.recommended_investigation || "Inspect substation PMU logs and run AC power-flow verification."}
            </p>
          </div>
        </div>

        {/* Statistical Validation Note & Rigor Disclaimer */}
        <div className="rounded-xl border border-border/80 bg-card/90 p-4 space-y-3 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-400" />
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                ENGINEERING ACCURACY & ARCHITECTURE INTEGRITY
              </h3>
            </div>

            <div className="mt-3 p-3 rounded-lg bg-void/60 border border-border/60 space-y-2 text-[9.5px] text-muted-foreground leading-relaxed">
              <p>
                <span className="font-bold text-foreground">Model Architecture: </span>
                Graph-Based Temporal Anomaly Correlation Model combining Dijkstra shortest-path spatial affinity, exponential temporal inter-arrival synchronization, and cross-modal synergy penalties.
              </p>
              <p>
                <span className="font-bold text-foreground">Transparency Standard: </span>
                {report?.statistical_validation_note ||
                  "Score represents uncalibrated composite heuristic evidence. Statistical confidence requires historical multi-attack ground truth calibration."}
              </p>
              <p>
                <span className="font-bold text-foreground">Isolation Guarantee: </span>
                Operates independently of single-bus KCL physics detectors and WLS bad-data identification filters.
              </p>
            </div>
          </div>

          <div className="pt-2 text-[8.5px] text-muted-foreground/60 flex items-center justify-between border-t border-border/40">
            <span>IEEE 14-Bus Benchmark System</span>
            <span>FastAPI Backend + Pandapower AC Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}

