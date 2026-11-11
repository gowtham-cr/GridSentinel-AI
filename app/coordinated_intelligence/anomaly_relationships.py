"""
Anomaly Relationships and Cross-Component Evidence Evaluator for CTIE.
Correlates physical modalities (voltage, power, replay, communication) and evaluates uncertainty.
"""

from typing import List, Dict, Any, Set
import numpy as np

from app.coordinated_intelligence.schemas import (
    CrossComponentEvidence,
    ComponentAnomalyObservation,
)


class CrossComponentEvidenceEvaluator:
    """
    Evaluates cross-modal relationships across anomalous components.
    Analyzes whether deviations across distinct channels exhibit coordinated evasion or mutual reinforcement.
    """

    def evaluate_cross_component_evidence(
        self,
        observations: List[ComponentAnomalyObservation],
    ) -> CrossComponentEvidence:
        """
        Calculates cross-modal synergy score S_cross in [0, 1] and uncertainty penalty U.
        """
        if not observations:
            return CrossComponentEvidence(
                modalities_involved=[],
                cross_modal_synergy_score=0.0,
                evasion_synergy_detected=False,
                uncertainty_penalty=0.0,
            )

        if len(observations) == 1:
            types = observations[0].anomaly_types
            return CrossComponentEvidence(
                modalities_involved=types,
                cross_modal_synergy_score=0.10 if types else 0.0,
                evasion_synergy_detected=False,
                uncertainty_penalty=0.0,
            )

        # 1. Collect distinct physical modalities across all observations
        modalities: Set[str] = set()
        missing_count = 0
        delayed_count = 0
        severities: List[float] = []

        has_voltage_anom = False
        has_power_anom = False
        has_replay_anom = False
        has_comm_anom = False

        for obs in observations:
            severities.append(obs.severity_score)
            if obs.is_telemetry_missing:
                missing_count += 1
            if obs.is_telemetry_delayed:
                delayed_count += 1

            for anom in obs.anomaly_types:
                anom_lower = anom.lower()
                modalities.add(anom_lower)
                if "voltage" in anom_lower or "vm" in anom_lower:
                    has_voltage_anom = True
                if "power" in anom_lower or "load" in anom_lower or "gen" in anom_lower or "p_" in anom_lower:
                    has_power_anom = True
                if "replay" in anom_lower or "stale" in anom_lower:
                    has_replay_anom = True
                if "dos" in anom_lower or "freeze" in anom_lower or "comm" in anom_lower:
                    has_comm_anom = True

        # 2. Check for Evasion Synergy
        # Attackers manipulating voltage on one node while adjusting active power or freezing communications
        # on adjacent nodes indicates multi-vector coordinated infiltration.
        evasion_synergy = False
        if has_voltage_anom and has_power_anom:
            evasion_synergy = True
        elif (has_voltage_anom or has_power_anom) and (has_replay_anom or has_comm_anom):
            evasion_synergy = True

        # 3. Synergy Score Calculation
        # Base synergy reflects the severity and modality diversity
        mean_severity = float(np.mean(severities)) if severities else 0.5
        modality_diversity = min(1.0, len(modalities) / 3.0)

        # Multi-component synergy base
        base_synergy = 0.5 * mean_severity + 0.3 * modality_diversity
        if evasion_synergy:
            base_synergy += 0.20

        synergy_score = float(min(1.0, max(0.0, base_synergy)))

        # 4. Uncertainty Penalty
        # If telemetry packets are missing or delayed, penalty is scaled into [0, 0.40]
        n_obs = len(observations)
        missing_ratio = missing_count / max(n_obs, 1)
        delayed_ratio = delayed_count / max(n_obs, 1)
        uncertainty_penalty = float(min(0.40, 0.25 * missing_ratio + 0.15 * delayed_ratio))

        return CrossComponentEvidence(
            modalities_involved=sorted(list(modalities)),
            cross_modal_synergy_score=round(synergy_score, 4),
            evasion_synergy_detected=evasion_synergy,
            uncertainty_penalty=round(uncertainty_penalty, 4),
        )

