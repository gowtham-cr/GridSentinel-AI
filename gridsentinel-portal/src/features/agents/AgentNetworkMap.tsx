import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Orbit,
  Flame,
  ShieldAlert,
  Cpu,
  Wrench,
  Activity,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Radio,
  FileText,
  ChevronRight,
  X,
  Play,
  Layers,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSimulation } from "../simulation/SimulationContext";

interface AgentNodeDef {
  id: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  name: string;
  role: string;
  x: number;
  y: number;
  color: string;
  glowColor: string;
  borderColor: string;
  icon: React.ElementType;
}

const AGENT_NODES: AgentNodeDef[] = [
  {
    id: "coordinator",
    name: "Grid Coordinator Agent",
    role: "AC Newton-Raphson Power Flow & Orchestration Hub",
    x: 500,
    y: 80,
    color: "text-cyan-400",
    glowColor: "rgba(34, 211, 238, 0.4)",
    borderColor: "border-cyan-500/50",
    icon: Orbit,
  },
  {
    id: "attack",
    name: "Attack Agent",
    role: "Controlled Cyber-Physical Fault Injection Engine",
    x: 170,
    y: 240,
    color: "text-red-400",
    glowColor: "rgba(239, 68, 68, 0.4)",
    borderColor: "border-red-500/50",
    icon: Flame,
  },
  {
    id: "detection",
    name: "Detection Agent",
    role: "KCL Residual Analysis & Multiclass ML Classifier",
    x: 340,
    y: 440,
    color: "text-amber-400",
    glowColor: "rgba(245, 158, 11, 0.4)",
    borderColor: "border-amber-500/50",
    icon: ShieldAlert,
  },
  {
    id: "estimation",
    name: "State Estimation Agent",
    role: "WLS State Estimator & Chi-Square Bad Data Filter",
    x: 660,
    y: 440,
    color: "text-purple-400",
    glowColor: "rgba(168, 85, 247, 0.4)",
    borderColor: "border-purple-500/50",
    icon: Cpu,
  },
  {
    id: "mitigation",
    name: "Mitigation Agent",
    role: "Volt-VAR Secondary Control & Auto-Remediation",
    x: 830,
    y: 240,
    color: "text-emerald-400",
    glowColor: "rgba(16, 185, 129, 0.4)",
    borderColor: "border-emerald-500/50",
    icon: Wrench,
  },
];

interface ConnectionDef {
  id: string;
  from: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  to: "coordinator" | "attack" | "detection" | "estimation" | "mitigation";
  type: "pipeline" | "command" | "feedback";
  d: string;
  label: string;
  labelX: number;
  labelY: number;
  activeColor: string;
}

