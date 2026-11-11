import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  AreaChart,
  Area,
} from "recharts";
import { Activity, Zap, TrendingUp } from "lucide-react";
import { BusData } from "@/lib/api";

interface GridChartsProps {
  buses: BusData[];
  totalGen: number;
  totalLoad: number;
  hasActiveAttack?: boolean;
}

interface TimePoint {
  time: string;
  frequency: number;
  v_bus0: number;
  v_bus2: number;
  v_bus5: number;
  v_bus6: number;
  gen: number;
  load: number;
}

export default function GridCharts({
  buses,
  totalGen,
  totalLoad,
  hasActiveAttack = false,
}: GridChartsProps) {
  const [dataHistory, setDataHistory] = useState<TimePoint[]>([]);
  const [selectedChart, setSelectedChart] = useState<"frequency" | "voltage" | "power">("frequency");

  // Sample or generate continuous rolling time-series points
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = `${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

      const b0 = buses.find((b) => b.bus_id === 0)?.vm_pu ?? 1.02;
      const b2 = buses.find((b) => b.bus_id === 2)?.vm_pu ?? 1.025;
      const b5 = buses.find((b) => b.bus_id === 5)?.vm_pu ?? 0.998;
      const b6 = buses.find((b) => b.bus_id === 6)?.vm_pu ?? 0.991;

      // Realistic frequency simulation: nominal 50.00 Hz
      let freq = 50.0 + (Math.random() - 0.5) * 0.03;
      if (hasActiveAttack) {
        freq = 49.78 + (Math.random() - 0.5) * 0.08; // Frequency transient excursion
      }

      const point: TimePoint = {
        time: timeStr,
        frequency: Math.round(freq * 100) / 100,
        v_bus0: Math.round(b0 * 1000) / 1000,
        v_bus2: Math.round(b2 * 1000) / 1000,
        v_bus5: Math.round(b5 * 1000) / 1000,
        v_bus6: Math.round(b6 * 1000) / 1000,
        gen: Math.round(totalGen * 100) / 100,
        load: Math.round(totalLoad * 100) / 100,
      };

      setDataHistory((prev) => {
        const next = [...prev, point];
        return next.slice(-20); // Keep last 20 seconds
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [buses, totalGen, totalLoad, hasActiveAttack]);

  const currentFreq = dataHistory.length > 0 ? dataHistory[dataHistory.length - 1].frequency : 50.0;

  return (
    <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/80 p-5 shadow-xl backdrop-blur-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/40 bg-cyan-950/40 text-cyan-400">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-semibold text-white">
              Dynamic Frequency & Voltage Analytics
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Real-time IEEE 1547 frequency containment & multi-bus voltage stability
            </p>
          </div>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 font-mono text-xs">
          <button
            onClick={() => setSelectedChart("frequency")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedChart === "frequency" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Frequency (50Hz)
          </button>
          <button
            onClick={() => setSelectedChart("voltage")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedChart === "voltage" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Bus Voltage (p.u.)
          </button>
          <button
            onClick={() => setSelectedChart("power")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedChart === "power" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold" : "text-slate-400 hover:text-white"
            }`}
          >
            Dispatch (Pgen vs Pload)
          </button>
        </div>
      </div>

      {/* Frequency Chart */}
      {selectedChart === "frequency" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Grid Frequency:</span>
              <span className={`text-base font-bold ${hasActiveAttack ? "text-amber-400" : "text-emerald-400"}`}>
                {currentFreq.toFixed(2)} Hz
              </span>
              <span className="text-[10px] text-slate-500">Nominal 50.00 Hz (±0.20 Hz safe band)</span>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Live Frequency
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 bg-red-400 inline-block" />
                Trip Limits (49.8 / 50.2 Hz)
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis
                  domain={[49.6, 50.4]}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v.toFixed(1)}Hz`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", borderColor: "#0ea5e9", borderRadius: "0.75rem", fontSize: "11px" }}
                  labelStyle={{ color: "#38bdf8" }}
                />
                <ReferenceLine y={50.0} stroke="#38bdf8" strokeDasharray="2 2" label={{ value: "50.00 Hz Nominal", fill: "#38bdf8", fontSize: 10 }} />
                <ReferenceLine y={50.2} stroke="#f87171" strokeDasharray="3 3" />
                <ReferenceLine y={49.8} stroke="#f87171" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="frequency"
                  stroke="#06b6d4"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Voltage Chart */}
      {selectedChart === "voltage" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <span className="text-slate-400">Multi-Bus Voltage Magnitude Envelope</span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-cyan-400">Node 0 (Slack)</span>
              <span className="text-yellow-400">Node 2 (Solar)</span>
              <span className="text-red-400">Node 5 (Hospital)</span>
              <span className="text-orange-400">Node 6 (Industrial)</span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis
                  domain={[0.92, 1.12]}
                  stroke="#64748b"
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  tickFormatter={(v) => `${v.toFixed(2)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", borderColor: "#0ea5e9", borderRadius: "0.75rem", fontSize: "11px" }}
                  labelStyle={{ color: "#38bdf8" }}
                />
                <ReferenceLine y={1.05} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "1.05 p.u. Max Limit", fill: "#ef4444", fontSize: 10 }} />
                <ReferenceLine y={0.95} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "0.95 p.u. Min Limit", fill: "#ef4444", fontSize: 10 }} />
                <Line type="monotone" dataKey="v_bus0" stroke="#06b6d4" strokeWidth={2} dot={false} isAnimationActive={false} name="Substation Bus 0" />
                <Line type="monotone" dataKey="v_bus2" stroke="#facc15" strokeWidth={2} dot={false} isAnimationActive={false} name="Solar PV Bus 2" />
                <Line type="monotone" dataKey="v_bus5" stroke="#ef4444" strokeWidth={2.5} dot={false} isAnimationActive={false} name="Hospital Bus 5" />
                <Line type="monotone" dataKey="v_bus6" stroke="#f97316" strokeWidth={2} dot={false} isAnimationActive={false} name="Industrial Bus 6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Power Dispatch Chart */}
      {selectedChart === "power" && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3 font-mono text-xs">
            <span className="text-slate-400">Total Generation vs Aggregate Demand</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                Total Gen: {totalGen.toFixed(2)} MW
              </span>
              <span className="flex items-center gap-1.5 text-purple-400">
                <span className="h-2 w-2 rounded-full bg-purple-400" />
                Total Load: {totalLoad.toFixed(2)} MW
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dataHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${v.toFixed(1)}MW`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#020617", borderColor: "#0ea5e9", borderRadius: "0.75rem", fontSize: "11px" }}
                  labelStyle={{ color: "#38bdf8" }}
                />
                <Area type="monotone" dataKey="gen" stroke="#06b6d4" fillOpacity={1} fill="url(#colorGen)" name="Total Generation (MW)" />
                <Area type="monotone" dataKey="load" stroke="#a855f7" fillOpacity={1} fill="url(#colorLoad)" name="Total Demand (MW)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

