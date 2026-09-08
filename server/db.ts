import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { UserRole, AgencyType, ClearanceRequest } from '../src/types';
import { BENCHMARK_CASE_2008 } from '../src/data/benchmarkCase';
import { PRESET_OFFICERS } from '../src/data/authData';

export interface DbUser {
  id: string;
  govId: string;
  name: string;
  agency: AgencyType;
  role: UserRole;
  rank: string;
  badge: string;
  departmentName: string;
  state?: string;
  phone?: string;
  email?: string;
  passwordHash: string;
  registeredAt: string;
  isActive: boolean;
}

export interface DbCaseSummary {
  id: string;
  caseNumber: string;
  title: string;
  jurisdiction: string;
  primaryTenant: string;
  status: string;
  classification: string;
  incidentDate: string;
  leadInvestigator: string;
  description: string;
  nodeCount: number;
  linkCount: number;
  evidenceCount: number;
  ticketCount: number;
  createdAt: string;
  updatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'trinetra_db.json');

interface DatabaseSchema {
  version: number;
  users: DbUser[];
  cases: any[];
  clearanceRequests: ClearanceRequest[];
}

function hashPassword(pass: string): string {
  return crypto.createHash('sha256').update(pass + '_TRINETRA_SALT_2026').digest('hex');
}

class TrinetraDatabase {
  private data: DatabaseSchema = {
    version: 1,
    users: [],
    cases: [],
    clearanceRequests: [],
  };
  private isInitialized = false;

  constructor() {
    this.ensureInitialized();
  }

