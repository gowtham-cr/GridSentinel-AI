"""
Feature Extractor for Smart Grid Cybersecurity Detection.
Transforms electrical telemetry and physics states into mathematical feature vectors
for Scikit-learn AI/ML models.
"""

from collections import deque
from typing import List, Dict, Any, Tuple
import numpy as np
from app.telemetry.schemas import TelemetryPacket
from app.grid_simulation.schemas import GridStateSummary
from app.core.config import settings


class GridFeatureExtractor:
    """
    Extracts physical, statistical, and temporal features from telemetry packets.
    Combines electrical engineering conservation laws with signal characteristics.
    """

    FEATURE_NAMES = [
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
    ]

    def __init__(self, history_len: int = 10):
        self.history: deque = deque(maxlen=history_len)

    def extract_features(
        self,
        packet: TelemetryPacket,
        grid_state: GridStateSummary,
    ) -> np.ndarray:
        """
        Extracts 1D feature vector for a single time step.
        Returns numpy array of shape (len(FEATURE_NAMES),).
        """
        v_magnitudes = [b.vm_pu for b in packet.buses]
        v_angles = [b.va_degree for b in packet.buses]
        p_injections = [b.p_mw for b in packet.buses]
        line_loadings = [l.loading_percent for l in packet.lines] if packet.lines else [0.0]

        # 1. Voltage magnitude statistics
        vm_mean = float(np.mean(v_magnitudes)) if v_magnitudes else 1.0
        vm_std = float(np.std(v_magnitudes)) if v_magnitudes else 0.0
        vm_max_dev = float(np.max(np.abs(np.array(v_magnitudes) - 1.0))) if v_magnitudes else 0.0

        # 2. Voltage angle range
        va_range = float(np.max(v_angles) - np.min(v_angles)) if v_angles else 0.0

        # 3. Power conservation features
        total_p_gen = grid_state.total_generation_mw
        total_p_load = grid_state.total_load_mw
        total_losses = grid_state.total_losses_mw
        # Kirchhoff power conservation residual: |P_gen - P_load - P_loss|
        power_imbalance_residual = abs(total_p_gen - total_p_load - total_losses)

        # 4. Thermal loading features
        max_line_loading = float(np.max(line_loadings)) if line_loadings else 0.0
        mean_line_loading = float(np.mean(line_loadings)) if line_loadings else 0.0

        # 5. Extremal voltages
        bus_voltage_min = float(np.min(v_magnitudes)) if v_magnitudes else 1.0
        bus_voltage_max = float(np.max(v_magnitudes)) if v_magnitudes else 1.0

        # 6. Temporal dynamics (rate of change between consecutive time steps)
        delta_v_rate = 0.0
        delta_p_rate = 0.0
        sensor_variance_score = 1.0

        if self.history:
            prev_v = self.history[-1]["vm"]
            if len(prev_v) == len(v_magnitudes):
                prev_p = self.history[-1]["p_load"]
                delta_v_rate = float(np.max(np.abs(np.array(v_magnitudes) - np.array(prev_v))))
                delta_p_rate = abs(total_p_load - prev_p)

                # Check for DoS sensor freeze: if temporal variance of voltages is abnormally low (< 1e-6)
                historical_v = [h["vm"] for h in self.history if len(h["vm"]) == len(v_magnitudes)]
                if len(historical_v) >= 3:
                    v_arr = np.array(historical_v)
                    temporal_var = float(np.mean(np.var(v_arr, axis=0)))
                    # A frozen sensor exhibits near 0 variance
                    sensor_variance_score = min(1.0, temporal_var * 1000.0)
            else:
                self.history.clear()

        # Record in history buffer
        self.history.append({
            "vm": v_magnitudes,
            "p_load": total_p_load,
        })

        feature_vector = np.array([
            vm_mean,
            vm_std,
            vm_max_dev,
            va_range,
            total_p_gen,
            total_p_load,
            total_losses,
            power_imbalance_residual,
            max_line_loading,
            mean_line_loading,
            bus_voltage_min,
            bus_voltage_max,
            delta_v_rate,
            delta_p_rate,
            sensor_variance_score,
        ], dtype=np.float32)

        return feature_vector

    def get_flagged_buses(self, packet: TelemetryPacket) -> List[int]:
        """Identifies specific buses exhibiting significant voltage or power abnormalities."""
        flagged = []
        # Priority 1: Directly spoofed / compromised telemetry channels
        for b in packet.buses:
            if getattr(b, "is_spoofed", False) and b.bus_id not in flagged:
                flagged.append(b.bus_id)

        # Priority 2: Statutory voltage limit breaches ([0.90, 1.10] pu) sorted by severity
        violations = []
        for b in packet.buses:
            if b.bus_id not in flagged:
                if b.vm_pu < settings.VOLTAGE_LOWER_LIMIT_PU:
                    violations.append((settings.VOLTAGE_LOWER_LIMIT_PU - b.vm_pu, b.bus_id))
                elif b.vm_pu > settings.VOLTAGE_UPPER_LIMIT_PU:
                    violations.append((b.vm_pu - settings.VOLTAGE_UPPER_LIMIT_PU, b.bus_id))
        violations.sort(reverse=True)
        for _, bus_id in violations:
            flagged.append(bus_id)

        return flagged

