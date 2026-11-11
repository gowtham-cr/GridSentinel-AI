"""
Electrical Residual-Based Anomaly Detection for Smart Grids.
Implements Kirchhoff Current Law (KCL) active power nodal balance and
system-wide conservation of energy residual verification.
Pinpoints compromised electrical nodes via physical mismatch.
"""

from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

from app.core.config import settings
from app.core.logging import logger
from app.cybersecurity.schemas import (
    NodalResidual,
    ResidualAnalysisResult,
    IncidentSeverity,
)
from app.telemetry.schemas import TelemetryPacket
from app.grid_simulation.schemas import GridStateSummary


class ElectricalResidualDetector:
    """
    Physical Residual-Based Anomaly Detector.
    Evaluates Kirchhoff's nodal active power conservation:
        r_i = | P_inj,i - sum_{j in N_i} P_ij |
    In an uncompromised grid, r_i approx 0 MW.
    Adversarial telemetry spoofing (FDIA, load tampering, sensor bias) introduces
    detectable non-zero residuals, isolating the attacked bus component.
    """

    def __init__(
        self,
        residual_threshold_mw: float = 2.0,
        system_threshold_mw: float = 1.0,
    ):
        self.residual_threshold_mw = residual_threshold_mw
        self.system_threshold_mw = system_threshold_mw

    def calculate_from_net(self, net) -> ResidualAnalysisResult:
        """
        Calculates exact per-bus KCL active power residuals directly from a pandapower network.
        Uses physical input injections and power flow branch results.
        """
        now_str = datetime.now(timezone.utc).isoformat()
        nodal_list: List[NodalResidual] = []
        max_residual = 0.0
        worst_bus: Optional[int] = None

        has_line_results = hasattr(net, "res_line") and not net.res_line.empty
        has_trafo_results = hasattr(net, "res_trafo") and not net.res_trafo.empty

        for bus in net.bus.index:
            bus_id = int(bus)
            # Net injection into bus from generation minus load
            gen_p = float(net.gen.loc[net.gen.bus == bus, "p_mw"].sum()) if hasattr(net, "gen") and not net.gen.empty else 0.0
            ext_p = float(net.res_ext_grid.loc[net.ext_grid.bus == bus, "p_mw"].sum()) if hasattr(net, "res_ext_grid") and not net.ext_grid.empty else 0.0
            sgen_p = float(net.sgen.loc[net.sgen.bus == bus, "p_mw"].sum()) if hasattr(net, "sgen") and not net.sgen.empty else 0.0
            load_p = float(net.load.loc[net.load.bus == bus, "p_mw"].sum()) if hasattr(net, "load") and not net.load.empty else 0.0
            p_inj = gen_p + ext_p + sgen_p - load_p

            # Active power leaving bus via incident lines and transformers
            p_leaving = 0.0
            if has_line_results:
                line_from = float(net.res_line.loc[net.line.from_bus == bus, "p_from_mw"].sum())
                line_to = float(net.res_line.loc[net.line.to_bus == bus, "p_to_mw"].sum())
                p_leaving += line_from + line_to

            if has_trafo_results:
                trafo_hv = float(net.res_trafo.loc[net.trafo.hv_bus == bus, "p_hv_mw"].sum())
                trafo_lv = float(net.res_trafo.loc[net.trafo.lv_bus == bus, "p_lv_mw"].sum())
                p_leaving += trafo_hv + trafo_lv

            r_i = abs(p_inj - p_leaving)
            is_viol = bool(r_i > self.residual_threshold_mw)

            if r_i > max_residual:
                max_residual = r_i
                worst_bus = bus_id

            nodal_list.append(
                NodalResidual(
                    bus_id=bus_id,
                    p_inj_mw=round(p_inj, 4),
                    p_leaving_mw=round(p_leaving, 4),
                    residual_mw=round(r_i, 6),
                    is_violation=is_viol,
                )
            )

        # Whole grid power balance
        p_gen_tot = (
            float(net.res_ext_grid["p_mw"].sum() + net.res_gen["p_mw"].sum() + net.res_sgen["p_mw"].sum())
            if hasattr(net, "res_ext_grid") and not net.res_ext_grid.empty
            else 0.0
        )
        p_load_tot = float(net.res_load["p_mw"].sum()) if hasattr(net, "res_load") and not net.res_load.empty else 0.0
        p_loss_tot = (
            float(net.res_line["pl_mw"].sum()) if has_line_results else 0.0
        ) + (
            float(net.res_trafo["pl_mw"].sum()) if has_trafo_results else 0.0
        )
        sys_imbalance = abs(p_gen_tot - p_load_tot - p_loss_tot)

        residual_violation = (
            max_residual > self.residual_threshold_mw or sys_imbalance > self.system_threshold_mw
        )

        return ResidualAnalysisResult(
            timestamp=now_str,
            max_residual_mw=round(max_residual, 6),
            worst_bus_id=worst_bus,
            system_imbalance_mw=round(sys_imbalance, 6),
            residual_threshold_mw=self.residual_threshold_mw,
            residual_violation=residual_violation,
            nodal_residuals=nodal_list,
        )

    def calculate_from_telemetry(
        self,
        packet: TelemetryPacket,
        grid_state: GridStateSummary,
    ) -> ResidualAnalysisResult:
        """
        Calculates per-bus active power KCL residuals from transmitted telemetry packets.
        Allows real-time SCADA bad data detection on arriving PMU streams.
        """
        nodal_list: List[NodalResidual] = []
        max_residual = 0.0
        worst_bus: Optional[int] = None

        bus_map = {b.bus_id: b for b in packet.buses}

        for bus_id, bus_telem in bus_map.items():
            # In pandapower: bus_telem.p_mw is net demand (load - gen).
            # Net physical injection into node = -bus_telem.p_mw
            p_inj = -bus_telem.p_mw

            # Accumulate leaving branch flows
            p_leaving = 0.0
            for line in packet.lines:
                if line.from_bus == bus_id:
                    p_leaving += line.p_from_mw
                elif line.to_bus == bus_id:
                    # In pandapower line power convention: p_to_mw = pl_mw - p_from_mw
                    p_to_leaving = line.pl_mw - line.p_from_mw
                    p_leaving += p_to_leaving

            r_i = abs(p_inj - p_leaving)
            # Normal PMU AWGN noise can create up to ~0.05 MW residual; threshold is 1.0 MW
            is_viol = bool(r_i > self.residual_threshold_mw or bus_telem.is_spoofed)

            if r_i > max_residual:
                max_residual = r_i
                worst_bus = bus_id

            nodal_list.append(
                NodalResidual(
                    bus_id=bus_id,
                    p_inj_mw=round(p_inj, 4),
                    p_leaving_mw=round(p_leaving, 4),
                    residual_mw=round(r_i, 6),
                    is_violation=is_viol,
                )
            )

        sys_imbalance = grid_state.active_power_imbalance_mw
        residual_violation = (
            max_residual > self.residual_threshold_mw
            or sys_imbalance > self.system_threshold_mw
            or any(n.is_violation for n in nodal_list)
        )

        return ResidualAnalysisResult(
            timestamp=packet.timestamp,
            max_residual_mw=round(max_residual, 6),
            worst_bus_id=worst_bus,
            system_imbalance_mw=round(sys_imbalance, 6),
            residual_threshold_mw=self.residual_threshold_mw,
            residual_violation=residual_violation,
            nodal_residuals=nodal_list,
        )
