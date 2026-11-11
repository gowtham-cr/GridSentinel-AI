"""
GridSentinel AI - Continuous Simulation Execution & Playback Controller.
Manages automatic simulation stepping, pause, resume, reset, and topology switching.
"""

import threading
import time
from typing import Optional, Dict, Any, List
from pydantic import BaseModel
from app.core.logging import logger
from app.grid_simulation.simulator import GridSimulator
from app.telemetry.collector import TelemetryCollector
from app.telemetry.stream import telemetry_stream_manager


class SimulationStatusInfo(BaseModel):
    """Simulation status payload for control dashboard."""
    status: str  # RUNNING | PAUSED | STOPPED
    step_count: int
    speed_hz: float
    active_topology: str
    converged: bool
    num_buses: int
    num_lines: int
    active_attacks_count: int


class SimulationManager:
    """
    Manages real-time execution of the virtual power grid simulation.
    Runs a non-blocking background worker thread for real-time physics progression.
    """

    def __init__(self, simulator: GridSimulator, collector: TelemetryCollector):
        self.simulator = simulator
        self.collector = collector
        self.status = "PAUSED"  # Initial state is paused so user can explore baseline or start
        self.speed_hz = 1.0
        self.step_count = 0
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self.lock = threading.RLock()

    def start(self) -> None:
        """Starts or resumes continuous simulation loop."""
        with self.lock:
            self.status = "RUNNING"
            if self._thread is None or not self._thread.is_alive():
                self._stop_event.clear()
                self._thread = threading.Thread(target=self._run_loop, daemon=True, name="GridSimLoop")
                self._thread.start()
            logger.info("Simulation loop started (RUNNING).")

    def pause(self) -> None:
        """Pauses the automatic simulation stepping."""
        with self.lock:
            self.status = "PAUSED"
            logger.info("Simulation loop paused (PAUSED).")

    def resume(self) -> None:
        """Resumes automatic stepping."""
        self.start()

    def reset(self) -> None:
        """Resets simulation back to nominal state."""
        with self.lock:
            self.status = "PAUSED"
            self.step_count = 0
            self.simulator.reset_to_nominal()
            self.collector.sample_telemetry()
            logger.info("Simulation reset to nominal baseline state.")

    def set_speed(self, speed_hz: float) -> float:
        """Sets simulation speed (steps per second)."""
        with self.lock:
            self.speed_hz = max(0.2, min(speed_hz, 10.0))
            return self.speed_hz

    def change_topology(self, topology_name: str) -> None:
        """Switches the active Pandapower network topology."""
        with self.lock:
            self.pause()
            from app.grid_simulation.topologies import get_topology
            self.simulator.topology_name = topology_name
            self.simulator.net = get_topology(topology_name)
            self.simulator._initial_loads = (
                self.simulator.net.load[["p_mw", "q_mvar"]].copy()
                if not self.simulator.net.load.empty
                else None
            )
            self.simulator._initial_sgens = (
                self.simulator.net.sgen[["p_mw", "q_mvar"]].copy()
                if not self.simulator.net.sgen.empty
                else None
            )
            self.simulator.run_power_flow()
            self.step_count = 0
            self.collector.sample_telemetry()
            logger.info(f"Switched simulation topology to '{topology_name}'.")

    def get_status(self) -> SimulationStatusInfo:
        """Returns current simulation control status."""
        with self.lock:
            topo = self.simulator.get_topology_info()
            return SimulationStatusInfo(
                status=self.status,
                step_count=self.step_count,
                speed_hz=self.speed_hz,
                active_topology=self.simulator.topology_name,
                converged=self.simulator.converged,
                num_buses=topo.num_buses,
                num_lines=topo.num_lines,
                active_attacks_count=(
                    len(self.collector._attack_engine_ref.get_active_attack_names())
                    if self.collector._attack_engine_ref
                    else 0
                ),
            )

    def _run_loop(self) -> None:
        """Background continuous execution loop."""
        while not self._stop_event.is_set():
            if self.status == "RUNNING":
                try:
                    with self.lock:
                        self.step_count += 1
                        self.simulator.step()
                        self.collector.sample_telemetry()
                except Exception as exc:
                    logger.error(f"Error in continuous simulation loop: {exc}")

            sleep_time = max(0.1, 1.0 / self.speed_hz)
            time.sleep(sleep_time)

