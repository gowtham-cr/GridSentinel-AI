import { useState } from "react";
import {
  History,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Activity,
  RefreshCw,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EventLogItem } from "@/lib/gridApi";

interface EventHistoryAuditLogProps {
  events: EventLogItem[];
  onRefresh: () => void;
  isLoading?: boolean;
}

export function EventHistoryAuditLog({
  events,
  onRefresh,
  isLoading = false,
}: EventHistoryAuditLogProps) {
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredEvents = events.filter((e) => {
    if (filterType === "ALL") return true;
    if (filterType === "INCIDENT") return e.type === "DETECTION_INCIDENT";
    if (filterType === "ATTACK") return e.type === "ATTACK_INJECTION";
    if (filterType === "MITIGATION") return e.type === "MITIGATION_APPLIED" || e.type === "RECOVERY";
    if (filterType === "RECOVERY") return e.type === "RECOVERY";
    if (filterType === "LIFECYCLE") return e.type === "INITIALIZE" || e.type === "ESTIMATION_EVALUATED" || e.type === "SIMULATION_STEP" || e.type === "RECOVERY";
    return true;
  });

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 backdrop-blur-xl shadow-xl font-mono space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <History className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            Complete Digital-Twin Event Audit Log
          </h3>
          <span className="rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            {events.length} Recorded Events
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-void/50 p-0.5 text-[10px]">
            {["ALL", "INCIDENT", "ATTACK", "MITIGATION", "RECOVERY", "LIFECYCLE"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFilterType(cat)}
                className={cn(
                  "rounded px-2 py-1 font-semibold transition-colors cursor-pointer",
                  filterType === cat
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-void/50 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh event log"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Log Feed */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {filteredEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No events recorded yet. Simulation steps, attack injections, detections, and mitigations
            will automatically be logged here.
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isAttack = evt.type === "ATTACK_INJECTION";
            const isIncident = evt.type === "DETECTION_INCIDENT";
            const isMitigation = evt.type === "MITIGATION_APPLIED";
            const isRecovery = evt.type === "RECOVERY";

            return (
              <div
                key={evt.id}
                className={cn(
                  "rounded-lg border p-3 text-xs transition-all",
                  isAttack
                    ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                    : isIncident
                    ? "border-warning/40 bg-warning/5 hover:bg-warning/10"
                    : isRecovery
                    ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15"
                    : isMitigation
                    ? "border-cyan-500/40 bg-cyan-500/5 hover:bg-cyan-500/10"
                    : "border-border/60 bg-void/40 hover:bg-void/60"
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded",
                        isAttack
                          ? "bg-destructive/20 text-destructive"
                          : isIncident
                          ? "bg-warning/20 text-warning"
                          : isRecovery
                          ? "bg-emerald-500/20 text-emerald-400"
                          : isMitigation
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "bg-primary/20 text-primary"
                      )}
                    >
                      {isAttack ? (
                        <Flame className="size-3" />
                      ) : isIncident ? (
                        <ShieldAlert className="size-3" />
                      ) : isRecovery ? (
                        <CheckCircle2 className="size-3" />
                      ) : isMitigation ? (
                        <CheckCircle2 className="size-3" />
                      ) : (
                        <Activity className="size-3" />
                      )}
                    </span>
                    <span className="font-bold text-foreground">{evt.title}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Target: {evt.target}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] font-bold uppercase",
                        evt.severity === "CRITICAL"
                          ? "bg-destructive/20 text-destructive border border-destructive/40"
                          : evt.severity === "HIGH"
                          ? "bg-accent/20 text-accent border border-accent/40"
                          : evt.severity === "MEDIUM"
                          ? "bg-warning/20 text-warning border border-warning/40"
                          : evt.severity === "LOW"
                          ? "bg-primary/20 text-primary border border-primary/40"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {evt.severity}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {new Date(evt.timestamp).toLocaleTimeString("en-GB", { hour12: false })}
                    </span>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed pl-7">
                  {evt.details}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
