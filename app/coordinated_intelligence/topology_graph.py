"""
Topology Graph Model for GridSentinel Coordinated Threat Intelligence.
Constructs an electrical network graph from Pandapower and evaluates
connectivity, neighborhood distance, and spatial affinity.
"""

import math
from typing import List, Dict, Any, Tuple, Optional, Set
import networkx as nx
import numpy as np
import pandapower as pp

from app.coordinated_intelligence.schemas import GraphTopologyEvidence


class GridTopologyGraph:
    """
    Constructs and maintains a weighted graph representation of the power grid.
    Translates physical lines, transformers, and switch states into topological
    and electrical distance metrics.
    """

    def __init__(self, net: Optional[pp.pandapowerNet] = None):
        self.graph = nx.Graph()
        self.net = net
        self.bus_ids: List[int] = []
        self.bus_metadata: Dict[int, Dict[str, Any]] = {}
        if net is not None:
            self.build_from_pandapower(net)

    def build_from_pandapower(self, net: pp.pandapowerNet) -> None:
        """Constructs an undirected NetworkX graph from a pandapower network instance."""
        self.net = net
        self.graph.clear()
        self.bus_ids = list(net.bus.index)
        self.bus_metadata.clear()

        # 1. Add Bus Nodes
        for b_id in net.bus.index:
            name = str(net.bus.at[b_id, "name"]) if "name" in net.bus.columns and not pd_isna(net.bus.at[b_id, "name"]) else f"Bus_{b_id}"
            vn_kv = float(net.bus.at[b_id, "vn_kv"]) if "vn_kv" in net.bus.columns else 13.8
            bus_type = str(net.bus.at[b_id, "type"]) if "type" in net.bus.columns else "b"

            self.graph.add_node(
                b_id,
                bus_id=b_id,
                name=name,
                vn_kv=vn_kv,
                bus_type=bus_type,
            )
            self.bus_metadata[b_id] = {
                "bus_id": b_id,
                "name": name,
                "vn_kv": vn_kv,
                "bus_type": bus_type,
            }

        # 2. Add Transmission Line Edges
        if hasattr(net, "line") and not net.line.empty:
            for l_id in net.line.index:
                # Respect line in-service status
                in_service = bool(net.line.at[l_id, "in_service"]) if "in_service" in net.line.columns else True
                if not in_service:
                    continue

                from_b = int(net.line.at[l_id, "from_bus"])
                to_b = int(net.line.at[l_id, "to_bus"])
                r_ohm = float(net.line.at[l_id, "r_ohm_per_km"] * net.line.at[l_id, "length_km"]) if "r_ohm_per_km" in net.line.columns else 0.1
                x_ohm = float(net.line.at[l_id, "x_ohm_per_km"] * net.line.at[l_id, "length_km"]) if "x_ohm_per_km" in net.line.columns else 0.4
                length_km = float(net.line.at[l_id, "length_km"]) if "length_km" in net.line.columns else 1.0

                z_mag = math.sqrt(r_ohm**2 + x_ohm**2)
                admittance = 1.0 / max(z_mag, 1e-4)

                self.graph.add_edge(
                    from_b,
                    to_b,
                    edge_id=f"line_{l_id}",
                    edge_type="line",
                    index=int(l_id),
                    r_ohm=r_ohm,
                    x_ohm=x_ohm,
                    length_km=length_km,
                    admittance=admittance,
                    weight=1.0,  # 1 hop per branch
                )

        # 3. Add Power Transformer Edges
        if hasattr(net, "trafo") and not net.trafo.empty:
            for t_id in net.trafo.index:
                in_service = bool(net.trafo.at[t_id, "in_service"]) if "in_service" in net.trafo.columns else True
                if not in_service:
                    continue

                hv_b = int(net.trafo.at[t_id, "hv_bus"])
                lv_b = int(net.trafo.at[t_id, "lv_bus"])
                vk_pct = float(net.trafo.at[t_id, "vk_percent"]) if "vk_percent" in net.trafo.columns else 10.0
                admittance = 100.0 / max(vk_pct, 1e-2)

                self.graph.add_edge(
                    hv_b,
                    lv_b,
                    edge_id=f"trafo_{t_id}",
                    edge_type="trafo",
                    index=int(t_id),
                    r_ohm=0.01,
                    x_ohm=0.1,
                    length_km=0.1,
                    admittance=admittance,
                    weight=1.0,  # 1 hop per transformer branch
                )

    def get_hop_distance(self, bus_a: int, bus_b: int) -> int:
        """Returns shortest path topological hop distance between two buses."""
        if bus_a == bus_b:
            return 0
        if not self.graph.has_node(bus_a) or not self.graph.has_node(bus_b):
            return 999
        try:
            return nx.shortest_path_length(self.graph, source=bus_a, target=bus_b, weight=None)
        except nx.NetworkXNoPath:
            return 999

    def get_shortest_path(self, bus_a: int, bus_b: int) -> List[int]:
        """Returns the list of bus IDs representing the topological shortest path."""
        if bus_a == bus_b:
            return [bus_a]
        if not self.graph.has_node(bus_a) or not self.graph.has_node(bus_b):
            return []
        try:
            return nx.shortest_path(self.graph, source=bus_a, target=bus_b, weight=None)
        except nx.NetworkXNoPath:
            return []

    def evaluate_subgraph_affinity(
        self,
        candidate_buses: List[int],
        spatial_scale: float = 2.5,
    ) -> GraphTopologyEvidence:
        """
        Calculates spatial graph affinity across candidate anomalous buses.
        Formula:
            S_graph = exp(-(mean_hops - 1.0) / spatial_scale) if connected, else 0.0.
        """
        valid_buses = [b for b in candidate_buses if self.graph.has_node(b)]
        if not valid_buses:
            return GraphTopologyEvidence(
                subgraph_nodes=[],
                connected_components_count=0,
                are_electrically_connected=False,
                mean_hop_distance=0.0,
                min_hop_distance=0,
                max_hop_distance=0,
                mean_admittance_mhos=0.0,
                graph_affinity_score=0.0,
                shortest_paths={},
            )

        if len(valid_buses) == 1:
            return GraphTopologyEvidence(
                subgraph_nodes=valid_buses,
                connected_components_count=1,
                are_electrically_connected=True,
                mean_hop_distance=0.0,
                min_hop_distance=0,
                max_hop_distance=0,
                mean_admittance_mhos=0.0,
                graph_affinity_score=0.0,  # Single node does not constitute a coordinated multi-point cluster
                shortest_paths={},
            )

        # Pairwise distance evaluation
        hop_distances: List[int] = []
        admittances: List[float] = []
        shortest_paths: Dict[str, List[int]] = {}
        all_connected = True

        for i in range(len(valid_buses)):
            for j in range(i + 1, len(valid_buses)):
                u, v = valid_buses[i], valid_buses[j]
                pair_key = f"{u}-{v}"
                path = self.get_shortest_path(u, v)
                if not path:
                    all_connected = False
                    hop_distances.append(999)
                else:
                    hops = len(path) - 1
                    hop_distances.append(hops)
                    shortest_paths[pair_key] = path

                    # Compute harmonic mean admittance along shortest path
                    edge_adms = []
                    for k in range(len(path) - 1):
                        e_data = self.graph.get_edge_data(path[k], path[k + 1])
                        if e_data and "admittance" in e_data:
                            edge_adms.append(e_data["admittance"])
                    if edge_adms:
                        admittances.append(float(np.mean(edge_adms)))

        if not all_connected:
            return GraphTopologyEvidence(
                subgraph_nodes=valid_buses,
                connected_components_count=2,
                are_electrically_connected=False,
                mean_hop_distance=float(np.mean(hop_distances)),
                min_hop_distance=int(np.min(hop_distances)),
                max_hop_distance=int(np.max(hop_distances)),
                mean_admittance_mhos=0.0,
                graph_affinity_score=0.0,
                shortest_paths=shortest_paths,
            )

        mean_hops = float(np.mean(hop_distances))
        min_hops = int(np.min(hop_distances))
        max_hops = int(np.max(hop_distances))
        mean_adm = float(np.mean(admittances)) if admittances else 1.0

        # S_graph calculation
        # If mean_hops = 1 (directly connected adjacent neighbors) -> S_graph = 1.0
        # If mean_hops = 2 -> S_graph = exp(-1/2.5) = 0.67
        # If mean_hops >= 4 -> S_graph = exp(-3/2.5) <= 0.30
        delta_hops = max(0.0, mean_hops - 1.0)
        affinity = float(math.exp(-delta_hops / spatial_scale))
        affinity = min(1.0, max(0.0, affinity))

        return GraphTopologyEvidence(
            subgraph_nodes=valid_buses,
            connected_components_count=1,
            are_electrically_connected=True,
            mean_hop_distance=round(mean_hops, 2),
            min_hop_distance=min_hops,
            max_hop_distance=max_hops,
            mean_admittance_mhos=round(mean_adm, 3),
            graph_affinity_score=round(affinity, 4),
            shortest_paths=shortest_paths,
        )

    def to_dict(self) -> Dict[str, Any]:
        """Serializes graph nodes and edges for frontend D3/SVG visualization."""
        nodes = []
        for n_id, data in self.graph.nodes(data=True):
            nodes.append({
                "id": n_id,
                "name": data.get("name", f"Bus_{n_id}"),
                "vn_kv": data.get("vn_kv", 13.8),
                "bus_type": data.get("bus_type", "b"),
                "degree": self.graph.degree(n_id),
            })

        edges = []
        for u, v, data in self.graph.edges(data=True):
            edges.append({
                "from_bus": u,
                "to_bus": v,
                "edge_id": data.get("edge_id", f"{u}_{v}"),
                "edge_type": data.get("edge_type", "line"),
                "admittance": round(data.get("admittance", 1.0), 3),
                "r_ohm": round(data.get("r_ohm", 0.1), 4),
                "x_ohm": round(data.get("x_ohm", 0.4), 4),
            })

        return {
            "num_nodes": len(nodes),
            "num_edges": len(edges),
            "nodes": sorted(nodes, key=lambda x: x["id"]),
            "edges": edges,
        }


def pd_isna(val: Any) -> bool:
    """Helper to check if a value is pandas NA/None."""
    try:
        import pandas as pd
        return bool(pd.isna(val))
    except Exception:
        return val is None or (isinstance(val, float) and math.isnan(val))