const CONNECTIONS: ConnectionDef[] = [
  // --- 1. MAIN SEQUENTIAL PIPELINE (ATTACK → DETECTION → ESTIMATION → MITIGATION → RECOVERY) ---
  {
    id: "pipeline-attack-detect",
    from: "attack",
    to: "detection",
    type: "pipeline",
    d: "M 170 280 C 170 350, 240 395, 295 398",
    label: "1. SENSOR PERTURBATION",
    labelX: 205,
    labelY: 355,
    activeColor: "#EF4444",
  },
  {
    id: "pipeline-detect-estim",
    from: "detection",
    to: "estimation",
    type: "pipeline",
    d: "M 425 440 L 570 440",
    label: "2. RESIDUAL ANOMALY HAND-OFF",
    labelX: 500,
    labelY: 428,
    activeColor: "#F59E0B",
  },
  {
    id: "pipeline-estim-mitig",
    from: "estimation",
    to: "mitigation",
    type: "pipeline",
    d: "M 700 398 C 760 395, 830 350, 830 285",
    label: "3. CORRUPTED FEED ISOLATION",
    labelX: 795,
    labelY: 355,
    activeColor: "#A855F7",
  },
  {
    id: "pipeline-mitig-coord",
    from: "mitigation",
    to: "coordinator",
    type: "pipeline",
    d: "M 830 200 C 830 110, 710 80, 595 80",
    label: "4. VERIFIED RESTORATION FEEDBACK",
    labelX: 730,
    labelY: 76,
    activeColor: "#10B981",
  },

  // --- 2. COORDINATOR-TO-AGENT COMMAND SIGNALS ---
  {
    id: "cmd-coord-attack",
    from: "coordinator",
    to: "attack",
    type: "command",
    d: "M 420 115 C 330 120, 220 150, 185 195",
    label: "CMD: INJECT/DISARM",
    labelX: 285,
    labelY: 135,
    activeColor: "#22D3EE",
  },
  {
    id: "cmd-coord-detect",
    from: "coordinator",
    to: "detection",
    type: "command",
    d: "M 460 120 C 430 210, 360 300, 342 395",
    label: "CMD: TELEMETRY STREAM",
    labelX: 380,
    labelY: 245,
    activeColor: "#22D3EE",
  },
  {
    id: "cmd-coord-estim",
    from: "coordinator",
    to: "estimation",
    type: "command",
    d: "M 540 120 C 570 210, 640 300, 658 395",
    label: "CMD: RUN WLS ESTIMATE",
    labelX: 620,
    labelY: 245,
    activeColor: "#22D3EE",
  },
  {
    id: "cmd-coord-mitig",
    from: "coordinator",
    to: "mitigation",
    type: "command",
    d: "M 580 115 C 640 145, 690 190, 740 235",
    label: "CMD: DISPATCH REMEDY",
    labelX: 675,
    labelY: 165,
    activeColor: "#22D3EE",
  },

  // --- 3. AGENT-TO-COORDINATOR STATUS & FEEDBACK SIGNALS ---
  {
    id: "fdbk-attack-coord",
    from: "attack",
    to: "coordinator",
    type: "feedback",
    d: "M 140 200 C 130 90, 280 45, 425 45",
    label: "FDBK: ATTACK ALARMS",
    labelX: 270,
    labelY: 52,
    activeColor: "#EF4444",
  },
  {
    id: "fdbk-detect-coord",
    from: "detection",
    to: "coordinator",
    type: "feedback",
    d: "M 380 400 C 410 310, 475 220, 485 125",
    label: "FDBK: KCL RESIDUALS",
    labelX: 450,
    labelY: 295,
    activeColor: "#F59E0B",
  },
  {
    id: "fdbk-estim-coord",
    from: "estimation",
    to: "coordinator",
    type: "feedback",
    d: "M 620 400 C 590 310, 525 220, 515 125",
    label: "FDBK: CHI2 TEST VERDICT",
    labelX: 550,
    labelY: 295,
    activeColor: "#A855F7",
  },
];

