import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StateComparisonReport } from "@/lib/gridApi";

interface StateComparisonMatrixProps {
  comparison: StateComparisonReport | null;
  isLoading?: boolean;
}

export function StateComparisonMatrix({
  comparison,
  isLoading = false,
}: StateComparisonMatrixProps) {
  if (!comparison) {
    return (
      <div className="rounded-xl border border-primary/30 bg-card p-6 backdrop-blur-xl shadow-xl font-mono text-xs">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <GitCompare className="size-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
              3-Way Physical State Comparison Matrix
            </h3>
          </div>
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            ⚡ PANDAPOWER PHYSICS VERIFIED
          </span>
        </div>
        <div className="py-8 text-center text-muted-foreground">
          <Info className="size-6 mx-auto mb-2 opacity-50" />
          <p className="font-semibold text-foreground">Awaiting Attack / Mitigation Cycle</p>
          <p className="text-[11px] mt-1 max-w-md mx-auto">
            Inject a cyberattack scenario above to record the compromised state, then apply simulated
            mitigation to view the 3-way side-by-side engineering comparison.
          </p>
        </div>
      </div>
    );
  }

  const {
    baseline_normal: base,
    attacked_compromised: att,
    recovered_mitigated: rec,
    delta_attack_impact: dAtt,
    delta_recovery_improvement: dRec,
    recovery_effective: isEffective,
  } = comparison;

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-5 backdrop-blur-xl shadow-xl font-mono space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <GitCompare className="size-4 text-primary" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
            3-Way Physical State Comparison Matrix
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
            ⚡ PANDAPOWER AC NEWTON-RAPHSON AUDIT
          </span>
          {rec && isEffective && (
            <span className="rounded border border-success/40 bg-success/15 px-2 py-0.5 text-[10px] text-success font-bold flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              RECOVERY EFFECTIVE
            </span>
          )}
        </div>
      </div>

      {/* 3-Column Comparative Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/70 text-[11px] text-muted-foreground uppercase">
              <th className="py-2.5 px-3">Electrical Parameter</th>
              <th className="py-2.5 px-3 text-primary bg-primary/5 rounded-t-lg">
                1. Nominal Baseline
              </th>
              <th className="py-2.5 px-3 text-destructive bg-destructive/10 rounded-t-lg">
                2. Attacked State
              </th>
              <th className="py-2.5 px-3 text-success bg-success/10 rounded-t-lg">
                3. Mitigated State
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40 text-[11px]">
            {/* Frequency */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Grid Frequency</td>
              <td className="py-2.5 px-3 font-semibold text-foreground bg-primary/5">
                {base.frequency_hz.toFixed(2)} Hz
              </td>
              <td className="py-2.5 px-3 font-semibold text-destructive bg-destructive/10">
                {att.frequency_hz.toFixed(2)} Hz
              </td>
              <td className="py-2.5 px-3 font-semibold text-success bg-success/10">
                {rec ? `${rec.frequency_hz.toFixed(2)} Hz` : "—"}
              </td>
            </tr>

            {/* Min Voltage */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Min Voltage (V_min)</td>
              <td className="py-2.5 px-3 font-semibold text-foreground bg-primary/5">
                {base.min_voltage_pu.toFixed(4)} pu
              </td>
              <td
                className={cn(
                  "py-2.5 px-3 font-semibold bg-destructive/10",
                  att.min_voltage_pu < 0.90 ? "text-destructive" : "text-foreground"
                )}
              >
                {att.min_voltage_pu.toFixed(4)} pu
              </td>
              <td className="py-2.5 px-3 font-semibold text-success bg-success/10">
                {rec ? `${rec.min_voltage_pu.toFixed(4)} pu` : "—"}
              </td>
            </tr>

            {/* Max Voltage */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Max Voltage (V_max)</td>
              <td className="py-2.5 px-3 text-foreground bg-primary/5">
                {base.max_voltage_pu.toFixed(4)} pu
              </td>
              <td className="py-2.5 px-3 text-foreground bg-destructive/10">
                {att.max_voltage_pu.toFixed(4)} pu
              </td>
              <td className="py-2.5 px-3 text-foreground bg-success/10">
                {rec ? `${rec.max_voltage_pu.toFixed(4)} pu` : "—"}
              </td>
            </tr>

            {/* Voltage Violations */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Voltage Violations (&lt;0.90 or &gt;1.10 pu)</td>
              <td className="py-2.5 px-3 text-foreground bg-primary/5">
                {base.voltage_violations_count}
              </td>
              <td
                className={cn(
                  "py-2.5 px-3 font-bold bg-destructive/10",
                  att.voltage_violations_count > 0 ? "text-destructive" : "text-foreground"
                )}
              >
                {att.voltage_violations_count} violation{att.voltage_violations_count !== 1 ? "s" : ""}
              </td>
              <td className="py-2.5 px-3 font-bold text-success bg-success/10">
                {rec ? `${rec.voltage_violations_count} violations` : "—"}
              </td>
            </tr>

            {/* Overloaded Lines */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Overloaded Lines (&gt;100%)</td>
              <td className="py-2.5 px-3 text-foreground bg-primary/5">
                {base.overloaded_lines_count}
              </td>
              <td
                className={cn(
                  "py-2.5 px-3 font-bold bg-destructive/10",
                  att.overloaded_lines_count > 0 ? "text-destructive" : "text-foreground"
                )}
              >
                {att.overloaded_lines_count} lines
              </td>
              <td className="py-2.5 px-3 font-bold text-success bg-success/10">
                {rec ? `${rec.overloaded_lines_count} lines` : "—"}
              </td>
            </tr>

            {/* Total Generation & Load */}
            <tr>
              <td className="py-2.5 px-3 text-muted-foreground">Total Generation / Load</td>
              <td className="py-2.5 px-3 text-foreground bg-primary/5">
                {base.total_generation_mw.toFixed(2)} / {base.total_load_mw.toFixed(2)} MW
              </td>
              <td className="py-2.5 px-3 text-foreground bg-destructive/10">
                {att.total_generation_mw.toFixed(2)} / {att.total_load_mw.toFixed(2)} MW
              </td>
              <td className="py-2.5 px-3 text-foreground bg-success/10">
                {rec ? `${rec.total_generation_mw.toFixed(2)} / ${rec.total_load_mw.toFixed(2)} MW` : "—"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Delta Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
        {/* Attack Impact Delta */}
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs space-y-1">
          <div className="flex items-center gap-1.5 text-destructive font-bold">
            <TrendingDown className="size-4" />
            <span>Attack Degradation Vector (Baseline → Attacked)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-muted-foreground block text-[10px]">Voltage Drop:</span>
              <span className="font-bold text-destructive">
                -{Math.abs(dAtt.voltage_drop_pu).toFixed(4)} p.u.
              </span>
            </div>
            <div>
              <span className="text-muted-foreground block text-[10px]">Freq Deviation:</span>
              <span className="font-bold text-destructive">
                {dAtt.frequency_deviation_hz >= 0 ? `+${dAtt.frequency_deviation_hz.toFixed(2)}` : dAtt.frequency_deviation_hz.toFixed(2)} Hz
              </span>
            </div>
          </div>
        </div>

        {/* Recovery Improvement Delta */}
        {dRec ? (
          <div className="rounded-lg border border-success/40 bg-success/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-success font-bold">
              <TrendingUp className="size-4" />
              <span>Mitigation Restoration Vector (Attacked → Recovered)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
              <div>
                <span className="text-muted-foreground block text-[10px]">Voltage Restored:</span>
                <span className="font-bold text-success">
                  +{dRec.voltage_restored_pu.toFixed(4)} p.u.
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block text-[10px]">Violations Cleared:</span>
                <span className="font-bold text-success">
                  {dRec.voltage_violations_eliminated} cleared
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-border/50 bg-void/40 p-3 text-xs flex items-center justify-center text-muted-foreground">
            <span>Mitigation not yet executed for this cycle</span>
          </div>
        )}
      </div>
    </div>
  );
}