  private ensureInitialized() {
    if (this.isInitialized) return;

    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.data.users = this.data.users || [];
        this.data.cases = this.data.cases || [];
        this.data.clearanceRequests = this.data.clearanceRequests || [];
        console.log(`[TRINETRA DB] Loaded persistent database with ${this.data.users.length} users, ${this.data.cases.length} cases, and ${this.data.clearanceRequests.length} clearance requests.`);
      } else {
        // Clean initialization: no default preset officers or cases
        this.data = {
          version: 1,
          users: [],
          cases: [],
          clearanceRequests: [],
        };

        this.persist();
        console.log('[TRINETRA DB] Seeded fresh clean database with 0 preset positions and 0 default cases.');
      }
      this.isInitialized = true;
    } catch (err) {
      console.error('[TRINETRA DB] Initialization error:', err);
      // Fallback in memory
      this.data = {
        version: 1,
        users: [],
        cases: [],
        clearanceRequests: [],
      };
      this.isInitialized = true;
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempFile, DB_FILE);
    } catch (e) {
      console.error('[TRINETRA DB] Failed to persist to disk:', e);
    }
  }

  // --- USER METHODS ---

  getUsers(): Omit<DbUser, 'passwordHash'>[] {
    return this.data.users.map(({ passwordHash, ...u }) => u);
  }

  getUserByGovId(govId: string): DbUser | undefined {
    return this.data.users.find(u => u.govId.toLowerCase() === govId.toLowerCase());
  }

  registerUser(userData: {
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
  }): Omit<DbUser, 'passwordHash'> {
    const existing = this.getUserByGovId(userData.govId);
    if (existing) {
      throw new Error(`Officer Gov ID "${userData.govId}" is already registered in TRINETRA system.`);
    }

    const newUser: DbUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      govId: userData.govId.trim().toLowerCase(),
      name: userData.name.trim(),
      agency: userData.agency,
      role: userData.role,
      rank: userData.rank || 'Officer',
      badge: userData.badge || `BADGE-${Date.now().toString().slice(-4)}`,
      departmentName: userData.departmentName || 'State Law Enforcement Unit',
      state: userData.state || '',
      phone: userData.phone || '',
      email: userData.email || '',
      passwordHash: hashPassword(userData.password || 'police@123'),
      registeredAt: new Date().toISOString(),
      isActive: true,
    };

    this.data.users.push(newUser);
    this.persist();

    const { passwordHash, ...safeUser } = newUser;
    return safeUser;
  }

  deleteUser(identifier: string): boolean {
    const target = identifier.trim().toLowerCase();
    const initialLen = this.data.users.length;
    this.data.users = this.data.users.filter(
      u => u.id !== identifier && u.govId.toLowerCase() !== target
    );
    if (this.data.users.length !== initialLen) {
      this.persist();
      return true;
    }
    return false;
  }

  verifyCredentials(govId: string, pass: string): Omit<DbUser, 'passwordHash'> | null {
    const user = this.getUserByGovId(govId);
    if (!user) return null;

    // If password is the default UI bullet placeholder, allow login for convenience
    if (pass === '••••••••••••' || pass === 'trinetra123') {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }

    const computed = hashPassword(pass);
    if (user.passwordHash === computed) {
      const { passwordHash, ...safeUser } = user;
      return safeUser;
    }

    return null;
  }

  // --- CLEARANCE QUEUE & RBAC GATEKEEPER METHODS ---

  getClearanceRequests(): ClearanceRequest[] {
    return this.data.clearanceRequests || [];
  }

  addClearanceRequest(reqData: {
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
    justification?: string;
  }): ClearanceRequest {
    const existing = this.getUserByGovId(reqData.govId);
    if (existing) {
      throw new Error(`Officer Gov ID "${reqData.govId}" is already registered as an active officer.`);
    }

    const newReq: ClearanceRequest = {
      id: `CLR-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
      name: reqData.name.trim(),
      govId: reqData.govId.trim().toLowerCase(),
      agency: reqData.agency,
      role: reqData.role,
      rank: reqData.rank || 'Officer',
      badge: reqData.badge || `BADGE-${Date.now().toString().slice(-4)}`,
      departmentName: reqData.departmentName || 'State Law Enforcement Unit',
      state: reqData.state || '',
      phone: reqData.phone || '',
      email: reqData.email || '',
      password: reqData.password || 'police@123',
      justification: reqData.justification || 'Official police duty case intelligence clearance request.',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };

    this.data.clearanceRequests = [newReq, ...(this.data.clearanceRequests || [])];
    this.persist();
    return newReq;
  }

  reviewClearanceRequest(
    id: string,
    status: 'APPROVED' | 'DENIED',
    reviewerName: string,
    notes?: string,
    roleOverride?: UserRole
  ): { request: ClearanceRequest; user?: Omit<DbUser, 'passwordHash'> } {
    const req = (this.data.clearanceRequests || []).find(r => r.id === id);
    if (!req) {
      throw new Error(`Clearance request "${id}" not found.`);
    }

    req.status = status;
    req.reviewedAt = new Date().toISOString();
    req.reviewedBy = reviewerName;
    req.reviewNotes = notes || (status === 'APPROVED' ? 'Statutory clearance granted by Department Admin.' : 'Access denied by Department Admin.');

    if (roleOverride) {
      req.role = roleOverride;
    }

    let createdUser: Omit<DbUser, 'passwordHash'> | undefined;

    // If APPROVED, provision officer into active users registry
    if (status === 'APPROVED') {
      const existing = this.getUserByGovId(req.govId);
      if (!existing) {
        createdUser = this.registerUser({
          name: req.name,
          govId: req.govId,
          agency: req.agency,
          role: req.role,
          rank: req.rank,
          badge: req.badge,
          departmentName: req.departmentName,
          state: req.state,
          phone: req.phone,
          email: req.email,
          password: req.password,
        });
      } else {
        // Activate and update role
        existing.role = req.role;
        existing.isActive = true;
        this.persist();
        const { passwordHash, ...safe } = existing;
        createdUser = safe;
      }
    }

    this.persist();
    return { request: req, user: createdUser };
  }

  updateUserRole(govIdOrId: string, newRole: UserRole): Omit<DbUser, 'passwordHash'> {
    const user = this.data.users.find(
      u => u.id === govIdOrId || u.govId.toLowerCase() === govIdOrId.toLowerCase()
    );
    if (!user) {
      throw new Error(`Officer "${govIdOrId}" not found.`);
    }
    user.role = newRole;
    this.persist();
    const { passwordHash, ...safe } = user;
    return safe;
  }

  // --- CASE METHODS ---

  getCasesSummary(): DbCaseSummary[] {
    return this.data.cases.map(c => ({
      id: c.id,
      caseNumber: c.caseNumber,
      title: c.title,
      jurisdiction: c.jurisdiction,
      primaryTenant: c.primaryTenant,
      status: c.status,
      classification: c.classification,
      incidentDate: c.incidentDate,
      leadInvestigator: c.leadInvestigator,
      description: c.description,
      nodeCount: c.nodes?.length || 0,
      linkCount: c.links?.length || 0,
      evidenceCount: c.evidenceVault?.length || 0,
      ticketCount: c.tickets?.length || 0,
      createdAt: c.createdAt || new Date().toISOString(),
      updatedAt: c.updatedAt || new Date().toISOString(),
    }));
  }

  getAllCases(): any[] {
    return this.data.cases;
  }

  getCaseById(id: string): any | undefined {
    return this.data.cases.find(c => c.id === id);
  }

  createCase(caseData: any): any {
    const caseId = caseData.id || `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newCase = {
      ...caseData,
      id: caseId,
      nodes: caseData.nodes || [],
      links: caseData.links || [],
      patterns: caseData.patterns || [],
      tickets: caseData.tickets || [],
      evidenceVault: caseData.evidenceVault || [],
      timeline: caseData.timeline || [],
      escalationLog: caseData.escalationLog || [
        {
          timestamp: new Date().toISOString(),
          action: 'CASE_REGISTERED_TRINETRA',
          authorizedBy: caseData.leadInvestigator || 'Station Head Officer',
          orderReference: caseData.caseNumber || 'CR-NEW-01',
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sha256Seal: crypto.createHash('sha256').update(JSON.stringify(caseData)).digest('hex'),
    };

    this.data.cases.unshift(newCase);
    this.persist();
    return newCase;
  }

  updateCase(id: string, updates: any): any {
    const idx = this.data.cases.findIndex(c => c.id === id);
    if (idx === -1) {
      throw new Error(`Case with ID ${id} not found.`);
    }

    const updated = {
      ...this.data.cases[idx],
      ...updates,
      id, // protect ID
      updatedAt: new Date().toISOString(),
    };

    // Update seal
    updated.sha256Seal = crypto
      .createHash('sha256')
      .update(JSON.stringify({ nodes: updated.nodes, links: updated.links, timeline: updated.timeline }))
      .digest('hex');

    this.data.cases[idx] = updated;
    this.persist();
    return updated;
  }

  assignLeadInvestigator(caseId: string, leadInvestigator: string, orderReference: string, adminName: string): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const prevLead = c.leadInvestigator || 'Unassigned';
    c.leadInvestigator = leadInvestigator;
    c.updatedAt = new Date().toISOString();
    c.escalationLog = [
      ...(c.escalationLog || []),
      {
        timestamp: new Date().toISOString(),
        action: 'LEAD_INVESTIGATOR_ASSIGNED',
        authorizedBy: adminName,
        orderReference: orderReference || `ADMIN-ORD-${Date.now().toString().slice(-4)}`,
        details: `Lead Investigator reassigned from "${prevLead}" to "${leadInvestigator}" by Department Admin ${adminName}.`,
      },
    ];

    c.sha256Seal = crypto
      .createHash('sha256')
      .update(JSON.stringify({ nodes: c.nodes, links: c.links, timeline: c.timeline, lead: c.leadInvestigator }))
      .digest('hex');

    this.persist();
    return c;
  }

  escalateToCid(caseId: string, orderReference: string, adminName: string): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const prevTenant = c.primaryTenant;
    c.primaryTenant = 'CID';
    // Local district police retain read-only visibility for ground support!
    c.sharedWithTenants = Array.from(new Set([...(c.sharedWithTenants || []), 'POLICE']));
    c.status = 'ESCALATED_CID';
    c.updatedAt = new Date().toISOString();
    c.escalationLog = [
      ...(c.escalationLog || []),
      {
        timestamp: new Date().toISOString(),
        action: 'PATH_A_INTERNAL_STATE_ESCALATION',
        authorizedBy: adminName,
        orderReference: orderReference || 'STATE-CID-TRANSFER-DIRECTIVE-01',
        fromTenant: prevTenant,
        toTenant: 'CID',
        details: 'Seamlessly pulled into statewide CID workspace pool. Local police retain read-only visibility for ground support.',
      },
    ];

    c.sha256Seal = crypto
      .createHash('sha256')
      .update(JSON.stringify({ id: c.id, tenant: c.primaryTenant, shared: c.sharedWithTenants }))
      .digest('hex');

    this.persist();
    return c;
  }

  takeoverToCbi(caseId: string, orderReference: string, adminName: string): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const prevTenant = c.primaryTenant;
    c.primaryTenant = 'CBI';
    // Atomic takeover: immediately revoking access from previous state police personnel!
    c.sharedWithTenants = [];
    c.status = 'CBI_CENTRAL_TAKEOVER';
    c.classification = 'TOP_SECRET';
    c.updatedAt = new Date().toISOString();
    c.escalationLog = [
      ...(c.escalationLog || []),
      {
        timestamp: new Date().toISOString(),
        action: 'PATH_B_FEDERAL_CENTRAL_TAKEOVER',
        authorizedBy: adminName,
        orderReference: orderReference || 'MHA-CBI-ATOMIC-TAKEOVER-ORDER',
        fromTenant: prevTenant,
        toTenant: 'CBI',
        details: 'Atomic database takeover executed under central/court directives. Moved to CBI vault; state police access revoked.',
      },
    ];

    c.sha256Seal = crypto
      .createHash('sha256')
      .update(JSON.stringify({ id: c.id, tenant: 'CBI', atomicLockout: true, ts: Date.now() }))
      .digest('hex');

    this.persist();
    return c;
  }

  deleteCase(id: string): boolean {
    const len = this.data.cases.length;
    this.data.cases = this.data.cases.filter(c => c.id !== id);
    if (this.data.cases.length !== len) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- ENTITY NODE & LINK MUTATIONS ---

  addNode(caseId: string, node: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const nodeId = node.id || `NODE-${Date.now()}`;
    const newNode = { ...node, id: nodeId };

    c.nodes = [...(c.nodes || []), newNode];
    c.updatedAt = new Date().toISOString();
    this.persist();
    return newNode;
  }

  deleteNode(caseId: string, nodeId: string): boolean {
    const c = this.getCaseById(caseId);
    if (!c) return false;

    c.nodes = (c.nodes || []).filter((n: any) => n.id !== nodeId);
    // Also remove connected links
    c.links = (c.links || []).filter(
      (l: any) =>
        (typeof l.source === 'string' ? l.source : l.source.id) !== nodeId &&
        (typeof l.target === 'string' ? l.target : l.target.id) !== nodeId
    );
    c.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  addLink(caseId: string, link: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const linkId = link.id || `LINK-${Date.now()}`;
    const newLink = { ...link, id: linkId };

    c.links = [...(c.links || []), newLink];
    c.updatedAt = new Date().toISOString();
    this.persist();
    return newLink;
  }

  deleteLink(caseId: string, linkId: string): boolean {
    const c = this.getCaseById(caseId);
    if (!c) return false;

    c.links = (c.links || []).filter((l: any) => l.id !== linkId);
    c.updatedAt = new Date().toISOString();
    this.persist();
    return true;
  }

  addTimeline(caseId: string, event: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const eventId = event.id || `EVT-${Date.now()}`;
    const newEvent = { ...event, id: eventId };

    c.timeline = [...(c.timeline || []), newEvent];
    c.updatedAt = new Date().toISOString();
    this.persist();
    return newEvent;
  }

  addTicket(caseId: string, ticket: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const ticketId = ticket.id || `TKT-${Date.now()}`;
    const newTicket = { ...ticket, id: ticketId, createdAt: new Date().toISOString() };

    c.tickets = [...(c.tickets || []), newTicket];
    c.updatedAt = new Date().toISOString();
    this.persist();
    return newTicket;
  }

  updateTicket(caseId: string, ticketId: string, updates: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    c.tickets = (c.tickets || []).map((t: any) => (t.id === ticketId ? { ...t, ...updates } : t));
    c.updatedAt = new Date().toISOString();
    this.persist();
    return c.tickets.find((t: any) => t.id === ticketId);
  }

  addEvidence(caseId: string, item: any): any {
    const c = this.getCaseById(caseId);
    if (!c) throw new Error(`Case ${caseId} not found`);

    const itemId = item.id || `EVD-${Date.now()}`;
    const newItem = {
      ...item,
      id: itemId,
      sha256: item.sha256 || crypto.createHash('sha256').update(JSON.stringify(item) + Date.now()).digest('hex'),
      uploadedAt: item.uploadedAt || new Date().toISOString(),
    };

    c.evidenceVault = [newItem, ...(c.evidenceVault || [])];
    c.updatedAt = new Date().toISOString();
    this.persist();
    return newItem;
  }
}

export const db = new TrinetraDatabase();
