import { GraphNode, GraphLink, NodeCommunity } from '../types';

/**
 * Brandes' Algorithm for Betweenness Centrality
 * Calculates exact Betweenness Centrality for all nodes in O(V * E) time.
 * CB(v) = sum_{s != v != t} (sigma_st(v) / sigma_st)
 */
export function computeBetweennessCentrality(
  nodes: GraphNode[],
  links: GraphLink[]
): Map<string, number> {
  const cb = new Map<string, number>();
  nodes.forEach(n => cb.set(n.id, 0));

  // Build adjacency list
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));
  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.push(t);
      adj.get(t)!.push(s);
    }
  });

  for (const s of nodes.map(n => n.id)) {
    const S: string[] = [];
    const P = new Map<string, string[]>();
    nodes.forEach(n => P.set(n.id, []));

    const sigma = new Map<string, number>();
    nodes.forEach(n => sigma.set(n.id, 0));
    sigma.set(s, 1);

    const d = new Map<string, number>();
    nodes.forEach(n => d.set(n.id, -1));
    d.set(s, 0);

    const Q: string[] = [s];

    while (Q.length > 0) {
      const v = Q.shift()!;
      S.push(v);

      const neighbors = adj.get(v) || [];
      for (const w of neighbors) {
        // w found for the first time?
        if (d.get(w)! < 0) {
          d.set(w, d.get(v)! + 1);
          Q.push(w);
        }
        // shortest path to w via v?
        if (d.get(w) === d.get(v)! + 1) {
          sigma.set(w, sigma.get(w)! + sigma.get(v)!);
          P.get(w)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    nodes.forEach(n => delta.set(n.id, 0));

    // S returns vertices in order of non-increasing distance from s
    while (S.length > 0) {
      const w = S.pop()!;
      for (const v of P.get(w)!) {
        const c = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
        delta.set(v, delta.get(v)! + c);
      }
      if (w !== s) {
        cb.set(w, cb.get(w)! + delta.get(w)!);
      }
    }
  }

  // Normalize by (N-1)(N-2)/2 for undirected graph
  const n = nodes.length;
  const normFactor = n > 2 ? ((n - 1) * (n - 2)) / 2 : 1;
  for (const [key, val] of cb.entries()) {
    cb.set(key, Number((val / normFactor).toFixed(4)));
  }

  return cb;
}

/**
 * Tarjan's Articulation Points Algorithm (Cut-Vertices)
 * Identifies single points of failure in the syndicate network.
 * If a Cut-Vertex is neutralized, the network breaks into disconnected components.
 */
export function findCutVertices(nodes: GraphNode[], links: GraphLink[]): Set<string> {
  const cutVertices = new Set<string>();
  const adj = new Map<string, string[]>();
  nodes.forEach(n => adj.set(n.id, []));

  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.push(t);
      adj.get(t)!.push(s);
    }
  });

  let time = 0;
  const visited = new Set<string>();
  const disc = new Map<string, number>();
  const low = new Map<string, number>();
  const parent = new Map<string, string | null>();

  function dfs(u: string) {
    let children = 0;
    visited.add(u);
    disc.set(u, ++time);
    low.set(u, time);

    for (const v of adj.get(u) || []) {
      if (!visited.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);

        low.set(u, Math.min(low.get(u)!, low.get(v)!));

        // Case 1: u is root of DFS tree and has >= 2 children
        if (parent.get(u) === null && children > 1) {
          cutVertices.add(u);
        }

        // Case 2: u is not root and low value of child is >= disc value of u
        if (parent.get(u) !== null && low.get(v)! >= disc.get(u)!) {
          cutVertices.add(u);
        }
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u)!, disc.get(v)!));
      }
    }
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      parent.set(node.id, null);
      dfs(node.id);
    }
  }

  return cutVertices;
}

/**
 * PageRank Algorithm with damping factor d = 0.85
 */
export function computePageRank(
  nodes: GraphNode[],
  links: GraphLink[],
  iterations = 20,
  d = 0.85
): Map<string, number> {
  const n = nodes.length;
  if (n === 0) return new Map();

  let pr = new Map<string, number>();
  nodes.forEach(node => pr.set(node.id, 1 / n));

  const outDegree = new Map<string, number>();
  const inNeighbors = new Map<string, string[]>();
  nodes.forEach(node => {
    outDegree.set(node.id, 0);
    inNeighbors.set(node.id, []);
  });

  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
    if (outDegree.has(s) && inNeighbors.has(t)) {
      outDegree.set(s, outDegree.get(s)! + 1);
      inNeighbors.get(t)!.push(s);
      // Undirected contribution
      outDegree.set(t, outDegree.get(t)! + 1);
      inNeighbors.get(s)!.push(t);
    }
  });

  for (let it = 0; it < iterations; it++) {
    const nextPr = new Map<string, number>();
    for (const node of nodes) {
      let sum = 0;
      for (const inN of inNeighbors.get(node.id) || []) {
        const deg = outDegree.get(inN) || 1;
        sum += pr.get(inN)! / deg;
      }
      nextPr.set(node.id, (1 - d) / n + d * sum);
    }
    pr = nextPr;
  }

  // Normalize to 0 - 1 scale
  let max = 0;
  for (const val of pr.values()) {
    if (val > max) max = val;
  }
  for (const [k, v] of pr.entries()) {
    pr.set(k, Number((max > 0 ? v / max : 0).toFixed(4)));
  }

  return pr;
}

