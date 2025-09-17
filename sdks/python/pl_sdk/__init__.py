# SPDX-License-Identifier: MIT
# Copyright (c) 2025 Pure Lambda Authors

"""
Pure Lambda Python SDK
Minimal pure Python implementation for PL-SEED-01 format
"""

import json
import hashlib
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import heapq


@dataclass
class TileABI:
    """ABI specification for a tile"""
    types: str
    effects: List[str]
    ports: Dict[str, str]


@dataclass
class TileObject:
    """A single tile in an operon"""
    op: str
    abi: TileABI
    law: str
    cost: str
    code: Optional[str] = None


@dataclass
class SeedMeta:
    """Metadata for a seed"""
    gid_set: List[str]
    iid_set: List[str]
    xid_set: List[str]
    stats: Dict[str, float]


@dataclass
class Seed:
    """PL-SEED-01 format seed"""
    pl_seed: str
    name: str
    version: int
    created_at: str
    tiles: List[TileObject]
    meta: SeedMeta

    def __post_init__(self):
        if self.pl_seed != "PL-SEED-01":
            raise ValueError(f"Invalid pl_seed format: {self.pl_seed}")


@dataclass
class OperonNode:
    """A node in an operon"""
    op: str
    abi: Optional[TileABI] = None
    ports: Optional[Dict[str, str]] = None
    law: Optional[str] = None
    cost: Optional[str] = None
    code: Optional[str] = None
    gid: Optional[str] = None
    iid: Optional[str] = None
    xid: Optional[str] = None
    links: Optional[Dict[str, str]] = None
    receipt: Optional[Any] = None
    oids: Optional[List[str]] = None  # For meta nodes
    root: Optional[str] = None  # For meta nodes


@dataclass
class OperonJson:
    """Operon JSON format"""
    nodes: Dict[str, OperonNode]
    root: str
    name: str
    gid_set: List[str]
    iid_set: List[str]
    expected: Optional[Dict[str, Any]] = None


def validate_seed(data: Dict[str, Any]) -> Seed:
    """Validate and parse seed data"""

    # Basic structure validation
    if not isinstance(data, dict):
        raise ValueError("Seed must be a dictionary")

    if data.get("pl_seed") != "PL-SEED-01":
        raise ValueError("Invalid pl_seed format")

    name = data.get("name")
    if not isinstance(name, str) or not name:
        raise ValueError("Name must be a non-empty string")

    version = data.get("version")
    if not isinstance(version, int) or version <= 0:
        raise ValueError("Version must be a positive integer")

    created_at = data.get("createdAt")
    if not isinstance(created_at, str):
        raise ValueError("createdAt must be a string")

    # Validate ISO 8601 format
    try:
        datetime.fromisoformat(created_at.replace('Z', '+00:00'))
    except ValueError:
        raise ValueError("createdAt must be valid ISO 8601 format")

    # Validate tiles
    tiles_data = data.get("tiles")
    if not isinstance(tiles_data, list) or len(tiles_data) == 0:
        raise ValueError("tiles must be a non-empty list")

    tiles = []
    for i, tile_data in enumerate(tiles_data):
        if not isinstance(tile_data, dict):
            raise ValueError(f"tiles[{i}] must be a dictionary")

        op = tile_data.get("op")
        if not isinstance(op, str):
            raise ValueError(f"tiles[{i}].op must be a string")

        abi_data = tile_data.get("abi")
        if not isinstance(abi_data, dict):
            raise ValueError(f"tiles[{i}].abi must be a dictionary")

        abi = TileABI(
            types=abi_data.get("types", ""),
            effects=abi_data.get("effects", []),
            ports=abi_data.get("ports", {})
        )

        law = tile_data.get("law", "unknown")
        cost = tile_data.get("cost", "O(?)")
        code = tile_data.get("code")

        tiles.append(TileObject(
            op=op,
            abi=abi,
            law=law,
            cost=cost,
            code=code
        ))

    # Validate meta
    meta_data = data.get("meta")
    if not isinstance(meta_data, dict):
        raise ValueError("meta must be a dictionary")

    gid_set = meta_data.get("gidSet", [])
    iid_set = meta_data.get("iidSet", [])
    xid_set = meta_data.get("xidSet", [])
    stats = meta_data.get("stats", {})

    if not isinstance(stats, dict):
        raise ValueError("meta.stats must be a dictionary")

    meta = SeedMeta(
        gid_set=gid_set,
        iid_set=iid_set,
        xid_set=xid_set,
        stats=stats
    )

    return Seed(
        pl_seed="PL-SEED-01",
        name=name,
        version=version,
        created_at=created_at,
        tiles=tiles,
        meta=meta
    )


