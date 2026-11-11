"""
Smart Grid Cyber Attack Implementations.
Strictly confined to local virtual environment simulation.
Does not connect to external networks or physical electrical equipment.
"""

from collections import deque
from datetime import datetime, timezone
import uuid
from typing import Tuple, Optional, Dict, Any, List
from app.attack_simulation.schemas import AttackType, AttackLaunchRequest
from app.core.logging import logger
from app.grid_simulation.simulator import GridSimulator


class VirtualAttack:
    """Base class for virtual cyber attacks confined to local simulation memory."""

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        self.attack_id: str = f"atk_{uuid.uuid4().hex[:8]}"
        self.attack_type: AttackType = req.attack_type
        self.target_bus_id: Optional[int] = req.target_bus_id
        self.target_line_id: Optional[int] = req.target_line_id
        self.intensity: float = req.intensity
        self.magnitude: float = req.magnitude if req.magnitude is not None else req.intensity
        self.duration_seconds: int = req.duration_seconds
        self.started_at: datetime = datetime.now(timezone.utc)
        self.status: str = "ACTIVE"
        self.simulator: GridSimulator = simulator
        self.stopped_at: Optional[datetime] = None
        self.scenario_name: str = f"Simulated {req.attack_type.value}"
        self.baseline_values: Dict[str, Any] = {}
        self.injected_values: Dict[str, Any] = {}

        # Capture initial baseline values from simulator state if available
        self._capture_initial_baseline()

    def _capture_initial_baseline(self):
        """Captures ground truth electrical parameters before attack injection."""
        try:
            if self.target_bus_id is not None and self.target_bus_id in self.simulator.net.bus.index:
                res = self.simulator.net.res_bus
                if not res.empty and self.target_bus_id in res.index:
                    self.baseline_values = {
                        "vm_pu": round(float(res.loc[self.target_bus_id, "vm_pu"]), 4),
                        "va_degree": round(float(res.loc[self.target_bus_id, "va_degree"]), 3),
                        "p_mw": round(float(res.loc[self.target_bus_id, "p_mw"]), 4),
                        "q_mvar": round(float(res.loc[self.target_bus_id, "q_mvar"]), 4),
                    }
        except Exception as e:
            logger.debug(f"[VirtualAttack] Initial baseline capture deferred: {e}")

    @property
    def elapsed_seconds(self) -> float:
        end = self.stopped_at or datetime.now(timezone.utc)
        return (end - self.started_at).total_seconds()

    @property
    def is_expired(self) -> bool:
        return self.status != "STOPPED" and self.elapsed_seconds >= self.duration_seconds

    def stop(self):
        self.status = "STOPPED"
        self.stopped_at = datetime.now(timezone.utc)

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        """Returns (vm, va, p, q, was_modified). Default returns unchanged."""
        return vm, va, p, q, False

    def modify_line_telemetry(self, line_id: int, loading_pct: float) -> Tuple[float, bool]:
        """Returns (loading_pct, was_modified). Default returns unchanged."""
        return loading_pct, False


