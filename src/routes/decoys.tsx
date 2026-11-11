import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell, PageHeader } from "@/components/layout/AppShell";
import AttackLab from "@/components/dashboard/AttackLab";
import {
  fetchActiveAttacks,
  launchAttack,
  stopAttack,
  stopAllAttacks,
  ActiveAttack,
} from "@/lib/api";
import { ShieldAlert, Terminal, Shield, CheckCircle2, Lock } from "lucide-react";

export const Route = createFileRoute("/decoys")({
  head: () => ({
    meta: [
      { title: "Cyber-Physical Attack Simulation Deck — GridSentinel AI" },
      { name: "description", content: "Controlled Virtual Attack Injections & Deception Testing for Smart Grids." },
    ],
  }),
  component: AttackSimulationPage,
});

function AttackSimulationPage() {
  const [activeAttacks, setActiveAttacks] = useState<ActiveAttack[]>([]);

  useEffect(() => {
    fetchActiveAttacks().then(setActiveAttacks);
    const interval = setInterval(() => {
      fetchActiveAttacks().then(setActiveAttacks);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleLaunch = async (type: string, targetBus: number, intensity: number, duration: number) => {
    await launchAttack(type, targetBus, intensity, duration);
    fetchActiveAttacks().then(setActiveAttacks);
  };

  const handleStop = async (id: string) => {
    await stopAttack(id);
    fetchActiveAttacks().then(setActiveAttacks);
  };

  const handleStopAll = async () => {
    await stopAllAttacks();
    fetchActiveAttacks().then(setActiveAttacks);
  };

  return (
    <AppShell>
      <PageHeader
        eyebrow="Virtual Attack Lab"
        title="Cyber-Physical Attack Simulation & Deception Testing"
        desc="Safe evaluation of smart grid attack vectors strictly confined to local virtual environment memory."
      />

      <div className="space-y-6">
        <AttackLab
          activeAttacks={activeAttacks}
          onLaunchAttack={handleLaunch}
          onStopAttack={handleStop}
          onStopAll={handleStopAll}
        />

        {/* Local Safety Confinement Explanation Card */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/15 p-6 shadow-xl font-mono text-xs text-slate-300">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold mb-2">
            <Lock className="h-5 w-5" />
            <span className="text-sm">Safety Protocol: Zero-Hardware Virtual Confinement</span>
          </div>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            All simulated attack perturbations (False Data Injection, Denial of Service sensor freezes, historical state replays, and load surges) are strictly isolated within local process memory. The electrical grid response is solved numerically via <strong>Pandapower Newton-Raphson AC power flow calculations</strong>. No live electrical infrastructure, relays, or high-voltage circuits are connected.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
