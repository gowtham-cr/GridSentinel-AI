import { useState } from "react";
import { ActiveAttack } from "@/lib/api";
import { Zap, ShieldAlert, Play, Square, AlertOctagon, RotateCcw, Flame } from "lucide-react";

interface AttackLabProps {
  activeAttacks: ActiveAttack[];
  onLaunchAttack: (type: string, targetBus: number, intensity: number, duration: number) => void;
  onStopAttack: (attackId: string) => void;
  onStopAll: () => void;
}

const ATTACK_VECTORS = [
  {
    id: "fdia_voltage",
    name: "FDIA: Bus Voltage Spoofing",
    desc: "Falsifies PMU voltage magnitude readings reported to EMS, attempting to induce unnecessary tap changer operations.",
    defaultTarget: 5,
    defaultIntensity: 1.8,
    category: "Telemetry Manipulation",
  },
  {
    id: "fdia_power",
    name: "FDIA: Active Power Injection",
    desc: "Injects false generation/load power measurements, violating Kirchhoff conservation residuals to trick automatic dispatch.",
    defaultTarget: 2,
    defaultIntensity: 2.0,
    category: "Telemetry Manipulation",
  },
  {
    id: "dos_freeze",
    name: "DoS: Sensor Telemetry Freeze",
    desc: "Simulates communication buffer exhaustion where RTU continuously replays frozen static readings with zero variance.",
    defaultTarget: 3,
    defaultIntensity: 1.0,
    category: "Network Disruption",
  },
  {
    id: "replay_attack",
    name: "Historical Replay Attack",
    desc: "Captures past valid state telemetry vectors and replays them back to operator, masking genuine grid transient shifts.",
    defaultTarget: 1,
    defaultIntensity: 1.0,
    category: "Stealth Deception",
  },
  {
    id: "load_tampering",
    name: "Cyber-Physical Load Surge",
    desc: "Adversary compromises IoT load controllers to surge physical demand by 200%, triggering line thermal overloads.",
    defaultTarget: 6,
    defaultIntensity: 2.2,
    category: "Physical Impact",
  },
  {
    id: "der_disconnect",
    name: "DER Tripping / Disconnect",
    desc: "Malicious trip command sent to Solar PV inverter via compromised Modbus protocol, causing sudden power loss.",
    defaultTarget: 2,
    defaultIntensity: 1.0,
    category: "Physical Impact",
  },
];

