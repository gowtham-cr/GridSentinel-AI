"""
Telemetry Collector module.
Samples physical measurements from Pandapower simulation, simulates realistic PMU/SCADA
Gaussian noise, applies active cyber-attack perturbations, and produces telemetry streams.
"""

from collections import deque
from datetime import datetime, timezone
import threading
from typing import List, Optional, Dict, Any
import numpy as np
from app.core.config import settings
from app.core.logging import logger
from app.grid_simulation.simulator import GridSimulator
from app.telemetry.schemas import BusTelemetry, LineTelemetry, TelemetryPacket


class TelemetryCollector:
    """
    Substation RTU and PMU Sensor Telemetry Collector.
    Emulates realistic Phasor Measurement Unit (PMU) and SCADA telemetry acquisition.
    """

    def __init__(self, simulator: GridSimulator):
        self.simulator = simulator
        self.sequence_counter = 0
        self.history: deque = deque(maxlen=settings.TELEMETRY_BUFFER_SIZE)
        self.lock = threading.RLock()
        self._attack_engine_ref = None  # Injected after attack engine initialization

    def set_attack_engine(self, attack_engine):
        """Attaches AttackEngine instance to enable cyber-physical telemetry manipulation."""
        self._attack_engine_ref = attack_engine

    def sample_telemetry(self) -> TelemetryPacket:
        """
        Samples physical ground truth from grid simulator, applies physical measurement noise,
        and applies any active local cyber attack injections.
        """
        with self.lock:
            self.sequence_counter += 1
            now_iso = datetime.now(timezone.utc).isoformat()
            
            # 1. Fetch physical ground truth from pandapower simulation
            grid_state = self.simulator.get_state_summary()

            active_attacks: List[str] = []
            compromised_buses = 0

            # 2. Check if attack engine has active attacks
            if self._attack_engine_ref:
                active_attacks = self._attack_engine_ref.get_active_attack_names()

            bus_telemetry_list: List[BusTelemetry] = []
            for bus in grid_state.buses:
                # Add realistic PMU sensor AWGN (Additive White Gaussian Noise)
                noise_vm = float(np.random.normal(0, settings.TELEMETRY_NOISE_STD_DEV))
                noise_p = float(np.random.normal(0, 0.005 * (abs(bus.p_mw) + 0.1)))
                noise_q = float(np.random.normal(0, 0.005 * (abs(bus.q_mvar) + 0.1)))

                vm_meas = bus.vm_pu + noise_vm
                va_meas = bus.va_degree + float(np.random.normal(0, 0.05))
                p_meas = bus.p_mw + noise_p
                q_meas = bus.q_mvar + noise_q
                is_spoofed = False

                # Apply cyber attack modifications if bus is targeted
                if self._attack_engine_ref:
                    vm_meas, va_meas, p_meas, q_meas, is_spoofed = self._attack_engine_ref.apply_bus_telemetry_attack(
                        bus_id=bus.bus_id,
                        vm=vm_meas,
                        va=va_meas,
                        p=p_meas,
                        q=q_meas,
                    )
                    if is_spoofed:
                        compromised_buses += 1

                bus_telemetry_list.append(
                    BusTelemetry(
                        bus_id=bus.bus_id,
                        name=bus.name,
                        vm_pu=round(float(vm_meas), 4),
                        va_degree=round(float(va_meas), 3),
                        p_mw=round(float(p_meas), 4),
                        q_mvar=round(float(q_meas), 4),
                        is_spoofed=is_spoofed,
                    )
                )

            line_telemetry_list: List[LineTelemetry] = []
            for line in grid_state.lines:
                # Add slight measurement variance to line loading
                meas_loading = max(0.0, line.loading_percent + float(np.random.normal(0, 0.1)))
                is_spoofed = False

                if self._attack_engine_ref:
                    meas_loading, is_spoofed = self._attack_engine_ref.apply_line_telemetry_attack(
                        line_id=line.line_id,
                        loading_pct=meas_loading,
                    )

                line_telemetry_list.append(
                    LineTelemetry(
                        line_id=line.line_id,
                        name=line.name,
                        from_bus=line.from_bus,
                        to_bus=line.to_bus,
                        loading_percent=round(meas_loading, 2),
                        p_from_mw=line.p_from_mw,
                        q_from_mvar=line.q_from_mvar,
                        pl_mw=line.pl_mw,
                        is_spoofed=is_spoofed,
                    )
                )

            packet = TelemetryPacket(
                sequence_id=self.sequence_counter,
                timestamp=now_iso,
                topology_name=grid_state.topology_name,
                buses=bus_telemetry_list,
                lines=line_telemetry_list,
                compromised_buses_count=compromised_buses,
                active_attack_vectors=active_attacks,
            )

            # Store in ring buffer
            self.history.append(packet)
            return packet

    def get_latest(self) -> Optional[TelemetryPacket]:
        """Returns the most recent telemetry packet."""
        with self.lock:
            if not self.history:
                return self.sample_telemetry()
            return self.history[-1]

    def get_history(self, limit: int = 50) -> List[TelemetryPacket]:
        """Returns the recent history of telemetry packets."""
        with self.lock:
            items = list(self.history)
            return items[-limit:]