def to_operon(seed: Seed) -> OperonJson:
    """Convert seed to operon JSON format"""

    nodes = {}
    operational_nodes = []

    # Create nodes from tiles
    for i, tile in enumerate(seed.tiles):
        # Generate deterministic node ID
        gid = seed.meta.gid_set[i] if i < len(seed.meta.gid_set) else "0" * 64
        iid = seed.meta.iid_set[i] if i < len(seed.meta.iid_set) else "0" * 64

        node_id = f"baf{gid[:32]}{iid[:32]}"[:62]
        operational_nodes.append(node_id)

        nodes[node_id] = OperonNode(
            op=tile.op,
            code=tile.code,
            abi=tile.abi,
            ports=tile.abi.ports,
            law=tile.law,
            cost=tile.cost,
            gid=gid,
            iid=iid,
            xid=seed.meta.xid_set[i] if i < len(seed.meta.xid_set) else "0" * 64,
            links={},
            receipt=None
        )

    # Create meta node if multiple tiles
    if len(operational_nodes) > 1:
        meta_node_id = f"{operational_nodes[0]}meta"[:62]
        nodes[meta_node_id] = OperonNode(
            op="META",
            oids=operational_nodes,
            root=operational_nodes[0]
        )
        root_id = meta_node_id
    else:
        root_id = operational_nodes[0] if operational_nodes else "unknown"

    return OperonJson(
        nodes=nodes,
        root=root_id,
        name=seed.name,
        gid_set=seed.meta.gid_set,
        iid_set=seed.meta.iid_set,
        expected={
            "minRouteLen": len(seed.tiles),
            "invariants": [
                "GID independent of ports",
                "IID equal for abi-equal"
            ]
        }
    )


def run_autopilot(operon: OperonJson, k: int = 5) -> Tuple[float, List[int]]:
    """
    Run autopilot algorithm on operon
    Returns (Lbest, route) where route is list of node indices
    """

    # Find operational nodes (not meta nodes)
    operational_nodes = []
    for node_id, node in operon.nodes.items():
        if hasattr(node, 'op') and node.op and node.op != "META" and not hasattr(node, 'oids'):
            operational_nodes.append(node_id)

    if not operational_nodes:
        return (0.0, [])

    def get_node_cost(node: OperonNode) -> float:
        """Calculate cost for a node"""
        if not node.cost:
            return 2.0

        cost_str = node.cost.lower()
        if 'o(1)' in cost_str:
            return 1.0
        elif 'o(n)' in cost_str and 'o(n²)' not in cost_str and 'o(n^2)' not in cost_str:
            return 10.0
        elif 'o(n²)' in cost_str or 'o(n^2)' in cost_str:
            return 100.0
        elif 'o(log n)' in cost_str:
            return 5.0

        # Cost based on operation type
        op = getattr(node, 'op', '').upper()
        cost_map = {
            'FOCUS': 1.0,
            'DELAY': 2.0,
            'TRANSFORM': 3.0,
            'MERGE': 4.0,
            'SPLIT': 5.0
        }
        return cost_map.get(op, 2.0)

    # Build graph
    graph = {node_id: [] for node_id in operational_nodes}

    for node_id in operational_nodes:
        node = operon.nodes[node_id]
        if hasattr(node, 'links') and node.links:
            for port, target_id in node.links.items():
                if target_id in operational_nodes:
                    target_node = operon.nodes[target_id]
                    cost = get_node_cost(target_node)
                    graph[node_id].append((target_id, cost))

    # Dijkstra's algorithm
    start_node = operon.root if operon.root in operational_nodes else operational_nodes[0]

    distances = {node_id: float('inf') for node_id in operational_nodes}
    distances[start_node] = 0.0
    previous = {node_id: None for node_id in operational_nodes}

    # Priority queue: (distance, node_id)
    pq = [(0.0, start_node)]
    visited = set()

    while pq:
        current_dist, current_node = heapq.heappop(pq)

        if current_node in visited:
            continue

        visited.add(current_node)

        for neighbor, edge_cost in graph[current_node]:
            if neighbor not in visited:
                new_dist = current_dist + edge_cost
                if new_dist < distances[neighbor]:
                    distances[neighbor] = new_dist
                    previous[neighbor] = current_node
                    heapq.heappush(pq, (new_dist, neighbor))

    # Find best path
    best_node = min(distances.keys(), key=lambda x: distances[x])
    best_distance = distances[best_node]

    # Reconstruct path
    path = []
    current = best_node
    while current is not None:
        path.append(current)
        current = previous[current]
    path.reverse()

    # Convert to indices
    route_indices = []
    for node_id in path:
        try:
            idx = operational_nodes.index(node_id)
            route_indices.append(idx)
        except ValueError:
            pass

    return (best_distance, route_indices)


def load_seed(json_data: Any) -> Seed:
    """Load and validate a seed from JSON data"""
    if isinstance(json_data, str):
        data = json.loads(json_data)
    elif isinstance(json_data, dict):
        data = json_data
    else:
        raise ValueError("json_data must be a string or dictionary")

    return validate_seed(data)


def canonical_json(obj: Any) -> str:
    """Create canonical JSON representation"""
    return json.dumps(obj, sort_keys=True, separators=(',', ':'), ensure_ascii=False)


# Export main functions
__all__ = [
    'Seed', 'TileObject', 'TileABI', 'SeedMeta', 'OperonJson',
    'load_seed', 'to_operon', 'run_autopilot', 'validate_seed', 'canonical_json'
]