export default function AttackLab({
  activeAttacks,
  onLaunchAttack,
  onStopAttack,
  onStopAll,
}: AttackLabProps) {
  const [selectedVector, setSelectedVector] = useState(ATTACK_VECTORS[0]);
  const [targetBus, setTargetBus] = useState(ATTACK_VECTORS[0].defaultTarget);
  const [intensity, setIntensity] = useState(ATTACK_VECTORS[0].defaultIntensity);
  const [duration, setDuration] = useState(60);

  const handleSelectVector = (vec: (typeof ATTACK_VECTORS)[0]) => {
    setSelectedVector(vec);
    setTargetBus(vec.defaultTarget);
    setIntensity(vec.defaultIntensity);
  };

  const isCurrentVectorActive = activeAttacks.some((a) => a.attack_type === selectedVector.id);

  return (
    <div className="rounded-2xl border border-red-500/25 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/40 bg-red-950/40 text-red-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Virtual Cyber-Physical Attack Injection Deck
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Safely confined to local virtual environment simulation • Zero physical hardware connection
            </p>
          </div>
        </div>

        {activeAttacks.length > 0 && (
          <button
            onClick={onStopAll}
            className="flex items-center gap-2 rounded-xl border border-red-500/50 bg-red-600/20 px-3.5 py-1.5 font-mono text-xs font-semibold text-red-300 hover:bg-red-600/30 transition-all active:scale-95 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.25)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>NEUTRALIZE ALL ATTACKS ({activeAttacks.length})</span>
          </button>
        )}
      </div>

      {/* Active Attacks Status Banner */}
      {activeAttacks.length > 0 && (
        <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/30 p-3.5 font-mono text-xs text-red-200">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold flex items-center gap-2">
              <Flame className="h-4 w-4 text-red-400 animate-pulse" />
              ACTIVE SIMULATED INTRUSION VECTORS:
            </span>
            <span className="text-[10px] text-red-400">CONFINED TO LOCAL MEMORY</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {activeAttacks.map((atk) => (
              <div
                key={atk.attack_id}
                className="flex items-center gap-2 rounded-lg bg-red-900/40 border border-red-500/30 px-3 py-1.5"
              >
                <span>
                  <strong>{atk.attack_type.toUpperCase()}</strong> on {atk.target_component} (Intensity: {atk.intensity.toFixed(1)}x)
                </span>
                <button
                  onClick={() => onStopAttack(atk.attack_id)}
                  className="rounded bg-red-800/80 px-1.5 py-0.5 text-[10px] hover:bg-red-700 text-white transition-colors"
                >
                  Stop
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vector Selector Cards */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2.5 font-mono text-xs">
        {ATTACK_VECTORS.map((vec) => {
          const isSelected = selectedVector.id === vec.id;
          const isActive = activeAttacks.some((a) => a.attack_type === vec.id);

          return (
            <button
              key={vec.id}
              onClick={() => handleSelectVector(vec)}
              className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? "border-red-500/60 bg-red-950/25 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-1 ring-red-400/30"
                  : "border-slate-800 bg-slate-900/40 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-white">{vec.name}</span>
                {isActive && (
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                )}
              </div>
              <span className="text-[10px] text-slate-400 block mb-1">{vec.category}</span>
              <p className="text-[10px] text-slate-500 line-clamp-2 font-sans">{vec.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Attack Parameter Configuration */}
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/50 p-4 font-mono text-xs">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <span className="text-white font-semibold">Configuring: {selectedVector.name}</span>
          <span className="text-slate-400 text-[10px]">LOCAL VIRTUAL ENVIRONMENT</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Bus */}
          <div>
            <label className="text-slate-400 block text-[11px] mb-1.5">Target Microgrid Node</label>
            <select
              value={targetBus}
              onChange={(e) => setTargetBus(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 px-3 text-white focus:border-red-400 focus:outline-none"
            >
              <option value={0}>Node 0: Substation Slack (20 kV)</option>
              <option value={1}>Node 1: Main Switchgear Incomer</option>
              <option value={2}>Node 2: Solar PV Array (1.5 MW)</option>
              <option value={3}>Node 3: Wind Turbine Generator (1.8 MW)</option>
              <option value={4}>Node 4: BESS Energy Storage (0.8 MW)</option>
              <option value={5}>Node 5: Critical Hospital Feeder (0.45 MW)</option>
              <option value={6}>Node 6: Industrial Manufacturing (2.1 MW)</option>
              <option value={7}>Node 7: Residential District (1.35 MW)</option>
            </select>
          </div>

          {/* Attack Intensity */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <label className="text-slate-400">Attack Magnitude / Intensity</label>
              <span className="text-red-400 font-bold">{intensity.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))}
              className="w-full accent-red-500"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <span>0.5x (Subtle)</span>
              <span>1.5x (Nominal)</span>
              <span>3.0x (Aggressive)</span>
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="text-slate-400 block text-[11px] mb-1.5">Auto-Neutralize Duration</label>
            <div className="flex items-center gap-2">
              {[30, 60, 120].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setDuration(sec)}
                  className={`flex-1 rounded-lg py-2 border transition-colors ${
                    duration === sec ? "border-red-500/50 bg-red-950/40 text-red-300 font-bold" : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Launch Button */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-sans">
            Launches virtual attack against local in-memory simulation variables. Pandapower will compute real physical power flow impact.
          </p>

          <button
            onClick={() => onLaunchAttack(selectedVector.id, targetBus, intensity, duration)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 px-6 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
          >
            <Zap className="h-4 w-4" />
            <span>Launch Virtual Attack</span>
          </button>
        </div>
      </div>
    </div>
  );
}

