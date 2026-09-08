import { CaseData, GraphNode, GraphLink } from '../types';
import {
  computeBetweennessCentrality,
  findCutVertices,
  computeDegreeCentrality,
  computePageRank,
} from './graphAlgorithms';
import { scanSuspiciousPatterns } from './patternEngine';

/**
 * Enriches any case (manual or benchmark) by executing graph centrality algorithms,
 * identifying Tarjan cut-vertices, computing PageRank, and running heuristic threat scans.
 */
export function enrichCaseWithAlgorithms(c: CaseData): CaseData {
  const nodes = c.nodes || [];
  const links = c.links || [];
  const timeline = c.timeline || [];

  if (nodes.length === 0) {
    return {
      ...c,
      nodes: [],
      links: [],
      patterns: [],
    };
  }

  // 1. Calculate betweenness centrality
  const betweennessMap = computeBetweennessCentrality(nodes, links);

  // 2. Calculate cut vertices (Tarjan's algorithm)
  const cutVertices = findCutVertices(nodes, links);

  // 3. Calculate degrees
  const degreeMap = computeDegreeCentrality(nodes, links);

  // 4. Calculate PageRank
  const pageRankMap = computePageRank(nodes, links);

  // 5. Update nodes with calculated algorithmic properties
  const enrichedNodes: GraphNode[] = nodes.map(node => {
    const bw = betweennessMap.get(node.id) || 0;
    const deg = degreeMap.get(node.id) || 0;
    const pr = pageRankMap.get(node.id) || 0;
    const isCut = cutVertices.has(node.id);

    // Heuristic: Flag as potential kingpin if high betweenness or cut-vertex with low direct degree
    const isPotentialKingpin = node.isKingpin || (bw >= 0.25 && deg <= 5 && isCut);

    return {
      ...node,
      betweenness: bw,
      degree: deg,
      pageRank: pr,
      isCutVertex: isCut,
      isKingpin: isPotentialKingpin,
    };
  });

  // 6. Run automated pattern recognition heuristics on the topology
  const detectedPatterns = scanSuspiciousPatterns(enrichedNodes, links, timeline);

  return {
    ...c,
    nodes: enrichedNodes,
    links,
    patterns: detectedPatterns,
  };
}
