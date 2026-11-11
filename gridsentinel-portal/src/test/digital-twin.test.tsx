import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { gridApi } from "@/lib/gridApi";
import { StateComparisonMatrix } from "@/features/digitaltwin/StateComparisonMatrix";
import { MicrogridTwinView } from "@/features/digitaltwin/MicrogridTwinView";
import { GridControlBar } from "@/features/digitaltwin/GridControlBar";
import { SystemMonitoringHUD } from "@/features/digitaltwin/SystemMonitoringHUD";
import { SimulationTimeline } from "@/features/digitaltwin/SimulationTimeline";
import { BusVoltagesLinesPanel } from "@/features/digitaltwin/BusVoltagesLinesPanel";
import { StateEstimationPMUPanel } from "@/features/digitaltwin/StateEstimationPMUPanel";
import { SafetyMonitoringPanel } from "@/features/digitaltwin/SafetyMonitoringPanel";
import { CybersecurityMonitoringPanel } from "@/features/digitaltwin/CybersecurityMonitoringPanel";
import { GenerationRedispatchPanel } from "@/features/digitaltwin/GenerationRedispatchPanel";
import { KeySafetyFeaturesPanel } from "@/features/digitaltwin/KeySafetyFeaturesPanel";
import { RightMonitoringSection } from "@/features/digitaltwin/RightMonitoringSection";
import { OverviewView } from "@/features/views/OverviewView";
import { EventHistoryAuditLog } from "@/features/digitaltwin/EventHistoryAuditLog";
import type { EventLogItem } from "@/lib/gridApi";
import { SimulationProvider } from "@/features/simulation/SimulationContext";

