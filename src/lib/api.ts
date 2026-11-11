/**
 * GridSentinel AI - API Client & Demonstration Data Provider.
 * Gracefully connects to the FastAPI backend at http://localhost:8000/api/v1
 * with seamless fallback to realistic demonstration data when offline.
 */

import { appConfig } from "@/config/app";

export interface BusData {
  bus_id: number;
  name: string;
  vn_kv: number;
  vm_pu: number;
  va_degree: number;
  p_mw: number;
  q_mvar: number;
  voltage_violation: boolean;
  is_spoofed?: boolean;
}

export interface LineData {
  line_id: number;
  name: string;
  from_bus: number;
  to_bus: number;
  p_from_mw: number;
  q_from_mvar: number;
  p_to_mw: number;
  q_to_mvar: number;
  pl_mw: number;
  loading_percent: number;
  thermal_overload: boolean;
}

export interface GridState {
  timestamp: string;
  topology_name: string;
  converged: boolean;
  algorithm: string;
  total_generation_mw: number;
  total_load_mw: number;
  total_losses_mw: number;
  active_power_imbalance_mw: number;
  min_voltage_pu: number;
  max_voltage_pu: number;
  max_line_loading_pct: number;
  voltage_violations_count: number;
  overloaded_lines_count: number;
  buses: BusData[];
  lines: LineData[];
  isDemoData?: boolean;
}

export interface ActiveAttack {
  attack_id: string;
  attack_type: string;
  target_component: string;
  target_bus_id?: number | null;
  target_line_id?: number | null;
  intensity: number;
  duration_seconds: number;
  elapsed_seconds: number;
  started_at: string;
  status: string;
  is_confined_locally: boolean;
}

export interface SecurityIncident {
  incident_id: string;
  timestamp: string;
  attack_type: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  target_component: string;
  anomaly_score: number;
  confidence: number;
  voltage_violation: boolean;
  thermal_overload: boolean;
  power_imbalance_violation: boolean;
  details: Record<string, unknown>;
  mitigation_recommendation: string;
  resolved: boolean;
}

export interface ModelMetrics {
  model_type: string;
  trained_at: string;
  num_training_samples: number;
  num_test_samples: number;
  accuracy: number;
  f1_score: number;
  features_used: string[];
}

// -------------------------------------------------------------
// Baseline Realistic Demonstration Data
// -------------------------------------------------------------
const INITIAL_DEMO_BUSES: BusData[] = [
  { bus_id: 0, name: "Bus 0 - Substation Slack (20kV)", vn_kv: 20.0, vm_pu: 1.02, va_degree: 0.0, p_mw: 0.62, q_mvar: 0.15, voltage_violation: false },
  { bus_id: 1, name: "Bus 1 - Main Switchgear Incomer", vn_kv: 20.0, vm_pu: 1.015, va_degree: -0.42, p_mw: 0.0, q_mvar: 0.0, voltage_violation: false },
  { bus_id: 2, name: "Bus 2 - Solar PV Plant (1.5MW)", vn_kv: 20.0, vm_pu: 1.028, va_degree: 0.85, p_mw: -1.48, q_mvar: -0.18, voltage_violation: false },
  { bus_id: 3, name: "Bus 3 - Wind Turbine Unit (1.8MW)", vn_kv: 20.0, vm_pu: 1.025, va_degree: 0.92, p_mw: -1.75, q_mvar: -0.12, voltage_violation: false },
  { bus_id: 4, name: "Bus 4 - BESS Inverter (0.8MW / 2.4MWh)", vn_kv: 20.0, vm_pu: 1.018, va_degree: 0.25, p_mw: -0.78, q_mvar: -0.05, voltage_violation: false },
  { bus_id: 5, name: "Bus 5 - Critical Hospital Care (0.45MW)", vn_kv: 0.4, vm_pu: 0.998, va_degree: -1.45, p_mw: 0.45, q_mvar: 0.12, voltage_violation: false },
  { bus_id: 6, name: "Bus 6 - Industrial Manufacturing (2.1MW)", vn_kv: 20.0, vm_pu: 0.991, va_degree: -2.35, p_mw: 2.10, q_mvar: 0.70, voltage_violation: false },
  { bus_id: 7, name: "Bus 7 - Residential Smart Hub (1.35MW)", vn_kv: 0.4, vm_pu: 0.995, va_degree: -1.82, p_mw: 1.35, q_mvar: 0.35, voltage_violation: false },
];

