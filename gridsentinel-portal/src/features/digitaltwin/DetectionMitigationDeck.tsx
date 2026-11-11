import { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Cpu,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Activity,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MitigationPlan, MitigationResult } from "@/lib/gridApi";

interface DetectionMitigationDeckProps {
  detection: {
    is_anomaly: boolean;
    anomaly_score: number;
    attack_classification: string;
    confidence: number;
    affected_component?: string;
    reason?: string;
    feature_contributions?: Record<string, number>;
  } | null;
  mitigationPlan: MitigationPlan | null;
  onApplyMitigation: () => Promise<MitigationResult | null>;
  lastMitigationResult: MitigationResult | null;
  isLoading?: boolean;
}

export function DetectionMitigationDeck({
  detection,
  mitigationPlan,
  onApplyMitigation,
  lastMitigationResult,
  isLoading = false,
}: DetectionMitigationDeckProps) {
  const [isApplying, setIsApplying] = useState(false);

  const isAnomaly = detection?.is_anomaly ?? false;
  const score = detection?.anomaly_score ?? 0.05;
  const scorePercent = Math.min(100, Math.round(score * 100));

  const handleApply = async () => {
    if (isApplying) return;
    setIsApplying(true);
    try {
      await onApplyMitigation();
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Detection Engine Telemetry Panel */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 backdrop-blur-xl shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="size-4 text-primary" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
              Cybersecurity Detection Engine
            </h3>
          </div>
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
            🤖 SCIKIT-LEARN + RESIDUAL STATE ESTIMATOR
          </span>
        </div>

        {/* Anomaly Status Gauge & Banner */}
        <div
          className={cn(
            "rounded-lg border p-4 font-mono transition-all",
            isAnomaly
              ? "border-destructive/60 bg-destructive/15 shadow-[0_0_16px_rgba(239,68,68,0.25)]"
              : "border-success/40 bg-success/10"
          )}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg border",
                  isAnomaly
                    ? "border-destructive bg-destructive/20 text-destructive animate-pulse"
                    : "border-success bg-success/20 text-success"
                )}
              >
                {isAnomaly ? <ShieldAlert className="size-5" /> : <ShieldCheck className="size-5" />}
              </span>
              <div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground block">
                  System State Assessment
                </span>
                <h4
                  className={cn(
                    "text-sm font-bold",
                    isAnomaly ? "text-destructive" : "text-success"
                  )}
                >
                  {isAnomaly ? "MALICIOUS ANOMALY DETECTED" : "NOMINAL GRID STATE"}
                </h4>
              </div>
            </div>

            {/* Score Pill */}
            <div className="text-right">
              <span className="text-[10px] text-muted-foreground block">Anomaly Score</span>
              <span
                className={cn(
                  "text-lg font-bold tabular-nums",
                  isAnomaly ? "text-destructive" : "text-success"
                )}
              >
                {score.toFixed(3)}
              </span>
            </div>
          </div>

          {/* Anomaly Gauge Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>0.00 (Nominal)</span>
              <span>Threshold: 0.60</span>
              <span>1.00 (Critical)</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/60">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  score > 0.6 ? "bg-destructive" : score > 0.3 ? "bg-warning" : "bg-success"
                )}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Identified Event Details */}
        {isAnomaly ? (
          <div className="rounded-lg border border-border bg-void/60 p-3.5 font-mono text-xs space-y-2.5">
            <div className="flex justify-between items-center border-b border-border/50 pb-2">
              <span className="text-muted-foreground text-[11px]">Identified Classification:</span>
              <span className="rounded bg-destructive/20 px-2 py-0.5 font-bold text-destructive text-[11px] uppercase">
                {detection?.attack_classification || "FDIA_ATTACK"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-muted-foreground block text-[10px]">Affected Component</span>
                <span className="font-bold text-foreground">
                  {detection?.affected_component || "Bus 2 (Renewable DER Inverter)"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Model Confidence</span>
                <span className="font-bold text-primary tabular-nums">
                  {((detection?.confidence || 0.94) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-muted-foreground block text-[10px]">Physical Reason & Impact:</span>
              <p className="text-[11px] text-accent mt-0.5 leading-relaxed">
                {detection?.reason ||
                  "State Estimation residual J(x) diverged beyond Chi-Square cutoff; sensor bias creates apparent voltage drop."}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 bg-void/40 p-4 font-mono text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 text-success">
              <Activity className="size-4" />
              <span className="font-bold">Continuous State Estimation Running</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              Pandapower AC power flow equations are convergent. Kirchhoff Current Law (KCL) residuals
              and PMU sensor voltages match nominal bounds.
            </p>
          </div>
        )}
      </div>

      {/* 2. Recommended Mitigation & Recalculation Panel */}
      <div className="rounded-xl border border-primary/30 bg-card p-5 backdrop-blur-xl shadow-xl space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="size-4 text-primary" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-foreground">
              Mitigation & Grid Recalculation
            </h3>
          </div>
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
            🛡️ ADAPTIVE MITIGATION ENGINE
          </span>
        </div>

        {mitigationPlan ? (
          <div className="space-y-3 font-mono">
            {/* Strategy Title Card */}
            <div className="rounded-lg border border-primary/40 bg-primary/10 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-primary font-bold">
                  Recommended Engineering Strategy
                </span>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[9px] text-primary-glow uppercase">
                  {mitigationPlan.severity} Priority
                </span>
              </div>
              <h4 className="text-sm font-bold text-foreground">
                {mitigationPlan.strategy_name}
              </h4>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
                {mitigationPlan.engineering_rationale}
              </p>
            </div>

            {/* Action Steps */}
            <div className="rounded-lg border border-border bg-void/50 p-3 space-y-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-bold">
                Automated Mitigation Sequence:
              </span>
              <ul className="space-y-1.5 text-[11px]">
                {mitigationPlan.action_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-foreground/90">
                    <CheckCircle2 className="size-3.5 text-success shrink-0 mt-0.5" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Execute Button */}
            <button
              type="button"
              onClick={handleApply}
              disabled={isApplying || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-lg border border-success/60 bg-success/20 hover:bg-success/30 text-success py-2.5 font-mono text-xs font-bold transition-all shadow-[0_0_16px_rgba(34,197,94,0.25)] cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="size-4" />
              <span>
                {isApplying
                  ? "Recalculating AC Power Flow with Mitigation..."
                  : "APPLY SIMULATED MITIGATION & RECALCULATE GRID"}
              </span>
            </button>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/60 bg-void/30 p-6 text-center font-mono text-xs text-muted-foreground">
            <CheckCircle2 className="size-8 text-success/60 mb-2" />
            <p className="font-bold text-foreground">Grid In Safe Operating Envelope</p>
            <p className="text-[11px] mt-1 max-w-sm">
              No active cyberattack or state deviation requires mitigation. If an attack is injected,
              recommended mitigation steps and one-click Pandapower recalculation will appear here.
            </p>
          </div>
        )}

        {/* Last Mitigation Feedback */}
        {lastMitigationResult && (
          <div className="rounded-lg border border-success/40 bg-success/10 p-3 font-mono text-xs text-success flex items-start gap-2.5">
            <CheckCircle2 className="size-4 shrink-0 mt-0.5 text-success" />
            <div>
              <p className="font-bold">
                Mitigation Applied: {lastMitigationResult.strategy_executed}
              </p>
              <p className="text-[11px] text-success/90 mt-0.5">
                {lastMitigationResult.message}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
