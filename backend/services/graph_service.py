"""Graph service for expanding node connections via edges."""

from typing import Optional


def get_connected_nodes(
    node_ids: list[str],
    edges: list[dict],
    depth: int = 1,
    max_nodes: int = 20,
) -> list[str]:
    """
    Expand node IDs by following edges to find connected nodes.

    Args:
        node_ids: Starting node IDs
        edges: List of edge dicts with 'source' and 'target' keys
        depth: How many hops to follow (0 = no expansion, 1 = direct connections, 2 = connections of connections)
        max_nodes: Maximum number of nodes to return

    Returns:
        List of all connected node IDs (including original nodes)
    """
    if depth <= 0 or not edges:
        return list(node_ids)[:max_nodes]

    # Build adjacency map (undirected - connections go both ways)
    adjacency: dict[str, set[str]] = {}
    for edge in edges:
        source = edge.get("source", "")
        target = edge.get("target", "")
        if source and target:
            if source not in adjacency:
                adjacency[source] = set()
            if target not in adjacency:
                adjacency[target] = set()
            adjacency[source].add(target)
            adjacency[target].add(source)

    # BFS to find connected nodes up to depth
    visited: set[str] = set(node_ids)
    current_level: set[str] = set(node_ids)

    for _ in range(depth):
        next_level: set[str] = set()
        for node_id in current_level:
            neighbors = adjacency.get(node_id, set())
            for neighbor in neighbors:
                if neighbor not in visited:
                    visited.add(neighbor)
                    next_level.add(neighbor)
                    if len(visited) >= max_nodes:
                        return list(visited)[:max_nodes]
        current_level = next_level
        if not current_level:
            break

    return list(visited)[:max_nodes]


def get_subgraph(
    node_ids: list[str],
    edges: list[dict],
) -> list[dict]:
    """
    Get edges that connect any of the given nodes.

    Args:
        node_ids: Node IDs to find connections between
        edges: All edges in the project

    Returns:
        List of edges where both source and target are in node_ids
    """
    node_set = set(node_ids)
    return [
        edge for edge in edges
        if edge.get("source") in node_set and edge.get("target") in node_set
    ]
