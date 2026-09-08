export type AgencyType = 'CBI' | 'NIA' | 'CID' | 'POLICE';

export type UserRole =
  | 'DEPT_ADMIN'
  | 'LEAD_INVESTIGATOR'
  | 'CYBER_PERSONNEL'
  | 'FORENSIC_PERSONNEL'
  | 'FIELD_BEAT_OFFICER';

export interface ClearanceRequest {
  id: string;
  name: string;
  govId: string;
  agency: AgencyType;
  role: UserRole;
  rank: string;
  badge: string;
  departmentName: string;
  state?: string;
  phone?: string;
  email?: string;
  password?: string;
  justification: string;
  status: 'PENDING' | 'APPROVED' | 'DENIED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
}

export interface UserSession {
  id: string;
  govId: string;
  name: string;
  agency: AgencyType;
  role: UserRole;
  badge: string;
  rank: string;
  departmentName: string;
  state?: string; // State / Union Territory for State Police & CID
  themeColor: string; // Hex color for department
  loginTime: string;
}

export type NodeCommunity =
  | 'Core Command & Masterminds'
  | 'Hawala Layering Cell'
  | 'Logistics & Procurement'
  | 'Ground Enforcement & Field';

export interface GraphNode {
  id: string;
  label: string;
  type: 'SUSPECT' | 'PHONE' | 'IMEI' | 'VEHICLE' | 'FINANCIAL' | 'LOCATION' | 'EVIDENCE';
  subType?: string;
  community: NodeCommunity;
  degree: number;
  betweenness: number;
  pageRank: number;
  isCutVertex: boolean;
  isKingpin: boolean;
  flaggedAlert?: string;
  candidateDuplicateOf?: string;
  similarityScore?: number;
  metadata: {
    msisdn?: string;
    imei?: string;
    vpa?: string;
    accountNo?: string;
    plateNo?: string;
    chassisNo?: string;
    roleDesc?: string;
    alias?: string;
    locationName?: string;
    lat?: number;
    lng?: number;
    exhibitRef?: string;
    lineRef?: number;
    notes?: string;
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphLink {
  id: string;
  source: string;
  target: string;
  type:
    | 'COORDINATES_WITH'
    | 'CALLS'
    | 'SHARED_IMEI'
    | 'TRANSFERS_FUNDS'
    | 'OPERATES_VEHICLE'
    | 'SAFEHOUSE_MEET'
    | 'CUT_OUT_PROXY'
    | 'TOWER_PING';
  weight: number;
  details: string;
  evidenceRef: string;
  timestamp?: string;
  amount?: number;
}

export interface SuspiciousPatternAlert {
  id: string;
  type: 'BURNER_SWAP' | 'HAWALA_SMURFING' | 'GEO_CONVERGENCE' | 'KINGPIN_SHIELDING';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  involvedNodeIds: string[];
  actionableLead: string;
  timestamp: string;
  evidenceSource: string;
}

export interface OperationalTicket {
  id: string;
  title: string;
  assignedRole: 'CYBER_PERSONNEL' | 'FORENSIC_PERSONNEL' | 'FIELD_BEAT_OFFICER';
  assignedToName: string;
  agency: AgencyType;
  priority: 'IMMEDIATE' | 'HIGH' | 'ROUTINE';
  status: 'PENDING' | 'IN_PROGRESS' | 'FULFILLED' | 'REJECTED';
  details: string;
  deadline: string;
  createdAt: string;
  completionNotes?: string;
}

export interface DailyDiaryEntry {
  id: string;
  entryNumber: number;
  date: string;
  time: string;
  officerName: string;
  officerRank: string;
  officerBadge: string;
  locationVisited: string;
  actionTaken: string;
  investigationFindings: string;
  attachedEvidenceIds?: string[];
  signatureHash?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  type:
    | 'CDR_LOG'
    | 'VEHICLE_FIR'
    | 'ANPR_TOLL'
    | 'BOMB_MEMO'
    | 'BANK_UPI'
    | 'AUDIO_NOTE'
    | 'FIELD_PHOTO'
    | 'FORENSIC_CHIP'
    | 'FIR_DOCUMENT'
    | 'CASE_DOCUMENT'
    | 'CRIME_PHOTO'
    | 'CCTV_VIDEO'
    | 'AUDIO_RECORDING'
    | 'TELEPHONE_LIST'
    | 'DAILY_CASE_DIARY';
  fileSize: string;
  sha256: string;
  uploadedBy: string;
  uploadedAt: string;
  status: 'VERIFIED' | 'PENDING_REVIEW' | 'FLAGGED';
  caseRef: string;
  jurisdictionOrigin: string;
  extractedEntitiesCount: number;
  summaryText: string;
  dataUrl?: string; // Preview URL or data for image, audio, video, document
  fileCategory?: 'FIR' | 'DOCUMENT' | 'PHOTO' | 'VIDEO' | 'AUDIO' | 'TELEPHONE' | 'DIARY' | 'OTHER';
}

export interface TimelineEvent {
  id: string;
  timestamp: string;
  timeLabel: string;
  location: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  nodeIds: string[];
  type:
    | 'VEHICLE_THEFT'
    | 'SAFEHOUSE_MEET'
    | 'BTS_BURST'
    | 'HAWALA_TRANCHE'
    | 'BLAST_COORDINATION'
    | 'TOLL_ANPR';
  azimuth?: number; // 0-360 degrees for cell-tower 120-deg sector
  radius?: number; // In meters, 500-3000m
}

export interface CaseData {
  id: string;
  caseNumber: string;
  title: string;
  jurisdiction: string;
  primaryTenant: AgencyType;
  sharedWithTenants: AgencyType[];
  classification: 'TOP_SECRET' | 'SECRET' | 'RESTRICTED';
  status: 'ACTIVE_TRIANGULATION' | 'ESCALATED_CID' | 'CBI_CENTRAL_TAKEOVER' | 'CHARGESHEET_FILED';
  leadInvestigator: string;
  description: string;
  incidentDate: string;
  nodes: GraphNode[];
  links: GraphLink[];
  patterns: SuspiciousPatternAlert[];
  tickets: OperationalTicket[];
  evidenceVault: EvidenceItem[];
  timeline: TimelineEvent[];
  dailyDiary?: DailyDiaryEntry[];
  sha256Seal: string;
  escalationLog: Array<{
    timestamp: string;
    action: string;
    authorizedBy: string;
    orderReference: string;
  }>;
}

export interface AgencyThemeConfig {
  name: string;
  code: AgencyType;
  prefix: string;
  accentHex: string;
  borderClass: string;
  bgClass: string;
  textClass: string;
  badgeClass: string;
  ringClass: string;
  tagline: string;
}