describe("Digital Twin Unit & Integration Tests", () => {
  it("provides predefined topologies with correct electrical specifications", async () => {
    const topologies = await gridApi.getTopologies();
    expect(topologies.length).toBeGreaterThanOrEqual(3);

    const resilient = topologies.find((t) => t.id === "resilient_microgrid");
    expect(resilient).toBeDefined();
    expect(resilient?.num_buses).toBe(8);
    expect(resilient?.voltage_level).toContain("20 kV");
  });

  it("provides 6 predefined cybersecurity attack scenarios", async () => {
    const scenarios = await gridApi.getScenarios();
    expect(scenarios.length).toBe(6);

    const fdia = scenarios.find((s) => s.id === "fdia_voltage_der");
    expect(fdia).toBeDefined();
    expect(fdia?.target_bus_id).toBe(2);
    expect(fdia?.severity).toBe("CRITICAL");

    const loadTamper = scenarios.find((s) => s.id === "load_tampering_surge");
    expect(loadTamper).toBeDefined();
    expect(loadTamper?.target_bus_id).toBe(5);
  });

  it("renders MicrogridTwinView with 8 buses and physical origin badge", () => {
    const buses = [
      { bus_id: 0, name: "Bus 0 - Slack 20kV", vn_kv: 20, vm_pu: 1.0, va_degree: 0, p_mw: -4.3, q_mvar: -1.2, voltage_violation: false },
      { bus_id: 1, name: "Bus 1 - Switchgear", vn_kv: 20, vm_pu: 0.998, va_degree: -0.4, p_mw: 0, q_mvar: 0, voltage_violation: false },
      { bus_id: 2, name: "Bus 2 - Solar PV", vn_kv: 20, vm_pu: 1.012, va_degree: 0.8, p_mw: 1.5, q_mvar: 0.2, voltage_violation: false },
    ];
    const lines = [
      { line_id: 0, name: "Feeder 0-1", from_bus: 0, to_bus: 1, p_from_mw: 4.3, q_from_mvar: 1.2, p_to_mw: -4.28, q_to_mvar: -1.18, pl_mw: 0.02, loading_percent: 42.5, thermal_overload: false },
    ];

    render(
      <MicrogridTwinView
        buses={buses}
        lines={lines}
        activeAttacks={[]}
      />
    );

    expect(screen.getByText(/Microgrid Digital-Twin Schematic/i)).toBeInTheDocument();
    expect(screen.getByText(/PANDAPOWER AC NEWTON-RAPHSON/i)).toBeInTheDocument();
    expect(screen.getByText("1.000 pu")).toBeInTheDocument();
  });

  it("renders StateComparisonMatrix with 3-way comparative matrix", () => {
    const mockReport = {
      baseline_normal: {
        timestamp: "2026-11-05T10:00:00Z",
        total_generation_mw: 7.6,
        total_load_mw: 3.95,
        frequency_hz: 50.0,
        min_voltage_pu: 0.985,
        max_voltage_pu: 1.012,
        voltage_violations_count: 0,
        overloaded_lines_count: 0,
      },
      attacked_compromised: {
        timestamp: "2026-11-05T10:01:00Z",
        total_generation_mw: 7.6,
        total_load_mw: 3.95,
        frequency_hz: 49.65,
        min_voltage_pu: 0.912,
        max_voltage_pu: 1.012,
        voltage_violations_count: 2,
        overloaded_lines_count: 1,
        active_attacks_count: 1,
      },
      recovered_mitigated: {
        timestamp: "2026-11-05T10:02:00Z",
        total_generation_mw: 7.6,
        total_load_mw: 3.95,
        frequency_hz: 50.0,
        min_voltage_pu: 0.985,
        max_voltage_pu: 1.012,
        voltage_violations_count: 0,
        overloaded_lines_count: 0,
      },
      delta_attack_impact: {
        voltage_drop_pu: -0.073,
        voltage_violations_increase: 2,
        overloaded_lines_increase: 1,
        frequency_deviation_hz: -0.35,
      },
      delta_recovery_improvement: {
        voltage_restored_pu: 0.073,
        voltage_violations_eliminated: 2,
        overloaded_lines_cleared: 1,
        frequency_restored_hz: 0.35,
      },
      recovery_effective: true,
    };

    render(<StateComparisonMatrix comparison={mockReport} />);

    expect(screen.getByText(/3-Way Physical State Comparison Matrix/i)).toBeInTheDocument();
    expect(screen.getByText(/1. Nominal Baseline/i)).toBeInTheDocument();
    expect(screen.getByText(/2. Attacked State/i)).toBeInTheDocument();
    expect(screen.getByText(/3. Mitigated State/i)).toBeInTheDocument();
    expect(screen.getByText(/RECOVERY EFFECTIVE/i)).toBeInTheDocument();
  });

  it("renders GridControlBar with playback controls and 50.00 Hz meter", () => {
    render(
      <GridControlBar
        topologies={[{ id: "resilient_microgrid", name: "8-Bus Resilient", voltage_level: "20 kV", num_buses: 8, der_assets: [], critical_loads: [], description: "" }]}
        activeTopology="resilient_microgrid"
        onSelectTopology={() => { }}
        status={{ status: "RUNNING", step_count: 42, speed_hz: 1, active_topology: "resilient_microgrid", converged: true, num_buses: 8, num_lines: 7, active_attacks_count: 0 }}
        onStart={() => { }}
        onPause={() => { }}
        onResume={() => { }}
        onReset={() => { }}
        onStep={() => { }}
        frequencyHz={50.0}
      />
    );

    expect(screen.getByText(/Virtual Grid:/i)).toBeInTheDocument();
    expect(screen.getByText("50.00 Hz")).toBeInTheDocument();
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText(/Step 42/i)).toBeInTheDocument();
  });

  it("renders SystemMonitoringHUD with MW generation, load, and voltage telemetry", () => {
    render(
      <SystemMonitoringHUD
        totalGenerationMw={8.4}
        totalLoadMw={3.95}
        frequencyHz={50.0}
        avgVoltagePu={0.998}
        minVoltagePu={0.985}
        maxVoltagePu={1.012}
        converged={true}
        activeAttacksCount={0}
      />
    );

    expect(screen.getByText("8.40")).toBeInTheDocument();
    expect(screen.getByText("3.95")).toBeInTheDocument();
    expect(screen.getByText("50.00")).toBeInTheDocument();
    expect(screen.getByText("0.998")).toBeInTheDocument();
    expect(screen.getByText(/Nominal \(50Hz\)/i)).toBeInTheDocument();
  });

  it("renders SimulationTimeline with 6-stage lifecycle track", () => {
    render(
      <SimulationTimeline
        currentStage="AI_DETECTION"
        activeAttackType="FDIA_VOLTAGE"
        anomalyScore={0.92}
        stepCount={15}
      />
    );

    expect(screen.getByText(/Simulation Timeline/i)).toBeInTheDocument();
    expect(screen.getByText("Normal Operation")).toBeInTheDocument();
    expect(screen.getByText("Attack")).toBeInTheDocument();
    expect(screen.getByText("Detection")).toBeInTheDocument();
    expect(screen.getByText("Estimation")).toBeInTheDocument();
    expect(screen.getByText("Mitigation")).toBeInTheDocument();
    expect(screen.getByText("Recovery")).toBeInTheDocument();
  });

  it("renders BusVoltagesLinesPanel and switches between buses and lines", () => {
    const mockBuses = [
      { bus_id: 0, name: "Bus 0 - Slack 20kV", vn_kv: 20, vm_pu: 1.0, va_degree: 0, p_mw: 4.3, q_mvar: 1.2, voltage_violation: false },
    ];
    const mockLines = [
      { line_id: 0, name: "Feeder 0-1", from_bus: 0, to_bus: 1, p_from_mw: 4.3, q_from_mvar: 1.2, p_to_mw: -4.28, q_to_mvar: -1.18, pl_mw: 0.02, loading_percent: 42.5, thermal_overload: false },
    ];

    render(
      <BusVoltagesLinesPanel
        buses={mockBuses}
        lines={mockLines}
      />
    );

    expect(screen.getByText(/Bus Voltage Profiles & Angles/i)).toBeInTheDocument();
    expect(screen.getByText("1.0000 pu")).toBeInTheDocument();
  });

  it("renders StateEstimationPMUPanel with RoCoF, SE residual and BDD", () => {
    render(
      <StateEstimationPMUPanel
        buses={[{ bus_id: 0, name: "Slack", vn_kv: 20, vm_pu: 1.0, va_degree: 0, p_mw: 0, q_mvar: 0, voltage_violation: false }]}
        lines={[]}
        frequencyHz={50.0}
        isAnomaly={false}
      />
    );

    expect(screen.getByText(/State Estimation & PMU Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Max Phase Spread/i)).toBeInTheDocument();
    expect(screen.getByText(/RoCoF/i)).toBeInTheDocument();
    expect(screen.getByText(/SE Residual/i)).toBeInTheDocument();
    expect(screen.getByText("CONFIRMED")).toBeInTheDocument();
  });

  it("renders SafetyMonitoringPanel with voltage, thermal and frequency envelopes", () => {
    render(
      <SafetyMonitoringPanel
        buses={[{ bus_id: 0, name: "Slack", vn_kv: 20, vm_pu: 1.0, va_degree: 0, p_mw: 0, q_mvar: 0, voltage_violation: false }]}
        lines={[{ line_id: 0, name: "Line 1", from_bus: 0, to_bus: 1, p_from_mw: 1, q_from_mvar: 0, p_to_mw: -1, q_to_mvar: 0, pl_mw: 0.01, loading_percent: 45, thermal_overload: false }]}
        frequencyHz={50.0}
      />
    );

    expect(screen.getByText(/Safety-Critical Monitoring/i)).toBeInTheDocument();
    expect(screen.getByText(/Voltage Envelope/i)).toBeInTheDocument();
    expect(screen.getByText(/Thermal Constraints/i)).toBeInTheDocument();
    expect(screen.getByText(/Frequency Limits/i)).toBeInTheDocument();
    expect(screen.getByText(/NERC \/ IEEE COMPLIANT/i)).toBeInTheDocument();
  });

  it("renders CybersecurityMonitoringPanel with IDS classifier, severity and affected target", () => {
    render(
      <CybersecurityMonitoringPanel
        isAnomaly={true}
        anomalyScore={0.88}
        attackClassification="FDIA_VOLTAGE"
        confidence={0.96}
        affectedComponent="Bus 2 (Solar PV)"
        reason="Voltage spoofed above statutory limits."
      />
    );

    expect(screen.getByText(/Cybersecurity & IDS Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText("CRITICAL INTRUSION")).toBeInTheDocument();
    expect(screen.getByText("FDIA_VOLTAGE")).toBeInTheDocument();
    expect(screen.getByText("Bus 2 (Solar PV)")).toBeInTheDocument();
  });

  it("renders GenerationRedispatchPanel with solar, wind, BESS and load shed controls", () => {
    render(<GenerationRedispatchPanel />);

    expect(screen.getByText(/Control Actions & Generation Redispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/Solar PV Setpoint/i)).toBeInTheDocument();
    expect(screen.getByText(/Wind Turbine Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/BESS Inverter Dispatch/i)).toBeInTheDocument();
    expect(screen.getByText(/TRIGGER LOAD SHED/i)).toBeInTheDocument();
  });

  it("renders KeySafetyFeaturesPanel with CBF invariance and IEEE standards", () => {
    render(<KeySafetyFeaturesPanel />);

    expect(screen.getByText(/Key Safety Features & Cyber-Physical Interlocks/i)).toBeInTheDocument();
    expect(screen.getByText(/Control Barrier Functions \(CBF\)/i)).toBeInTheDocument();
    expect(screen.getByText(/NERC PRC-024 Envelope/i)).toBeInTheDocument();
    expect(screen.getByText(/ALL BARRIERS ARMED/i)).toBeInTheDocument();
  });

  it("renders RightMonitoringSection with gauges and bus/line tables", () => {
    render(
      <RightMonitoringSection
        totalGenerationMw={8.4}
        totalLoadMw={3.95}
        frequencyHz={50.0}
        avgVoltagePu={0.998}
        minVoltagePu={0.985}
        maxVoltagePu={1.012}
        buses={[{ bus_id: 0, name: "Slack", vn_kv: 20, vm_pu: 1.0, va_degree: 0, p_mw: 4.3, q_mvar: 1.2, voltage_violation: false }]}
        lines={[{ line_id: 0, name: "L0", from_bus: 0, to_bus: 1, p_from_mw: 4.3, q_from_mvar: 1.2, p_to_mw: -4.28, q_to_mvar: -1.18, pl_mw: 0.02, loading_percent: 42.5, thermal_overload: false }]}
        events={[]}
      />
    );

    expect(screen.getByText(/Total Generation/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Load/i)).toBeInTheDocument();
    expect(screen.getByText("8.40")).toBeInTheDocument();
    expect(screen.getByText("3.95")).toBeInTheDocument();
  });

  it("verifies IEEE 14-bus nominal voltage compliance without false breaches", () => {
    const ieee14Buses = [
      { bus_id: 0, name: "Bus 1 (Slack)", vn_kv: 69.0, vm_pu: 1.060, va_degree: 0.0, p_mw: -232.39, q_mvar: 16.55, voltage_violation: false },
      { bus_id: 1, name: "Bus 2 (Gen)", vn_kv: 69.0, vm_pu: 1.045, va_degree: -4.98, p_mw: -18.30, q_mvar: -30.86, voltage_violation: false },
      { bus_id: 2, name: "Bus 3 (Condenser)", vn_kv: 69.0, vm_pu: 1.010, va_degree: -12.73, p_mw: 94.20, q_mvar: -6.08, voltage_violation: false },
      { bus_id: 5, name: "Bus 6 (Condenser)", vn_kv: 13.8, vm_pu: 1.070, va_degree: -14.22, p_mw: 11.20, q_mvar: -5.23, voltage_violation: false },
      { bus_id: 7, name: "Bus 8 (Condenser)", vn_kv: 13.8, vm_pu: 1.090, va_degree: -13.36, p_mw: 0.00, q_mvar: -17.62, voltage_violation: false },
    ];
    const branches = [
      { line_id: 0, name: "Line 0-1", from_bus: 0, to_bus: 1, p_from_mw: 156.88, q_from_mvar: -20.4, p_to_mw: -152.59, q_to_mvar: 27.68, pl_mw: 4.29, loading_percent: 42.5, thermal_overload: false },
      { line_id: 1000, name: "Trafo 3-6", from_bus: 3, to_bus: 6, p_from_mw: 28.07, q_from_mvar: 12.3, p_to_mw: -27.8, q_to_mvar: -11.9, pl_mw: 0.27, loading_percent: 29.0, thermal_overload: false },
    ];

    render(
      <RightMonitoringSection
        totalGenerationMw={272.39}
        totalLoadMw={259.00}
        frequencyHz={50.0}
        avgVoltagePu={1.055}
        minVoltagePu={1.010}
        maxVoltagePu={1.090}
        buses={ieee14Buses}
        lines={branches}
        events={[]}
      />
    );

    // No bus should have a "BREACH" label since all are within [0.90, 1.10] pu
    expect(screen.queryByText("BREACH")).toBeNull();
    expect(screen.getByText("272.39")).toBeInTheDocument();
    expect(screen.getByText("259.00")).toBeInTheDocument();
    expect(screen.getByText(/Pandapower IEEE 14-Bus/i)).toBeInTheDocument();
  });

  it("renders OverviewView with accurate power balance and zero external intertie export", () => {
    render(
      <SimulationProvider>
        <OverviewView />
      </SimulationProvider>
    );

    // Power balance KPI
    expect(screen.getByText(/Power Balance/i)).toBeInTheDocument();
    expect(screen.getAllByText(/272.39/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/259.00/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Net Intertie: 0.00 MW · Losses: 13.39 MW/i)).toBeInTheDocument();
    // Cyber threat level clearly separated
    expect(screen.getByText(/Cyber Threat Level/i)).toBeInTheDocument();
    expect(screen.getByText(/Zero active cyber intrusions/i)).toBeInTheDocument();
    // Voltage Margin with 0.90 - 1.10 limits
    expect(screen.getByText(/Limit: 0.90 - 1.10 pu/i)).toBeInTheDocument();
  });

  it("renders EventHistoryAuditLog with genuine incident target Bus_2 and lifecycle events", () => {
    const mockEvents: EventLogItem[] = [
      {
        id: "EVT-INC-234",
        type: "DETECTION_INCIDENT",
        timestamp: "2026-11-06T02:00:00Z",
        title: "Threat Detected: fdia_voltage",
        severity: "CRITICAL",
        target: "Bus_2",
        details: "Anomaly score 0.88. Voltage violation: True",
        status: "ACTIVE_ALERT",
      },
      {
        id: "EVT-ATK-252",
        type: "ATTACK_INJECTION",
        timestamp: "2026-11-06T01:59:00Z",
        title: "Attack Vector Launched: Simulated fdia_voltage",
        severity: "HIGH",
        target: "Bus 2",
        details: "Injected locally with intensity 1.15x",
        status: "ACTIVE",
      },
      {
        id: "EVT-RUN-100",
        type: "INITIALIZE",
        timestamp: "2026-11-06T01:55:00Z",
        title: "Simulation Lifecycle: INITIALIZE (ieee14_grid)",
        severity: "INFO",
        target: "ieee14_grid (Step 0)",
        details: "Simulation initialized",
        status: "COMPLETED",
      },
      {
        id: "EVT-RUN-101",
        type: "ESTIMATION_EVALUATED",
        timestamp: "2026-11-06T02:01:00Z",
        title: "Simulation Lifecycle: ESTIMATION (ieee14_grid)",
        severity: "INFO",
        target: "ieee14_grid (Step 4)",
        details: "WLS evaluated",
        status: "COMPLETED",
      },
    ];

    render(
      <EventHistoryAuditLog
        events={mockEvents}
        onRefresh={() => {}}
        isLoading={false}
      />
    );

    // Verify header count
    expect(screen.getByText(/4 Recorded Events/i)).toBeInTheDocument();

    // Verify incident with target Bus_2
    expect(screen.getByText(/Threat Detected: fdia_voltage/i)).toBeInTheDocument();
    expect(screen.getByText(/Target: Bus_2/i)).toBeInTheDocument();

    // Verify attack with target Bus 2
    expect(screen.getByText(/Attack Vector Launched: Simulated fdia_voltage/i)).toBeInTheDocument();
    expect(screen.getByText(/Target: Bus 2/i)).toBeInTheDocument();

    // Verify filter pills
    expect(screen.getByText("ALL")).toBeInTheDocument();
    expect(screen.getByText("INCIDENT")).toBeInTheDocument();
    expect(screen.getByText("ATTACK")).toBeInTheDocument();
    expect(screen.getByText("MITIGATION")).toBeInTheDocument();
    expect(screen.getByText("RECOVERY")).toBeInTheDocument();
    expect(screen.getByText("LIFECYCLE")).toBeInTheDocument();
  });
});
