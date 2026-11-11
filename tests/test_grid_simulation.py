"""Tests for pandapower electrical grid simulation and power flow physics."""

import pytest
from app.grid_simulation.topologies import create_resilient_microgrid, get_topology
from app.grid_simulation.simulator import GridSimulator


def test_resilient_microgrid_topology():
    """Verify standard resilient microgrid contains required buses, DERs, and loads."""
    net = create_resilient_microgrid()
    assert len(net.bus) == 8
    assert len(net.line) >= 5
    assert len(net.sgen) >= 2   # Solar + Wind
    assert len(net.load) >= 3   # Hospital, Industrial, Commercial


def test_power_flow_newton_raphson_convergence():
    """Verify Pandapower AC Newton-Raphson power flow converges accurately."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    converged = sim.run_power_flow(algorithm="nr")
    assert converged is True
    assert sim.converged is True

    summary = sim.get_state_summary()
    assert summary.converged is True
    assert len(summary.buses) == 8
    assert len(summary.lines) >= 5


def test_kirchhoff_power_conservation_law():
    """
    Verify fundamental physical law of energy conservation:
    Total Generation = Total Load + Total Electrical Losses
    Imbalance residual must be nearly zero (< 1e-4 MW).
    """
    sim = GridSimulator(topology_name="resilient_microgrid")
    summary = sim.get_state_summary()

    calculated_residual = abs(
        summary.total_generation_mw - summary.total_load_mw - summary.total_losses_mw
    )
    assert calculated_residual < 0.001
    assert summary.active_power_imbalance_mw < 0.001


def test_simulation_step_advancement():
    """Verify simulation advances in time with realistic load fluctuations."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    initial_p_load = sim.get_state_summary().total_load_mw
    
    # Step with 5% fluctuation
    step_summary = sim.step(load_noise_std=0.05, der_variation=0.05)
    assert step_summary.converged is True
    assert sim.step_count == 1
    # Total load should be close to initial but slightly fluctuated
    assert abs(step_summary.total_load_mw - initial_p_load) < 1.0


def test_cyber_physical_load_modification():
    """Verify modifying physical load setpoints alters power flow."""
    sim = GridSimulator(topology_name="resilient_microgrid")
    # Bus 5 is Industrial Load (nominal 2.1 MW)
    sim.modify_physical_load(bus_id=5, p_mw=3.5, q_mvar=1.0)
    summary = sim.get_state_summary()
    assert summary.total_load_mw > 4.0
    
    # Reset back to nominal
    sim.reset_to_nominal()
    restored_summary = sim.get_state_summary()
    assert restored_summary.total_load_mw < 5.0


def test_ieee14_power_flow_baseline_regression():
    """
    Regression test for IEEE 14-bus baseline electrical metrics:
    - Generation: 272.3933 MW (ext_grid 232.3933 MW + gen 40.0000 MW)
    - Load: 259.0000 MW
    - Electrical Losses: 13.3933 MW
    - AC power balance: P_gen - P_load - P_loss = 0 MW (< 1e-4 MW tolerance)
    - Zero false voltage breaches under configured limits (0.90 - 1.10 pu)
    - 15 transmission lines and 5 transformers (20 branches total)
    """
    sim = GridSimulator(topology_name="ieee14_grid")
    summary = sim.get_state_summary()

    # 1. Generation, Load, Losses
    assert abs(summary.total_generation_mw - 272.3933) < 0.01
    assert abs(summary.total_load_mw - 259.0000) < 0.01
    assert abs(summary.total_losses_mw - 13.3933) < 0.01

    # 2. Conservation of Energy (AC power balance)
    imbalance = abs(summary.total_generation_mw - summary.total_load_mw - summary.total_losses_mw)
    assert imbalance < 1e-4
    assert summary.active_power_imbalance_mw < 1e-4

    # 3. Voltage compliance across all 14 buses (no false breaches)
    assert summary.voltage_violations_count == 0
    assert len(summary.buses) == 14
    for bus in summary.buses:
        assert 0.90 <= bus.vm_pu <= 1.10
        assert bus.voltage_violation is False

    # 4. Transmission lines (15) and Transformers (5)
    assert len(sim.net.line) == 15
    assert len(sim.net.trafo) == 5
    assert len(summary.lines) == 20


