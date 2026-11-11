"""
Attack Simulation Engine.
Coordinates local virtual cyber-physical attacks strictly within the memory of the simulation.
Ensures zero interaction with real-world infrastructure.
"""

from collections import deque
from datetime import datetime, timezone
import threading
from typing import Dict, List, Optional, Tuple
from app.attack_simulation.attacks import (
    VirtualAttack,
    FDIAAttack,
    FDIAVoltageAttack,
    FDIAPowerAttack,
    DoSFreezeAttack,
    ReplayAttack,
    LoadTamperingAttack,
    LoadManipulationAttack,
    DERDisconnectAttack,
)
from app.attack_simulation.schemas import (
    AttackType,
    AttackLaunchRequest,
    ActiveAttackInfo,
)
from app.core.exceptions import AttackExecutionError
from app.core.logging import logger
from app.grid_simulation.simulator import GridSimulator


class AttackEngine:
    """
    Local Virtual Cyber-Attack Orchestration Engine.
    All attacks are safely simulated within software memory.
    """

    def __init__(self, simulator: GridSimulator):
        self.simulator = simulator
        self.active_attacks: Dict[str, VirtualAttack] = {}
        self.attack_history: deque = deque(maxlen=200)
        self.lock = threading.RLock()

    def launch_attack(self, request: AttackLaunchRequest) -> ActiveAttackInfo:
        """
        Instantiates and activates a virtual cyber attack in local memory.
        Validates target component bounds and input parameters.
        """
        with self.lock:
            self._cleanup_expired()

            # 1. Validation of target component boundaries
            if request.target_bus_id is not None:
                total_buses = len(self.simulator.net.bus)
                if request.target_bus_id < 0 or request.target_bus_id >= total_buses:
                    raise AttackExecutionError(
                        f"Target bus ID {request.target_bus_id} is out of bounds. "
                        f"Valid buses for '{self.simulator.topology_name}' are 0 to {total_buses - 1}."
                    )

            if request.target_line_id is not None:
                total_lines = len(self.simulator.net.line)
                if request.target_line_id < 0 or request.target_line_id >= total_lines:
                    raise AttackExecutionError(
                        f"Target line ID {request.target_line_id} is out of bounds. "
                        f"Valid lines for '{self.simulator.topology_name}' are 0 to {total_lines - 1}."
                    )

            if request.duration_seconds < 1:
                raise AttackExecutionError("Simulation duration must be at least 1 second.")

            if request.intensity <= 0:
                raise AttackExecutionError("Attack intensity must be greater than zero.")

            # 2. Map request attack type to implementation class
            attack_cls_map = {
                AttackType.FDIA: FDIAAttack,
                AttackType.FDIA_VOLTAGE: FDIAVoltageAttack,
                AttackType.FDIA_POWER: FDIAPowerAttack,
                AttackType.DOS_FREEZE: DoSFreezeAttack,
                AttackType.REPLAY_ATTACK: ReplayAttack,
                AttackType.LOAD_TAMPERING: LoadTamperingAttack,
                AttackType.LOAD_MANIPULATION: LoadManipulationAttack,
                AttackType.DER_DISCONNECT: DERDisconnectAttack,
            }

            attack_cls = attack_cls_map.get(request.attack_type)
            if not attack_cls:
                raise AttackExecutionError(f"Unsupported attack type: {request.attack_type}")

            try:
                attack_instance: VirtualAttack = attack_cls(request, self.simulator)
                self.active_attacks[attack_instance.attack_id] = attack_instance
                info = self._to_info(attack_instance)
                self.attack_history.append(info)

                logger.info(
                    f"[AttackEngine] Virtual attack '{attack_instance.attack_id}' ({request.attack_type.value}) launched. "
                    f"Confined locally. Duration: {request.duration_seconds}s. Target: {info.target_component}."
                )
                return info
            except Exception as e:
                logger.error(f"[AttackEngine] Failed to initialize attack: {e}")
                raise AttackExecutionError(f"Failed to launch attack: {str(e)}")

    def stop_attack(self, attack_id: str) -> bool:
        """Terminates an active virtual attack."""
        with self.lock:
            if attack_id not in self.active_attacks:
                return False
            atk = self.active_attacks[attack_id]
            atk.stop()

            # Update history record
            self._update_history_status(attack_id, "STOPPED")

            logger.info(f"[AttackEngine] Attack '{attack_id}' stopped by operator.")
            del self.active_attacks[attack_id]
            return True

    def stop_all_attacks(self) -> int:
        """Terminates all running attacks immediately and resets affected grid parameters."""
        with self.lock:
            count = len(self.active_attacks)
            for aid, atk in list(self.active_attacks.items()):
                atk.stop()
                self._update_history_status(aid, "STOPPED")
            self.active_attacks.clear()
            self.simulator.reset_to_nominal()
            logger.info(f"[AttackEngine] Stopped all {count} active virtual attacks.")
            return count

    def get_active_attacks(self) -> List[ActiveAttackInfo]:
        """Lists currently executing virtual attacks."""
        with self.lock:
            self._cleanup_expired()
            return [self._to_info(atk) for atk in self.active_attacks.values()]

    def get_active_attack_names(self) -> List[str]:
        """Returns string list of currently active attack types."""
        with self.lock:
            self._cleanup_expired()
            return [f"{atk.attack_type.value}@{atk.target_bus_id or 'all'}" for atk in self.active_attacks.values()]

    def get_attack_info(self, attack_id: str) -> Optional[ActiveAttackInfo]:
        """Retrieves attack info by attack_id from active attacks or memory history."""
        with self.lock:
            self._cleanup_expired()
            if attack_id in self.active_attacks:
                return self._to_info(self.active_attacks[attack_id])
            for h in self.attack_history:
                if h.attack_id == attack_id:
                    return h
            return None

    def apply_bus_telemetry_attack(
        self, bus_id: int, vm: float, va: float, p: float, q: float
    ) -> Tuple[float, float, float, float, bool]:
        """
        Applies active cyber attack alterations to bus sensor telemetry.
        Called by TelemetryCollector before returning PMU/SCADA packets.
        """
        with self.lock:
            self._cleanup_expired()
            is_modified = False
            cur_vm, cur_va, cur_p, cur_q = vm, va, p, q

            for atk in self.active_attacks.values():
                cur_vm, cur_va, cur_p, cur_q, mod = atk.modify_bus_telemetry(bus_id, cur_vm, cur_va, cur_p, cur_q)
                if mod:
                    is_modified = True

            return cur_vm, cur_va, cur_p, cur_q, is_modified

    def apply_line_telemetry_attack(self, line_id: int, loading_pct: float) -> Tuple[float, bool]:
        """Applies active cyber attack alterations to line sensor telemetry."""
        with self.lock:
            self._cleanup_expired()
            is_modified = False
            cur_loading = loading_pct

            for atk in self.active_attacks.values():
                cur_loading, mod = atk.modify_line_telemetry(line_id, cur_loading)
                if mod:
                    is_modified = True

            return cur_loading, is_modified

    def _cleanup_expired(self):
        """Removes attacks that have exceeded their duration."""
        expired_ids = [aid for aid, atk in self.active_attacks.items() if atk.is_expired]
        for aid in expired_ids:
            logger.info(f"[AttackEngine] Virtual attack '{aid}' expired.")
            self.active_attacks[aid].stop()
            self._update_history_status(aid, "EXPIRED")
            del self.active_attacks[aid]

    def _update_history_status(self, attack_id: str, status: str):
        for h in self.attack_history:
            if h.attack_id == attack_id:
                h.status = status
                h.stopped_at = datetime.now(timezone.utc).isoformat()
                break

    def _to_info(self, atk: VirtualAttack) -> ActiveAttackInfo:
        target_name = f"Bus_{atk.target_bus_id}" if atk.target_bus_id is not None else "Global"
        if atk.target_line_id is not None:
            target_name = f"Line_{atk.target_line_id}"

        return ActiveAttackInfo(
            attack_id=atk.attack_id,
            attack_type=atk.attack_type.value,
            scenario=atk.scenario_name,
            target_component=target_name,
            target_bus_id=atk.target_bus_id,
            target_line_id=atk.target_line_id,
            intensity=atk.intensity,
            magnitude=atk.magnitude,
            duration_seconds=atk.duration_seconds,
            elapsed_seconds=round(atk.elapsed_seconds, 1),
            started_at=atk.started_at.isoformat(),
            stopped_at=atk.stopped_at.isoformat() if atk.stopped_at else None,
            status="ACTIVE" if not atk.is_expired else "EXPIRED",
            is_confined_locally=True,
            baseline_values=dict(atk.baseline_values),
            injected_values=dict(atk.injected_values),
        )
