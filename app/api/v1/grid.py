"""Grid Simulation REST API endpoints."""

from typing import List, Dict, Any, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.api.dependencies import (
    get_grid_simulator,
    get_simulation_manager,
    get_mitigation_engine,
    get_db,
)
from app.grid_simulation.simulator import GridSimulator
from app.grid_simulation.runner import SimulationManager, SimulationStatusInfo
from app.cybersecurity.mitigation import MitigationEngine
from app.grid_simulation.schemas import GridStateSummary, TopologyInfo
from app.database.models import SimulationRunRecord, GridSnapshotRecord

router = APIRouter(prefix="/grid", tags=["Grid Simulation"])


class SwitchTopologyRequest(BaseModel):
    topology_name: str = Field(..., description="'resilient_microgrid', 'cigre_microgrid', or 'ieee14'")


class StepSimulationRequest(BaseModel):
    load_variation: float = Field(0.02, ge=0.0, le=0.20, description="Relative std dev for load fluctuation")
    der_variation: float = Field(0.03, ge=0.0, le=0.20, description="Relative std dev for renewable generation fluctuation")


class SpeedRequest(BaseModel):
    speed_hz: float = Field(1.0, ge=0.2, le=10.0, description="Simulation steps per second")


@router.get("/topologies", response_model=List[Dict[str, Any]])
def list_available_topologies():
    """Lists virtual microgrid topologies available for selection and initialization."""
    return [
        {
            "id": "ieee14_grid",
            "name": "IEEE 14-Bus Test System",
            "voltage_level": "69 kV / 13.8 kV",
            "num_buses": 14,
            "der_assets": ["Multi-Generator Dispatch"],
            "critical_loads": ["Transmission & Subtransmission Substations"],
            "description": "IEEE 14-bus electrical benchmark for power system stability, state estimation, and CPS intrusion detection.",
        },
        {
            "id": "resilient_microgrid",
            "name": "8-Bus Resilient Smart Microgrid",
            "voltage_level": "20 kV / 0.4 kV",
            "num_buses": 8,
            "der_assets": ["1.5 MW Solar PV", "1.8 MW Wind Turbine", "0.8 MW BESS"],
            "critical_loads": ["Hospital Critical Care", "Industrial Manufacturing"],
            "description": "Standard benchmark cyber-physical microgrid with mixed DERs and critical loads.",
        },
        {
            "id": "cigre_microgrid",
            "name": "CIGRE Medium Voltage Microgrid",
            "voltage_level": "20 kV",
            "num_buses": 14,
            "der_assets": ["Solar PV", "Wind Park", "Fuel Cells", "Storage"],
            "critical_loads": ["Mixed Industrial & Urban Feeders"],
            "description": "CIGRE benchmark MV distribution network with multi-inverter DER penetration.",
        },
    ]


@router.post("/initialize", status_code=status.HTTP_200_OK)
def initialize_grid(
    req: SwitchTopologyRequest,
    sim_manager: SimulationManager = Depends(get_simulation_manager),
    mitigation_engine: MitigationEngine = Depends(get_mitigation_engine),
    db: Session = Depends(get_db),
):
    """
    Selects and initializes a virtual electrical grid topology, resets setpoints,
    and captures nominal electrical state baseline. Persists lifecycle event in SQLite.
    """
    sim_manager.change_topology(req.topology_name)
    mitigation_engine._capture_baseline()
    state = sim_manager.simulator.get_state_summary()

    # Persist simulation run and initial state snapshot in SQLite
    run_rec = SimulationRunRecord(
        run_uuid=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        topology_name=req.topology_name,
        action="INITIALIZE",
        step_count=0,
        speed_hz=sim_manager.speed_hz,
        converged=state.converged,
        total_p_gen_mw=state.total_generation_mw,
        total_p_load_mw=state.total_load_mw,
        min_vm_pu=state.min_voltage_pu,
        max_vm_pu=state.max_voltage_pu,
        voltage_violations=state.voltage_violations_count,
        overloaded_lines=state.overloaded_lines_count,
        notes=f"Initialized virtual grid topology '{req.topology_name}'.",
    )
    snap_rec = GridSnapshotRecord(
        topology_name=req.topology_name,
        total_p_gen_mw=state.total_generation_mw,
        total_p_load_mw=state.total_load_mw,
        total_losses_mw=state.total_losses_mw,
        power_imbalance_mw=state.active_power_imbalance_mw,
        min_vm_pu=state.min_voltage_pu,
        max_vm_pu=state.max_voltage_pu,
        max_line_loading_pct=state.max_line_loading_pct,
        converged=state.converged,
    )
    db.add(run_rec)
    db.add(snap_rec)
    db.commit()

    return {
        "status": "success",
        "message": f"Virtual electrical grid initialized with topology '{req.topology_name}'.",
        "topology_info": sim_manager.simulator.get_topology_info(),
        "state_summary": state,
    }


@router.get("/topology", response_model=TopologyInfo)
def get_topology_info(simulator: GridSimulator = Depends(get_grid_simulator)):
    """Retrieves structural and component configuration of current electrical microgrid."""
    return simulator.get_topology_info()


@router.get("/state", response_model=GridStateSummary)
def get_grid_state(simulator: GridSimulator = Depends(get_grid_simulator)):
    """
    Retrieves full verified AC power flow state calculated via pandapower.
    Includes bus voltages (p.u.), phase angles, line loading %, active/reactive power,
    and Kirchhoff conservation residuals.
    """
    return simulator.get_state_summary()


