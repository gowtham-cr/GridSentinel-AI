"""Electrical grid and microgrid topology definitions for pandapower simulation."""

import pandapower as pp
import pandapower.networks as pn
from app.core.logging import logger


def create_resilient_microgrid() -> pp.pandapowerNet:
    """
    Constructs an 8-bus resilient cyber-physical smart microgrid.
    
    Architecture:
    - Bus 0: 20 kV Utility Substation (Slack bus / External Grid Intertie)
    - Bus 1: 20 kV Main Incomer Switchgear
    - Bus 2: 20 kV Distributed Generation Bus (Solar PV 1.5 MW + Wind 2.0 MW)
    - Bus 3: 20 kV Battery Energy Storage System (BESS 1.2 MW / 2.4 MWh)
    - Bus 4: 0.4 kV Critical Hospital & Life-Safety Feeder (via 20/0.4 kV Transformer)
    - Bus 5: 20 kV Industrial Manufacturing Center (Load 2.2 MW, 0.8 MVAr)
    - Bus 6: 20 kV Commercial Complex Feeder (Load 1.5 MW, 0.4 MVAr)
    - Bus 7: 0.4 kV Residential Smart District (Load 1.1 MW, 0.3 MVAr)
    """
    net = pp.create_empty_network(name="GridSentinel Resilient Microgrid")
    
    # 1. Create Buses
    b0 = pp.create_bus(net, vn_kv=20.0, name="Bus 0 - Substation Slack", zone="Substation")
    b1 = pp.create_bus(net, vn_kv=20.0, name="Bus 1 - Main Incomer", zone="Primary")
    b2 = pp.create_bus(net, vn_kv=20.0, name="Bus 2 - Renewable DER", zone="Generation")
    b3 = pp.create_bus(net, vn_kv=20.0, name="Bus 3 - BESS Storage", zone="Storage")
    b4 = pp.create_bus(net, vn_kv=0.4, name="Bus 4 - Critical Hospital", zone="Critical")
    b5 = pp.create_bus(net, vn_kv=20.0, name="Bus 5 - Industrial Park", zone="Industrial")
    b6 = pp.create_bus(net, vn_kv=20.0, name="Bus 6 - Commercial District", zone="Commercial")
    b7 = pp.create_bus(net, vn_kv=0.4, name="Bus 7 - Residential Smart Hub", zone="Residential")

    # 2. External Grid Interconnection (Slack Bus at Bus 0)
    pp.create_ext_grid(net, bus=b0, vm_pu=1.02, va_degree=0.0, name="Main Grid Intertie")

    # 3. Transmission / Distribution Lines (Standard 20kV Underground Cable: NA2XS2Y 1x240 RM/25 12/20 kV)
    pp.create_line(net, from_bus=b0, to_bus=b1, length_km=2.5, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 0-1 Substation Link")
    pp.create_line(net, from_bus=b1, to_bus=b2, length_km=1.8, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 1-2 DER Feed")
    pp.create_line(net, from_bus=b1, to_bus=b3, length_km=1.2, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 1-3 BESS Feed")
    pp.create_line(net, from_bus=b1, to_bus=b5, length_km=3.0, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 1-5 Industrial Feed")
    pp.create_line(net, from_bus=b2, to_bus=b6, length_km=2.0, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 2-6 Commercial Feed")
    pp.create_line(net, from_bus=b3, to_bus=b5, length_km=2.2, std_type="NA2XS2Y 1x240 RM/25 12/20 kV", name="Line 3-5 Backup Intertie")

    # 4. Transformers (20 kV to 0.4 kV step-down)
    # 0.63 MVA 20/0.4 kV standard distribution transformers
    pp.create_transformer(net, hv_bus=b1, lv_bus=b4, std_type="0.63 MVA 20/0.4 kV", name="Trafo 1-4 Hospital")
    pp.create_transformer(net, hv_bus=b6, lv_bus=b7, std_type="0.63 MVA 20/0.4 kV", name="Trafo 6-7 Residential")

    # 5. Distributed Generation (DERs)
    # Solar PV Plant at Bus 2
    pp.create_sgen(net, bus=b2, p_mw=1.5, q_mvar=0.2, sn_mva=2.0, name="Solar PV Plant 1.5MW", type="solar")
    # Wind Turbine Generator at Bus 2
    pp.create_sgen(net, bus=b2, p_mw=1.8, q_mvar=0.1, sn_mva=2.5, name="Wind Turbine Unit 1.8MW", type="wind")
    # Battery Energy Storage System (BESS) at Bus 3 (Inverter-interfaced)
    pp.create_sgen(net, bus=b3, p_mw=0.8, q_mvar=0.05, sn_mva=1.2, name="BESS Inverter 0.8MW", type="bess")

    # 6. Electrical Loads
    # Critical Hospital Load at Bus 4
    pp.create_load(net, bus=b4, p_mw=0.45, q_mvar=0.12, name="Hospital Critical Care", controllable=False)
    # Industrial Load at Bus 5
    pp.create_load(net, bus=b5, p_mw=2.10, q_mvar=0.70, name="Industrial Factory Heavy Load", controllable=True)
    # Commercial Load at Bus 6
    pp.create_load(net, bus=b6, p_mw=1.35, q_mvar=0.35, name="Commercial Mall & Offices", controllable=True)
    # Residential Load at Bus 7
    pp.create_load(net, bus=b7, p_mw=0.50, q_mvar=0.15, name="Residential Microgrid Community", controllable=True)

    return net


def create_cigre_microgrid() -> pp.pandapowerNet:
    """
    Returns standard CIGRE Medium Voltage benchmark distribution network with DERs,
    configured for microgrid cybersecurity evaluation.
    """
    try:
        net = pn.create_cigre_network_mv(with_der="all")
        net.name = "CIGRE MV Microgrid with DERs"
        return net
    except Exception as e:
        logger.warning(f"Could not load built-in CIGRE MV network ({e}); falling back to resilient microgrid.")
        return create_resilient_microgrid()


def create_ieee14_grid() -> pp.pandapowerNet:
    """
    Returns IEEE 14-bus standard benchmark transmission/distribution system.
    """
    try:
        net = pn.case14()
        net.name = "IEEE 14-Bus Test System"
        return net
    except Exception as e:
        logger.warning(f"Could not load IEEE 14-bus case ({e}); falling back to resilient microgrid.")
        return create_resilient_microgrid()


def get_topology(name: str) -> pp.pandapowerNet:
    """Factory method to get pandapower network by name."""
    name_clean = name.lower().strip()
    if "cigre" in name_clean:
        return create_cigre_microgrid()
    elif "ieee" in name_clean or "14" in name_clean:
        return create_ieee14_grid()
    else:
        return create_resilient_microgrid()

