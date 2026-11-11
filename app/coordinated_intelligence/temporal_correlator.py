"""
Temporal Correlator for GridSentinel Coordinated Threat Intelligence.
Analyzes timestamps, sliding event windows, sequence patterns, and synchronization.
"""

from datetime import datetime
import math
from typing import List, Tuple
import numpy as np

from app.coordinated_intelligence.schemas import TemporalEvidence, ComponentAnomalyObservation


class TemporalCorrelator:
    """
    Evaluates temporal clustering and synchronization of multi-component anomalies.
    Computes time span, inter-arrival variance, and synchronization decay.
    """

    def __init__(
        self,
        window_seconds: float = 15.0,
        sync_half_life_seconds: float = 3.0,
    ):
        self.window_seconds = window_seconds
        self.sync_half_life_seconds = sync_half_life_seconds

    def evaluate_temporal_correlation(
        self,
        observations: List[ComponentAnomalyObservation],
    ) -> TemporalEvidence:
        """
        Calculates temporal synchronization score S_temporal in [0, 1].
        If anomalies span outside window_seconds, S_temporal drops to 0.0.
        """
        if not observations:
            return TemporalEvidence(
                window_seconds=self.window_seconds,
                time_span_seconds=0.0,
                mean_inter_arrival_seconds=0.0,
                time_variance_seconds2=0.0,
                synchronization_score=0.0,
                sequence_pattern="NORMAL",
            )

        if len(observations) == 1:
            return TemporalEvidence(
                window_seconds=self.window_seconds,
                time_span_seconds=0.0,
                mean_inter_arrival_seconds=0.0,
                time_variance_seconds2=0.0,
                synchronization_score=0.0,
                sequence_pattern="SINGLE_EVENT",
            )

        # Convert timestamps to float seconds relative to first event
        sorted_obs = sorted(observations, key=lambda x: x.timestamp)
        base_t = sorted_obs[0].timestamp.timestamp()
        relative_times = np.array([obs.timestamp.timestamp() - base_t for obs in sorted_obs], dtype=np.float64)

        time_span = float(relative_times[-1] - relative_times[0])
        variance = float(np.var(relative_times))

        # Pairwise deltas
        deltas = []
        for i in range(len(relative_times)):
            for j in range(i + 1, len(relative_times)):
                deltas.append(abs(relative_times[i] - relative_times[j]))
        mean_delta = float(np.mean(deltas)) if deltas else 0.0

        # Criterion 1: Outside Correlation Window
        if time_span > self.window_seconds:
            return TemporalEvidence(
                window_seconds=self.window_seconds,
                time_span_seconds=round(time_span, 3),
                mean_inter_arrival_seconds=round(mean_delta, 3),
                time_variance_seconds2=round(variance, 3),
                synchronization_score=0.0,
                sequence_pattern="OUT_OF_WINDOW",
            )

        # Criterion 2: Within Window - Exponential Synchronization Decay
        # S_temporal = exp(-(mean_delta + 0.5 * variance) / sync_half_life)
        decay_factor = (mean_delta + 0.5 * math.sqrt(variance)) / max(self.sync_half_life_seconds, 0.5)
        sync_score = float(math.exp(-decay_factor))
        sync_score = min(1.0, max(0.0, sync_score))

        # Sequence Pattern Classification
        if time_span <= 2.0 and mean_delta <= 1.2:
            sequence_pattern = "SYNCHRONOUS_BURST"
        elif time_span <= 8.0:
            sequence_pattern = "SEQUENTIAL_PROPAGATION"
        else:
            sequence_pattern = "DISPERSED_RANDOM"

        return TemporalEvidence(
            window_seconds=self.window_seconds,
            time_span_seconds=round(time_span, 3),
            mean_inter_arrival_seconds=round(mean_delta, 3),
            time_variance_seconds2=round(variance, 3),
            synchronization_score=round(sync_score, 4),
            sequence_pattern=sequence_pattern,
        )

