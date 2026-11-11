import React, { useEffect } from "react";
import { EventHistoryAuditLog } from "../digitaltwin/EventHistoryAuditLog";
import { useSimulation } from "../simulation/SimulationContext";
import { Clock, Database, ShieldCheck, Zap, Download, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SimulationHistoryView() {
  const { eventHistory, refreshHistory, isLoading } = useSimulation();

  // Trigger an immediate sync when navigating to the view to ensure up-to-the-second state
  useEffect(() => {
    refreshHistory();
  }, [refreshHistory]);

  const totalEvents = eventHistory.length;
  const criticalCount = eventHistory.filter((e) => e.severity === "CRITICAL").length;
  const attackCount = eventHistory.filter((e) => e.type === "ATTACK_INJECTION").length;
  const mitigationCount = eventHistory.filter((e) => e.type === "MITIGATION_APPLIED" || e.type === "RECOVERY").length;

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner: SQLite Persistent Audit Trail */}
      <div className="rounded-xl border border-primary/40 bg-card/90 p-3.5 backdrop-blur-xl shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded-lg border border-primary/50 bg-primary/10 text-primary shadow-[0_0_12px_rgba(34,211,238,0.3)]">
            <Database className="size-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-bold tracking-wider text-foreground uppercase">
              PERSISTENT SQLITE FORENSIC AUDIT TRAIL
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              IMMUTABLE CHRONOLOGICAL RECORD · COMPLIANT WITH NERC CIP-008 INCIDENT REPORTING
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refreshHistory}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card/60 px-3 py-1.5 font-bold text-muted-foreground hover:text-foreground transition-all cursor-pointer text-[10px]"
          >
            <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
            <span>Sync DB</span>
          </button>
        </div>
      </div>

      {/* Forensic Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-lg">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Recorded Events</span>
          <p className="mt-2 font-display text-2xl font-black tracking-wider text-foreground">{totalEvents}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Persisted in SQLite database</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-lg">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Critical Alarms</span>
          <p className="mt-2 font-display text-2xl font-black tracking-wider text-destructive">{criticalCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Physical limit breaches</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-lg">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Attack Injections</span>
          <p className="mt-2 font-display text-2xl font-black tracking-wider text-amber-400">{attackCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Controlled simulated faults</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/90 p-3.5 shadow-lg">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Mitigations Executed</span>
          <p className="mt-2 font-display text-2xl font-black tracking-wider text-emerald-400">{mitigationCount}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Autonomous recoveries verified</p>
        </div>
      </div>

      {/* Complete Event History Audit Log Component */}
      <div className="pt-1">
        <EventHistoryAuditLog
          events={eventHistory}
          onRefresh={refreshHistory}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

