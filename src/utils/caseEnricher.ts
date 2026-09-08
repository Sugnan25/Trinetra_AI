import { CaseData, GraphNode, GraphLink, SuspiciousPatternAlert, TimelineEvent } from '../types';
import {
  computeBetweennessCentrality,
  findCutVertices,
  computeDegreeCentrality,
  computePageRank,
} from './graphAlgorithms';
import { scanSuspiciousPatterns } from './patternEngine';

/**
 * Computes a simple SHA-256-like hex hash for browser client-side audit seals
 */
export function generateAuditHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const hex1 = Math.abs(hash).toString(16).padStart(8, '0');
  const hex2 = Math.abs(hash * 31).toString(16).padStart(8, '0');
  const hex3 = Math.abs(hash * 97).toString(16).padStart(8, '0');
  const hex4 = Math.abs(hash * 139).toString(16).padStart(8, '0');
  return `${hex1}${hex2}${hex3}${hex4}`;
}

/**
 * Enriches any uploaded or created case with mathematical graph algorithms:
 * - Brandes Betweenness Centrality
 * - Tarjan's Cut-Vertices (Articulation Points)
 * - PageRank
 * - Degree Centrality
 * - Kingpin Identification
 * - Algorithmic Suspicious Pattern Detection (Burner swap, Hawala smurfing, etc.)
 */
export function enrichCaseWithAlgorithms(rawCase: Partial<CaseData>): CaseData {
  const nodes: GraphNode[] = (rawCase.nodes || []).map(n => ({
    ...n,
    degree: n.degree || 0,
    betweenness: n.betweenness || 0,
    pageRank: n.pageRank || 0,
    isCutVertex: Boolean(n.isCutVertex),
    isKingpin: Boolean(n.isKingpin),
    community: n.community || 'Ground Enforcement & Field',
    metadata: n.metadata || {},
  }));

  const links: GraphLink[] = (rawCase.links || []).map(l => ({
    ...l,
    weight: l.weight || 1,
    details: l.details || `${l.type} link`,
    evidenceRef: l.evidenceRef || 'INTEL-FEED-AUTO',
  }));

  const timeline: TimelineEvent[] = (rawCase.timeline || []).map(t => ({
    ...t,
    timeLabel: t.timeLabel || new Date(t.timestamp).toLocaleTimeString(),
    type: t.type || 'BTS_BURST',
  }));

  // Run mathematical algorithms if nodes exist
  if (nodes.length > 0) {
    const betweennessMap = computeBetweennessCentrality(nodes, links);
    const cutVerticesSet = findCutVertices(nodes, links);
    const degreeMap = computeDegreeCentrality(nodes, links);
    const pageRankMap = computePageRank(nodes, links);

    nodes.forEach(node => {
      node.betweenness = betweennessMap.get(node.id) || 0;
      node.isCutVertex = cutVerticesSet.has(node.id);
      node.degree = degreeMap.get(node.id) || 0;
      node.pageRank = pageRankMap.get(node.id) || 0;

      // Kingpin identification: High betweenness, cut-vertex, or highest pageRank suspect
      if (node.type === 'SUSPECT') {
        if (node.betweenness >= 0.2 || (node.isCutVertex && node.pageRank >= 0.1)) {
          node.isKingpin = true;
          node.flaggedAlert = 'HIGH-BETWEENNESS CUT-VERTEX (KINGPIN PROFILE)';
        }
      }
    });

    // Fallback if no kingpin was flagged, flag highest betweenness suspect
    const suspects = nodes.filter(n => n.type === 'SUSPECT');
    if (suspects.length > 0 && !suspects.some(s => s.isKingpin)) {
      suspects.sort((a, b) => b.betweenness - a.betweenness || b.pageRank - a.pageRank);
      suspects[0].isKingpin = true;
      suspects[0].flaggedAlert = 'PROBABLE OPERATIONAL CONTROLLER (TOP NETWORK BETWEENNESS)';
    }
  }

  // Scan patterns
  const detectedPatterns = scanSuspiciousPatterns(nodes, links, timeline);
  const combinedPatterns: SuspiciousPatternAlert[] = [
    ...(rawCase.patterns || []),
    ...detectedPatterns.filter(dp => !(rawCase.patterns || []).some(ep => ep.id === dp.id)),
  ];

  const caseId = rawCase.id || `CASE-${Date.now()}`;
  const caseNumber = rawCase.caseNumber || `FIR-${Math.floor(100 + Math.random() * 900)}/2025`;

  const seal =
    rawCase.sha256Seal ||
    generateAuditHash(
      `${caseNumber}_${rawCase.title}_${nodes.length}_${links.length}_${new Date().toISOString()}`
    );

  return {
    id: caseId,
    caseNumber,
    title: rawCase.title || 'Untitled Law Enforcement Investigation',
    jurisdiction: rawCase.jurisdiction || 'Special Crime & Intelligence Wing',
    primaryTenant: rawCase.primaryTenant || 'POLICE',
    sharedWithTenants: rawCase.sharedWithTenants || ['POLICE'],
    classification: rawCase.classification || 'TOP_SECRET',
    status: rawCase.status || 'ACTIVE_TRIANGULATION',
    leadInvestigator: rawCase.leadInvestigator || 'Investigating Officer',
    description:
      rawCase.description ||
      'Official investigation dossier ingested into TRINETRA intelligence matrix.',
    incidentDate: rawCase.incidentDate || new Date().toISOString(),
    nodes,
    links,
    patterns: combinedPatterns,
    tickets: rawCase.tickets || [],
    evidenceVault: rawCase.evidenceVault || [],
    dailyDiary: rawCase.dailyDiary || [],
    timeline,
    sha256Seal: seal,
    escalationLog: rawCase.escalationLog || [
      {
        timestamp: new Date().toISOString(),
        action: 'Case Dossier Ingested into TRINETRA Intelligence Matrix',
        authorizedBy: rawCase.leadInvestigator || 'Station Investigating Officer',
        orderReference: `PANCHNAMA-SEAL-${seal.slice(0, 8).toUpperCase()}`,
      },
    ],
  };
}
