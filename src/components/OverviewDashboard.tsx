import React, { useState } from 'react';
import {
  AlertTriangle,
  Radio,
  FileCheck2,
  Clock,
  Send,
  PlusCircle,
  TrendingUp,
  Cpu,
  Layers,
  MapPin,
  Car,
  PhoneCall,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { CaseData, UserSession, OperationalTicket } from '../types';
import { AGENCY_CONFIGS } from '../data/authData';

interface OverviewDashboardProps {
  currentCase: CaseData;
  session: UserSession;
  onNavigateToTab?: (tab: string) => void;
  onSelectPattern?: (pat: any) => void;
  onUpdateTicketStatus?: (ticketId: string, status: OperationalTicket['status']) => void;
  onCreateTicket?: (ticket: Omit<OperationalTicket, 'id' | 'createdAt'>) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  currentCase,
  session,
  onNavigateToTab,
  onSelectPattern,
  onUpdateTicketStatus,
  onCreateTicket,
}) => {
  const agencyConfig = AGENCY_CONFIGS[session.agency];
  const isLeadOrAdmin = session.role === 'LEAD_INVESTIGATOR' || session.role === 'DEPT_ADMIN';

  const navigateTo = (tabName: string) => {
    if (onNavigateToTab) {
      onNavigateToTab(tabName);
    } else if (onSelectPattern) {
      onSelectPattern(tabName);
    }
  };

  // State for new ticket modal
  const [showNewTicketModal, setShowNewTicketModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newRole, setNewRole] = useState<'CYBER_PERSONNEL' | 'FORENSIC_PERSONNEL' | 'FIELD_BEAT_OFFICER'>('CYBER_PERSONNEL');
  const [newAssignedTo, setNewAssignedTo] = useState('Sub-Inspector V. Kulkarni');
  const [newPriority, setNewPriority] = useState<'IMMEDIATE' | 'HIGH' | 'ROUTINE'>('IMMEDIATE');
  const [newDeadline, setNewDeadline] = useState('Within 4 Hours');
  const [newDetails, setNewDetails] = useState('');

  const handleCreateTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;
    if (onCreateTicket) {
      onCreateTicket({
        title: newTitle,
        assignedRole: newRole,
        assignedToName: newAssignedTo,
        agency: session.agency,
        priority: newPriority,
        status: 'PENDING',
        details: newDetails,
        deadline: newDeadline,
      });
    }
    setShowNewTicketModal(false);
    setNewTitle('');
    setNewDetails('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner: Real-World Benchmark Case Card */}
      <div className="relative overflow-hidden rounded-xl bg-slate-900/90 border border-slate-800 p-5 backdrop-blur-md shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-950 text-red-300 border border-red-800">
                BENCHMARK: 2008 AHMEDABAD SERIAL BOMBINGS
              </span>
              <span className="text-slate-500 text-xs font-mono">•</span>
              <span className="text-slate-400 text-xs font-mono">
                {currentCase.nodes.length} Entities • {currentCase.links.length} Relations • {currentCase.evidenceVault.length} Exhibits
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {currentCase.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 max-w-3xl leading-relaxed">
              {currentCase.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => onNavigateToTab('graph')}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg shadow-blue-600/20 transition-all"
            >
              <Cpu className="w-4 h-4" />
              <span>Launch Graph Canvas</span>
            </button>
            <button
              onClick={() => onNavigateToTab('geomatrix')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors border border-slate-700"
            >
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Geospatial Matrix (GIS)</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Architectural Pipeline Visualization (from PDF page 4) */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-mono text-blue-400 mb-1">
              <Car className="w-3.5 h-3.5" />
              <span className="font-bold">1. Cross-Border Silos</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Correlated inter-state vehicle theft FIRs with blast site car bomb forensic triggers in seconds.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 mb-1">
              <PhoneCall className="w-3.5 h-3.5" />
              <span className="font-bold">2. Burner Swap Radar</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hardware IMEI 490154203237510 linked across 6 mobile numbers over 72 hrs.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-mono text-purple-400 mb-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span className="font-bold">3. Brandes Centrality</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Surfaced hidden lieutenant Sajid @ Bilal (Cut-Vertex) despite only 2 operational calls.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center space-x-2 text-xs font-mono text-emerald-400 mb-1">
              <FileCheck2 className="w-3.5 h-3.5" />
              <span className="font-bold">4. Sec 65B Legal Dossier</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Produced SHA-256 tamper-evident certified evidence annexure for judicial trial.
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Algorithmic Pattern Engine Alerts + Threat Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Algorithmic Alerts */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                Algorithmic Threat Radar ({currentCase.patterns.length} Flagged Patterns)
              </h2>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              LIVE AUTOMATED CORRELATION
            </span>
          </div>

          <div className="space-y-3">
            {currentCase.patterns.map(pattern => (
              <div
                key={pattern.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded border ${
                        pattern.severity === 'CRITICAL'
                          ? 'bg-red-950 text-red-300 border-red-700 animate-pulse'
                          : 'bg-amber-950 text-amber-300 border-amber-700'
                      }`}
                    >
                      {pattern.severity}
                    </span>
                    <span className="text-xs font-bold text-white tracking-tight">{pattern.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {pattern.type}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {pattern.description}
                </p>

                <div className="mt-3 p-2.5 rounded bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono">
                  <div className="text-amber-400 flex items-start space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span><b>Actionable Lead:</b> {pattern.actionableLead}</span>
                  </div>
                  <button
                    onClick={() => onNavigateToTab('graph')}
                    className="shrink-0 text-blue-400 hover:text-blue-300 underline text-[10px]"
                  >
                    View in Graph →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 5 Cols: "Request More Data" Ticketing Loop */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-white">
                "Request More Data" Task Loop
              </h2>
            </div>
            {isLeadOrAdmin && (
              <button
                onClick={() => setShowNewTicketModal(true)}
                className="text-xs font-mono text-blue-400 hover:text-blue-300 flex items-center space-x-1 bg-blue-950/60 border border-blue-800 px-2 py-1 rounded transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Dispatch Task</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-400">
            Lead Investigators issue targeted task orders to specialized units (Cyber, Forensics, Field Beat Officers).
          </p>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {currentCase.tickets.map(ticket => {
              const isFulfilled = ticket.status === 'FULFILLED';
              const isPending = ticket.status === 'PENDING';
              return (
                <div
                  key={ticket.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-white line-clamp-1">{ticket.title}</span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        isFulfilled
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : isPending
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-blue-950 text-blue-300 border border-blue-800'
                      }`}
                    >
                      {ticket.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-300">{ticket.details}</p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span>{ticket.assignedToName} ({ticket.assignedRole.replace('_', ' ')})</span>
                    </div>
                    <span className="text-amber-400 font-bold">{ticket.deadline}</span>
                  </div>

                  {ticket.completionNotes && (
                    <div className="p-2 rounded bg-emerald-950/40 border border-emerald-900/60 text-[11px] text-emerald-300 flex items-start space-x-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span><b>Finding:</b> {ticket.completionNotes}</span>
                    </div>
                  )}

                  {/* Actions for changing status */}
                  <div className="flex items-center justify-end space-x-2 pt-1 text-[10px] font-mono">
                    {ticket.status !== 'FULFILLED' && (
                      <button
                        onClick={() => onUpdateTicketStatus(ticket.id, 'FULFILLED')}
                        className="px-2 py-0.5 rounded bg-emerald-900/50 hover:bg-emerald-800 text-emerald-200 border border-emerald-700 transition-colors"
                      >
                        Mark Fulfilled
                      </button>
                    )}
                    {ticket.status === 'PENDING' && (
                      <button
                        onClick={() => onUpdateTicketStatus(ticket.id, 'IN_PROGRESS')}
                        className="px-2 py-0.5 rounded bg-blue-900/50 hover:bg-blue-800 text-blue-200 border border-blue-700 transition-colors"
                      >
                        Start Progress
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewTicketModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white text-sm flex items-center space-x-2">
                <Send className="w-4 h-4 text-blue-400" />
                <span>Issue "Request More Data" Operational Ticket</span>
              </h3>
              <button
                onClick={() => setShowNewTicketModal(false)}
                className="text-slate-400 hover:text-white text-xs font-mono"
              >
                ✕ CLOSE
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-mono mb-1">Task Directive Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Subpoena Tower Dump for Surat Varachha BTS"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-mono mb-1">Target Personnel Role</label>
                  <select
                    value={newRole}
                    onChange={e => {
                      const role = e.target.value as any;
                      setNewRole(role);
                      if (role === 'CYBER_PERSONNEL') setNewAssignedTo('Sub-Inspector V. Kulkarni');
                      else if (role === 'FORENSIC_PERSONNEL') setNewAssignedTo('Dr. M. Parikh');
                      else setNewAssignedTo('Head Constable D. Jadeja');
                    }}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  >
                    <option value="CYBER_PERSONNEL">Cyber / Telecom Personnel</option>
                    <option value="FORENSIC_PERSONNEL">Forensic Lab Personnel</option>
                    <option value="FIELD_BEAT_OFFICER">Field Beat Officer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-mono mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  >
                    <option value="IMMEDIATE">Immediate (Red Alert)</option>
                    <option value="HIGH">High Priority</option>
                    <option value="ROUTINE">Routine Follow-up</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Assigned POC Name</label>
                <input
                  type="text"
                  value={newAssignedTo}
                  onChange={e => setNewAssignedTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Deadline / Operational Turnaround</label>
                <input
                  type="text"
                  value={newDeadline}
                  onChange={e => setNewDeadline(e.target.value)}
                  placeholder="e.g. Within 2 Hours / By 18:00 hrs"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-mono mb-1">Detailed Operational Directive</label>
                <textarea
                  rows={3}
                  required
                  value={newDetails}
                  onChange={e => setNewDetails(e.target.value)}
                  placeholder="Specify Exhibit references, tower azimuths, or physical addresses to investigate..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowNewTicketModal(false)}
                  className="px-3 py-2 bg-slate-800 text-slate-300 rounded font-mono text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-mono text-xs font-bold"
                >
                  Dispatch to POC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