@router.post("/step", response_model=GridStateSummary)
def step_simulation(
    req: StepSimulationRequest = StepSimulationRequest(),
    simulator: GridSimulator = Depends(get_grid_simulator),
    db: Session = Depends(get_db),
):
    """
    Advances the virtual microgrid simulation by one time interval.
    Applies realistic physical demand fluctuations and recalculates AC power flow.
    Persists power flow snapshot in SQLite.
    """
    state = simulator.step(
        load_noise_std=req.load_variation,
        der_variation=req.der_variation,
    )
    snap_rec = GridSnapshotRecord(
        topology_name=simulator.topology_name,
        total_p_gen_mw=state.total_generation_mw,
        total_p_load_mw=state.total_load_mw,
        total_losses_mw=state.total_losses_mw,
        power_imbalance_mw=state.active_power_imbalance_mw,
        min_vm_pu=state.min_voltage_pu,
        max_vm_pu=state.max_voltage_pu,
        max_line_loading_pct=state.max_line_loading_pct,
        converged=state.converged,
    )
    db.add(snap_rec)
    db.commit()
    return state


@router.post("/simulation/start", response_model=SimulationStatusInfo)
def start_simulation(
    sim_manager: SimulationManager = Depends(get_simulation_manager),
    db: Session = Depends(get_db),
):
    """Starts or resumes continuous simulation loop and logs event."""
    sim_manager.start()
    status_info = sim_manager.get_status()
    run_rec = SimulationRunRecord(
        run_uuid=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        topology_name=status_info.active_topology,
        action="START",
        step_count=status_info.step_count,
        speed_hz=status_info.speed_hz,
        converged=status_info.converged,
        notes="Started continuous simulation loop.",
    )
    db.add(run_rec)
    db.commit()
    return status_info


@router.post("/simulation/pause", response_model=SimulationStatusInfo)
def pause_simulation(
    sim_manager: SimulationManager = Depends(get_simulation_manager),
    db: Session = Depends(get_db),
):
    """Pauses automatic simulation loop and logs event."""
    sim_manager.pause()
    status_info = sim_manager.get_status()
    run_rec = SimulationRunRecord(
        run_uuid=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        topology_name=status_info.active_topology,
        action="PAUSE",
        step_count=status_info.step_count,
        speed_hz=status_info.speed_hz,
        converged=status_info.converged,
        notes="Paused simulation loop.",
    )
    db.add(run_rec)
    db.commit()
    return status_info


@router.post("/simulation/resume", response_model=SimulationStatusInfo)
def resume_simulation(
    sim_manager: SimulationManager = Depends(get_simulation_manager),
    db: Session = Depends(get_db),
):
    """Resumes automatic simulation loop and logs event."""
    sim_manager.resume()
    status_info = sim_manager.get_status()
    run_rec = SimulationRunRecord(
        run_uuid=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        topology_name=status_info.active_topology,
        action="RESUME",
        step_count=status_info.step_count,
        speed_hz=status_info.speed_hz,
        converged=status_info.converged,
        notes="Resumed simulation loop.",
    )
    db.add(run_rec)
    db.commit()
    return status_info


@router.post("/simulation/reset", response_model=SimulationStatusInfo)
def reset_simulation(
    sim_manager: SimulationManager = Depends(get_simulation_manager),
    db: Session = Depends(get_db),
):
    """Resets simulation time, restores nominal setpoints, and logs event."""
    sim_manager.reset()
    status_info = sim_manager.get_status()
    run_rec = SimulationRunRecord(
        run_uuid=f"RUN-{uuid.uuid4().hex[:8].upper()}",
        topology_name=status_info.active_topology,
        action="RESET",
        step_count=0,
        speed_hz=status_info.speed_hz,
        converged=status_info.converged,
        notes="Reset simulation to nominal baseline.",
    )
    db.add(run_rec)
    db.commit()
    return status_info


@router.post("/simulation/speed", response_model=SimulationStatusInfo)
def set_simulation_speed(
    req: SpeedRequest,
    sim_manager: SimulationManager = Depends(get_simulation_manager),
):
    """Adjusts automatic simulation step frequency."""
    sim_manager.set_speed(req.speed_hz)
    return sim_manager.get_status()


@router.get("/simulation/status", response_model=SimulationStatusInfo)
def get_simulation_status(sim_manager: SimulationManager = Depends(get_simulation_manager)):
    """Returns current execution and playback state."""
    return sim_manager.get_status()


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_grid(simulator: GridSimulator = Depends(get_grid_simulator)):
    """Restores all loads, generators, and switches back to pristine nominal setpoints."""
    simulator.reset_to_nominal()
    return {
        "status": "success",
        "message": f"Topology '{simulator.topology_name}' reset to nominal operating parameters.",
    }


@router.post("/switch-topology", status_code=status.HTTP_200_OK)
def switch_topology(
    req: SwitchTopologyRequest,
    sim_manager: SimulationManager = Depends(get_simulation_manager),
):
    """Switches active simulation network topology."""
    sim_manager.change_topology(req.topology_name)
    return {
        "status": "success",
        "message": f"Switched active grid topology to '{req.topology_name}'.",
        "topology_info": sim_manager.simulator.get_topology_info(),
    }
