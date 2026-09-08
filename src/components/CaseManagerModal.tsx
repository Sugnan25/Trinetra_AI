import React, { useState, useEffect } from 'react';
import {
  FolderPlus,
  FolderOpen,
  Shield,
  FileText,
  Building2,
  Calendar,
  User,
  CheckCircle2,
  X,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
} from 'lucide-react';
import { CaseData, UserSession, AgencyType } from '../types';
import { BENCHMARK_CASE_2008 } from '../data/benchmarkCase';
import { enrichCaseWithAlgorithms } from '../utils/caseEnrichment';

interface CaseManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeCase: CaseData;
  onSelectCase: (selectedCase: CaseData) => void;
  session: UserSession;
}

export const CaseManagerModal: React.FC<CaseManagerModalProps> = ({
  isOpen,
  onClose,
  activeCase,
  onSelectCase,
  session,
}) => {
  const [activeTab, setActiveTab] = useState<'REGISTRY' | 'CREATE_NEW'>('REGISTRY');
  const [casesList, setCasesList] = useState<any[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Form State for creating a new case
  const [title, setTitle] = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [crimeCategory, setCrimeCategory] = useState('Cyber Syndicate & Financial Fraud');
  const [jurisdiction, setJurisdiction] = useState(
    session.agency === 'POLICE'
      ? 'Ahmedabad City Police Station, Sector 1'
      : session.agency === 'CID'
      ? 'CID Crime Headquarters, Gandhinagar'
      : session.agency === 'CBI'
      ? 'CBI Special Crime Branch, New Delhi'
      : 'NIA National Operations Wing, New Delhi'
  );
  const [primaryTenant, setPrimaryTenant] = useState<AgencyType>(session.agency);
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [classification, setClassification] = useState<'TOP_SECRET' | 'SECRET' | 'RESTRICTED'>('TOP_SECRET');
  const [leadInvestigator, setLeadInvestigator] = useState(`${session.rank} ${session.name} (${session.badge})`);
  const [description, setDescription] = useState('');

  // Fetch cases from server
  const loadCases = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/cases');
      if (res.ok) {
        const data = await res.json();
        setCasesList(data.cases || []);
      }
    } catch (e) {
      console.warn('Could not fetch cases from backend, using active case state');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadCases();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Switch to an existing case
  const handleSwitchCase = async (caseId: string) => {
    try {
      setIsLoading(true);
      if (caseId === BENCHMARK_CASE_2008.id) {
        onSelectCase(enrichCaseWithAlgorithms(BENCHMARK_CASE_2008));
        setFeedbackMsg('Switched to Benchmark Investigation: 2008 Ahmedabad Serial Bombings.');
        setTimeout(() => {
          onClose();
          setFeedbackMsg('');
        }, 700);
        return;
      }

      const res = await fetch(`/api/cases/${caseId}`);
      if (res.ok) {
        const data = await res.json();
        const enriched = enrichCaseWithAlgorithms(data.case);
        onSelectCase(enriched);
        setFeedbackMsg(`Switched to active investigation: ${enriched.title}`);
        setTimeout(() => {
          onClose();
          setFeedbackMsg('');
        }, 700);
      }
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Create Brand New Case
  const handleCreateCaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !caseNumber.trim()) {
      alert('Case Title and FIR / Case Number are mandatory.');
      return;
    }

    const newCasePayload: CaseData = {
      id: `CASE-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      caseNumber: caseNumber.trim(),
      title: title.trim(),
      jurisdiction: jurisdiction.trim(),
      primaryTenant: primaryTenant,
      sharedWithTenants: [],
      classification: classification,
      status: 'ACTIVE_TRIANGULATION',
      leadInvestigator: leadInvestigator.trim(),
      incidentDate: incidentDate,
      description: description.trim() || 'Manual case record entered into TRINETRA Intelligence Framework.',
      nodes: [],
      links: [],
      patterns: [],
      tickets: [
        {
          id: `TKT-INIT-${Math.floor(100 + Math.random() * 900)}`,
          title: 'Initial Case Dossier Review & Target Profiling',
          assignedRole: 'LEAD_INVESTIGATOR' as any,
          assignedToName: session.name,
          agency: session.agency,
          priority: 'HIGH',
          status: 'IN_PROGRESS',
          details: `Manual investigation initiated under ${caseNumber}. Verify incoming telecom CDR records and physical evidence exhibits.`,
          deadline: 'Immediate',
          createdAt: new Date().toISOString(),
        },
      ],
      evidenceVault: [],
      timeline: [],
      sha256Seal: '',
      escalationLog: [
        {
          timestamp: new Date().toISOString(),
          action: 'MANUAL_CASE_INITIALIZATION',
          authorizedBy: `${session.name} (${session.badge})`,
          orderReference: caseNumber,
        },
      ],
    };

    try {
      setIsLoading(true);
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCasePayload),
      });

      let savedCase = newCasePayload;
      if (res.ok) {
        const data = await res.json();
        savedCase = data.case || newCasePayload;
      }

      onSelectCase(enrichCaseWithAlgorithms(savedCase));
      setFeedbackMsg(`Successfully created and initialized Case: ${savedCase.title}`);
      loadCases();

      setTimeout(() => {
        onClose();
        setFeedbackMsg('');
      }, 900);
    } catch (err: any) {
      console.error('Error creating case:', err);
      // Fallback local update
      onSelectCase(enrichCaseWithAlgorithms(newCasePayload));
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCases = casesList.filter(c =>
    (c.title + c.caseNumber + c.jurisdiction + c.primaryTenant)
      .toLowerCase()
      .includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-blue-900/40 border border-blue-600/60 flex items-center justify-center text-blue-400">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-mono font-bold text-white tracking-wide">
                  TRINETRA CASE REGISTRY & CREATION HUB
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-blue-950 text-blue-400 border border-blue-800">
                  PERSISTENT DB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage law enforcement investigations, create clean slate files, or switch reference cases.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 pt-2">
          <button
            onClick={() => setActiveTab('REGISTRY')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all border-b-2 ${
              activeTab === 'REGISTRY'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Active Case Registry ({casesList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CREATE_NEW')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all border-b-2 ${
              activeTab === 'CREATE_NEW'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderPlus className="w-4 h-4" />
            <span>Register New Case (Clean Slate)</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {activeTab === 'REGISTRY' && (
            <div className="space-y-4">
              {/* Search & Actions Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    placeholder="Search by FIR, Title, District..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={() => setActiveTab('CREATE_NEW')}
                  className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>Create New Investigation File</span>
                </button>
              </div>

              {/* Cases Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCases.map(c => {
                  const isCurrent = c.id === activeCase.id;
                  const isBenchmark = c.id === BENCHMARK_CASE_2008.id;

                  return (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold bg-slate-900 border border-slate-700 text-slate-300">
                            {c.caseNumber || 'NO-FIR'}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            {isBenchmark && (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                                BENCHMARK
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                              {c.primaryTenant}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-sm font-semibold text-white mb-1 line-clamp-1">{c.title}</h3>
                        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.description}</p>

                        <div className="grid grid-cols-3 gap-2 py-2 mb-3 bg-slate-900/80 rounded-lg px-2 border border-slate-800/80 text-center font-mono text-[11px]">
                          <div>
                            <span className="text-slate-500 block text-[9px]">SUSPECTS</span>
                            <span className="font-bold text-slate-200">{c.nodeCount ?? c.nodes?.length ?? 0}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">LINKS</span>
                            <span className="font-bold text-slate-200">{c.linkCount ?? c.links?.length ?? 0}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px]">EVIDENCE</span>
                            <span className="font-bold text-slate-200">{c.evidenceCount ?? c.evidenceVault?.length ?? 0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                        <span className="text-[10px] font-mono text-slate-500">
                          {c.jurisdiction ? c.jurisdiction.slice(0, 24) : 'General Jurisdiction'}
                        </span>
                        {isCurrent ? (
                          <span className="px-3 py-1 bg-blue-900/60 text-blue-300 rounded text-xs font-mono font-bold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ACTIVE CASE</span>
                          </span>
                        ) : (
                          <button
                            onClick={() => handleSwitchCase(c.id)}
                            disabled={isLoading}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-mono transition-colors flex items-center space-x-1"
                          >
                            <span>Open Case →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredCases.length === 0 && (
                <div className="text-center py-8 text-slate-500 font-mono text-xs">
                  No registered cases found matching your search.
                </div>
              )}
            </div>
          )}

          {activeTab === 'CREATE_NEW' && (
            <form onSubmit={handleCreateCaseSubmit} className="space-y-4">
              <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-lg text-xs text-blue-300 font-mono flex items-center space-x-2">
                <FolderPlus className="w-4 h-4 shrink-0 text-blue-400" />
                <span>
                  Initializing a new case creates a clean slate. You will be able to manually enter suspect entities,
                  communications links, cell tower telemetry, and evidence files.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Case Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Case Title / Operation Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Operation Chakra: Inter-State Hawala & Cyber Extortion Syndicate"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* FIR Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    FIR / Crime Register (CR) Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={caseNumber}
                    onChange={e => setCaseNumber(e.target.value)}
                    placeholder="e.g. FIR No. 182/2026, Station Cyber"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Crime Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Primary Crime Category</label>
                  <select
                    value={crimeCategory}
                    onChange={e => setCrimeCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Terrorism & UAPA Special Act">Terrorism & UAPA Special Act</option>
                    <option value="Cyber Syndicate & Financial Fraud">Cyber Syndicate & Financial Fraud</option>
                    <option value="Hawala & PMLA Laundering Chain">Hawala & PMLA Laundering Chain</option>
                    <option value="Narcotics & NDPS Inter-State Ring">Narcotics & NDPS Inter-State Ring</option>
                    <option value="Organized Homicide & Extortion">Organized Homicide & Extortion</option>
                    <option value="Armed Bank Robbery & Firearms Trafficking">
                      Armed Bank Robbery & Firearms Trafficking
                    </option>
                    <option value="Kidnapping & Hostage Ransom">Kidnapping & Hostage Ransom</option>
                  </select>
                </div>

                {/* Primary Tenant Agency */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Primary Investigating Agency</label>
                  <select
                    value={primaryTenant}
                    onChange={e => setPrimaryTenant(e.target.value as AgencyType)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="POLICE">State Police Department / Local Commissionerate (All States & UTs)</option>
                    <option value="CID">State CID Crime Branch</option>
                    <option value="CBI">Central Bureau of Investigation (CBI)</option>
                    <option value="NIA">National Investigation Agency (NIA)</option>
                  </select>
                </div>

                {/* Security Classification */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Security Classification</label>
                  <select
                    value={classification}
                    onChange={e => setClassification(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="TOP_SECRET">TOP SECRET (High Operational Opsec)</option>
                    <option value="SECRET">SECRET (State Inter-Agency Sharing)</option>
                    <option value="RESTRICTED">RESTRICTED (Station Personnel)</option>
                  </select>
                </div>

                {/* Jurisdiction / Station */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Jurisdiction & Police Station</label>
                  <input
                    type="text"
                    value={jurisdiction}
                    onChange={e => setJurisdiction(e.target.value)}
                    placeholder="e.g. Crime Branch Sector 1, Ahmedabad"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Incident Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Incident Date / Reporting Date</label>
                  <input
                    type="date"
                    value={incidentDate}
                    onChange={e => setIncidentDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Lead Investigator */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Assigned Lead Investigator</label>
                  <input
                    type="text"
                    value={leadInvestigator}
                    onChange={e => setLeadInvestigator(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Narrative Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Incident Synopsis / First Information Narrative
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Enter key details of the complaint, initial intelligence reports, or criminal conspiracy overview..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTRY')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>INITIALIZE REGISTERED INVESTIGATION FILE →</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
