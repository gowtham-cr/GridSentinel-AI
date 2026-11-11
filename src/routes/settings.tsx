import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import { appConfig } from "@/config/app";
import { fetchHealth, checkBackendConnection } from "@/lib/api";
import { Settings, ShieldCheck, Server, RefreshCw, CheckCircle2, AlertTriangle, Shield, Cpu } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Compliance — GridSentinel AI" },
      { name: "description", content: "Platform Configuration, Backend Health, and Grid Standards Compliance." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const [healthData, setHealthData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    const online = await checkBackendConnection();
    setBackendOnline(online);
    const h = await fetchHealth();
    setHealthData(h);
    setIsChecking(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <AppShell>
      <PageHeader
        eyebrow="Configuration & Standards"
        title="System Parameters & Grid Compliance"
        desc="Backend services connectivity, pandapower numerical solver thresholds, and cybersecurity compliance benchmarks."
      />

      <div className="space-y-6 font-mono text-xs">
        {/* Backend Status Card */}
        <div className="rounded-2xl border border-cyan-500/30 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
                <Server className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-semibold text-white">
                  FastAPI Backend Connection
                </h3>
                <p className="text-xs text-slate-400 font-sans">
                  Local electrical engineering calculation & machine learning REST engine
                </p>
              </div>
            </div>

            <button
              onClick={checkConnection}
              disabled={isChecking}
              className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-cyan-300 hover:border-cyan-400 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
              <span>Test Connection</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">API Base URL</span>
              <span className="text-sm font-bold text-cyan-300 mt-1 block break-all">
                {appConfig.apiBaseUrl}
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                {backendOnline ? "🟢 Service Reachable" : "🟡 Offline / Using High-Fidelity Demo Engine"}
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">Power Flow Solver</span>
              <span className="text-sm font-bold text-white mt-1 block">
                Pandapower AC Newton-Raphson
              </span>
              <span className="text-[10px] text-emerald-400 mt-1 block">
                ✓ Non-linear nodal power balance
              </span>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">Database Storage</span>
              <span className="text-sm font-bold text-white mt-1 block">
                SQLite 3 (Local Zero-Config)
              </span>
              <span className="text-[10px] text-slate-500 mt-1 block">
                TelemetryLogs & SecurityIncidents
              </span>
            </div>
          </div>
        </div>

        {/* IEEE / NERC Compliance Checklist */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-2.5 text-white font-semibold mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="font-display text-base">Cyber-Physical Standards & Grid Compliance</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/15 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300">IEEE 1547-2018</span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300 font-bold">
                  COMPLIANT
                </span>
              </div>
              <p className="font-sans text-xs text-slate-400 leading-relaxed">
                Standard for Interconnection and Interoperability of Distributed Energy Resources with Associated Electric Power Systems Interfaces.
              </p>
              <div className="text-[10px] text-slate-400 pt-1">
                ✓ Voltage Ride-Through: 0.95 - 1.05 p.u.
                <br />
                ✓ Frequency Trip Margins: 49.8 - 50.2 Hz
              </div>
            </div>

            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/15 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300">NERC CIP-005 / CIP-007</span>
                <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] text-cyan-300 font-bold">
                  ENFORCED
                </span>
              </div>
              <p className="font-sans text-xs text-slate-400 leading-relaxed">
                North American Electric Reliability Corporation Critical Infrastructure Protection standards for Electronic Security Perimeters.
              </p>
              <div className="text-[10px] text-slate-400 pt-1">
                ✓ Electronic Security Perimeter Armed
                <br />
                ✓ System Security Management Active
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-950/15 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300">IEC 62351 / 61850</span>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] text-purple-300 font-bold">
                  VERIFIED
                </span>
              </div>
              <p className="font-sans text-xs text-slate-400 leading-relaxed">
                Power systems management and associated information exchange - Data and communications security for substation automation.
              </p>
              <div className="text-[10px] text-slate-400 pt-1">
                ✓ GOOSE Message Authentication
                <br />
                ✓ PMU Synchrophasor Stream Validation
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
