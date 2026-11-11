"""
Pandapower-based Electrical Grid Simulation Engine.
Performs real engineering AC/DC Newton-Raphson power flow calculations.
Strictly confined to local virtual environment simulation; never connects to physical grid hardware.
"""

from datetime import datetime, timezone
import threading
from typing import Dict, Any, List, Optional
import numpy as np
import pandapower as pp
from app.core.config import settings
from app.core.exceptions import GridSimulationError
from app.core.logging import logger
from app.grid_simulation.topologies import get_topology
from app.grid_simulation.schemas import (
    BusState,
    LineState,
    GridStateSummary,
    TopologyInfo,
)


class GridSimulator:
    """
    Pandapower AC/DC Power Flow Simulation Engine.
    Executes true physical Newton-Raphson power flow solutions on microgrid networks.
    """

    def __init__(self, topology_name: Optional[str] = None):
        self.topology_name = topology_name or settings.DEFAULT_GRID_TOPOLOGY
        self.lock = threading.RLock()
        self.net = get_topology(self.topology_name)
        self.step_count = 0
        self.last_run_time: Optional[datetime] = None
        self.converged: bool = False
        self._initial_loads = self.net.load[["p_mw", "q_mvar"]].copy() if not self.net.load.empty else None
        self._initial_sgens = self.net.sgen[["p_mw", "q_mvar"]].copy() if not self.net.sgen.empty else None

        # Execute initial power flow to ensure valid nominal starting state
        self.run_power_flow()
        logger.info(f"Initialized GridSimulator with topology '{self.topology_name}' (Buses: {len(self.net.bus)}, Lines: {len(self.net.line)})")

    def run_power_flow(self, algorithm: str = "nr") -> bool:
        """
        Executes genuine AC Newton-Raphson power flow calculation via pandapower.
        """
        with self.lock:
            try:
                pp.runpp(
                    self.net,
                    algorithm=algorithm,
                    calculate_voltage_angles=True,
                    max_iteration=25,
                    enforce_q_lims=True,
                    numba=False,
                )
                self.converged = bool(self.net.converged)
                self.last_run_time = datetime.now(timezone.utc)
                if not self.converged:
                    logger.warning("Power flow completed without convergence.")
                return self.converged
            except Exception as e:
                self.converged = False
                logger.error(f"Pandapower power flow computation failed: {str(e)}")
                raise GridSimulationError(
                    message=f"Power flow calculation failed to converge: {str(e)}",
                    details={"algorithm": algorithm, "topology": self.topology_name},
                )

    def step(self, load_noise_std: float = 0.02, der_variation: float = 0.03) -> GridStateSummary:
        """
        Advances the virtual microgrid in time.
        Simulates realistic physical load demand fluctuations and renewable DER variations,
        then recalculates genuine AC power flow.
        """
        with self.lock:
            self.step_count += 1
            
            # Apply dynamic load fluctuations (Gaussian walk around nominal setpoints)
            if not self.net.load.empty and self._initial_loads is not None:
                for idx in self.net.load.index:
                    nominal_p = self._initial_loads.loc[idx, "p_mw"]
                    nominal_q = self._initial_loads.loc[idx, "q_mvar"]
                    # Load fluctuation ±2-5%
                    delta_p = float(np.random.normal(0, max(0.001, abs(nominal_p) * load_noise_std)))
                    delta_q = float(np.random.normal(0, max(0.001, abs(nominal_q) * load_noise_std)))
                    self.net.load.loc[idx, "p_mw"] = nominal_p + delta_p
                    self.net.load.loc[idx, "q_mvar"] = nominal_q + delta_q

            # Apply renewable generation fluctuation (e.g. solar/wind cloud transients)
            if not self.net.sgen.empty and self._initial_sgens is not None:
                for idx in self.net.sgen.index:
                    nominal_p = self._initial_sgens.loc[idx, "p_mw"]
                    delta_gen = float(np.random.normal(0, nominal_p * der_variation))
                    self.net.sgen.loc[idx, "p_mw"] = max(0.05, nominal_p + delta_gen)

        # Run power flow on new setpoints
        self.run_power_flow()
        return self.get_state_summary()

    def get_state_summary(self) -> GridStateSummary:
        """
        Extracts validated electrical engineering metrics from pandapower results.
        """
        with self.lock:
            # 1. Total Generation Calculation
            ext_grid_p = float(self.net.res_ext_grid["p_mw"].sum()) if not self.net.res_ext_grid.empty else 0.0
            sgen_p = float(self.net.res_sgen["p_mw"].sum()) if not self.net.res_sgen.empty else 0.0
            gen_p = float(self.net.res_gen["p_mw"].sum()) if not self.net.res_gen.empty else 0.0
            total_generation = ext_grid_p + sgen_p + gen_p

            # 2. Total Demand Calculation
            total_load = float(self.net.res_load["p_mw"].sum()) if not self.net.res_load.empty else 0.0

            # 3. Electrical Losses Calculation
            line_losses = float(self.net.res_line["pl_mw"].sum()) if not self.net.res_line.empty else 0.0
            trafo_losses = float(self.net.res_trafo["pl_mw"].sum()) if not self.net.res_trafo.empty else 0.0
            total_losses = line_losses + trafo_losses

            # Power balance residual conservation check: P_gen - P_load - P_loss ~ 0
            power_imbalance = abs(total_generation - total_load - total_losses)

            # Bus states
            buses: List[BusState] = []
            voltage_violations = 0
            for idx in self.net.bus.index:
                vm = float(self.net.res_bus.loc[idx, "vm_pu"])
                va = float(self.net.res_bus.loc[idx, "va_degree"])
                p = float(self.net.res_bus.loc[idx, "p_mw"])
                q = float(self.net.res_bus.loc[idx, "q_mvar"])
                is_violation = (
                    vm < settings.VOLTAGE_LOWER_LIMIT_PU or vm > settings.VOLTAGE_UPPER_LIMIT_PU
                )
                if is_violation:
                    voltage_violations += 1

                buses.append(
                    BusState(
                        bus_id=int(idx),
                        name=str(self.net.bus.loc[idx, "name"]),
                        vn_kv=float(self.net.bus.loc[idx, "vn_kv"]),
                        vm_pu=round(vm, 4),
                        va_degree=round(va, 3),
                        p_mw=round(p, 4),
                        q_mvar=round(q, 4),
                        voltage_violation=is_violation,
                    )
                )

            # Line states
            lines: List[LineState] = []
            overloaded_lines = 0
            for idx in self.net.line.index:
                loading = float(self.net.res_line.loc[idx, "loading_percent"])
                is_overload = loading > settings.MAX_LINE_LOADING_PERCENT
                if is_overload:
                    overloaded_lines += 1

                lines.append(
                    LineState(
                        line_id=int(idx),
                        name=str(self.net.line.loc[idx, "name"]),
                        from_bus=int(self.net.line.loc[idx, "from_bus"]),
                        to_bus=int(self.net.line.loc[idx, "to_bus"]),
                        p_from_mw=round(float(self.net.res_line.loc[idx, "p_from_mw"]), 4),
                        q_from_mvar=round(float(self.net.res_line.loc[idx, "q_from_mvar"]), 4),
                        p_to_mw=round(float(self.net.res_line.loc[idx, "p_to_mw"]), 4),
                        q_to_mvar=round(float(self.net.res_line.loc[idx, "q_to_mvar"]), 4),
                        pl_mw=round(float(self.net.res_line.loc[idx, "pl_mw"]), 4),
                        loading_percent=round(loading, 2),
                        thermal_overload=is_overload,
                    )
                )

            # Include transformer branches so all network connections are represented
            if hasattr(self.net, "trafo") and not self.net.trafo.empty and hasattr(self.net, "res_trafo") and not self.net.res_trafo.empty:
                for idx in self.net.trafo.index:
                    loading = float(self.net.res_trafo.loc[idx, "loading_percent"])
                    is_overload = loading > settings.MAX_LINE_LOADING_PERCENT
                    if is_overload:
                        overloaded_lines += 1

                    lines.append(
                        LineState(
                            line_id=int(1000 + idx),
                            name=str(self.net.trafo.loc[idx, "name"]),
                            from_bus=int(self.net.trafo.loc[idx, "hv_bus"]),
                            to_bus=int(self.net.trafo.loc[idx, "lv_bus"]),
                            p_from_mw=round(float(self.net.res_trafo.loc[idx, "p_hv_mw"]), 4),
                            q_from_mvar=round(float(self.net.res_trafo.loc[idx, "q_hv_mvar"]), 4),
                            p_to_mw=round(float(self.net.res_trafo.loc[idx, "p_lv_mw"]), 4),
                            q_to_mvar=round(float(self.net.res_trafo.loc[idx, "q_lv_mvar"]), 4),
                            pl_mw=round(float(self.net.res_trafo.loc[idx, "pl_mw"]), 4),
                            loading_percent=round(loading, 2),
                            thermal_overload=is_overload,
                        )
                    )

            min_v = float(self.net.res_bus["vm_pu"].min())
            max_v = float(self.net.res_bus["vm_pu"].max())
            max_loading = float(self.net.res_line["loading_percent"].max()) if not self.net.res_line.empty else 0.0

            return GridStateSummary(
                timestamp=self.last_run_time.isoformat() if self.last_run_time else datetime.now(timezone.utc).isoformat(),
                topology_name=self.topology_name,
                converged=self.converged,
                algorithm="Newton-Raphson AC Power Flow",
                total_generation_mw=round(total_generation, 4),
                total_load_mw=round(total_load, 4),
                total_losses_mw=round(total_losses, 4),
                active_power_imbalance_mw=round(power_imbalance, 6),
                min_voltage_pu=round(min_v, 4),
                max_voltage_pu=round(max_v, 4),
                max_line_loading_pct=round(max_loading, 2),
                voltage_violations_count=voltage_violations,
                overloaded_lines_count=overloaded_lines,
                buses=buses,
                lines=lines,
            )

    def get_topology_info(self) -> TopologyInfo:
        """Returns structural configuration of the electrical topology."""
        with self.lock:
            total_gen_cap = 0.0
            if not self.net.sgen.empty:
                total_gen_cap += float(self.net.sgen["p_mw"].sum())
            if not self.net.gen.empty:
                total_gen_cap += float(self.net.gen["p_mw"].sum())
            if not self.net.ext_grid.empty:
                total_gen_cap += 10.0  # nominal intertie capacity

            return TopologyInfo(
                name=self.topology_name,
                description=str(self.net.name),
                num_buses=len(self.net.bus),
                num_lines=len(self.net.line),
                num_loads=len(self.net.load),
                num_generators=len(self.net.sgen) + len(self.net.gen),
                nominal_voltage_kv=float(self.net.bus["vn_kv"].iloc[0]),
                total_installed_capacity_mw=round(total_gen_cap, 2),
            )

    def modify_physical_load(self, bus_id: int, p_mw: float, q_mvar: Optional[float] = None) -> bool:
        """
        Modifies physical load setpoints (used in load tampering cyber-physical attack simulations).
        """
        with self.lock:
            matched = self.net.load[self.net.load["bus"] == bus_id]
            if matched.empty:
                raise GridSimulationError(f"No electrical load found connected to bus {bus_id}")
            load_idx = matched.index[0]
            self.net.load.loc[load_idx, "p_mw"] = p_mw
            if q_mvar is not None:
                self.net.load.loc[load_idx, "q_mvar"] = q_mvar
        self.run_power_flow()
        return True

    def modify_der_generation(self, bus_id: int, p_mw: float) -> bool:
        """
        Modifies distributed energy resource setpoints (used in DER tampering simulations).
        """
        with self.lock:
            matched = self.net.sgen[self.net.sgen["bus"] == bus_id]
            if matched.empty:
                raise GridSimulationError(f"No DER generation found connected to bus {bus_id}")
            sgen_idx = matched.index[0]
            self.net.sgen.loc[sgen_idx, "p_mw"] = p_mw
        self.run_power_flow()
        return True

    def reset_to_nominal(self) -> None:
        """Restores all loads, generators, and switches back to initial nominal configuration."""
        with self.lock:
            self.net = get_topology(self.topology_name)
            self._initial_loads = self.net.load[["p_mw", "q_mvar"]].copy() if not self.net.load.empty else None
            self._initial_sgens = self.net.sgen[["p_mw", "q_mvar"]].copy() if not self.net.sgen.empty else None
        self.run_power_flow()
        logger.info(f"Grid topology '{self.topology_name}' reset to nominal baseline state.")