class FDIAVoltageAttack(VirtualAttack):
    """
    False Data Injection Attack targeting Bus Voltage sensor (Vm).
    Falsifies voltage measurements reported to EMS/SCADA without altering physical grid.
    e.g., offsets voltage reading by +15% or -15%, inducing false control actions.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "False Data Injection (FDIA - Voltage)"
        # Use magnitude if explicitly provided, else compute from intensity
        self.delta_factor = req.magnitude if req.magnitude is not None else (0.08 * self.intensity)

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        if self.status != "ACTIVE":
            return vm, va, p, q, False

        if self.target_bus_id is None or self.target_bus_id == bus_id:
            # Record current clean baseline
            self.baseline_values = {
                "vm_pu": round(float(vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(p), 4),
                "q_mvar": round(float(q), 4),
            }
            # Shift voltage magnitude
            spoofed_vm = vm * (1.0 + self.delta_factor)
            self.injected_values = {
                "vm_pu": round(float(spoofed_vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(p), 4),
                "q_mvar": round(float(q), 4),
            }
            return spoofed_vm, va, p, q, True

        return vm, va, p, q, False


class FDIAPowerAttack(VirtualAttack):
    """
    False Data Injection Attack targeting Active/Reactive Power sensor (P/Q).
    Spoofs measured power injection, attempting to induce unnecessary generation redispatch.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "False Data Injection (FDIA - Power)"
        self.delta_p = req.magnitude if req.magnitude is not None else (1.5 * self.intensity)
        self.delta_q = 0.33 * self.delta_p

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        if self.status != "ACTIVE":
            return vm, va, p, q, False

        if self.target_bus_id is None or self.target_bus_id == bus_id:
            self.baseline_values = {
                "vm_pu": round(float(vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(p), 4),
                "q_mvar": round(float(q), 4),
            }
            spoofed_p = p + self.delta_p
            spoofed_q = q + self.delta_q
            self.injected_values = {
                "vm_pu": round(float(vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(spoofed_p), 4),
                "q_mvar": round(float(spoofed_q), 4),
            }
            return vm, va, spoofed_p, spoofed_q, True

        return vm, va, p, q, False


class FDIAAttack(VirtualAttack):
    """
    Unified False Data Injection Attack (FDIA).
    Allows targeting either voltage or active/reactive power measurements based on request parameter.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.param = (req.parameter or "voltage").lower()
        self.scenario_name = f"False Data Injection (FDIA - {self.param.capitalize()})"
        self.delta_v = req.magnitude if req.magnitude is not None else (0.08 * self.intensity)
        self.delta_p = req.magnitude if req.magnitude is not None else (1.5 * self.intensity)

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        if self.status != "ACTIVE":
            return vm, va, p, q, False

        if self.target_bus_id is None or self.target_bus_id == bus_id:
            self.baseline_values = {
                "vm_pu": round(float(vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(p), 4),
                "q_mvar": round(float(q), 4),
            }
            if "power" in self.param:
                spoofed_p = p + self.delta_p
                spoofed_q = q + (0.33 * self.delta_p)
                self.injected_values = {
                    "vm_pu": round(float(vm), 4),
                    "va_degree": round(float(va), 3),
                    "p_mw": round(float(spoofed_p), 4),
                    "q_mvar": round(float(spoofed_q), 4),
                }
                return vm, va, spoofed_p, spoofed_q, True
            else:
                spoofed_vm = vm * (1.0 + self.delta_v)
                self.injected_values = {
                    "vm_pu": round(float(spoofed_vm), 4),
                    "va_degree": round(float(va), 3),
                    "p_mw": round(float(p), 4),
                    "q_mvar": round(float(q), 4),
                }
                return spoofed_vm, va, p, q, True

        return vm, va, p, q, False


class DoSFreezeAttack(VirtualAttack):
    """
    Denial of Service / Sensor Freeze Attack.
    Simulates jammed communication channels where sensor reports constant stale measurements.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "Telemetry DoS Communication Freeze"
        self.frozen_values: Dict[int, Tuple[float, float, float, float]] = {}

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        if self.status != "ACTIVE":
            return vm, va, p, q, False

        if self.target_bus_id is None or self.target_bus_id == bus_id:
            if bus_id not in self.frozen_values:
                # Capture first observed measurement to hold frozen
                self.frozen_values[bus_id] = (vm, va, p, q)
                self.baseline_values = {
                    "vm_pu": round(float(vm), 4),
                    "va_degree": round(float(va), 3),
                    "p_mw": round(float(p), 4),
                    "q_mvar": round(float(q), 4),
                }
            f_vm, f_va, f_p, f_q = self.frozen_values[bus_id]
            self.injected_values = {
                "vm_pu": round(float(f_vm), 4),
                "va_degree": round(float(f_va), 3),
                "p_mw": round(float(f_p), 4),
                "q_mvar": round(float(f_q), 4),
            }
            return f_vm, f_va, f_p, f_q, True

        return vm, va, p, q, False


class ReplayAttack(VirtualAttack):
    """
    Replay Attack on Substation Sensor Streams.
    Substitutes previous telemetry readings for current readings, masking true grid state.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "Sensor Telemetry Replay Attack"
        self.playback_buffer: deque = deque(maxlen=30)
        self._initialize_playback_history()

    def _initialize_playback_history(self):
        """Populates previous telemetry states for the target bus."""
        target_bus = self.target_bus_id if self.target_bus_id is not None else 1
        nominal_vm = 1.015
        nominal_va = -1.20
        nominal_p = 0.50
        nominal_q = 0.10

        try:
            if target_bus in self.simulator.net.bus.index and not self.simulator.net.res_bus.empty:
                nominal_vm = float(self.simulator.net.res_bus.loc[target_bus, "vm_pu"])
                nominal_va = float(self.simulator.net.res_bus.loc[target_bus, "va_degree"])
                nominal_p = float(self.simulator.net.res_bus.loc[target_bus, "p_mw"])
                nominal_q = float(self.simulator.net.res_bus.loc[target_bus, "q_mvar"])
        except Exception:
            pass

        # Create a series of past readings representing normal stable operation
        for i in range(10):
            # Previous readings slightly perturbed like normal operational noise
            self.playback_buffer.append((
                nominal_vm + 0.001 * (i % 3 - 1),
                nominal_va + 0.02 * (i % 2 - 0.5),
                nominal_p + 0.01 * (i % 3 - 1),
                nominal_q + 0.005 * (i % 2 - 0.5),
            ))

    def modify_bus_telemetry(self, bus_id: int, vm: float, va: float, p: float, q: float) -> Tuple[float, float, float, float, bool]:
        if self.status != "ACTIVE":
            return vm, va, p, q, False

        if self.target_bus_id is None or self.target_bus_id == bus_id:
            # Baseline is current real measurement
            self.baseline_values = {
                "vm_pu": round(float(vm), 4),
                "va_degree": round(float(va), 3),
                "p_mw": round(float(p), 4),
                "q_mvar": round(float(q), 4),
            }

            # Substitute with previous telemetry reading from playback buffer
            if self.playback_buffer:
                replayed_vm, replayed_va, replayed_p, replayed_q = self.playback_buffer.popleft()
                # Push current real reading to buffer end to maintain sliding replay window
                self.playback_buffer.append((vm, va, p, q))
            else:
                replayed_vm, replayed_va, replayed_p, replayed_q = (1.015, -1.20, 0.50, 0.10)

            self.injected_values = {
                "vm_pu": round(float(replayed_vm), 4),
                "va_degree": round(float(replayed_va), 3),
                "p_mw": round(float(replayed_p), 4),
                "q_mvar": round(float(replayed_q), 4),
            }
            return replayed_vm, replayed_va, replayed_p, replayed_q, True

        return vm, va, p, q, False


class LoadTamperingAttack(VirtualAttack):
    """
    Cyber-Physical Load Tampering / Manipulation Attack.
    Injects a controlled demand change in the simulation by modifying load setpoints.
    This modifies actual pandapower power flow, triggering real physical branch overloads and voltage drops.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "Load Manipulation (Cyber-Physical Demand Tampering)"
        # Default to bus 5 if not specified
        self.target_bus = req.target_bus_id if req.target_bus_id is not None else 5
        self.original_p: Optional[float] = None
        self.original_q: Optional[float] = None
        self.tampered_p: Optional[float] = None
        self.tampered_q: Optional[float] = None
        self._apply_physical_tamper()

    def _apply_physical_tamper(self):
        try:
            # Find current load on bus
            matched = self.simulator.net.load[self.simulator.net.load["bus"] == self.target_bus]
            if not matched.empty:
                load_idx = matched.index[0]
                self.original_p = float(self.simulator.net.load.loc[load_idx, "p_mw"])
                self.original_q = float(self.simulator.net.load.loc[load_idx, "q_mvar"])

                # Calculate tampered demand with controlled physical surge
                if self.magnitude is not None and self.magnitude != 1.0:
                    surge_pct = min(0.60, max(0.10, self.magnitude if self.magnitude < 1.0 else (self.magnitude * 0.20)))
                    surge = 1.0 + surge_pct
                else:
                    surge = 1.0 + min(0.50, max(0.15, 0.25 * self.intensity))

                self.tampered_p = max(0.05, self.original_p * surge)
                self.tampered_q = max(0.01, self.original_q * surge)

                self.simulator.modify_physical_load(self.target_bus, self.tampered_p, self.tampered_q)

                self.baseline_values = {
                    "p_mw": round(self.original_p, 4),
                    "q_mvar": round(self.original_q, 4),
                }
                self.injected_values = {
                    "p_mw": round(self.tampered_p, 4),
                    "q_mvar": round(self.tampered_q, 4),
                }

                logger.warning(
                    f"[Attack] Cyber-physical load tampering applied on Bus {self.target_bus}: "
                    f"{self.original_p:.2f} MW -> {self.tampered_p:.2f} MW"
                )
            else:
                logger.warning(f"[Attack] No electrical load found at Bus {self.target_bus} to tamper.")
        except Exception as e:
            logger.error(f"Failed to apply load tampering attack: {e}")

    def stop(self):
        super().stop()
        # Restore original physical load
        if self.original_p is not None:
            try:
                self.simulator.modify_physical_load(self.target_bus, self.original_p, self.original_q)
                logger.info(f"[Attack] Restored physical load on Bus {self.target_bus} to nominal.")
            except Exception as e:
                logger.error(f"Failed to restore load after attack stop: {e}")


# Alias for load manipulation scenario
LoadManipulationAttack = LoadTamperingAttack


class DERDisconnectAttack(VirtualAttack):
    """
    Distributed Energy Resource (DER) Disconnect Attack.
    Simulates cyber intrusion commanding inverter trip on solar or wind generation.
    Triggers sudden generation deficiency and voltage depression.
    """

    def __init__(self, req: AttackLaunchRequest, simulator: GridSimulator):
        super().__init__(req, simulator)
        self.scenario_name = "Unauthorized DER Generation Trip"
        self.target_bus = req.target_bus_id if req.target_bus_id is not None else 2
        self.original_gen_p: Optional[float] = None
        self._apply_der_trip()

    def _apply_der_trip(self):
        try:
            matched = self.simulator.net.sgen[self.simulator.net.sgen["bus"] == self.target_bus]
            if not matched.empty:
                sgen_idx = matched.index[0]
                self.original_gen_p = float(self.simulator.net.sgen.loc[sgen_idx, "p_mw"])
                self.baseline_values = {"p_gen_mw": round(self.original_gen_p, 4)}
                self.injected_values = {"p_gen_mw": 0.0}

                # Trip generation to 0.0 MW
                self.simulator.modify_der_generation(self.target_bus, 0.0)
                logger.warning(
                    f"[Attack] Cyber tripping command disconnected DER at Bus {self.target_bus} "
                    f"(tripped {self.original_gen_p:.2f} MW)."
                )
        except Exception as e:
            logger.error(f"Failed to execute DER trip attack: {e}")

    def stop(self):
        super().stop()
        if self.original_gen_p is not None:
            try:
                self.simulator.modify_der_generation(self.target_bus, self.original_gen_p)
                logger.info(f"[Attack] Reconnected DER at Bus {self.target_bus} to {self.original_gen_p:.2f} MW.")
            except Exception as e:
                logger.error(f"Failed to restore DER generation: {e}")
