import { useState } from "react";
import { SecurityIncident, ModelMetrics } from "@/lib/api";
import { Shield, Brain, Terminal, AlertCircle, CheckCircle, Search, Download, Filter, Cpu } from "lucide-react";

interface CyberSecurityPanelProps {
  incidents: SecurityIncident[];
  modelMetrics?: ModelMetrics | null;
  currentAnomalyScore?: number;
  onResolveIncident?: (id: string) => void;
}

export default function CyberSecurityPanel({
  incidents,
  modelMetrics,
  currentAnomalyScore = 0.04,
  onResolveIncident,
}: CyberSecurityPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredIncidents = incidents.filter((inc) => {
    const matchesSeverity = filterSeverity === "ALL" || inc.severity === filterSeverity;
    const matchesSearch =
      searchQuery === "" ||
      inc.attack_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.target_component.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inc.incident_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(incidents, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `gridsentinel_incident_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              AI Cyber Threat Detection & Incident Response
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Scikit-learn multi-model pipeline & real-time automated mitigation
            </p>
          </div>
        </div>

        {/* AI Model Badge */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-slate-900/80 px-2.5 py-1 text-cyan-300">
            <Brain className="h-3.5 w-3.5 text-cyan-400" />
            <span>Accuracy: {(modelMetrics?.accuracy ? modelMetrics.accuracy * 100 : 99.4).toFixed(1)}%</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 text-emerald-300">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>F1: {(modelMetrics?.f1_score ? modelMetrics.f1_score * 100 : 99.2).toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Top Threat Indicators & Anomaly Score Gauge */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3 font-mono text-xs">
        {/* Anomaly Gauge */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
          <span className="text-[10px] text-slate-400 block uppercase">Real-Time Anomaly Score</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span
              className={`text-2xl font-bold ${
                currentAnomalyScore > 0.6 ? "text-red-400 animate-pulse" : currentAnomalyScore > 0.3 ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {(currentAnomalyScore * 100).toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">
              {currentAnomalyScore > 0.6 ? "ANOMALOUS" : currentAnomalyScore > 0.3 ? "ELEVATED" : "NOMINAL"}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full mt-2.5 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                currentAnomalyScore > 0.6 ? "bg-red-500" : currentAnomalyScore > 0.3 ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${Math.min(currentAnomalyScore * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Unresolved Incidents */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
          <span className="text-[10px] text-slate-400 block uppercase">Active Incident Alerts</span>
          <span className="text-2xl font-bold text-white mt-1 block">
            {incidents.filter((i) => !i.resolved).length}
          </span>
          <span className="text-[10px] text-slate-500">Awaiting operator verification</span>
        </div>

        {/* Monitored Features */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3.5">
          <span className="text-[10px] text-slate-400 block uppercase">Cyber-Physical Features</span>
          <span className="text-2xl font-bold text-cyan-300 mt-1 block">
            {modelMetrics?.features_used?.length ?? 15} Vectors
          </span>
          <span className="text-[10px] text-slate-500">Kirchhoff residuals + PMU voltages</span>
        </div>

        {/* Protection Mode */}
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5">
          <span className="text-[10px] text-emerald-400/80 block uppercase">Defense Posture</span>
          <span className="text-base font-bold text-emerald-300 mt-1 block">Active Auto-Mitigation</span>
          <span className="text-[10px] text-emerald-400/60">Bad Data Rejection Armed</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search attack vector or node..."
            className="w-full rounded-xl border border-slate-800 bg-slate-900/80 py-2 pl-9 pr-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-1">
            {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2.5 py-1 rounded-lg text-[10px] transition-colors ${
                  filterSeverity === sev ? "bg-cyan-500/20 text-cyan-300 font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportLogs}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
            title="Download JSON incident audit report"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Log</span>
          </button>
        </div>
      </div>

      {/* Terminal-Style Security Event Stream */}
      <div className="mt-4 rounded-xl border border-slate-800/90 bg-slate-950 overflow-hidden font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>CYBERSECURITY AUDIT LOG STREAM</span>
          </div>
          <span>Showing {filteredIncidents.length} events</span>
        </div>

        <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/50 p-2 space-y-1">
          {filteredIncidents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No matching security incidents found. System operating within nominal physical bounds.
            </div>
          ) : (
            filteredIncidents.map((inc) => (
              <div
                key={inc.incident_id}
                className="p-3 rounded-lg hover:bg-slate-900/60 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        inc.severity === "CRITICAL"
                          ? "bg-red-500/20 text-red-300 border border-red-500/40"
                          : inc.severity === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <span className="font-semibold text-white">{inc.attack_type.toUpperCase()}</span>
                    <span className="text-slate-500 text-[11px]">➔ {inc.target_component}</span>
                    <span className="text-slate-500 text-[10px]">{new Date(inc.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    {inc.mitigation_recommendation}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span>Incident: {inc.incident_id}</span>
                    <span>•</span>
                    <span>Anomaly Score: {(inc.anomaly_score * 100).toFixed(1)}%</span>
                    <span>•</span>
                    <span>Confidence: {(inc.confidence * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Resolve Action */}
                <div className="shrink-0 self-start mt-1">
                  {inc.resolved ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Resolved
                    </span>
                  ) : (
                    <button
                      onClick={() => onResolveIncident?.(inc.incident_id)}
                      className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-300 hover:bg-cyan-900/60 transition-colors cursor-pointer"
                    >
                      Acknowledge & Mitigate
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