export function AgentNetworkMap() {
  const {
    activeAgentId,
    agentSignals,
    agentLogs,
    status,
    activeAttacks,
    detection,
    estimationResult,
    badDataReport,
    mitigationPlan,
    lastMitigationResult,
    currentStage,
    frequencyHz,
    totalGenMw,
    totalLoadMw,
    stateMode,
    runDetectionScan,
    runStateEstimation,
    applyMitigation,
    isLoading,
  } = useSimulation();

  const [selectedAgent, setSelectedAgent] = useState<AgentNodeDef | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<"diagram" | "logs">("diagram");

  // Determine node operational state dynamically
  const getNodeState = (agentId: string) => {
    switch (agentId) {
      case "coordinator":
        return {
          status: status?.status === "RUNNING" ? "ACTIVE" : "STANDBY",
          statusColor: status?.status === "RUNNING" ? "text-cyan-400" : "text-muted-foreground",
          badge: status?.converged ? "AC NR Converged" : "Diverged",
          summary: `${totalGenMw.toFixed(1)} MW · ${totalLoadMw.toFixed(1)} MW · ${frequencyHz} Hz`,
        };
      case "attack":
        return {
          status: activeAttacks.length > 0 ? "INJECTING" : "DORMANT",
          statusColor: activeAttacks.length > 0 ? "text-red-400 animate-pulse" : "text-muted-foreground",
          badge: activeAttacks.length > 0 ? `${activeAttacks.length} Attack Active` : "Zero Injections",
          summary: activeAttacks[0] ? `${activeAttacks[0].attack_type} on ${activeAttacks[0].target_component}` : "Safe boundary enforced",
        };
      case "detection":
        return {
          status: detection?.is_anomaly ? "THREAT DETECTED" : "NOMINAL",
          statusColor: detection?.is_anomaly ? "text-amber-400 animate-pulse" : "text-emerald-400",
          badge: detection?.is_anomaly ? `Score: ${(detection.anomaly_score * 100).toFixed(0)}%` : "Score: 5.0%",
          summary: detection?.attack_classification || "All residuals within KCL threshold",
        };
      case "estimation":
        return {
          status: badDataReport?.bad_data_detected ? "BAD DATA IDENTIFIED" : "WLS CONVERGED",
          statusColor: badDataReport?.bad_data_detected ? "text-purple-400 animate-pulse" : "text-cyan-400",
          badge: badDataReport?.chi2_passed ? "Chi2 Passed" : "Chi2 Exceeded",
          summary: estimationResult ? `RMSE: ${estimationResult.rmse_vm_pu.toFixed(4)} pu · ${estimationResult.num_measurements} ch` : "Gauss-Newton ready",
        };
      case "mitigation":
        return {
          status: lastMitigationResult?.recovery_effective ? "RECOVERED" : mitigationPlan ? "ARMED" : "STANDBY",
          statusColor: lastMitigationResult?.recovery_effective ? "text-emerald-400" : "text-cyan-400",
          badge: lastMitigationResult ? "Restoration Verified" : mitigationPlan ? "Plan Ready" : "Normal Dispatch",
          summary: mitigationPlan ? mitigationPlan.strategy_name : "Secondary controllers primed",
        };
      default:
        return { status: "IDLE", statusColor: "text-muted-foreground", badge: "--", summary: "" };
    }
  };

  // Check recent signals from event history within the last 20 seconds
  const recentSignalSet = useMemo(() => {
    const now = Date.now();
    const set = new Set<string>();
    for (const sig of agentSignals) {
      if (now - new Date(sig.timestamp).getTime() < 20000) {
        set.add(`${sig.fromAgent}->${sig.toAgent}`);
      }
    }
    return set;
  }, [agentSignals]);

  // Connection evaluation based on genuine simulation state
  const evaluateConnection = (conn: ConnectionDef) => {
    const signalKey = `${conn.from}->${conn.to}`;
    const hasRecentSignal = recentSignalSet.has(signalKey);

    switch (conn.id) {
      case "pipeline-attack-detect": {
        const isAttacking = activeAttacks.length > 0;
        const isDetected = detection?.is_anomaly === true;
        if (isAttacking) {
          return { state: "active" as const, color: "#EF4444", marker: "arrow-active-red", animate: true };
        }
        if (isDetected) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "pipeline-detect-estim": {
        const isDetected = detection?.is_anomaly === true;
        const hasEstimated = badDataReport !== null;
        if (isDetected && !hasEstimated) {
          return { state: "active" as const, color: "#F59E0B", marker: "arrow-active-amber", animate: true };
        }
        if (hasEstimated) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "pipeline-estim-mitig": {
        const badData = badDataReport?.bad_data_detected === true;
        const hasMitigation = lastMitigationResult !== null;
        if (badData && !hasMitigation) {
          return { state: "active" as const, color: "#A855F7", marker: "arrow-active-purple", animate: true };
        }
        if (hasMitigation) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "pipeline-mitig-coord": {
        const isRecovered = lastMitigationResult?.recovery_effective === true && stateMode === "RECOVERED";
        const isRecovering = isLoading && activeAgentId === "mitigation";
        if (isRecovered) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        if (isRecovering || hasRecentSignal) {
          return { state: "active" as const, color: "#22D3EE", marker: "arrow-active-cyan", animate: true };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "cmd-coord-attack": {
        const isAttacking = activeAttacks.length > 0;
        if (isAttacking || hasRecentSignal) {
          return { state: "active" as const, color: "#EF4444", marker: "arrow-active-red", animate: true };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "cmd-coord-detect": {
        const isScanning = isLoading && activeAgentId === "detection";
        const isStreaming = status?.status === "RUNNING";
        if (isScanning || hasRecentSignal) {
          return { state: "active" as const, color: "#22D3EE", marker: "arrow-active-cyan", animate: true };
        }
        if (isStreaming) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "cmd-coord-estim": {
        const isEstimating = isLoading && activeAgentId === "estimation";
        if (isEstimating || hasRecentSignal) {
          return { state: "active" as const, color: "#A855F7", marker: "arrow-active-purple", animate: true };
        }
        if (estimationResult !== null) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "cmd-coord-mitig": {
        const isMitigating = isLoading && activeAgentId === "mitigation";
        if (isMitigating || hasRecentSignal) {
          return { state: "active" as const, color: "#22D3EE", marker: "arrow-active-cyan", animate: true };
        }
        if (lastMitigationResult !== null) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "fdbk-attack-coord": {
        const isAttacking = activeAttacks.length > 0;
        if (isAttacking) {
          return { state: "active" as const, color: "#EF4444", marker: "arrow-active-red", animate: true };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "fdbk-detect-coord": {
        const isAnomaly = detection?.is_anomaly === true;
        if (isAnomaly) {
          return { state: "active" as const, color: "#F59E0B", marker: "arrow-active-amber", animate: true };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      case "fdbk-estim-coord": {
        const badData = badDataReport?.bad_data_detected === true;
        if (badData) {
          return { state: "failed" as const, color: "#EF4444", marker: "arrow-failed", animate: true };
        }
        if (badDataReport?.chi2_passed) {
          return { state: "completed" as const, color: "#10B981", marker: "arrow-completed", animate: false };
        }
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
      }

      default:
        return { state: "inactive" as const, color: "#334155", marker: "arrow-idle", animate: false };
    }
  };

  return (
    <div className="relative rounded-xl border border-primary/40 bg-void/95 p-3 sm:p-4 backdrop-blur-xl shadow-2xl font-mono text-xs overflow-hidden w-full max-w-full">
      {/* Background Cyber Atmosphere */}
      <div className="pointer-events-none absolute inset-0 bg-radial-[ellipse_80%_80%_at_50%_40%] from-cyan-950/20 via-void to-void" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />

      {/* Header bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
              AI AGENT NETWORK — <span className="text-primary-glow">CYBER-PHYSICAL ORCHESTRATION</span>
            </h2>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground tracking-wider">
            ACTUAL BACKEND MODULES ORCHESTRATED BY GRID COORDINATOR · REAL EVENT SIGNAL DISPATCH
          </p>
        </div>

        {/* View mode toggle + Zoom controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-card/60 p-0.5">
            <button
              type="button"
              onClick={() => setActiveTab("diagram")}
              className={cn(
                "rounded px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer",
                activeTab === "diagram" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Mind Map Canvas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("logs")}
              className={cn(
                "rounded px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5",
                activeTab === "logs" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Radio className="size-3 text-cyan-400 animate-pulse" />
              <span>Live Agent Feed ({agentLogs.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border bg-card/60 px-1 py-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(1.4, +(z + 0.1).toFixed(1)))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="size-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1 tabular-nums">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, +(z - 0.1).toFixed(1)))}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1.0)}
              className="p-1 text-muted-foreground hover:text-foreground cursor-pointer"
              title="Reset Zoom to Fit"
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Map or Log Stream */}
      {activeTab === "diagram" ? (
        <div className="relative mt-4 flex flex-col xl:flex-row gap-4 items-start w-full max-w-full">
          {/* Interactive Mind Map Canvas Wrapper */}
          <div className="relative flex-1 min-w-0 w-full rounded-lg border border-border/70 bg-void/90 p-2 sm:p-3 min-h-[500px] flex items-center justify-center overflow-hidden shadow-inner">
            <div
              className="w-full flex items-center justify-center transition-transform duration-200 origin-center"
              style={{
                transform: zoomLevel !== 1.0 ? `scale(${zoomLevel})` : undefined,
                transformOrigin: "center center",
                maxWidth: "100%",
              }}
            >
              <svg
                viewBox="0 0 1000 530"
                className="w-full h-auto max-h-[540px] select-none"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  {/* Radial Node Glow Filters */}
                  <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="attackGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="detectGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="estimGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#A855F7" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0" />
                  </radialGradient>
                  <radialGradient id="mitigGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </radialGradient>

                  {/* Marker Arrowheads */}
                  <marker
                    id="arrow-idle"
                    markerWidth="9"
                    markerHeight="7"
                    refX="7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0.5, 7 3.5, 0 6.5" fill="#475569" />
                  </marker>
                  <marker
                    id="arrow-active-cyan"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#22D3EE" />
                  </marker>
                  <marker
                    id="arrow-active-amber"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#F59E0B" />
                  </marker>
                  <marker
                    id="arrow-active-purple"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#A855F7" />
                  </marker>
                  <marker
                    id="arrow-active-red"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#EF4444" />
                  </marker>
                  <marker
                    id="arrow-completed"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#10B981" />
                  </marker>
                  <marker
                    id="arrow-failed"
                    markerWidth="10"
                    markerHeight="8"
                    refX="8"
                    refY="4"
                    orient="auto"
                  >
                    <polygon points="0 1, 8 4, 0 7" fill="#EF4444" />
                  </marker>
                </defs>

                {/* --- 1. Connection Edges --- */}
                {CONNECTIONS.map((conn) => {
                  const evalRes = evaluateConnection(conn);
                  const isPipeline = conn.type === "pipeline";
                  const isCommand = conn.type === "command";

                  return (
                    <g key={conn.id} className="transition-all duration-300">
                      {/* Connection Line */}
                      <path
                        id={conn.id}
                        d={conn.d}
                        fill="none"
                        stroke={evalRes.color}
                        strokeWidth={evalRes.state === "active" ? 2.5 : isPipeline ? 2 : 1.4}
                        strokeDasharray={evalRes.state === "inactive" ? (isPipeline ? "7,5" : "4,4") : "none"}
                        opacity={evalRes.state === "active" ? 1.0 : evalRes.state === "completed" ? 0.85 : 0.4}
                        markerEnd={`url(#${evalRes.marker})`}
                        className="transition-colors duration-300"
                        style={{
                          filter:
                            evalRes.state === "active"
                              ? `drop-shadow(0 0 6px ${evalRes.color})`
                              : "none",
                        }}
                      />

                      {/* Small Moving Signal Particles (Animated strictly when real events occur) */}
                      {evalRes.animate && (
                        <>
                          {/* Primary leading particle */}
                          <circle r="4.2" fill={evalRes.color}>
                            <animateMotion dur="2.4s" repeatCount="indefinite" path={conn.d} />
                          </circle>
                          {/* Secondary trailing particle for stream illusion */}
                          <circle r="2.5" fill={evalRes.color} opacity="0.6">
                            <animateMotion dur="2.4s" begin="0.3s" repeatCount="indefinite" path={conn.d} />
                          </circle>
                        </>
                      )}

                      {/* Directional Signal Label */}
                      <text
                        x={conn.labelX}
                        y={conn.labelY}
                        fill={evalRes.state === "active" ? evalRes.color : "#64748B"}
                        fontSize={isPipeline ? "8.5" : "7.5"}
                        fontWeight={evalRes.state === "active" ? "bold" : "normal"}
                        fontFamily="monospace"
                        textAnchor="middle"
                        letterSpacing="0.08em"
                        className="select-none pointer-events-none"
                      >
                        {conn.label}
                      </text>
                    </g>
                  );
                })}

                {/* Center Pipeline Sequence Label */}
                <g transform="translate(500, 260)">
                  <rect
                    x="-180"
                    y="-12"
                    width="360"
                    height="24"
                    rx="5"
                    fill="#050B14"
                    stroke="#1E293B"
                    strokeWidth="1"
                  />
                  <text
                    x="0"
                    y="4"
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="9"
                    fontFamily="monospace"
                    letterSpacing="0.12em"
                    fontWeight="bold"
                  >
                    WORKFLOW: ATTACK ➔ DETECT ➔ ESTIMATE ➔ MITIGATE
                  </text>
                </g>

                {/* --- 2. Agent Nodes --- */}
                {AGENT_NODES.map((agent) => {
                  const nodeState = getNodeState(agent.id);
                  const isNodeActive = activeAgentId === agent.id;
                  const isSelected = selectedAgent?.id === agent.id;

                  return (
                    <g
                      key={agent.id}
                      transform={`translate(${agent.x - 85}, ${agent.y - 40})`}
                      className="cursor-pointer transition-all duration-300 group"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      {/* Active Radial Glow */}
                      {isNodeActive && (
                        <circle
                          cx="85"
                          cy="40"
                          r="62"
                          fill={
                            agent.id === "attack"
                              ? "url(#attackGlow)"
                              : agent.id === "detection"
                              ? "url(#detectGlow)"
                              : agent.id === "estimation"
                              ? "url(#estimGlow)"
                              : agent.id === "mitigation"
                              ? "url(#mitigGlow)"
                              : "url(#hubGlow)"
                          }
                          className="animate-pulse"
                        />
                      )}

                      {/* Node Container Box */}
                      <rect
                        width="170"
                        height="80"
                        rx="10"
                        fill="#0A0E17"
                        stroke={isSelected ? "#22D3EE" : isNodeActive ? agent.glowColor : "#1E293B"}
                        strokeWidth={isSelected ? 2.5 : isNodeActive ? 2 : 1.2}
                        className="transition-all duration-300 group-hover:stroke-primary/80"
                        style={{
                          filter: isNodeActive ? `drop-shadow(0 0 10px ${agent.glowColor})` : "none",
                        }}
                      />

                      {/* Top Header Strip inside Node */}
                      <rect width="170" height="22" rx="10" fill="#0F172A" clipPath="inset(0 0 58 0)" />

                      {/* Status indicator dot */}
                      <circle
                        cx="16"
                        cy="11"
                        r="3.5"
                        fill={
                          nodeState.status === "ACTIVE" || nodeState.status === "RECOVERED"
                            ? "#10B981"
                            : nodeState.status.includes("DETECTED") || nodeState.status.includes("INJECTING")
                            ? "#EF4444"
                            : "#64748B"
                        }
                        className={isNodeActive ? "animate-pulse" : ""}
                      />

                      {/* Agent Short Code */}
                      <text x="26" y="14" fill="#94A3B8" fontSize="8" fontWeight="bold" fontFamily="monospace">
                        AGENT_0{AGENT_NODES.findIndex((n) => n.id === agent.id) + 1}
                      </text>

                      {/* Badge / Status on Right of Header */}
                      <text x="160" y="14" textAnchor="end" fill="#64748B" fontSize="7.5" fontFamily="monospace">
                        {nodeState.badge}
                      </text>

                      {/* Agent Name */}
                      <text x="14" y="38" fill="#F8FAFC" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                        {agent.name.replace(" Agent", "")}
                      </text>

                      {/* Status / Mode Subtext */}
                      <text
                        x="14"
                        y="52"
                        fill={
                          agent.id === "attack" && activeAttacks.length > 0
                            ? "#EF4444"
                            : agent.id === "detection" && detection?.is_anomaly
                            ? "#F59E0B"
                            : agent.id === "estimation" && badDataReport?.bad_data_detected
                            ? "#A855F7"
                            : agent.id === "mitigation" && lastMitigationResult
                            ? "#10B981"
                            : "#38BDF8"
                        }
                        fontSize="8.5"
                        fontWeight="600"
                        fontFamily="monospace"
                      >
                        ● {nodeState.status}
                      </text>

                      {/* Summary Metrics */}
                      <text x="14" y="68" fill="#64748B" fontSize="7.5" fontFamily="monospace">
                        {nodeState.summary.slice(0, 25)}
                      </text>
                    </g>
                  );
                })}

                {/* --- 3. Mind Map Legend --- */}
                <g transform="translate(130, 510)">
                  {/* Legend Item 1: Active Signal */}
                  <line x1="0" y1="0" x2="25" y2="0" stroke="#22D3EE" strokeWidth="2.5" />
                  <circle cx="12" cy="0" r="3" fill="#22D3EE" />
                  <text x="32" y="3.5" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                    Active Signal
                  </text>

                  {/* Legend Item 2: Idle Connection */}
                  <line x1="140" y1="0" x2="165" y2="0" stroke="#475569" strokeWidth="1.5" strokeDasharray="4,4" />
                  <text x="172" y="3.5" fill="#64748B" fontSize="8" fontFamily="monospace">
                    Idle (Dashed)
                  </text>

                  {/* Legend Item 3: Completed Recovery */}
                  <line x1="280" y1="0" x2="305" y2="0" stroke="#10B981" strokeWidth="2" />
                  <text x="312" y="3.5" fill="#10B981" fontSize="8" fontFamily="monospace">
                    Restored / Completed
                  </text>

                  {/* Legend Item 4: Fault / Alarm */}
                  <line x1="460" y1="0" x2="485" y2="0" stroke="#EF4444" strokeWidth="2.5" />
                  <circle cx="472" cy="0" r="3" fill="#EF4444" />
                  <text x="492" y="3.5" fill="#EF4444" fontSize="8" fontFamily="monospace">
                    Attack / Alarm
                  </text>

                  {/* Legend Item 5: Arrow direction */}
                  <path d="M 620 0 L 635 0" stroke="#64748B" strokeWidth="1.5" markerEnd="url(#arrow-idle)" />
                  <text x="645" y="3.5" fill="#94A3B8" fontSize="8" fontFamily="monospace">
                    Signal Direction
                  </text>
                </g>
              </svg>
            </div>
          </div>

          {/* Node Inspector Flyout / Side Details */}
          <div className="w-full xl:w-80 space-y-3 shrink-0">
            {selectedAgent ? (
              <div className="rounded-xl border border-primary/50 bg-card/95 p-4 shadow-xl space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <div className="flex items-center gap-2">
                    <selectedAgent.icon className={cn("size-4", selectedAgent.color)} />
                    <span className="font-bold text-foreground text-xs">{selectedAgent.name}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAgent(null)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  {selectedAgent.role}
                </div>

                {/* Agent Technical Spec */}
                <div className="rounded-lg border border-border/60 bg-void/70 p-2.5 space-y-1.5 text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Internal Model:</span>
                    <span className="text-foreground font-semibold">
                      {selectedAgent.id === "coordinator"
                        ? "Pandapower AC NR (v3.0)"
                        : selectedAgent.id === "attack"
                        ? "Sensor Perturbation Matrix"
                        : selectedAgent.id === "detection"
                        ? "Multiclass RF + KCL Physics"
                        : selectedAgent.id === "estimation"
                        ? "Gauss-Newton WLS Estimator"
                        : "Volt-VAR Secondary Dispatch"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Execution Interval:</span>
                    <span className="text-cyan-400">1.0 Hz (Synchronous Loop)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current State:</span>
                    <span className="font-bold">{getNodeState(selectedAgent.id).status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Confinement:</span>
                    <span className="text-emerald-400">Strictly Isolated Software</span>
                  </div>
                </div>

                {/* Quick Agent Actions */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">Agent Interventions:</p>
                  {selectedAgent.id === "detection" && (
                    <button
                      type="button"
                      onClick={runDetectionScan}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 py-1.5 text-[11px] font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                    >
                      <ShieldAlert className="size-3.5" />
                      <span>Trigger ML Threat Scan</span>
                    </button>
                  )}
                  {selectedAgent.id === "estimation" && (
                    <button
                      type="button"
                      onClick={runStateEstimation}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-purple-500/50 bg-purple-500/10 py-1.5 text-[11px] font-bold text-purple-400 hover:bg-purple-500/20 transition-all cursor-pointer"
                    >
                      <Cpu className="size-3.5" />
                      <span>Execute WLS State Estimation</span>
                    </button>
                  )}
                  {selectedAgent.id === "mitigation" && (
                    <button
                      type="button"
                      onClick={applyMitigation}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/10 py-1.5 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Wrench className="size-3.5" />
                      <span>Apply Autonomous Mitigation</span>
                    </button>
                  )}
                  {selectedAgent.id === "coordinator" && (
                    <div className="text-[10px] text-muted-foreground">
                      Continuous 1 Hz telemetry coordination active over WebSockets.
                    </div>
                  )}
                  {selectedAgent.id === "attack" && (
                    <div className="text-[10px] text-muted-foreground">
                      Switch to the <span className="text-destructive font-bold">Attack Center</span> view to configure custom parameters.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/60 bg-card/60 p-4 text-center space-y-2">
                <Orbit className="size-8 mx-auto text-primary/60 animate-pulse" />
                <p className="font-bold text-foreground text-xs">Node Inspector Idle</p>
                <p className="text-[10px] text-muted-foreground">
                  Click on any agent node on the canvas to inspect its mathematical state, active parameters, and live telemetry feeds.
                </p>
              </div>
            )}

            {/* Stage indicator card */}
            <div className="rounded-xl border border-border/70 bg-card/60 p-3 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">Lifecycle Phase:</span>
                <span className="font-bold text-cyan-400">{currentStage.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Synchronized with FastAPI simulation runner</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Live Agent Event Feed */
        <div className="mt-4 space-y-2">
          <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
            {agentLogs.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No agent events logged yet.</div>
            ) : (
              agentLogs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-border/60 bg-card/70 p-2.5 flex items-start justify-between gap-3 font-mono text-[11px]"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums text-[10px]">[{log.timestamp}]</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.2 text-[9px] font-bold uppercase",
                          log.category === "ALERT"
                            ? "bg-red-500/20 text-red-400 border border-red-500/40"
                            : log.category === "ACTION"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : log.category === "PHYSICS"
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                            : "bg-void text-muted-foreground border border-border"
                        )}
                      >
                        {log.agent}
                      </span>
                    </div>
                    <p className="text-foreground font-semibold mt-1">{log.message}</p>
                    {log.details && <p className="text-[10px] text-muted-foreground">{log.details}</p>}
                  </div>
                  <span className="text-[9px] text-muted-foreground uppercase">{log.category}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