/**
 * Degree Centrality
 */
export function computeDegreeCentrality(nodes: GraphNode[], links: GraphLink[]): Map<string, number> {
  const deg = new Map<string, number>();
  nodes.forEach(n => deg.set(n.id, 0));

  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
    if (deg.has(s)) deg.set(s, deg.get(s)! + 1);
    if (deg.has(t)) deg.set(t, deg.get(t)! + 1);
  });

  return deg;
}

/**
 * Constrained Pathfinding using Dijkstra's Algorithm
 * Mode 'HAWALA_FINANCIAL': Prioritizes financial/mule nodes, heavily penalizes pure telecom edges.
 * Mode 'TELECOM_CDR': Prioritizes CDR/IMEI/BTS connections, heavily penalizes financial edges.
 */
export function findConstrainedPath(
  sourceId: string,
  targetId: string,
  nodes: GraphNode[],
  links: GraphLink[],
  mode: 'UNCONSTRAINED' | 'HAWALA_FINANCIAL' | 'TELECOM_CDR'
): { path: string[]; totalCost: number; edges: GraphLink[] } {
  if (sourceId === targetId) return { path: [sourceId], totalCost: 0, edges: [] };

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const adj = new Map<string, Array<{ target: string; link: GraphLink; cost: number }>>();
  nodes.forEach(n => adj.set(n.id, []));

  links.forEach(l => {
    const s = typeof l.source === 'string' ? l.source : (l.source as any).id;
    const t = typeof l.target === 'string' ? l.target : (l.target as any).id;
    if (!adj.has(s) || !adj.has(t)) return;

    let cost = l.weight || 1;
    if (mode === 'HAWALA_FINANCIAL') {
      if (l.type === 'TRANSFERS_FUNDS') cost *= 0.5; // Highly preferred
      else if (l.type === 'CALLS' || l.type === 'TOWER_PING') cost *= 5.0; // Penalized
    } else if (mode === 'TELECOM_CDR') {
      if (l.type === 'CALLS' || l.type === 'SHARED_IMEI' || l.type === 'TOWER_PING') cost *= 0.5; // Highly preferred
      else if (l.type === 'TRANSFERS_FUNDS') cost *= 5.0; // Penalized
    }

    adj.get(s)!.push({ target: t, link: l, cost });
    adj.get(t)!.push({ target: s, link: l, cost });
  });

  const dist = new Map<string, number>();
  const prevNode = new Map<string, string | null>();
  const prevEdge = new Map<string, GraphLink | null>();
  const unvisited = new Set<string>();

  nodes.forEach(n => {
    dist.set(n.id, Infinity);
    prevNode.set(n.id, null);
    prevEdge.set(n.id, null);
    unvisited.add(n.id);
  });

  dist.set(sourceId, 0);

  while (unvisited.size > 0) {
    // Extract min
    let curr: string | null = null;
    let minDist = Infinity;
    for (const u of unvisited) {
      const d = dist.get(u)!;
      if (d < minDist) {
        minDist = d;
        curr = u;
      }
    }

    if (!curr || minDist === Infinity) break;
    if (curr === targetId) break;

    unvisited.delete(curr);

    const neighbors = adj.get(curr) || [];
    for (const edge of neighbors) {
      if (!unvisited.has(edge.target)) continue;
      const alt = dist.get(curr)! + edge.cost;
      if (alt < dist.get(edge.target)!) {
        dist.set(edge.target, alt);
        prevNode.set(edge.target, curr);
        prevEdge.set(edge.target, edge.link);
      }
    }
  }

  // Reconstruct path
  const path: string[] = [];
  const edges: GraphLink[] = [];
  let u: string | null = targetId;

  if (dist.get(targetId) === Infinity) {
    return { path: [], totalCost: Infinity, edges: [] };
  }

  while (u) {
    path.unshift(u);
    const edge = prevEdge.get(u);
    if (edge) edges.unshift(edge);
    u = prevNode.get(u);
  }

  return { path, totalCost: dist.get(targetId) || 0, edges };
}