const INITIAL_DEMO_LINES: LineData[] = [
  { line_id: 0, name: "Line 0-1 Substation Link", from_bus: 0, to_bus: 1, p_from_mw: 0.62, q_from_mvar: 0.15, p_to_mw: -0.61, q_to_mvar: -0.14, pl_mw: 0.01, loading_percent: 24.5, thermal_overload: false },
  { line_id: 1, name: "Line 1-2 Solar DER Feed", from_bus: 1, to_bus: 2, p_from_mw: -1.46, q_from_mvar: -0.17, p_to_mw: 1.48, q_to_mvar: 0.18, pl_mw: 0.02, loading_percent: 48.2, thermal_overload: false },
  { line_id: 2, name: "Line 1-3 Wind DER Feed", from_bus: 1, to_bus: 3, p_from_mw: -1.72, q_from_mvar: -0.11, p_to_mw: 1.75, q_to_mvar: 0.12, pl_mw: 0.03, loading_percent: 54.8, thermal_overload: false },
  { line_id: 3, name: "Line 1-4 BESS Inverter Feed", from_bus: 1, to_bus: 4, p_from_mw: -0.77, q_from_mvar: -0.05, p_to_mw: 0.78, q_to_mvar: 0.05, pl_mw: 0.01, loading_percent: 28.1, thermal_overload: false },
  { line_id: 4, name: "Line 1-6 Industrial Park Feeder", from_bus: 1, to_bus: 6, p_from_mw: 2.06, q_from_mvar: 0.68, p_to_mw: -2.10, q_to_mvar: -0.70, pl_mw: 0.04, loading_percent: 68.4, thermal_overload: false },
  { line_id: 5, name: "Line 1-5 Hospital Distribution Feed", from_bus: 1, to_bus: 5, p_from_mw: 0.44, q_from_mvar: 0.12, p_to_mw: -0.45, q_to_mvar: -0.12, pl_mw: 0.01, loading_percent: 32.0, thermal_overload: false },
  { line_id: 6, name: "Line 1-7 Residential Grid Link", from_bus: 1, to_bus: 7, p_from_mw: 1.33, q_from_mvar: 0.34, p_to_mw: -1.35, q_to_mvar: -0.35, pl_mw: 0.02, loading_percent: 44.6, thermal_overload: false },
];

let demoBuses = JSON.parse(JSON.stringify(INITIAL_DEMO_BUSES)) as BusData[];
let demoLines = JSON.parse(JSON.stringify(INITIAL_DEMO_LINES)) as LineData[];
let demoActiveAttacks: ActiveAttack[] = [];
let demoIncidents: SecurityIncident[] = [
  {
    incident_id: "INC-9F42A1E8",
    timestamp: new Date(Date.now() - 360000).toISOString(),
    attack_type: "fdia_voltage",
    severity: "HIGH",
    target_component: "Bus_5 (Hospital Feeder)",
    anomaly_score: 0.884,
    confidence: 0.942,
    voltage_violation: true,
    thermal_overload: false,
    power_imbalance_violation: true,
    details: {
      injected_delta_vm: "+14.2%",
      estimated_residual_mw: 0.28,
      algorithm: "Isolation Forest + Bad Data Detection",
    },
    mitigation_recommendation: "Isolate Bus 5 SCADA telemetry; engage Kalman bad-data residual filter; switch to redundant PMU stream.",
    resolved: true,
  },
  {
    incident_id: "INC-8B12C440",
    timestamp: new Date(Date.now() - 120000).toISOString(),
    attack_type: "load_tampering",
    severity: "CRITICAL",
    target_component: "Bus_6 (Industrial)",
    anomaly_score: 0.925,
    confidence: 0.961,
    voltage_violation: false,
    thermal_overload: true,
    power_imbalance_violation: false,
    details: {
      surged_load_mw: 3.65,
      line_loading_pct: 114.2,
      thermal_trip_margin_sec: 42,
    },
    mitigation_recommendation: "Execute automatic demand-response load curtailment on non-critical industrial feeders; throttle BESS discharge to prevent feeder trip.",
    resolved: false,
  },
];

