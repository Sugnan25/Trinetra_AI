import React, { useState, useEffect, useCallback } from 'react';
import { UserSession, CaseData, GraphNode, GraphLink, EvidenceItem, OperationalTicket } from './types';
import { SecurityGate } from './components/SecurityGate';
import { Header } from './components/Header';
import { CaseUploadIntake } from './components/CaseUploadIntake';
import { OverviewDashboard } from './components/OverviewDashboard';
import { GraphWorkstation } from './components/GraphWorkstation';
import { GeospatialMatrix } from './components/GeospatialMatrix';
import { SahayakAI } from './components/SahayakAI';
import { EvidenceIngestion } from './components/EvidenceIngestion';
import { FieldOfficerMobile } from './components/FieldOfficerMobile';
import { ForensicVault } from './components/ForensicVault';
import { CourtDossierGenerator } from './components/CourtDossierGenerator';
import { CaseEscalationModal } from './components/CaseEscalationModal';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  // Session State (Null = Locked behind Security Gate)
  const [session, setSession] = useState<UserSession | null>(null);

  // Multi-Case Repository State (Persisted in localStorage)
  const [casesList, setCasesList] = useState<CaseData[]>(() => {
    try {
      const saved = localStorage.getItem('trinetra_cases_list');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Active Case State (Null by default: user uploads or selects case)
  const [currentCase, setCurrentCase] = useState<CaseData | null>(() => {
    try {
      const saved = localStorage.getItem('trinetra_cases_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return null;
  });

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<string>('OVERVIEW');

  // Multi-Tenant Escalation Modal
  const [showEscalationModal, setShowEscalationModal] = useState(false);

  // Modal for uploading or switching cases while inside an active session
  const [showIntakeModal, setShowIntakeModal] = useState(false);

  // Inactivity Auto-Lockout Timer (120 seconds as required by high-security spec)
  const [inactivitySeconds, setInactivitySeconds] = useState(120);

  // Auto-sync casesList with localStorage
  useEffect(() => {
    try {
      if (casesList.length > 0) {
        localStorage.setItem('trinetra_cases_list', JSON.stringify(casesList));
      }
    } catch (e) {
      console.error('Failed to sync casesList to localStorage', e);
    }
  }, [casesList]);

  // Keep currentCase in sync within casesList whenever currentCase updates
  useEffect(() => {
    if (!currentCase) return;
    setCasesList(prev => {
      const idx = prev.findIndex(c => c.caseNumber === currentCase.caseNumber);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = currentCase;
        return copy;
      }
      return [currentCase, ...prev];
    });
  }, [currentCase]);

  // Multi-case ingestion handlers
  const handleIngestSingleCase = (newCase: CaseData, targetTab?: string) => {
    setCasesList(prev => {
      const filtered = prev.filter(c => c.caseNumber !== newCase.caseNumber);
      return [newCase, ...filtered];
    });
    setCurrentCase(newCase);
    setShowIntakeModal(false);
    setActiveTab(targetTab || 'OVERVIEW');
  };

  const handleIngestMultipleCases = (newCases: CaseData[]) => {
    if (!newCases || newCases.length === 0) return;
    setCasesList(prev => {
      const incomingSet = new Set(newCases.map(c => c.caseNumber));
      const remaining = prev.filter(c => !incomingSet.has(c.caseNumber));
      return [...newCases, ...remaining];
    });
    setCurrentCase(newCases[0]);
    setShowIntakeModal(false);
    setActiveTab('OVERVIEW');
  };

  const handleSelectCase = (selected: CaseData) => {
    setCurrentCase(selected);
    setActiveTab('OVERVIEW');
  };

  const handleDeleteCase = (caseNumber: string) => {
    setCasesList(prev => {
      const remaining = prev.filter(c => c.caseNumber !== caseNumber);
      if (currentCase?.caseNumber === caseNumber) {
        setCurrentCase(remaining.length > 0 ? remaining[0] : null);
      }
      return remaining;
    });
  };

  const handleResetInactivity = useCallback(() => {
    setInactivitySeconds(120);
  }, []);

  useEffect(() => {
    if (!session) return;

    const timer = setInterval(() => {
      setInactivitySeconds(prev => {
        if (prev <= 1) {
          // Trigger Auto-Lockout
          setSession(null);
          return 120;
        }
        return prev - 1;
      });
    }, 1000);

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(e => window.addEventListener(e, handleResetInactivity));

    return () => {
      clearInterval(timer);
      activityEvents.forEach(e => window.removeEventListener(e, handleResetInactivity));
    };
  }, [session, handleResetInactivity]);

  // Adjust default tab according to officer role upon login
  const handleLogin = (userSession: UserSession) => {
    setSession(userSession);
    setInactivitySeconds(120);

    if (userSession.role === 'DEPT_ADMIN') {
      setActiveTab('ADMIN_PORTAL');
    } else if (userSession.role === 'FIELD_BEAT_OFFICER') {
      setActiveTab('FIELD_MOBILE');
    } else if (userSession.role === 'FORENSIC_PERSONNEL') {
      setActiveTab('FORENSIC_VAULT');
    } else {
      setActiveTab('OVERVIEW');
    }
  };

  const handleLogout = () => {
    setSession(null);
  };

  // Add extracted entities into the active case's graph topology
  const handleAddEntitiesToGraph = (newNodes: GraphNode[], newLinks: GraphLink[]) => {
    setCurrentCase(prev =>
      prev
        ? {
            ...prev,
            nodes: [...prev.nodes, ...newNodes],
            links: [...prev.links, ...newLinks],
          }
        : null
    );
  };

  // Add evidence item to vault
  const handleUploadEvidence = (item: EvidenceItem) => {
    setCurrentCase(prev =>
      prev
        ? {
            ...prev,
            evidenceVault: [item, ...prev.evidenceVault],
          }
        : null
    );
  };

  // Execute Jurisdictional Case Escalation
  const handleExecuteEscalation = (type: 'PATH_A_CID' | 'PATH_B_CBI', orderRef: string) => {
    if (!currentCase) return;
    if (type === 'PATH_B_CBI') {
      setCurrentCase(prev =>
        prev
          ? {
              ...prev,
              primaryTenant: 'CBI-HQ-NEWDELHI',
              sharedWithTenants: [], // Atomic Lockout: severed from state police
              status: 'CBI_CENTRAL_TAKEOVER',
              escalationLog: [
                ...prev.escalationLog,
                {
                  timestamp: new Date().toISOString(),
                  action: 'PATH_B_FEDERAL_CENTRAL_TAKEOVER',
                  authorizedBy: session?.name || 'CBI Central Director',
                  orderReference: orderRef,
                  fromTenant: prev.primaryTenant,
                  toTenant: 'CBI-HQ-NEWDELHI',
                },
              ],
            }
          : null
      );
    } else {
      setCurrentCase(prev =>
        prev
          ? {
              ...prev,
              status: 'ESCALATED_CID',
              sharedWithTenants: Array.from(new Set([...prev.sharedWithTenants, 'STATE-CID-CRIME'])),
              escalationLog: [
                ...prev.escalationLog,
                {
                  timestamp: new Date().toISOString(),
                  action: 'PATH_A_INTERNAL_STATE_ESCALATION',
                  authorizedBy: session?.name || 'CID Special Inspector General',
                  orderReference: orderRef,
                  fromTenant: prev.primaryTenant,
                  toTenant: 'STATE-CID-CRIME',
                },
              ],
            }
          : null
      );
    }
  };

  // Dispatch field observation from mobile operative into task queue
  const handleDispatchFieldData = (payload: any) => {
    const newTicket: OperationalTicket = {
      id: `TKT-FIELD-${Math.floor(100 + Math.random() * 900)}`,
      title: `Field Recon: ${payload.notes?.slice(0, 32) || 'Evidence'}...`,
      assignedRole: 'FIELD_BEAT_OFFICER',
      assignedToName: session?.name || 'Beat Constable',
      agency: session?.agency || 'POLICE',
      priority: 'HIGH',
      status: 'FULFILLED',
      details: payload.notes || 'Field evidence reported',
      deadline: 'Logged On-Site',
      createdAt: new Date().toISOString(),
      completionNotes: `FIR Ref: ${payload.firNumber || 'MH-04-ONSCENE'}`,
    };

    setCurrentCase(prev =>
      prev
        ? {
            ...prev,
            tickets: [newTicket, ...(prev.tickets || [])],
          }
        : null
    );
  };

  const handleNavigateTab = (tab: string) => {
    const upper = tab.toUpperCase();
    if (upper.includes('GRAPH')) setActiveTab('GRAPH_CANVAS');
    else if (upper.includes('GEO') || upper.includes('MAP')) setActiveTab('GEOSPATIAL');
    else if (upper.includes('SAHAYAK') || upper.includes('AI')) setActiveTab('SAHAYAK_AI');
    else if (upper.includes('STREAM') || upper.includes('INGEST')) setActiveTab('STREAMER');
    else if (upper.includes('VAULT') || upper.includes('FORENSIC')) setActiveTab('FORENSIC_VAULT');
    else if (upper.includes('FIELD') || upper.includes('MOBILE')) setActiveTab('FIELD_MOBILE');
    else if (upper.includes('DOSSIER') || upper.includes('COURT')) setActiveTab('COURT_DOSSIER');
    else setActiveTab('OVERVIEW');
  };

  const handleUpdateTicketStatus = (ticketId: string, status: OperationalTicket['status']) => {
    setCurrentCase(prev =>
      prev
        ? {
            ...prev,
            tickets: prev.tickets.map(t => (t.id === ticketId ? { ...t, status } : t)),
          }
        : null
    );
  };

  const handleCreateTicket = (ticket: Omit<OperationalTicket, 'id' | 'createdAt'>) => {
    const newT: OperationalTicket = {
      ...ticket,
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
    };
    setCurrentCase(prev =>
      prev
        ? {
            ...prev,
            tickets: [newT, ...prev.tickets],
          }
        : null
    );
  };

  // Render Gate if no authenticated session
  if (!session) {
    return <SecurityGate onAuthenticated={handleLogin} onAuthenticate={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation & Agency Header */}
      <Header
        session={session}
        currentCase={currentCase}
        casesList={casesList}
        onSelectCase={handleSelectCase}
        onDeleteCase={handleDeleteCase}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onSwitchOfficer={officer => {
          handleLogin({
            id: officer.govId,
            govId: officer.govId,
            name: officer.name,
            agency: officer.agency,
            role: officer.role,
            badge: officer.badge,
            rank: officer.rank,
            departmentName: officer.departmentName,
            themeColor:
              officer.agency === 'POLICE'
                ? '#d97706'
                : officer.agency === 'CID'
                ? '#475569'
                : officer.agency === 'CBI'
                ? '#2563eb'
                : '#dc2626',
            loginTime: new Date().toISOString(),
          });
        }}
        inactivitySeconds={inactivitySeconds}
        onOpenEscalationModal={() => setShowEscalationModal(true)}
        onOpenIntakeModal={() => setShowIntakeModal(true)}
      />

      {/* Main Content: Dedicated Case Intake Space OR Intelligence Suite for Active Case */}
      <main className="flex-1 overflow-x-hidden">
        {!currentCase ? (
          <div className="p-4 lg:p-8">
            <CaseUploadIntake
              session={session}
              existingCases={casesList}
              onCaseIngested={handleIngestSingleCase}
              onCasesIngested={handleIngestMultipleCases}
            />
          </div>
        ) : (
          <>
            {activeTab === 'OVERVIEW' && (
              <OverviewDashboard
                currentCase={currentCase}
                session={session}
                onNavigateToTab={handleNavigateTab}
                onSelectPattern={handleNavigateTab}
                onUpdateTicketStatus={handleUpdateTicketStatus}
                onCreateTicket={handleCreateTicket}
              />
            )}

            {activeTab === 'GRAPH_CANVAS' && (
              <GraphWorkstation
                nodes={currentCase.nodes}
                links={currentCase.links}
              />
            )}

            {activeTab === 'GEOSPATIAL' && (
              <GeospatialMatrix timeline={currentCase.timeline} />
            )}

            {activeTab === 'SAHAYAK_AI' && (
              <SahayakAI currentCase={currentCase} session={session} />
            )}

            {activeTab === 'STREAMER' && (
              <EvidenceIngestion onAddEntitiesToGraph={handleAddEntitiesToGraph} />
            )}

            {activeTab === 'FIELD_MOBILE' && (
              <FieldOfficerMobile
                session={session}
                onDispatchToLeadQueue={handleDispatchFieldData}
              />
            )}

            {activeTab === 'FORENSIC_VAULT' && (
              <ForensicVault
                session={session}
                evidenceVault={currentCase.evidenceVault}
                dailyDiary={currentCase.dailyDiary}
                caseNumber={currentCase.caseNumber}
                leadInvestigator={currentCase.leadInvestigator}
                onUploadEvidence={handleUploadEvidence}
              />
            )}

            {activeTab === 'COURT_DOSSIER' && (
              <CourtDossierGenerator currentCase={currentCase} session={session} />
            )}

            {activeTab === 'ADMIN_PORTAL' && (
              <AdminPortal
                session={session}
                cases={casesList}
                onCaseCreated={(newCase) => handleIngestSingleCase(newCase, 'OVERVIEW')}
                onCaseUpdated={(updatedCase) => {
                  setCasesList(prev => prev.map(c => c.id === updatedCase.id ? updatedCase : c));
                  if (currentCase?.id === updatedCase.id) setCurrentCase(updatedCase);
                }}
                onSelectCase={(caseData) => {
                  setCurrentCase(caseData);
                  setActiveTab('OVERVIEW');
                }}
              />
            )}
          </>
        )}
      </main>

      {/* Intake / Upload Modal (When user wants to switch or upload a new case while active) */}
      {showIntakeModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md p-4 overflow-y-auto flex items-center justify-center">
          <CaseUploadIntake
            session={session}
            isModal
            existingCases={casesList}
            onCaseIngested={handleIngestSingleCase}
            onCasesIngested={handleIngestMultipleCases}
            onCancel={() => setShowIntakeModal(false)}
          />
        </div>
      )}

      {/* Jurisdictional Escalation Modal */}
      {showEscalationModal && currentCase && (
        <CaseEscalationModal
          currentCase={currentCase}
          session={session}
          onClose={() => setShowEscalationModal(false)}
          onExecuteEscalation={handleExecuteEscalation}
        />
      )}
    </div>
  );
}
