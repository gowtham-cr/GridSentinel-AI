import { CheckCircle2, ShieldAlert, Cpu, Radio, Wrench, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export type SimulationStage =
  | "NORMAL"
  | "ATTACK_INJECTED"
  | "AI_DETECTION"
  | "ESTIMATION"
  | "MITIGATION_APPLIED"
  | "PHYSICAL_RECOVERY";

interface SimulationTimelineProps {
  currentStage: SimulationStage;
  activeAttackType?: string;
  anomalyScore?: number;
  mitigationStrategy?: string;
  stepCount: number;
}

const STAGES: {
  id: SimulationStage;
  label: string;
  sub: string;
  icon: any;
}[] = [
  {
    id: "NORMAL",
    label: "Normal Operation",
    sub: "AC Power Flow Nominal",
    icon: CheckCircle2,
  },
  {
    id: "ATTACK_INJECTED",
    label: "Attack",
    sub: "Injected Perturbation",
    icon: ShieldAlert,
  },
  {
    id: "AI_DETECTION",
    label: "Detection",
    sub: "Residual & ML Classifier",
    icon: Cpu,
  },
  {
    id: "ESTIMATION",
    label: "Estimation",
    sub: "PMU & Bad Data Detection",
    icon: Radio,
  },
  {
    id: "MITIGATION_APPLIED",
    label: "Mitigation",
    sub: "Remediation Executed",
    icon: Wrench,
  },
  {
    id: "PHYSICAL_RECOVERY",
    label: "Recovery",
    sub: "Grid Recalculation Restored",
    icon: RotateCcw,
  },
];

export function SimulationTimeline({
  currentStage,
  activeAttackType,
  anomalyScore,
  mitigationStrategy,
  stepCount,
}: SimulationTimelineProps) {
  const stageIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-3.5 backdrop-blur-xl shadow-lg font-mono">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-primary animate-pulse" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Simulation Timeline
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>Step: #{stepCount}</span>
          <span className="text-border">|</span>
          <span className="text-primary font-semibold">
            Stage: {STAGES[stageIndex]?.label || "Normal Operation"}
          </span>
        </div>
      </div>

      {/* 6-Stage Progress Track */}
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 relative">
        {STAGES.map((s, idx) => {
          const Icon = s.icon;
          const isPassed = idx < stageIndex;
          const isCurrent = idx === stageIndex;

          let badgeColor = "border-border/60 bg-void/50 text-muted-foreground";
          if (isCurrent) {
            if (s.id === "ATTACK_INJECTED") {
              badgeColor =
                "border-destructive bg-destructive/20 text-destructive shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse";
            } else if (s.id === "AI_DETECTION") {
              badgeColor =
                "border-warning bg-warning/20 text-warning shadow-[0_0_12px_rgba(234,179,8,0.35)]";
            } else if (s.id === "ESTIMATION") {
              badgeColor =
                "border-cyan-400 bg-cyan-950/40 text-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.35)]";
            } else if (s.id === "MITIGATION_APPLIED") {
              badgeColor =
                "border-primary bg-primary/20 text-primary-glow shadow-[0_0_12px_rgba(34,211,238,0.35)]";
            } else {
              badgeColor =
                "border-success bg-success/20 text-success shadow-[0_0_12px_rgba(34,197,94,0.35)]";
            }
          } else if (isPassed) {
            badgeColor = "border-success/40 bg-success/10 text-success/80";
          }

          return (
            <div
              key={s.id}
              className={cn(
                "relative flex flex-col items-center text-center p-2 rounded-lg border transition-all duration-300",
                badgeColor
              )}
            >
              <div className="flex items-center justify-center size-6 rounded-full border border-inherit bg-background/50 mb-1">
                <Icon className="size-3" />
              </div>
              <span className="text-[10px] font-bold leading-tight">{s.label}</span>
              <span className="text-[8px] text-muted-foreground mt-0.5 line-clamp-1">
                {s.sub}
              </span>

              {isCurrent && (
                <div className="mt-1 w-full border-t border-inherit pt-0.5 text-[8px] font-semibold truncate">
                  {s.id === "ATTACK_INJECTED" && (activeAttackType || "Active")}
                  {s.id === "AI_DETECTION" &&
                    `Score: ${(anomalyScore ? anomalyScore * 100 : 88).toFixed(0)}%`}
                  {s.id === "ESTIMATION" && "BDD Filtering"}
                  {s.id === "MITIGATION_APPLIED" && (mitigationStrategy || "Remediating")}
                  {s.id === "PHYSICAL_RECOVERY" && "1.00 pu Restored"}
                  {s.id === "NORMAL" && "Steady-State"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
