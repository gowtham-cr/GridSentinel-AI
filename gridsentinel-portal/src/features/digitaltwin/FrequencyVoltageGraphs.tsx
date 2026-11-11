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
} from "recharts";
import { Activity, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusElectricalData } from "@/lib/gridApi";

interface FrequencyVoltageGraphsProps {
  frequencyHz: number;
  buses: BusElectricalData[];
  isAttackActive?: boolean;
}

interface TelemetryPoint {
  time: string;
  freq: number;
  vSlack: number;
  vSolar: number;
  vWind: number;
  vLoad: number;
}

export function FrequencyVoltageGraphs({
  frequencyHz,
  buses,
  isAttackActive = false,
}: FrequencyVoltageGraphsProps) {
  const [data, setData] = useState<TelemetryPoint[]>([]);
  const [activeTab, setActiveTab] = useState<"freq" | "volt">("freq");

  // Keep a rolling buffer of 20 points
  useEffect(() => {
    const now = new Date().toLocaleTimeString("en-GB", {
      hour12: false,
      minute: "2-digit",
      second: "2-digit",
    });

    const b0 = buses.find((b) => b.bus_id === 0)?.vm_pu ?? 1.0;
    const b2 = buses.find((b) => b.bus_id === 2)?.vm_pu ?? 1.012;
    const b3 = buses.find((b) => b.bus_id === 3)?.vm_pu ?? 1.009;
    const b5 = buses.find((b) => b.bus_id === 5)?.vm_pu ?? 0.985;

    setData((prev) => {
      const nextPoint: TelemetryPoint = {
        time: now,
        freq: frequencyHz,
        vSlack: b0,
        vSolar: b2,
        vWind: b3,
        vLoad: b5,
      };
      const updated = [...prev, nextPoint];
      if (updated.length > 20) updated.shift();
      return updated;
    });
  }, [frequencyHz, buses]);

  return (
    <div className="rounded-xl border border-primary/30 bg-card p-4 backdrop-blur-xl shadow-lg font-mono text-xs">
      {/* Header with Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          {activeTab === "freq" ? (
            <Activity className="size-4 text-primary" />
          ) : (
            <Zap className="size-4 text-accent" />
          )}
          <h4 className="font-bold uppercase tracking-wider text-foreground">
            {activeTab === "freq"
              ? "Real-Time Frequency Response (Hz)"
              : "Bus Voltage Response Envelope (p.u.)"}
          </h4>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-border bg-void/60 p-0.5 text-[10px]">
          <button
            type="button"
            onClick={() => setActiveTab("freq")}
            className={cn(
              "rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer",
              activeTab === "freq"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Frequency (Hz)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("volt")}
            className={cn(
              "rounded px-2.5 py-1 font-semibold transition-colors cursor-pointer",
              activeTab === "volt"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Voltage Profiles (pu)
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="mt-4 h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "freq" ? (
            <LineChart data={data} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[49.0, 51.0]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val.toFixed(1)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 15, 29, 0.95)",
                  borderColor: "rgba(34, 211, 238, 0.3)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
                formatter={(value: any) => [`${parseFloat(value).toFixed(2)} Hz`, "Frequency"]}
              />
              <ReferenceLine y={50.0} stroke="#22d3ee" strokeDasharray="2 2" label={{ value: "50.0 Hz Nominal", fill: "#22d3ee", fontSize: 9, position: "insideTopLeft" }} />
              <ReferenceLine y={50.2} stroke="#f59e0b" strokeDasharray="3 3" />
              <ReferenceLine y={49.8} stroke="#f59e0b" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="freq"
                stroke={isAttackActive ? "#ef4444" : "#22d3ee"}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <LineChart data={data} margin={{ top: 8, right: 12, left: -22, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0.88, 1.15]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `${val.toFixed(2)}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(10, 15, 29, 0.95)",
                  borderColor: "rgba(34, 211, 238, 0.3)",
                  borderRadius: "8px",
                  fontSize: "11px",
                }}
              />
              <ReferenceLine y={1.10} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "1.10 pu Max", fill: "#ef4444", fontSize: 9, position: "insideTopLeft" }} />
              <ReferenceLine y={0.90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "0.90 pu Min", fill: "#ef4444", fontSize: 9, position: "insideBottomLeft" }} />
              <ReferenceLine y={1.00} stroke="#22d3ee" strokeDasharray="2 2" />
              <Line type="monotone" dataKey="vSlack" name="Bus 0 Slack" stroke="#38bdf8" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="vSolar" name="Bus 2 Solar" stroke="#fbbf24" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="vWind" name="Bus 3 Wind" stroke="#34d399" strokeWidth={1.5} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="vLoad" name="Bus 5 Industry" stroke="#f43f5e" strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-primary" /> Bus 0 Slack
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-warning" /> Bus 2 Solar
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-success" /> Bus 3 Wind
          </span>
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-destructive" /> Bus 5 Industrial
          </span>
        </div>
        <span className="text-primary font-semibold">IEEE 1547 Grid Standard</span>
      </div>
    </div>
  );
}

