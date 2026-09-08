import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  Briefcase,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  Building,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileCheck,
  UploadCloud,
  ChevronRight,
  FolderLock,
  Sparkles,
} from 'lucide-react';
import {
  UserSession,
  CaseData,
  AgencyType,
  UserRole,
  ClearanceRequest,
  EvidenceItem,
} from '../types';
import { AGENCY_CONFIGS, AGENCY_RANKS, INDIAN_STATES_AND_UTS } from '../data/authData';
import { formatFileSize, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_LABEL, computeLargeFileDigest } from '../utils/fileUtils';

interface AdminPortalProps {
  session: UserSession;
  cases: CaseData[];
  onCaseCreated: (newCase: CaseData) => void;
  onCaseUpdated: (updatedCase: CaseData) => void;
  onSelectCase?: (caseData: CaseData) => void;
}

const STATUTORY_SECTION_PRESETS = [
  'BNS Sec 318(4) (Cheating & Fraud)',
  'BNS Sec 319(2) (Cheating by Impersonation)',
  'BNS Sec 61(2) (Criminal Conspiracy)',
  'BNS Sec 336(3) (Forgery of Electronic Record)',
  'IT Act 2000 Sec 43 (Damage to Computer System)',
  'IT Act 2000 Sec 66C (Identity Theft)',
  'IT Act 2000 Sec 66D (Cheating by Impersonation via Computer)',
  'PMLA 2002 Sec 3 & 4 (Money Laundering / Layering)',
  'NDPS Act Sec 20/22 (Commercial Quantity)',
  'UAPA Sec 15, 16, 18 (Terror Financing & Conspiracies)',
];