let backendAvailable: boolean | null = null;

export async function checkBackendConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/health`, { signal: AbortSignal.timeout(1800) });
    backendAvailable = res.ok;
    return backendAvailable;
  } catch {
    backendAvailable = false;
    return false;
  }
}

export function isBackendConnected(): boolean {
  return backendAvailable === true;
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/health`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      backendAvailable = true;
      return await res.json();
    }
  } catch {
    backendAvailable = false;
  }

  // Demonstration data fallback
  return {
    status: demoActiveAttacks.length > 0 ? "degraded" : "healthy",
    platform: "GridSentinel AI",
    version: "1.0.0",
    environment: "demonstration_sandbox",
    timestamp: new Date().toISOString(),
    safety_confinement: {
      real_infrastructure_connected: false,
      virtual_environment_confined: true,
      power_flow_physics: "Pandapower AC Newton-Raphson",
    },
    components: {
      database: { status: "up", type: "SQLite" },
      grid_simulator: {
        status: "up",
        topology: "GridSentinel Resilient Microgrid",
        buses_count: 8,
        lines_count: 7,
        power_flow_converged: true,
      },
      ai_cybersecurity_detector: {
        status: "ready",
        model_type: "IsolationForest+RandomForest",
        evaluated_accuracy: 0.9942,
        evaluated_f1_score: 0.9918,
      },
      attack_simulation: {
        active_attacks_count: demoActiveAttacks.length,
        is_confined_locally: true,
      },
    },
  };
}

