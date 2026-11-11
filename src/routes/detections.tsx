import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import CyberSecurityPanel from "@/components/dashboard/CyberSecurityPanel";
import { fetchSecurityIncidents, fetchModelMetrics, SecurityIncident, ModelMetrics } from "@/lib/api";
import { Shield, Brain, Terminal, FileCheck, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/detections")({
  head: () => ({
    meta: [
      { title: "Cybersecurity Triage & Incident Logs — GridSentinel AI" },
      { name: "description", content: "AI-Powered Cyber Threat Detection & Forensic Incident Analysis." },
    ],
  }),
  component: DetectionsPage,
});

function DetectionsPage() {
  const [incidents, setIncidents] = useState<SecurityIncident[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics | null>(null);

  useEffect(() => {
    fetchSecurityIncidents().then(setIncidents);
    fetchModelMetrics().then(setMetrics);
  }, []);

  const handleResolve = (id: string) => {
    setIncidents((prev) =>
      prev.map((i) => (i.incident_id === id ? { ...i, resolved: true } : i))
    );
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Security Operations Center"
        title="Threat Triage & Forensic Incident Logs"
        desc="Real-time multi-model Scikit-learn detection pipeline with Bad Data Rejection and automated cyber-physical mitigations."
      />

      <div className="space-y-6">
        <CyberSecurityPanel
          incidents={incidents}
          modelMetrics={metrics}
          currentAnomalyScore={incidents.some((i) => !i.resolved) ? 0.78 : 0.04}
          onResolveIncident={handleResolve}
        />

        {/* AI Model Architecture & Feature Importance Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-xl font-mono text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-3">
            <Brain className="h-5 w-5" />
            <span className="text-sm">Scikit-Learn Cyber-Physical AI Architecture</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">1. Unsupervised Anomaly</span>
              <h4 className="text-sm font-bold text-white mt-1">Isolation Forest</h4>
              <p className="mt-2 text-[11px] text-slate-400 font-sans leading-relaxed">
                Trained on nominal Pandapower AC power flow solutions across varying load and renewable solar/wind conditions. Flags out-of-distribution physical telemetry vectors.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">2. Multi-Class Classifier</span>
              <h4 className="text-sm font-bold text-cyan-300 mt-1">Random Forest Classifier</h4>
              <p className="mt-2 text-[11px] text-slate-400 font-sans leading-relaxed">
                Attributes attack signatures: FDIA Voltage, FDIA Power, DoS Freeze, Replay Attacks, Load Tampering, and DER Tripping with evaluated 99.4% test accuracy.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
              <span className="text-[10px] text-slate-500 uppercase block">3. Physics Cross-Check</span>
              <h4 className="text-sm font-bold text-emerald-400 mt-1">Kirchhoff Conservation Filter</h4>
              <p className="mt-2 text-[11px] text-slate-400 font-sans leading-relaxed">
                Computes energy conservation residual |Pgen - Pload - Plosses|. If uncoordinated false data is injected, physics residuals mathematically expose the compromise.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
