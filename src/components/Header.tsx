import React from 'react';
import {
  Shield,
  ShieldCheck,
  Activity,
  GitGraph,
  MapPin,
  Bot,
  FileText,
  UploadCloud,
  LogOut,
  Camera,
  ChevronDown,
  Lock,
  Flame,
  Archive,
  ArrowUpRight,
  Trash2,
  FolderOpen,
  Plus,
} from 'lucide-react';
import { UserSession, CaseData } from '../types';
import { AGENCY_CONFIGS, PRESET_OFFICERS } from '../data/authData';

interface HeaderProps {
  session: UserSession;
  currentCase: CaseData | null;
  casesList?: CaseData[];
  onSelectCase?: (caseItem: CaseData) => void;
  onDeleteCase?: (caseNumber: string) => void;
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onTabChange?: (tab: string) => void;
  onLogout: () => void;
  onSwitchOfficer?: (officer: any) => void;
  onOpenEscalationModal: () => void;
  onOpenArchiveModal?: () => void;
  onOpenIntakeModal?: () => void;
  inactivitySeconds?: number;
}

export const Header: React.FC<HeaderProps> = ({
  session,
  currentCase,
  casesList = [],
  onSelectCase,
  onDeleteCase,
  activeTab,
  setActiveTab,
  onTabChange,
  onLogout,
  onSwitchOfficer,
  onOpenEscalationModal,
  onOpenArchiveModal,
  onOpenIntakeModal,
  inactivitySeconds,
}) => {
  const agencyConfig = AGENCY_CONFIGS[session.agency];
  const isCbiTakeover = currentCase?.status === 'CBI_CENTRAL_TAKEOVER';
  const [showCaseDropdown, setShowCaseDropdown] = React.useState(false);
  const [showDeletePositionConfirm, setShowDeletePositionConfirm] = React.useState(false);

  const switchTab = (tabId: string) => {
    if (setActiveTab) setActiveTab(tabId);
    if (onTabChange) onTabChange(tabId);
  };

  // Define accessible tabs based on role matrix in Blueprint
  const getTabs = () => {
    switch (session.role) {
      case 'FORENSIC_PERSONNEL':
        return [
          { id: 'FORENSIC_VAULT', label: 'Forensic Vault & Upload', icon: UploadCloud },
          { id: 'OVERVIEW', label: 'Case Brief', icon: Activity },
          { id: 'COURT_DOSSIER', label: 'Sec 65B Dossier', icon: FileText },
        ];
      case 'FIELD_BEAT_OFFICER':
        return [
          { id: 'FIELD_MOBILE', label: 'Field Beat Interface', icon: Camera },
          { id: 'OVERVIEW', label: 'Case Brief', icon: Activity },
          { id: 'GEOSPATIAL', label: 'Area Grid (GIS)', icon: MapPin },
        ];
      case 'CYBER_PERSONNEL':
        return [
          { id: 'OVERVIEW', label: 'Case Overview', icon: Activity },
          { id: 'STREAMER', label: '15GB Streamer & Ingestion', icon: UploadCloud },
          { id: 'GRAPH_CANVAS', label: 'Graph Canvas & Centrality', icon: GitGraph },
          { id: 'GEOSPATIAL', label: 'Geospatial Matrix (GIS)', icon: MapPin },
          { id: 'SAHAYAK_AI', label: 'SAHAYAK AI', icon: Bot },
        ];
      case 'DEPT_ADMIN':
        return [
          { id: 'ADMIN_PORTAL', label: 'Admin Command & Clearance', icon: ShieldCheck },
          { id: 'OVERVIEW', label: 'Command Overview', icon: Activity },
          { id: 'GRAPH_CANVAS', label: 'Graph Intelligence', icon: GitGraph },
          { id: 'GEOSPATIAL', label: 'Geospatial Matrix (GIS)', icon: MapPin },
          { id: 'SAHAYAK_AI', label: 'SAHAYAK AI', icon: Bot },
          { id: 'COURT_DOSSIER', label: 'Sec 65B Dossier', icon: FileText },
        ];
      case 'LEAD_INVESTIGATOR':
      default:
        return [
          { id: 'ADMIN_PORTAL', label: 'Admin Page', icon: ShieldCheck },
          { id: 'OVERVIEW', label: 'Command Overview', icon: Activity },
          { id: 'GRAPH_CANVAS', label: 'Graph Canvas & Centrality', icon: GitGraph },
          { id: 'GEOSPATIAL', label: 'Geospatial Matrix (GIS)', icon: MapPin },
          { id: 'SAHAYAK_AI', label: 'SAHAYAK AI Assistant', icon: Bot },
          { id: 'STREAMER', label: '15GB Streamer', icon: UploadCloud },
          { id: 'FORENSIC_VAULT', label: 'Forensic Vault', icon: UploadCloud },
          { id: 'FIELD_MOBILE', label: 'Field Mobile', icon: Camera },
          { id: 'COURT_DOSSIER', label: 'Sec 65B Court Dossier', icon: FileText },
        ];
    }
  };

  const tabs = getTabs();

  return (
    <header
      className="w-full border-b border-slate-800 backdrop-blur-md sticky top-0 z-40 transition-colors"
      style={{
        backgroundColor: `${agencyConfig.accentHex}18`,
        borderBottomColor: `${agencyConfig.accentHex}60`,
      }}
    >
      {/* Top Utility Bar */}
      <div className="px-4 lg:px-6 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-3">
          <div
            className="h-7 w-7 rounded-md flex items-center justify-center font-bold text-white shadow"
            style={{ backgroundColor: agencyConfig.accentHex }}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono font-black tracking-wider text-slate-100 uppercase">
                TRINETRA // {agencyConfig.code}
              </span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border"
                style={{
                  backgroundColor: `${agencyConfig.accentHex}30`,
                  borderColor: agencyConfig.accentHex,
                  color: agencyConfig.accentHex === '#334155' ? '#cbd5e1' : '#f8fafc',
                }}
              >
                {agencyConfig.name}
              </span>
              {isCbiTakeover && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-700 flex items-center space-x-1 animate-pulse">
                  <Lock className="w-3 h-3" />
                  <span>CBI CENTRAL TAKEOVER ACTIVE</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Case Bar */}
        <div className="relative flex items-center space-x-2 font-mono text-[11px]">
          <span className="text-slate-400">ACTIVE CASE:</span>
          {currentCase ? (
            <>
              <button
                onClick={() => setShowCaseDropdown(prev => !prev)}
                className="flex items-center space-x-1.5 font-bold text-white bg-slate-900/90 hover:bg-slate-800 px-2.5 py-1 rounded border border-slate-700 transition-all cursor-pointer shadow-sm"
                title="Click to view all cases or switch active case"
              >
                <span>{currentCase.caseNumber}</span>
                {casesList && casesList.length > 1 && (
                  <span className="text-[9px] bg-blue-900/80 text-blue-300 px-1.5 py-0.2 rounded border border-blue-700">
                    {casesList.length} CASES
                  </span>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <span
                className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                  currentCase.status === 'CBI_CENTRAL_TAKEOVER'
                    ? 'bg-blue-900 text-blue-200 border border-blue-600'
                    : currentCase.status === 'ESCALATED_CID'
                    ? 'bg-slate-800 text-slate-300 border border-slate-600'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                }`}
              >
                {currentCase.status.replace('_', ' ')}
              </span>

              {onOpenIntakeModal && (
                <button
                  onClick={onOpenIntakeModal}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center space-x-1 transition-all shadow-sm cursor-pointer"
                  title="Upload or Batch Ingest Case Dossiers"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span className="hidden sm:inline">Upload / Batch Cases</span>
                </button>
              )}

              {/* Case Switcher Dropdown */}
              {showCaseDropdown && casesList && casesList.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-96 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-3 z-50">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span>CASE REPOSITORY ({casesList.length})</span>
                    </div>
                    {onOpenIntakeModal && (
                      <button
                        onClick={() => {
                          setShowCaseDropdown(false);
                          onOpenIntakeModal();
                        }}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center space-x-1 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Upload New Case</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                    {casesList.map(c => {
                      const isActive = c.caseNumber === currentCase.caseNumber;
                      return (
                        <div
                          key={c.caseNumber}
                          className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                            isActive
                              ? 'bg-blue-950/60 border-blue-600 text-white shadow-sm'
                              : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:border-slate-700'
                          }`}
                        >
                          <button
                            onClick={() => {
                              if (onSelectCase) onSelectCase(c);
                              setShowCaseDropdown(false);
                            }}
                            className="flex-1 text-left mr-2 cursor-pointer"
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-bold font-mono text-slate-100">{c.caseNumber}</span>
                              {isActive && (
                                <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.2 rounded font-bold">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[240px]">
                              {c.title}
                            </div>
                            <div className="text-[9px] text-slate-500 mt-0.5 flex items-center space-x-2 font-mono">
                              <span>{c.nodes?.length || 0} entities</span>
                              <span>•</span>
                              <span>{c.evidenceVault?.length || 0} exhibits</span>
                            </div>
                          </button>

                          {casesList.length > 1 && onDeleteCase && !isActive && (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                onDeleteCase(c.caseNumber);
                              }}
                              className="p-1 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors"
                              title="Delete Case from Registry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-700 font-bold text-[10px] animate-pulse">
                AWAITING CASE UPLOAD
              </span>
              {onOpenIntakeModal && (
                <button
                  onClick={onOpenIntakeModal}
                  className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] flex items-center space-x-1 shadow-sm cursor-pointer"
                >
                  <UploadCloud className="w-3 h-3" />
                  <span>Upload Case Now</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* User Identity & Fast Role Switcher */}
        <div className="flex items-center space-x-3">
          <div className="relative group">
            <button
              className="flex items-center space-x-2 px-2.5 py-1 rounded bg-slate-900/90 border border-slate-700 hover:border-slate-500 transition-colors text-left"
              title="Click to switch role or agency persona"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: agencyConfig.accentHex }}
              />
              <div className="font-mono text-xs">
                <span className="font-bold text-slate-200">{session.name}</span>
                <span className="text-[10px] text-slate-400 ml-1.5">
                  ({session.role.replace('_', ' ')})
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Dropdown for active officer credentials */}
            <div className="absolute right-0 mt-1 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-2.5 z-50 hidden group-hover:block hover:block">
              <div className="text-[10px] font-mono text-slate-400 px-2 py-1 uppercase tracking-wider border-b border-slate-800 mb-2">
                Active Officer Profile
              </div>
              <div className="p-2 bg-slate-950/80 rounded border border-slate-800 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">OFFICER:</span>
                  <span className="font-bold text-white">{session.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">GOV ID:</span>
                  <span className="font-bold text-blue-400">{session.govId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">RANK:</span>
                  <span className="text-slate-200">{session.rank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">BADGE:</span>
                  <span className="text-emerald-400">{session.badge}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">AGENCY:</span>
                  <span className="text-amber-400">{session.agency} ({agencyConfig.code})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ROLE:</span>
                  <span className="text-slate-300">{session.role.replace('_', ' ')}</span>
                </div>
                {session.state && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">STATE / UT:</span>
                    <span className="text-amber-300 font-bold flex items-center">
                      <MapPin className="w-2.5 h-2.5 mr-0.5" />
                      {session.state}
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-2 border-t border-slate-800 mt-2 space-y-1.5">
                <button
                  onClick={onLogout}
                  className="w-full py-1.5 px-2 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 rounded text-xs font-mono flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-blue-400" />
                  <span>Logout / Switch Position</span>
                </button>
                {showDeletePositionConfirm ? (
                  <div className="p-2.5 bg-red-950/90 border border-red-800 rounded text-xs font-mono space-y-2">
                    <div className="text-red-200 font-bold text-[11px]">
                      Delete position profile for {session.name}?
                    </div>
                    <p className="text-[10px] text-red-300 leading-snug">
                      Permanently removes this profile from the TRINETRA database. You will be logged out.
                    </p>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => setShowDeletePositionConfirm(false)}
                        className="flex-1 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            await fetch(`/api/auth/users/${encodeURIComponent(session.id || session.govId)}`, { method: 'DELETE' });
                          } catch (e) {
                            console.error('Delete position error', e);
                          }
                          onLogout();
                        }}
                        className="flex-1 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowDeletePositionConfirm(true)}
                    className="w-full py-1.5 px-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-900/60 rounded text-[11px] font-mono flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    <span>Delete This Position Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Inactivity countdown display */}
          {typeof inactivitySeconds === 'number' && (
            <div
              className={`hidden md:flex items-center space-x-1.5 font-mono text-[11px] px-2 py-1 rounded border ${
                inactivitySeconds < 30
                  ? 'bg-red-950/80 text-red-300 border-red-700 animate-pulse'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
              title="Automatic session lockout upon 120s of inactivity"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>LOCK: {inactivitySeconds}s</span>
            </div>
          )}

          {/* Admin Command Portal quick button */}
          <button
            onClick={() => switchTab('ADMIN_PORTAL')}
            className={`px-2.5 py-1 rounded text-xs font-mono flex items-center space-x-1.5 transition-colors ${
              activeTab === 'ADMIN_PORTAL'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-500/40'
            }`}
            title="Department Administrator Command Portal & Clearance Queue"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Admin Page</span>
          </button>

          {/* Migration Engine & Cold Storage Trigger Buttons */}
          <button
            onClick={onOpenEscalationModal}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            title="Multi-Tenant Case Escalation & CBI Takeover Engine"
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Case Escalation</span>
          </button>

          <button
            onClick={() => {
              if (onOpenArchiveModal) {
                onOpenArchiveModal();
              } else {
                if (!currentCase) return;
                // Download active case as JSON
                const blob = new Blob([JSON.stringify(currentCase, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `TRINETRA_CASE_${currentCase.caseNumber}_ENCRYPTED_BACKUP.json`;
                a.click();
                URL.revokeObjectURL(url);
              }
            }}
            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-mono flex items-center space-x-1.5 transition-colors"
            title="Cold Storage & Portable Archival (Encrypted JSON Backup/Restore)"
          >
            <Archive className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Archive</span>
          </button>

          <button
            onClick={onLogout}
            className="p-1.5 rounded bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-400 border border-slate-700 hover:border-red-800 transition-colors"
            title="Lock session & drop back to VPN tunnel"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="px-4 lg:px-6 flex items-center space-x-1 overflow-x-auto scrollbar-none py-1.5">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-mono tracking-wide transition-all shrink-0 ${
                isActive
                  ? 'text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
              style={{
                backgroundColor: isActive ? agencyConfig.accentHex : 'transparent',
              }}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
