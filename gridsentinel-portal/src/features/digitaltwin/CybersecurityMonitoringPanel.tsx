import { ShieldAlert, ShieldCheck, Activity, Cpu, Radio, Network, AlertOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CybersecurityMonitoringPanelProps {
  isAnomaly: boolean;
  anomalyScore: number;
  attackClassification: string;
  confidence: number;
  affectedComponent?: string;
  reason?: string;
  packetRate?: number;
  latencyMs?: number;
}

export function CybersecurityMonitoringPanel({
  isAnomaly,
  anomalyScore,
  attackClassification,
  confidence,
  affectedComponent = "None (System Baseline)",
  reason,
  packetRate = 1.0,
  latencyMs = 12,
}: CybersecurityMonitoringPanelProps) {
  const severity = isAnomaly
    ? anomalyScore > 0.8
      ? "CRITICAL"
      : anomalyScore > 0.5
      ? "HIGH"
      : "MEDIUM"
    : "NOMINAL";

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {isAnomaly ? (
            <ShieldAlert className="size-4 text-destructive animate-pulse" />
          ) : (
            <ShieldCheck className="size-4 text-success" />
          )}
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            Cybersecurity & IDS Telemetry
          </h4>
        </div>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-[10px] font-bold border",
            isAnomaly
              ? "border-destructive/60 bg-destructive/15 text-destructive animate-pulse"
              : "border-success/40 bg-success/15 text-success"
          )}
        >
          {severity === "CRITICAL"
            ? "CRITICAL INTRUSION"
            : severity === "HIGH"
            ? "HIGH ANOMALY"
            : "DEFENDED / SECURE"}
        </span>
      </div>

      {/* 4 Telemetry Metrics */}
      <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {/* 1. Network Traffic / Frame Rate */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>DNP3 / Modbus Rate</span>
            <Network className="size-3 text-primary" />
          </div>
          <span className="text-base font-bold text-foreground mt-0.5 block">
            {packetRate} <span className="text-[10px] font-normal text-muted-foreground">Hz stream</span>
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            Latency: {latencyMs} ms
          </span>
        </div>

        {/* 2. Intrusion Detection Status */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>AI Classifier</span>
            <Cpu className="size-3 text-accent" />
          </div>
          <span
            className={cn(
              "text-base font-bold mt-0.5 block truncate",
              isAnomaly ? "text-destructive" : "text-success"
            )}
            title={attackClassification}
          >
            {isAnomaly ? attackClassification : "BASELINE"}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            Confidence: {(confidence * 100).toFixed(1)}%
          </span>
        </div>

        {/* 3. Attack Severity */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>Attack Severity</span>
            <AlertOctagon className="size-3 text-warning" />
          </div>
          <span
            className={cn(
              "text-base font-bold mt-0.5 block",
              severity === "CRITICAL"
                ? "text-destructive"
                : severity === "HIGH"
                ? "text-warning"
                : "text-success"
            )}
          >
            {severity}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            Anomaly Score: {(anomalyScore * 100).toFixed(0)}%
          </span>
        </div>

        {/* 4. Affected Component */}
        <div className="p-2.5 rounded-lg border border-border/60 bg-void/50">
          <div className="flex items-center justify-between text-muted-foreground text-[10px]">
            <span>Affected Target</span>
            <Radio className="size-3 text-primary animate-pulse" />
          </div>
          <span
            className={cn(
              "text-base font-bold mt-0.5 block truncate",
              isAnomaly ? "text-destructive" : "text-foreground"
            )}
            title={affectedComponent}
          >
            {affectedComponent}
          </span>
          <span className="text-[9px] text-muted-foreground mt-0.5 block">
            {isAnomaly ? "Target Isolated" : "All Components Nominal"}
          </span>
        </div>
      </div>

      {/* Detection Root Cause Explanation */}
      {reason && (
        <div className="mt-3 rounded-lg border border-border/40 bg-void/30 p-2.5 text-[11px] flex items-start gap-2">
          <span className="text-destructive font-bold">REASON:</span>
          <span className="text-muted-foreground leading-relaxed">{reason}</span>
        </div>
      )}
    </div>
  );
}

