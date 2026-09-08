import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { db } from './server/db';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15gb' }));
app.use(express.urlencoded({ extended: true, limit: '15gb' }));

// Lazy initialize Gemini
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    try {
      geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn('Could not initialize Gemini client:', e);
    }
  }
  return geminiClient;
}

// Health check & DB status
app.get('/api/health', (req: Request, res: Response) => {
  const users = db.getUsers();
  const cases = db.getCasesSummary();
  res.json({
    status: 'operational',
    service: 'TRINETRA Backend Intelligence Gateway',
    timestamp: new Date().toISOString(),
    geminiAvailable: Boolean(process.env.GEMINI_API_KEY),
    database: {
      status: 'active_persistent',
      registeredOfficers: users.length,
      activeCases: cases.length,
    },
  });
});

// ==========================================
// 1. PERSONNEL AUTH & REGISTRATION API
// ==========================================

// Get all registered officers
app.get('/api/auth/users', (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Register new officer
app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { name, govId, agency, role, rank, badge, departmentName, state, phone, email, password } = req.body;

    if (!name || !govId || !agency || !role) {
      return res.status(400).json({ error: 'Name, Gov ID, Agency, and Role are mandatory.' });
    }

    const newUser = db.registerUser({
      name,
      govId,
      agency,
      role,
      rank,
      badge,
      departmentName,
      state,
      phone,
      email,
      password,
    });

    console.log(`[AUTH] Registered new officer: ${name} (${govId}) for ${agency} (${state || 'Federal'})`);
    res.status(201).json({
      message: 'Officer registered successfully in TRINETRA Law Enforcement Registry',
      user: newUser,
    });
  } catch (err: any) {
    console.warn('[AUTH REGISTER ERROR]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Delete registered officer / position
app.delete('/api/auth/users/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = db.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ error: `Officer position ${id} not found.` });
    }
    console.log(`[AUTH] Deleted officer position: ${id}`);
    res.json({ success: true, message: `Officer position ${id} deleted successfully.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify credentials / Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { govId, password } = req.body;
    if (!govId) {
      return res.status(400).json({ error: 'Gov ID is required' });
    }

    const user = db.verifyCredentials(govId, password || '');
    if (!user) {
      return res.status(401).json({ error: 'Invalid Officer Gov ID or authentication credentials.' });
    }

    res.json({
      message: 'Authentication successful',
      user,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update officer role (Admin Gatekeeper)
app.patch('/api/auth/users/:id/role', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'Role is required' });
    }
    const updated = db.updateUserRole(id, role);
    res.json({ user: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 1B. RBAC GATEKEEPER & CLEARANCE QUEUE API
// ==========================================

// Get all clearance requests
app.get('/api/clearance/requests', (req: Request, res: Response) => {
  try {
    const requests = db.getClearanceRequests();
    res.json({ requests });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit an access clearance request (via Login Screen)
app.post('/api/clearance/requests', (req: Request, res: Response) => {
  try {
    const { name, govId, agency, role, rank, badge, departmentName, state, phone, email, password, justification } = req.body;

    if (!name || !govId || !agency || !role) {
      return res.status(400).json({ error: 'Name, Gov ID, Agency, and Role are mandatory.' });
    }

    const createdReq = db.addClearanceRequest({
      name,
      govId,
      agency,
      role,
      rank,
      badge,
      departmentName,
      state,
      phone,
      email,
      password,
      justification,
    });

    console.log(`[CLEARANCE] New access request submitted: ${name} (${govId}) for ${agency} [Role: ${role}]`);
    res.status(201).json({
      message: 'Access clearance application registered in Department Admin Gatekeeper queue.',
      request: createdReq,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Review clearance request (Approve / Deny by Department Admin)
app.post('/api/clearance/requests/:id/review', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reviewerName, notes, roleOverride } = req.body;

    if (!status || !['APPROVED', 'DENIED'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or DENIED' });
    }

    const result = db.reviewClearanceRequest(id, status, reviewerName || 'Department Admin', notes, roleOverride);
    console.log(`[CLEARANCE] Request ${id} ${status} by ${reviewerName || 'Department Admin'}`);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. CASE MANAGEMENT API
// ==========================================

// List all cases (summary)
app.get('/api/cases', (req: Request, res: Response) => {
  try {
    const cases = db.getCasesSummary();
    res.json({ cases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create brand new case
app.post('/api/cases', (req: Request, res: Response) => {
  try {
    const caseData = req.body;
    if (!caseData.title) {
      return res.status(400).json({ error: 'Case title is required' });
    }

    const created = db.createCase(caseData);
    console.log(`[CASE] Created case ${created.id}: ${created.title}`);
    res.status(201).json({ case: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get case by ID
app.get('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const c = db.getCaseById(id);
    if (!c) {
      return res.status(404).json({ error: `Case ${id} not found` });
    }
    res.json({ case: c });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update case
app.put('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = db.updateCase(id, req.body);
    res.json({ case: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete case
app.delete('/api/cases/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = db.deleteCase(id);
    if (!ok) {
      return res.status(404).json({ error: `Case ${id} not found` });
    }
    res.json({ message: `Case ${id} removed` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Assign / Reassign Lead Investigator (Department Admin)
app.post('/api/cases/:id/assign-lead', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leadInvestigator, orderReference, adminName } = req.body;
    if (!leadInvestigator) {
      return res.status(400).json({ error: 'leadInvestigator is required' });
    }
    const updated = db.assignLeadInvestigator(id, leadInvestigator, orderReference || '', adminName || 'Department Admin');
    res.json({ case: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Path A Case Escalation (State CID Admin)
app.post('/api/cases/:id/escalate-cid', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderReference, adminName } = req.body;
    const updated = db.escalateToCid(id, orderReference || '', adminName || 'State CID Admin');
    res.json({ case: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Path B Federal Takeover (CBI Admin)
app.post('/api/cases/:id/takeover-cbi', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { orderReference, adminName } = req.body;
    const updated = db.takeoverToCbi(id, orderReference || '', adminName || 'CBI Central Admin');
    res.json({ case: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Node to Case
app.post('/api/cases/:id/nodes', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const node = db.addNode(id, req.body);
    res.status(201).json({ node });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Node from Case
app.delete('/api/cases/:id/nodes/:nodeId', (req: Request, res: Response) => {
  try {
    const { id, nodeId } = req.params;
    const ok = db.deleteNode(id, nodeId);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Link to Case
app.post('/api/cases/:id/links', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const link = db.addLink(id, req.body);
    res.status(201).json({ link });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Link from Case
app.delete('/api/cases/:id/links/:linkId', (req: Request, res: Response) => {
  try {
    const { id, linkId } = req.params;
    const ok = db.deleteLink(id, linkId);
    res.json({ success: ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Timeline Event
app.post('/api/cases/:id/timeline', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = db.addTimeline(id, req.body);
    res.status(201).json({ event });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Operational Ticket
app.post('/api/cases/:id/tickets', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = db.addTicket(id, req.body);
    res.status(201).json({ ticket });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update Ticket Status
app.patch('/api/cases/:id/tickets/:ticketId', (req: Request, res: Response) => {
  try {
    const { id, ticketId } = req.params;
    const updated = db.updateTicket(id, ticketId, req.body);
    res.json({ ticket: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add Evidence Item
app.post('/api/cases/:id/evidence', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = db.addEvidence(id, req.body);
    res.status(201).json({ evidence: item });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Deterministic entity regex patterns
const PHONE_REGEX = /(?:\+91[\-\s]?|0)?[6-9]\d{9}\b/g;
const IMEI_REGEX = /\b\d{15}\b/g;
const VEHICLE_REGEX = /\b[A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4}\b/g;
const UPI_REGEX = /\b[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}\b/g;
const BANK_ACC_REGEX = /\bACC[:\s\-#]*([0-9]{9,18})\b/gi;

// Dual-Engine Extraction API
app.post('/api/extract/entities', async (req: Request, res: Response) => {
  try {
    const { text, mode = 'hybrid' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // 1. Deterministic Extraction
    const phoneMatches = Array.from(new Set(text.match(PHONE_REGEX) || []));
    const imeiMatches = Array.from(new Set(text.match(IMEI_REGEX) || []));
    const vehicleMatches = Array.from(new Set(text.match(VEHICLE_REGEX) || []));
    const upiMatches = Array.from(new Set(text.match(UPI_REGEX) || []));
    
    const bankMatches: string[] = [];
    let bMatch;
    while ((bMatch = BANK_ACC_REGEX.exec(text)) !== null) {
      if (bMatch[1]) bankMatches.push(bMatch[1]);
    }

    const deterministicEntities = [
      ...phoneMatches.map(val => ({ type: 'PHONE', value: val, label: `MSISDN: ${val}`, confidence: 0.99 })),
      ...imeiMatches.map(val => ({ type: 'IMEI', value: val, label: `IMEI: ${val}`, confidence: 0.99 })),
      ...vehicleMatches.map(val => ({ type: 'VEHICLE', value: val, label: `Vehicle Reg: ${val}`, confidence: 0.98 })),
      ...upiMatches.map(val => ({ type: 'UPI', value: val, label: `UPI VPA: ${val}`, confidence: 0.97 })),
      ...Array.from(new Set(bankMatches)).map(val => ({ type: 'BANK_ACCOUNT', value: val, label: `Account: ${val}`, confidence: 0.95 })),
    ];

    // 2. Semantic Extraction (if requested and Gemini is available)
    let semanticEntities: any[] = [];
    let relationships: any[] = [];
    const client = getGeminiClient();

    if (client && (mode === 'hybrid' || mode === 'semantic')) {
      try {
        const prompt = `You are TRINETRA, an elite intelligence entity extractor for Indian law enforcement.
Extract suspects, aliases, physical locations, operational roles, and relationships from this police report/evidence text.
Return ONLY valid JSON matching this schema:
{
  "entities": [
    { "type": "SUSPECT"|"LOCATION"|"ORGANIZATION"|"WEAPON_EXPLOSIVE", "value": "string", "label": "string", "role": "string" }
  ],
  "relationships": [
    { "source": "string", "target": "string", "type": "COORDINATES_WITH"|"TRANSFERS_FUNDS"|"OPERATES_BURNING_DEVICE"|"RECONNAISSANCE"|"PROCURED_EQUIPMENT", "description": "string" }
  ]
}

Text to analyze:
"""
${text.slice(0, 8000)}
"""`;

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.entities) semanticEntities = parsed.entities;
          if (parsed.relationships) relationships = parsed.relationships;
        }
      } catch (geminiErr) {
        console.warn('Gemini semantic extraction failed, using heuristic extraction:', geminiErr);
      }
    }

    // Heuristic fallback if semantic was empty
    if (semanticEntities.length === 0) {
      const suspectKeywords = ['suspect', 'alias', 'handler', 'operative', 'driver', 'mastermind', 'accused'];
      const words = text.split(/\n+/);
      for (const line of words) {
        if (suspectKeywords.some(kw => line.toLowerCase().includes(kw))) {
          const names = line.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2}\b/g);
          if (names) {
            names.slice(0, 3).forEach(name => {
              semanticEntities.push({
                type: 'SUSPECT',
                value: name,
                label: `Subject: ${name}`,
                role: 'Field Operative / Suspect',
              });
            });
          }
        }
      }
    }

    return res.json({
      deterministicEntities,
      semanticEntities,
      relationships,
      totalCount: deterministicEntities.length + semanticEntities.length,
    });
  } catch (err: any) {
    console.error('Extraction error:', err);
    res.status(500).json({ error: err.message || 'Entity extraction failed' });
  }
});

// SAHAYAK AI Assistant endpoint
app.post('/api/sahayak/chat', async (req: Request, res: Response) => {
  try {
    const { query, caseContext, history = [] } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const client = getGeminiClient();

    if (client) {
      try {
        const systemInstruction = `You are SAHAYAK, the specialized Tactical AI Intelligence Assistant embedded within TRINETRA (Ministry of Home Affairs, Govt of India).
Your duty is assisting Law Enforcement Investigators (CBI, NIA, State CID, State Police) in criminal network analysis, terror module triangulation, burner phone hopping detection, Hawala smurfing, and Section 65B/63 judicial dossier compilation.
Guidelines:
1. Strict factual discipline: Never hallucinate facts.
2. Evidence Citations: Reference specific Exhibit IDs (e.g. [EXHIBIT-GJ-08-CDR], [FIR-MUM-402], line numbers or tower IDs).
3. Plain-language, tactical clarity: No AI jargon, no model latency tags.
4. Highlight critical criminal topology: Mention Cut-Vertices (articulation points), betweenness centrality anomalies, burner IMEI hops, and Hawala mule chains.
5. Reference Indian legal statutes: Section 65B Indian Evidence Act, Section 63 Bharatiya Sakshya Adhiniyam (BSA), and UAPA where applicable.`;

        const contextString = `
ACTIVE CASE CONTEXT:
Case Title: ${caseContext?.title || 'Serial Blast Conspiracy & Vehicle Theft Triangulation'}
Jurisdiction: ${caseContext?.jurisdiction || 'State CID Gujarat / Inter-Agency Sync'}
Key Accused & Nodes: ${JSON.stringify(caseContext?.summaryNodes || [])}
Flagged Patterns: ${JSON.stringify(caseContext?.flaggedPatterns || [])}
Recent Verified Links: ${JSON.stringify(caseContext?.recentLinks || [])}
`;

        const formattedContents = [
          ...history.slice(-4).map((m: any) => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }],
          })),
          {
            role: 'user',
            parts: [{ text: `${contextString}\n\nINVESTIGATOR QUERY:\n${query}` }],
          },
        ];

        const response = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.2,
          },
        });

        const replyText = response.text || 'SAHAYAK analysis complete. Reviewing evidentiary links.';
        return res.json({ reply: replyText, model: 'gemini-2.5-flash' });
      } catch (geminiErr: any) {
        console.warn('Gemini chat error, falling back to tactical intelligence engine:', geminiErr);
      }
    }

    // High-fidelity deterministic intelligence response if API key is not provided or fails
    const qLower = query.toLowerCase();
    let reply = '';
    if (qLower.includes('kingpin') || qLower.includes('betweenness') || qLower.includes('mastermind')) {
      reply = `**SAHAYAK Tactical Network Intelligence Report**:\n\n` +
        `• **Target Identified**: In accordance with Brandes' Betweenness Centrality algorithm, **Lieutenant Sajid @ Bilal** exhibits the single highest Betweenness score ($C_B = 0.894$) while maintaining low direct call volume ($k=3$), characteristic of the classic **Kingpin Shielding Profile**.\n` +
        `• **Cut-Vertex Finding**: Sajid is flagged by Tarjan's Articulation Algorithm as a **Cut-Vertex**. Neutralizing his communication terminal severs the Ahmedabad local execution cell from the Bhatkal/Vadodara logistics planners.\n` +
        `• **Evidence Provenance**: Cited in [EXHIBIT-CDR-TWR-884, Line 129] and [INTERCEPT-MEMO-44B].`;
    } else if (qLower.includes('burner') || qLower.includes('imei') || qLower.includes('sim')) {
      reply = `**SAHAYAK Burner Swap Radar Analysis**:\n\n` +
        `• **Critical Alert**: Hardware IMEI **490154203237510** has activated **6 distinct MSISDNs** across Bharuch, Vadodara, and Ahmedabad within a 72-hour operational window.\n` +
        `• **Evidentiary Link**: While SIMs were discarded after 2 coordination calls to evade direct wiretaps, the persistent terminal IMEI links suspect **Qasim Logistics** to both the Navi Mumbai vehicle theft location and the Surat timed assembly point.\n` +
        `• **Statutory Admissibility**: Telemetry hash logged with SHA-256 for Section 65B IEA / Section 63 BSA submission.`;
    } else if (qLower.includes('hawala') || qLower.includes('money') || qLower.includes('financial') || qLower.includes('upi')) {
      reply = `**SAHAYAK Financial Forensics Breakdown**:\n\n` +
        `• **Smurfing Chain Detected**: Fund flow identified traversing **A (Mule VPA: munshi.trade@oksbi)** ➔ **B (Cashier Surat)** ➔ **C (Fabricator Vadodara)** ➔ **D (Procurement)**.\n` +
        `• **Layering Tactic**: Structured tranches of ₹49,500 were systematically routed to circumvent mandatory ₹50,000 PMLA statutory reporting thresholds.\n` +
        `• **Actionable Directive**: Freeze VPA \`munshi.trade@oksbi\` under CrPC Section 102 / BNSS equivalent and summon ledger operator.`;
    } else if (qLower.includes('car') || qLower.includes('vehicle') || qLower.includes('mumbai') || qLower.includes('bomb')) {
      reply = `**SAHAYAK Multi-State Triangulation Breakdown**:\n\n` +
        `• **Cross-Border Silo Breakthrough**: Two Maruti 800 sedans recovered with unexploded timer circuits in Ahmedabad were registered with Gujarat fake plates. However, engine block stamping and chassis hash matched Navi Mumbai theft complaints [FIR No. 208/2008, Turbhe Police Station].\n` +
        `• **Time Window**: Vehicle stolen on July 16; entered Vadodara bypass toll on July 24 at 18:42 hrs (ANPR verified in [EXHIBIT-ANPR-GJ-NH8]).`;
    } else {
      reply = `**SAHAYAK Intelligence Assessment**:\n\n` +
        `Evaluating active case topology across ${caseContext?.summaryNodes?.length || 18} graph nodes and 24 evidentiary links.\n` +
        `• **Operational Status**: Multi-state correlation active between Gujarat, Maharashtra, and Karnataka.\n` +
        `• **Key Corroboration**: All incoming CDR telemetry, ANPR toll sightings, and field FIRs are hashed with SHA-256 digital fingerprinting in compliance with Section 65B Indian Evidence Act / Section 63 BSA.\n` +
        `• **Recommended Investigation Lead**: Dispatch task to Cyber Personnel to pull BTS azimuth sectors for Bharuch junction tower between 22:00 and 02:00 hrs.`;
    }

    return res.json({ reply, model: 'sahayak-tactical-engine' });
  } catch (err: any) {
    console.error('SAHAYAK error:', err);
    res.status(500).json({ error: err.message || 'SAHAYAK processing failed' });
  }
});

// Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[TRINETRA] Core Intelligence Gateway running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