export const AdminPortal: React.FC<AdminPortalProps> = ({
  session,
  cases,
  onCaseCreated,
  onCaseUpdated,
  onSelectCase,
}) => {
  const agencyConfig = AGENCY_CONFIGS[session.agency] || AGENCY_CONFIGS.POLICE;

  // Active Admin Sub-Tab:
  // 'INCEPTION' | 'CLEARANCE' | 'LEAD_PROVISION' | 'ESCALATION_TAKEOVER'
  const [activeAdminTab, setActiveAdminTab] = useState<
    'INCEPTION' | 'CLEARANCE' | 'LEAD_PROVISION' | 'ESCALATION_TAKEOVER'
  >('INCEPTION');

  // Clearance Requests State
  const [clearanceRequests, setClearanceRequests] = useState<ClearanceRequest[]>([]);
  const [clearanceFilter, setClearanceFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'DENIED'>('PENDING');
  const [isLoadingClearance, setIsLoadingClearance] = useState(false);
  const [clearanceActionMsg, setClearanceActionMsg] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  // Registered Officers List
  const [registeredOfficers, setRegisteredOfficers] = useState<any[]>([]);
  const [isLoadingOfficers, setIsLoadingOfficers] = useState(false);
  const [officerRoleEdits, setOfficerRoleEdits] = useState<{ [govId: string]: UserRole }>({});
  const [officerToDelete, setOfficerToDelete] = useState<{ id: string; name: string; govId: string } | null>(null);

  // Tab 1: Case Inception State
  const [firNumber, setFirNumber] = useState(`FIR-${new Date().getFullYear()}/CYBER-${Math.floor(100 + Math.random() * 900)}`);
  const [incidentTitle, setIncidentTitle] = useState('');
  const [selectedStatutorySections, setSelectedStatutorySections] = useState<string[]>([
    'BNS Sec 318(4) (Cheating & Fraud)',
    'IT Act 2000 Sec 66D (Cheating by Impersonation via Computer)',
  ]);
  const [customStatutorySection, setCustomStatutorySection] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().slice(0, 16));
  const [jurisdiction, setJurisdiction] = useState(
    session.agency === 'CBI'
      ? 'Central Bureau of Investigation (CBI-HQ), New Delhi'
      : session.agency === 'CID'
      ? 'State Crime Investigation Department (CID HQ)'
      : `${session.state || 'State'} Cyber Crime Police Station`
  );
  const [primaryTenant, setPrimaryTenant] = useState<AgencyType>(session.agency);
  const [classification, setClassification] = useState<'TOP_SECRET' | 'SECRET' | 'RESTRICTED'>('SECRET');
  const [assignedLead, setAssignedLead] = useState('');
  const [incidentNarrative, setIncidentNarrative] = useState('');

  // 15GB Evidence File Upload State for Inception
  const [stagedFiles, setStagedFiles] = useState<Array<{ name: string; size: number; type: string; hash: string }>>([]);
  const [isStagingFile, setIsStagingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inception Feedback
  const [inceptionSuccess, setInceptionSuccess] = useState<string | null>(null);
  const [inceptionError, setInceptionError] = useState<string | null>(null);
  const [isSubmittingInception, setIsSubmittingInception] = useState(false);

  // Tab 3: Lead Investigator Provisioning State
  const [selectedCaseForLead, setSelectedCaseForLead] = useState<CaseData | null>(null);
  const [newLeadInvestigatorName, setNewLeadInvestigatorName] = useState('');
  const [leadAssignmentOrderRef, setLeadAssignmentOrderRef] = useState(`DEP-ORD/${new Date().getFullYear()}/INV-${Math.floor(100 + Math.random() * 900)}`);
  const [leadAssignSuccess, setLeadAssignSuccess] = useState<string | null>(null);

  // Tab 4: Escalation / Takeover State
  const [pathAOrderRef, setPathAOrderRef] = useState(`CID-TRANSFER-MEMO-${new Date().getFullYear()}-09`);
  const [pathBOrderRef, setPathBOrderRef] = useState(`MHA-CENTRAL-DIR-${new Date().getFullYear()}/CBI-TAKEOVER-44`);
  const [confirmedAtomicLockout, setConfirmedAtomicLockout] = useState(false);
  const [escalationSuccessMsg, setEscalationSuccessMsg] = useState<string | null>(null);
  const [escalationErrorMsg, setEscalationErrorMsg] = useState<string | null>(null);

  // Load Clearance Requests & Registered Officers
  const loadClearanceData = async () => {
    setIsLoadingClearance(true);
    try {
      const res = await fetch('/api/clearance/requests');
      if (res.ok) {
        const data = await res.json();
        setClearanceRequests(data.requests || []);
      }
    } catch (e) {
      console.warn('Could not load clearance requests:', e);
    } finally {
      setIsLoadingClearance(false);
    }
  };

  const loadOfficers = async () => {
    setIsLoadingOfficers(true);
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setRegisteredOfficers(data.users || []);
      }
    } catch (e) {
      console.warn('Could not load officers:', e);
    } finally {
      setIsLoadingOfficers(false);
    }
  };

  useEffect(() => {
    loadClearanceData();
    loadOfficers();
  }, []);

  // Handle Review Clearance Request
  const handleReviewRequest = async (
    reqId: string,
    status: 'APPROVED' | 'DENIED',
    roleOverride?: UserRole
  ) => {
    try {
      const res = await fetch(`/api/clearance/requests/${reqId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewerName: `${session.name} (${session.rank})`,
          roleOverride,
          notes: status === 'APPROVED' ? 'Cleared by Department Administrator' : 'Denied access by Department Administrator',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to review request');
      }

      setClearanceActionMsg({
        id: reqId,
        text: status === 'APPROVED' ? 'Request Approved & Officer Credentials Activated' : 'Request Denied',
        type: 'success',
      });

      setTimeout(() => setClearanceActionMsg(null), 3500);
      loadClearanceData();
      loadOfficers();
    } catch (err: any) {
      setClearanceActionMsg({
        id: reqId,
        text: err.message || 'Error processing review',
        type: 'error',
      });
      setTimeout(() => setClearanceActionMsg(null), 3500);
    }
  };

  // Handle Modify Officer Role
  const handleSaveOfficerRole = async (govId: string) => {
    const newRole = officerRoleEdits[govId];
    if (!newRole) return;

    try {
      const res = await fetch(`/api/auth/users/${govId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update officer role');
      }

      loadOfficers();
    } catch (err: any) {
      alert(`Role modification failed: ${err.message}`);
    }
  };

  // Handle Delete Officer
  const handleDeleteOfficer = async () => {
    if (!officerToDelete) return;
    try {
      const res = await fetch(`/api/auth/users/${officerToDelete.id || officerToDelete.govId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Deletion failed');
      }
      setOfficerToDelete(null);
      loadOfficers();
    } catch (err: any) {
      alert(`Could not delete officer position: ${err.message}`);
    }
  };

  // Handle 15GB Evidence File Upload for Inception
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setFileError(null);
    setIsStagingFile(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File "${file.name}" exceeds departmental limit of ${MAX_FILE_SIZE_LABEL} (${formatFileSize(file.size)}).`);
        continue;
      }

      const digest = await computeLargeFileDigest(file);
      setStagedFiles(prev => [
        ...prev,
        {
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          hash: digest,
        },
      ]);
    }

    setIsStagingFile(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Handle Submit Case Inception
  const handleSubmitInception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim()) {
      setInceptionError('Incident Title is mandatory for case inception.');
      return;
    }

    setIsSubmittingInception(true);
    setInceptionError(null);
    setInceptionSuccess(null);

    try {
      const evidenceVaultItems: EvidenceItem[] = stagedFiles.map((f, idx) => ({
        id: `EXHIBIT-INCEPTION-${idx + 1}-${Math.floor(100 + Math.random() * 900)}`,
        title: f.name,
        type: f.name.toLowerCase().endsWith('.pdf') ? 'DIGITAL_FIR' : 'EVIDENCE_FILE',
        fileSize: formatFileSize(f.size),
        sha256: f.hash,
        uploadedBy: `${session.name} (${session.badge})`,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: jurisdiction,
        extractedEntitiesCount: 0,
        summaryText: `Primary Inception exhibit seized under ${selectedStatutorySections.join(', ')}. Initial intake size: ${formatFileSize(f.size)}.`,
      }));

      const newCasePayload: Partial<CaseData> = {
        id: firNumber.replace(/[^a-zA-Z0-9_-]/g, '-'),
        caseNumber: firNumber,
        title: incidentTitle.trim(),
        jurisdiction: jurisdiction.trim(),
        primaryTenant,
        sharedWithTenants: [],
        status: 'ACTIVE_INVESTIGATION',
        classification,
        incidentDate,
        leadInvestigator: assignedLead || `${session.name} (${session.badge})`,
        description: incidentNarrative || `Case incepted under statutory provisions: ${selectedStatutorySections.join(', ')}.`,
        nodes: [],
        links: [],
        patterns: [],
        tickets: [
          {
            id: `TKT-INCEPTION-01`,
            title: `Lead Investigator Briefing: ${incidentTitle.slice(0, 30)}`,
            assignedRole: 'LEAD_INVESTIGATOR',
            assignedToName: assignedLead || session.name,
            agency: primaryTenant,
            priority: 'CRITICAL',
            status: 'OPEN',
            details: `Admin initialization complete. Statutory sections: ${selectedStatutorySections.join(', ')}. Primary evidence container initialized with ${evidenceVaultItems.length} exhibits.`,
            deadline: 'Within 24 Hours',
            createdAt: new Date().toISOString(),
          },
        ],
        evidenceVault: evidenceVaultItems,
        timeline: [
          {
            id: `EVT-INCEPTION-01`,
            date: incidentDate,
            time: incidentDate.slice(11, 16) || '10:00',
            title: 'Case Inception & Container Setup',
            description: `FIR registered and container officially incepted in TRINETRA Law Enforcement Gateway by Department Administrator ${session.name}. Statutory sections: ${selectedStatutorySections.join(', ')}.`,
            type: 'ARREST',
            location: jurisdiction,
            coordinates: [12.9716, 77.5946],
          },
        ],
        escalationLog: [
          {
            timestamp: new Date().toISOString(),
            action: 'CASE_INCEPTION_CONTAINER_INITIALIZED',
            authorizedBy: `${session.name} [${session.rank}]`,
            orderReference: firNumber,
            details: `Container setup complete. Authorized by Department Admin under ${primaryTenant} registry.`,
          },
        ],
      };

      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCasePayload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to initialize case container');
      }

      const data = await res.json();
      onCaseCreated(data.case);
      setInceptionSuccess(`Case container "${data.case.caseNumber}" successfully initialized with SHA-256 seal.`);

      // Reset form
      setFirNumber(`FIR-${new Date().getFullYear()}/CYBER-${Math.floor(100 + Math.random() * 900)}`);
      setIncidentTitle('');
      setIncidentNarrative('');
      setStagedFiles([]);
    } catch (err: any) {
      setInceptionError(err.message || 'Case Inception failed');
    } finally {
      setIsSubmittingInception(false);
    }
  };

  // Handle Assign Lead Investigator
  const handleAssignLead = async (caseId: string) => {
    if (!newLeadInvestigatorName.trim()) {
      alert('Please select or specify a Lead Investigator name.');
      return;
    }

    try {
      const res = await fetch(`/api/cases/${caseId}/assign-lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadInvestigator: newLeadInvestigatorName.trim(),
          orderReference: leadAssignmentOrderRef,
          adminName: `${session.name} (${session.badge})`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lead assignment failed');
      }

      const data = await res.json();
      onCaseUpdated(data.case);
      setLeadAssignSuccess(`Lead Investigator for case ${data.case.caseNumber} updated to ${newLeadInvestigatorName}.`);
      setSelectedCaseForLead(null);
      setTimeout(() => setLeadAssignSuccess(null), 4000);
    } catch (err: any) {
      alert(`Assignment failed: ${err.message}`);
    }
  };

  // Handle Path A Case Escalation (State CID Admin)
  const handleExecutePathA = async (caseId: string) => {
    setEscalationErrorMsg(null);
    setEscalationSuccessMsg(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/escalate-cid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference: pathAOrderRef,
          adminName: `${session.name} [${session.rank}]`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Escalation failed');
      }

      const data = await res.json();
      onCaseUpdated(data.case);
      setEscalationSuccessMsg(`Path A Executed: Case ${data.case.caseNumber} pulled to statewide CID workspace. Local district police retain read-only visibility for ground support.`);
    } catch (err: any) {
      setEscalationErrorMsg(err.message || 'Escalation failed');
    }
  };

  // Handle Path B Federal Takeover (CBI Admin)
  const handleExecutePathB = async (caseId: string) => {
    if (!confirmedAtomicLockout) {
      setEscalationErrorMsg('You must verify and acknowledge the Zero-Trust Atomic Lockout protocol before executing Path B.');
      return;
    }

    setEscalationErrorMsg(null);
    setEscalationSuccessMsg(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/takeover-cbi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference: pathBOrderRef,
          adminName: `${session.name} [${session.rank}]`,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'CBI takeover failed');
      }

      const data = await res.json();
      onCaseUpdated(data.case);
      setEscalationSuccessMsg(`Path B Federal Central Takeover Executed: Case ${data.case.caseNumber} migrated atomically to CBI Federal Vault. All previous state police personnel access has been revoked.`);
      setConfirmedAtomicLockout(false);
    } catch (err: any) {
      setEscalationErrorMsg(err.message || 'Federal takeover failed');
    }
  };

  // Counts for Badges
  const pendingRequestsCount = clearanceRequests.filter(r => r.status === 'PENDING').length;
  const filteredRequests = clearanceRequests.filter(r => clearanceFilter === 'ALL' || r.status === clearanceFilter);
  const districtPoliceCases = cases.filter(c => c.primaryTenant === 'POLICE');
  const takeoverEligibleCases = cases.filter(c => c.primaryTenant === 'POLICE' || c.primaryTenant === 'CID');

  return (
    <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Department Admin Credentials Card */}
      <div className="rounded-2xl p-6 bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
            style={{ backgroundColor: agencyConfig.accentHex }}
          >
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-mono font-bold tracking-tight text-white uppercase">
                Department Administrator Command Portal
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                Tier-1 Supervisory Clearance
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Admin: <span className="text-slate-200 font-semibold">{session.name}</span> ({session.rank}) • Badge: <span className="text-slate-200 font-semibold">{session.badge}</span> • Jurisdiction: <span className="text-slate-200 font-semibold">{session.departmentName}</span>
            </p>
          </div>
        </div>

        {/* Real-time KPI Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Registered Cases</span>
            <span className="text-lg font-mono font-bold text-white">{cases.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 relative">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Clearance Queue</span>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="text-lg font-mono font-bold text-amber-400">{pendingRequestsCount}</span>
              {pendingRequestsCount > 0 && (
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Active Officers</span>
            <span className="text-lg font-mono font-bold text-emerald-400">{registeredOfficers.length}</span>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 block">Upload Cap</span>
            <span className="text-lg font-mono font-bold text-blue-400">15 GB</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveAdminTab('INCEPTION')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 ${
            activeAdminTab === 'INCEPTION'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 border border-blue-400/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <FolderLock className="w-4 h-4" />
          <span>1. Case Inception & Container Setup</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('CLEARANCE')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 relative ${
            activeAdminTab === 'CLEARANCE'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 border border-amber-400/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>2. User Onboarding & RBAC Gatekeeper</span>
          {pendingRequestsCount > 0 && (
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white">
              {pendingRequestsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveAdminTab('LEAD_PROVISION')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 ${
            activeAdminTab === 'LEAD_PROVISION'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 border border-indigo-400/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>3. Lead Investigator Provisioning</span>
        </button>

        <button
          onClick={() => setActiveAdminTab('ESCALATION_TAKEOVER')}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center space-x-2 ${
            activeAdminTab === 'ESCALATION_TAKEOVER'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 border border-red-400/40'
              : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>4. Case Escalation (CID / CBI Takeover)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CASE INCEPTION & CONTAINER SETUP                                   */}
      {/* ========================================================================= */}
      {activeAdminTab === 'INCEPTION' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                  <FolderLock className="w-5 h-5 text-blue-400" />
                  <span>Case Inception & Container Setup</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Department Admin exclusive authorization: Initialize new investigation containers, enter FIR identifiers, incident titles, and statutory penal code sections.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                15 GB Forensic Intake Supported
              </span>
            </div>

            {inceptionSuccess && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-mono flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                <span className="font-semibold">{inceptionSuccess}</span>
              </div>
            )}

            {inceptionError && (
              <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-center space-x-3">
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
                <span>{inceptionError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitInception} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    FIR / Case Identifier *
                  </label>
                  <input
                    type="text"
                    value={firNumber}
                    onChange={e => setFirNumber(e.target.value)}
                    required
                    placeholder="e.g. FIR-2026/CYBER-409"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    value={incidentTitle}
                    onChange={e => setIncidentTitle(e.target.value)}
                    required
                    placeholder="e.g. Operation Chakra: Inter-State Cyber Hawala Syndicate"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Statutory Penal Code Sections */}
              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-2">
                  Statutory Penal Code & Special Acts Sections *
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {STATUTORY_SECTION_PRESETS.map(sec => {
                    const isSelected = selectedStatutorySections.includes(sec);
                    return (
                      <button
                        type="button"
                        key={sec}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedStatutorySections(selectedStatutorySections.filter(s => s !== sec));
                          } else {
                            setSelectedStatutorySections([...selectedStatutorySections, sec]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all border ${
                          isSelected
                            ? 'bg-blue-600/30 text-blue-300 border-blue-500 shadow-sm'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {sec}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={customStatutorySection}
                    onChange={e => setCustomStatutorySection(e.target.value)}
                    placeholder="Add custom statutory act / section (e.g. Arms Act Sec 25/27)..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customStatutorySection.trim() && !selectedStatutorySections.includes(customStatutorySection.trim())) {
                        setSelectedStatutorySections([...selectedStatutorySections, customStatutorySection.trim()]);
                        setCustomStatutorySection('');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-white"
                  >
                    Add Section
                  </button>
                </div>
              </div>

              {/* Jurisdiction, Classification & Lead Assignment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Primary Tenant Agency
                  </label>
                  <select
                    value={primaryTenant}
                    onChange={e => setPrimaryTenant(e.target.value as AgencyType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="POLICE">State Police (District PS)</option>
                    <option value="CID">State Crime Investigation Dept (CID)</option>
                    <option value="CBI">Central Bureau of Investigation (CBI)</option>
                    <option value="NIA">National Investigation Agency (NIA)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Security Classification
                  </label>
                  <select
                    value={classification}
                    onChange={e => setClassification(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="SECRET">SECRET // Inter-Agency Discretion</option>
                    <option value="TOP_SECRET">TOP SECRET // Highly Compartmentalized</option>
                    <option value="RESTRICTED">RESTRICTED // Internal Police Record</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Assign Lead Investigator
                  </label>
                  <input
                    type="text"
                    value={assignedLead}
                    onChange={e => setAssignedLead(e.target.value)}
                    placeholder="e.g. DySP Vikram Rathore (CID)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Jurisdiction & Police Station
                  </label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={e => setJurisdiction(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                    Incident Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-slate-400 block mb-1">
                  Incident Narrative & Preliminary Intelligence Brief
                </label>
                <textarea
                  value={incidentNarrative}
                  onChange={e => setIncidentNarrative(e.target.value)}
                  rows={3}
                  placeholder="Enter preliminary seizure details, modus operandi, complainant brief, or initial case leads..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 15 GB High-Capacity Exhibit Attachment Container */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <UploadCloud className="w-5 h-5 text-blue-400" />
                    <div>
                      <span className="text-xs font-mono font-bold uppercase text-white">
                        Initial Forensic Exhibit Container (Max Capacity: 15 GB)
                      </span>
                      <span className="block text-[11px] text-slate-500 font-mono">
                        Attach RAW disk dumps (E01/DD), PCAP network captures, CDR telecom archives, or digital FIR copies.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isStagingFile}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold transition-all shadow"
                  >
                    {isStagingFile ? 'Computing Seal...' : '+ Attach Files (Up to 15 GB)'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    multiple
                    className="hidden"
                  />
                </div>

                {fileError && (
                  <div className="p-2.5 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono">
                    {fileError}
                  </div>
                )}

                {stagedFiles.length > 0 && (
                  <div className="space-y-2 mt-2">
                    {stagedFiles.map((sf, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono"
                      >
                        <div className="flex items-center space-x-2">
                          <FileCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span className="text-slate-200 font-medium">{sf.name}</span>
                          <span className="text-slate-500">({formatFileSize(sf.size)})</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-[10px] text-slate-400 font-mono">
                            SHA-256: {sf.hash.slice(0, 12)}...{sf.hash.slice(-8)}
                          </span>
                          <button
                            type="button"
                            onClick={() => setStagedFiles(stagedFiles.filter((_, i) => i !== idx))}
                            className="text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingInception}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold tracking-wider uppercase transition-all shadow-lg shadow-blue-600/30 flex items-center space-x-2"
                >
                  <FolderLock className="w-4 h-4" />
                  <span>{isSubmittingInception ? 'Initializing Container...' : 'Initialize & Register Case Container'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: USER ONBOARDING & RBAC GATEKEEPER                                  */}
      {/* ========================================================================= */}
      {activeAdminTab === 'CLEARANCE' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <span>User Onboarding & RBAC Gatekeeper Queue</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Manage the clearance queue to review, approve, or deny access requests submitted by law enforcement officers via the login screen.
                </p>
              </div>

              {/* Status Filter */}
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(['PENDING', 'APPROVED', 'DENIED', 'ALL'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setClearanceFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                      clearanceFilter === f
                        ? 'bg-amber-600 text-white shadow'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f}
                    {f === 'PENDING' && pendingRequestsCount > 0 && ` (${pendingRequestsCount})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Clearance Action Message */}
            {clearanceActionMsg && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-mono flex items-center space-x-2 ${
                  clearanceActionMsg.type === 'success'
                    ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                    : 'bg-red-950/80 border-red-800 text-red-200'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{clearanceActionMsg.text}</span>
              </div>
            )}

            {/* Clearance Requests Queue */}
            {isLoadingClearance ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                Loading national clearance queue...
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-mono">
                  No {clearanceFilter !== 'ALL' ? clearanceFilter.toLowerCase() : ''} clearance requests found in queue.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredRequests.map(req => (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-xs">
                          {req.agency}
                        </div>
                        <div>
                          <span className="font-mono font-bold text-sm text-white">{req.name}</span>
                          <span className="text-xs font-mono text-slate-400 ml-2">({req.govId})</span>
                          <div className="text-[11px] font-mono text-slate-500">
                            Rank: <span className="text-slate-300">{req.rank}</span> • Badge: <span className="text-slate-300">{req.badge}</span> • Unit: <span className="text-slate-300">{req.departmentName}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                            req.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : req.status === 'DENIED'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                          }`}
                        >
                          {req.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(req.submittedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">REQUESTED ROLE</span>
                        <span className="text-blue-400 font-bold">{req.role}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">STATE / JURISDICTION</span>
                        <span className="text-slate-300">{req.state || 'Federal HQ'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">CONTACT VERIFICATION</span>
                        <span className="text-slate-400">{req.phone || 'N/A'} • {req.email || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/90 text-xs font-mono text-slate-300">
                      <span className="text-slate-500 text-[10px] block uppercase mb-0.5">POSTING / CLEARANCE MEMO:</span>
                      "{req.justification}"
                    </div>

                    {req.status === 'PENDING' && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-slate-800/80">
                        <button
                          type="button"
                          onClick={() => handleReviewRequest(req.id, 'DENIED')}
                          className="px-4 py-2 rounded-xl bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                        >
                          <UserX className="w-3.5 h-3.5" />
                          <span>Deny Access</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-lg shadow-emerald-600/30"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Approve & Grant RBAC Clearance</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Active Registered Officers Directory & Role Management */}
            <div className="border-t border-slate-800 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Registered Officers Directory & Role Governance</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Directly modify granted roles or revoke officer positions in the national law enforcement registry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadOfficers}
                  className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                  title="Refresh Officers"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {registeredOfficers.length === 0 ? (
                <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No active registered officers in database.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Officer / Badge</th>
                        <th className="p-3">Agency / State</th>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Assigned Role</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {registeredOfficers.map(u => (
                        <tr key={u.id || u.govId} className="hover:bg-slate-950/40">
                          <td className="p-3">
                            <span className="font-bold text-white block">{u.name}</span>
                            <span className="text-slate-500 text-[10px]">{u.govId} • {u.badge}</span>
                          </td>
                          <td className="p-3">
                            <span className="text-slate-300 block">{u.agency}</span>
                            <span className="text-slate-500 text-[10px]">{u.state || 'National HQ'}</span>
                          </td>
                          <td className="p-3 text-slate-300">{u.rank}</td>
                          <td className="p-3">
                            <div className="flex items-center space-x-2">
                              <select
                                value={officerRoleEdits[u.govId] || u.role}
                                onChange={e => {
                                  setOfficerRoleEdits({
                                    ...officerRoleEdits,
                                    [u.govId]: e.target.value as UserRole,
                                  });
                                }}
                                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                              >
                                <option value="LEAD_INVESTIGATOR">Lead Investigator</option>
                                <option value="CYBER_PERSONNEL">Cyber Forensics Personnel</option>
                                <option value="FORENSIC_PERSONNEL">Forensic Personnel</option>
                                <option value="FIELD_BEAT_OFFICER">Field Beat Officer</option>
                                <option value="DEPT_ADMIN">Department Administrator</option>
                              </select>

                              {officerRoleEdits[u.govId] && officerRoleEdits[u.govId] !== u.role && (
                                <button
                                  type="button"
                                  onClick={() => handleSaveOfficerRole(u.govId)}
                                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={() => setOfficerToDelete({ id: u.id, name: u.name, govId: u.govId })}
                              className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-[11px] font-mono transition-all"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: LEAD INVESTIGATOR PROVISIONING                                      */}
      {/* ========================================================================= */}
      {activeAdminTab === 'LEAD_PROVISION' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-mono font-bold uppercase tracking-wider text-white flex items-center space-x-2">
                  <Briefcase className="w-5 h-5 text-indigo-400" />
                  <span>Lead Investigator Provisioning & Case Assignment</span>
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Assign internal Lead Investigators to newly initialized cases or transferred cases under administrative warrant.
                </p>
              </div>
            </div>

            {leadAssignSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-mono flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{leadAssignSuccess}</span>
              </div>
            )}

            {cases.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 font-mono">
                  No cases registered in the system yet. Please initialize a case in Tab 1.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cases.map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-blue-400">{c.caseNumber}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-slate-900 text-slate-300 border border-slate-800">
                          {c.primaryTenant}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{c.title}</h4>
                      <p className="text-[11px] text-slate-400 font-mono line-clamp-2 mt-1">
                        {c.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-slate-500 block">CURRENT LEAD</span>
                        <span className="text-xs font-mono font-bold text-amber-300">
                          {c.leadInvestigator || 'Unassigned'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCaseForLead(c);
                          setNewLeadInvestigatorName(c.leadInvestigator || '');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition-all shadow"
                      >
                        Reassign Lead
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CASE ESCALATION (PATH A CID & PATH B CBI TAKEOVER)                  */}
      {/* ========================================================================= */}
      {activeAdminTab === 'ESCALATION_TAKEOVER' && (
        <div className="space-y-6">
          {escalationSuccessMsg && (
            <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-200 text-xs font-mono flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <span className="font-semibold">{escalationSuccessMsg}</span>
            </div>
          )}

          {escalationErrorMsg && (
            <div className="p-4 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-mono flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{escalationErrorMsg}</span>
            </div>
          )}

          {/* Path A: State CID Admin Escalation */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-slate-800 pb-3">
              <div className="p-2 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                  Path A Case Escalation (State CID Admin)
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Seamlessly pulls local district police cases into the statewide CID workspace pool while allowing local police to retain read-only visibility for ground support.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center space-x-2">
                <label className="text-slate-400 uppercase text-[10px] w-36 shrink-0">CID Transfer Memo:</label>
                <input
                  type="text"
                  value={pathAOrderRef}
                  onChange={e => setPathAOrderRef(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            {districtPoliceCases.length === 0 ? (
              <div className="p-4 text-center text-xs font-mono text-slate-500 border border-dashed border-slate-800 rounded-xl">
                No local district police cases currently pending escalation. All cases have been escalated or are in higher jurisdictional pools.
              </div>
            ) : (
              <div className="space-y-3">
                {districtPoliceCases.map(c => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white">{c.caseNumber}</span>
                        <span className="text-amber-400 font-semibold">{c.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Station: {c.jurisdiction} • Lead: {c.leadInvestigator} • Status: {c.status}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleExecutePathA(c.id)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0"
                    >
                      <ArrowUpRight className="w-4 h-4 text-slate-300" />
                      <span>Execute Path A (State CID Pull)</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Path B: CBI Admin Federal Takeover */}
          <div className="bg-slate-900/80 border border-red-950/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center space-x-3 border-b border-red-900/50 pb-3">
              <div className="p-2 rounded-xl bg-red-950/80 text-red-400 border border-red-800">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-red-300">
                  Path B Federal Takeover (CBI Admin - Zero-Trust Atomic Lockout)
                </h3>
                <p className="text-[11px] text-slate-400 font-mono">
                  Executes an atomic database takeover under court or central government directives, moving data to the CBI vault and immediately revoking access from previous state police personnel.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-red-900/40 text-xs font-mono space-y-3">
              <div className="flex items-center space-x-2">
                <label className="text-slate-400 uppercase text-[10px] w-36 shrink-0">Central Directive Ref:</label>
                <input
                  type="text"
                  value={pathBOrderRef}
                  onChange={e => setPathBOrderRef(e.target.value)}
                  className="flex-1 bg-slate-900 border border-red-900/40 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>

              <div className="flex items-start space-x-2 pt-1 border-t border-red-900/30">
                <input
                  type="checkbox"
                  id="lockoutCheck"
                  checked={confirmedAtomicLockout}
                  onChange={e => setConfirmedAtomicLockout(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-500 bg-slate-900 border-red-800"
                />
                <label htmlFor="lockoutCheck" className="text-[11px] text-slate-300 font-mono cursor-pointer">
                  Acknowledge Zero-Trust Atomic Lockout: All state police and local CID personnel access will be severed immediately. The case will be permanently re-sealed in the CBI Federal Central Repository.
                </label>
              </div>
            </div>

            <div className="space-y-3">
              {takeoverEligibleCases.map(c => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-slate-950 border border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white">{c.caseNumber}</span>
                      <span className="text-red-400 font-semibold">{c.title}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                        Current: {c.primaryTenant}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Origin: {c.jurisdiction} • Classification: {c.classification}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleExecutePathB(c.id)}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold transition-all flex items-center space-x-2 shrink-0 shadow-lg shadow-red-600/30"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Execute Atomic CBI Takeover</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reassign Lead Investigator Modal */}
      {selectedCaseForLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-mono font-bold uppercase text-white">
                Provision Lead Investigator
              </h3>
              <button
                type="button"
                onClick={() => setSelectedCaseForLead(null)}
                className="text-slate-400 hover:text-white font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-mono space-y-3">
              <div>
                <span className="text-slate-500 uppercase text-[10px] block">CASE REF</span>
                <span className="text-white font-bold">{selectedCaseForLead.caseNumber} — {selectedCaseForLead.title}</span>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Select from Registered Officers:</label>
                <select
                  onChange={e => setNewLeadInvestigatorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white mb-2"
                >
                  <option value="">-- Choose Registered Officer --</option>
                  {registeredOfficers.map(o => (
                    <option key={o.govId} value={`${o.name} (${o.badge})`}>
                      {o.name} • {o.rank} ({o.agency}) - {o.badge}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Or Enter Custom Name & Rank:</label>
                <input
                  type="text"
                  value={newLeadInvestigatorName}
                  onChange={e => setNewLeadInvestigatorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                  placeholder="e.g. Inspector R. K. Sharma (CID Special Cell)"
                />
              </div>

              <div>
                <label className="text-slate-400 uppercase text-[10px] block mb-1">Administrative Transfer Order Ref:</label>
                <input
                  type="text"
                  value={leadAssignmentOrderRef}
                  onChange={e => setLeadAssignmentOrderRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedCaseForLead(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleAssignLead(selectedCaseForLead.id)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold"
              >
                Confirm Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Officer Confirmation Modal (No window.confirm) */}
      {officerToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-red-900/60 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-mono font-bold uppercase">
                Revoke Officer Position
              </h3>
            </div>
            <p className="text-xs font-mono text-slate-300">
              Are you sure you want to revoke and delete officer position <strong className="text-white">{officerToDelete.name}</strong> ({officerToDelete.govId}) from the national law enforcement registry?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setOfficerToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-mono text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteOfficer}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