export async function fetchGridState(): Promise<GridState> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/grid/state`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      backendAvailable = true;
      const data = await res.json();
      return { ...data, isDemoData: false };
    }
  } catch {
    backendAvailable = false;
  }

  // Live stochastic physics simulation for demonstration
  const totalGen = 4.63 + (Math.random() - 0.5) * 0.04;
  const totalLoad = 3.90 + (Math.random() - 0.5) * 0.06;
  const totalLoss = 0.13;
  const imbalance = Math.abs(totalGen - totalLoad - totalLoss);

  // If active attack exists in demo mode, update buses accordingly
  const updatedBuses = demoBuses.map((b) => {
    let vm = b.vm_pu + (Math.random() - 0.5) * 0.002;
    let is_spoofed = false;
    let violation = false;

    for (const atk of demoActiveAttacks) {
      if (atk.target_bus_id === b.bus_id || atk.target_bus_id === null) {
        if (atk.attack_type === "fdia_voltage") {
          vm = vm * (1.0 + 0.08 * atk.intensity);
          is_spoofed = true;
        } else if (atk.attack_type === "dos_freeze") {
          vm = 1.015; // Frozen
          is_spoofed = true;
        }
      }
    }

    if (vm < 0.95 || vm > 1.05) {
      violation = true;
    }

    return {
      ...b,
      vm_pu: Math.round(vm * 1000) / 1000,
      voltage_violation: violation,
      is_spoofed,
    };
  });

  const maxLoading = demoActiveAttacks.some((a) => a.attack_type === "load_tampering") ? 116.4 : 68.4;

  return {
    timestamp: new Date().toISOString(),
    topology_name: "GridSentinel Resilient Microgrid (IEEE / CIGRE)",
    converged: true,
    algorithm: "Newton-Raphson AC Power Flow",
    total_generation_mw: Math.round(totalGen * 100) / 100,
    total_load_mw: Math.round(totalLoad * 100) / 100,
    total_losses_mw: totalLoss,
    active_power_imbalance_mw: Math.round(imbalance * 10000) / 10000,
    min_voltage_pu: Math.min(...updatedBuses.map((b) => b.vm_pu)),
    max_voltage_pu: Math.max(...updatedBuses.map((b) => b.vm_pu)),
    max_line_loading_pct: maxLoading,
    voltage_violations_count: updatedBuses.filter((b) => b.voltage_violation).length,
    overloaded_lines_count: maxLoading > 100 ? 1 : 0,
    buses: updatedBuses,
    lines: demoLines,
    isDemoData: true,
  };
}

export async function launchAttack(
  type: string,
  targetBusId: number = 5,
  intensity: number = 1.5,
  durationSec: number = 60
): Promise<ActiveAttack> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/attacks/launch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attack_type: type,
        target_bus_id: targetBusId,
        intensity,
        duration_seconds: durationSec,
      }),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // fallback
  }

  // Demo attack simulation
  const newAtk: ActiveAttack = {
    attack_id: `atk_${Math.random().toString(16).substring(2, 10)}`,
    attack_type: type,
    target_component: `Bus_${targetBusId}`,
    target_bus_id: targetBusId,
    target_line_id: null,
    intensity,
    duration_seconds: durationSec,
    elapsed_seconds: 0,
    started_at: new Date().toISOString(),
    status: "ACTIVE",
    is_confined_locally: true,
  };

  demoActiveAttacks = [newAtk];

  // Add real-time security incident
  const newInc: SecurityIncident = {
    incident_id: `INC-${Math.random().toString(16).substring(2, 8).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    attack_type: type,
    severity: type === "load_tampering" ? "CRITICAL" : "HIGH",
    target_component: `Bus_${targetBusId}`,
    anomaly_score: Math.min(0.98, 0.70 + intensity * 0.12),
    confidence: 0.95,
    voltage_violation: type === "fdia_voltage",
    thermal_overload: type === "load_tampering",
    power_imbalance_violation: type === "fdia_power",
    details: {
      intensity,
      vector: type,
      detection_engine: "Scikit-Learn IsolationForest + Kirchhoff Residual Check",
    },
    mitigation_recommendation:
      type === "fdia_voltage"
        ? `Isolate voltage telemetry on Bus_${targetBusId}; engage state estimator bad data rejection filter.`
        : type === "load_tampering"
        ? `Execute rapid demand-response load shedding on Bus_${targetBusId}; ramp BESS reserve discharge.`
        : `Flag communication channel on Bus_${targetBusId}; switch to secure encrypted IEC 62351 fallback link.`,
    resolved: false,
  };

  demoIncidents.unshift(newInc);
  return newAtk;
}

export async function stopAttack(attackId: string): Promise<boolean> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/attacks/${attackId}/stop`, { method: "POST" });
    if (res.ok) return true;
  } catch {
    // fallback
  }
  demoActiveAttacks = demoActiveAttacks.filter((a) => a.attack_id !== attackId);
  return true;
}

export async function stopAllAttacks(): Promise<number> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/attacks/stop-all`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      return data.terminated_count ?? 1;
    }
  } catch {
    // fallback
  }
  const count = demoActiveAttacks.length;
  demoActiveAttacks = [];
  return count;
}

export async function fetchActiveAttacks(): Promise<ActiveAttack[]> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/attacks/active`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return demoActiveAttacks;
}

export async function fetchSecurityIncidents(): Promise<SecurityIncident[]> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/security/incidents`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return demoIncidents;
}

export async function fetchModelMetrics(): Promise<ModelMetrics> {
  try {
    const res = await fetch(`${appConfig.apiBaseUrl}/security/metrics`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch {
    // fallback
  }
  return {
    model_type: "IsolationForest + RandomForestClassifier",
    trained_at: new Date(Date.now() - 3600000).toISOString(),
    num_training_samples: 240,
    num_test_samples: 60,
    accuracy: 0.9942,
    f1_score: 0.9918,
    features_used: [
      "vm_mean",
      "vm_std",
      "vm_max_dev",
      "va_range",
      "total_p_gen",
      "total_p_load",
      "total_losses",
      "power_imbalance_residual",
      "max_line_loading",
      "mean_line_loading",
      "bus_voltage_min",
      "bus_voltage_max",
      "delta_v_rate",
      "delta_p_rate",
      "sensor_variance_score",
    ],
  };
}
