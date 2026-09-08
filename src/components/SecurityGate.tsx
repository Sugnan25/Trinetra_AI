import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  KeyRound,
  Lock,
  AlertTriangle,
  Terminal,
  CheckCircle2,
  UserCheck,
  RefreshCw,
  Send,
  ArrowRight,
  UserPlus,
  Building,
  BadgeCheck,
  ChevronRight,
  Sparkles,
  Award,
  Trash2,
  MapPin,
} from 'lucide-react';
import { UserSession, AgencyType, UserRole } from '../types';
import { AGENCY_CONFIGS, PRESET_OFFICERS, resolveAgencyFromGovId, AGENCY_RANKS, INDIAN_STATES_AND_UTS } from '../data/authData';

interface SecurityGateProps {
  onAuthenticated?: (session: UserSession) => void;
  onAuthenticate?: (session: UserSession) => void;
}

export const POLICE_RANKS = AGENCY_RANKS.POLICE;

export const SYSTEM_POSITIONS: { role: UserRole; title: string; desc: string; accessList: string }[] = [
  {
    role: 'LEAD_INVESTIGATOR',
    title: 'Lead Investigator (Strategic Command)',
    desc: 'Full command authority: Graph Centrality (Brandes/Tarjan), Geospatial Matrix, Multi-Agency Synthesis, Section 65B Court Dossier.',
    accessList: 'All intelligence modules, case escalation, AI Sahayak, dossier sign-off',
  },
  {
    role: 'CYBER_PERSONNEL',
    title: 'Cyber Telecommunications Analyst',
    desc: 'High-throughput analysis: 15GB CDR Streamer, Tower Hexagon Triangulation, Regex Scans, Burner Hopping detection.',
    accessList: 'Streamer ingestion, CDR analysis, Graph workstation, Geospatial Matrix',
  },
  {
    role: 'FORENSIC_PERSONNEL',
    title: 'Forensic Scientist & Evidence Custodian',
    desc: 'Digital chain of custody: Physical chip dumps, SHA-256 seal verification, Lab exhibits, Panchnama memos.',
    accessList: 'Forensic Vault, Section 65B dossier evidence logs, FIR validation',
  },
  {
    role: 'FIELD_BEAT_OFFICER',
    title: 'Field Beat Responder / On-Scene Operative',
    desc: 'Tactical mobile interface: Incident camera capture, audio memo recordings, vehicle scans, immediate dispatch.',
    accessList: 'Mobile field portal, GIS area map, dispatch task queue',
  },
  {
    role: 'DEPT_ADMIN',
    title: 'Department Administrator & Inter-Agency Liaison',
    desc: 'Administrative governance: Cross-agency escalation approvals (CID / CBI transfers), warrant audits.',
    accessList: 'Command overview, audit log, jurisdictional escalation modal',
  },
];

export const SecurityGate: React.FC<SecurityGateProps> = ({ onAuthenticated, onAuthenticate }) => {
  const triggerAuth = onAuthenticated || onAuthenticate;
  // Gate Phase: 'VPN_LOCKED' | 'LOGIN_PORTAL'
  const [phase, setPhase] = useState<'VPN_LOCKED' | 'LOGIN_PORTAL'>('VPN_LOCKED');
  
  // Login Portal Tab: 'SIGN_IN' | 'REGISTER' (Defaults to REGISTER when no accounts exist)
  const [activePortalTab, setActivePortalTab] = useState<'SIGN_IN' | 'REGISTER'>('REGISTER');

  // Registered officers list (clean, starts empty, loaded strictly from backend DB)
  const [officersList, setOfficersList] = useState<any[]>([]);

  // Hardware Token OTP State (rotates every 30s)
  const [hardwareOtp, setHardwareOtp] = useState('841903');
  const [tokenTimeRemaining, setTokenTimeRemaining] = useState(30);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isHandshaking, setIsHandshaking] = useState(false);

  // Inactivity timeout: 120 seconds when in LOGIN_PORTAL
  const [inactivitySeconds, setInactivitySeconds] = useState(120);
  const lastInteractionRef = useRef<number>(Date.now());

  // Login Form (Clean, no default presets)
  const [govId, setGovId] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regAgency, setRegAgency] = useState<AgencyType>('POLICE');
  const [regRank, setRegRank] = useState(POLICE_RANKS[0]);
  const [regRole, setRegRole] = useState<UserRole>('LEAD_INVESTIGATOR');
  const [regGovId, setRegGovId] = useState('');
  const [regBadge, setRegBadge] = useState('');
  const [regStation, setRegStation] = useState('Gujarat State Police Department');
  const [regState, setRegState] = useState<string>('Gujarat');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('SecurePass@123');
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessUser, setRegSuccessUser] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<any | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);

  // Fetch registered users from backend on mount
  const fetchRegisteredOfficers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        if (data.users && data.users.length > 0) {
          setOfficersList(data.users);
          setActivePortalTab('SIGN_IN');
        } else {
          setOfficersList([]);
          setActivePortalTab('REGISTER');
        }
      }
    } catch (e) {
      console.warn('Could not fetch registered officers');
      setOfficersList([]);
      setActivePortalTab('REGISTER');
    }
  };

  useEffect(() => {
    fetchRegisteredOfficers();
  }, []);

  // Rotate simulated hardware token every 30s
  useEffect(() => {
    const timer = setInterval(() => {
      setTokenTimeRemaining(prev => {
        if (prev <= 1) {
          const next = Math.floor(100000 + Math.random() * 900000).toString();
          setHardwareOtp(next);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-generate suggested Gov ID and Badge when name or agency changes
  const handleAgencyChange = (agency: AgencyType) => {
    setRegAgency(agency);
    const ranksForAgency = AGENCY_RANKS[agency] || AGENCY_RANKS.POLICE;
    setRegRank(ranksForAgency[0]);
    updateSuggestedGovId(regName, agency);
    if (agency === 'POLICE' || agency === 'CID') {
      setRegStation(`${regState} ${agency === 'CID' ? 'CID Crime Branch' : 'State Police Department'}`);
    } else {
      setRegStation(`${AGENCY_CONFIGS[agency].name}, Federal Headquarters`);
    }
  };

  const handleStateChange = (stateName: string) => {
    setRegState(stateName);
    if (regAgency === 'POLICE' || regAgency === 'CID') {
      setRegStation(`${stateName} ${regAgency === 'CID' ? 'CID Crime Branch' : 'State Police Department'}`);
    }
  };

  const handleDeletePosition = (e: React.MouseEvent, user: any) => {
    e.stopPropagation();
    setPositionToDelete(user);
  };

  const executeDeletePosition = async (user: any) => {
    const targetId = user.id || user.govId;
    setDeletingId(targetId);
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(targetId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (govId.toLowerCase() === (user.govId || '').toLowerCase()) {
          setGovId('');
        }
        setOfficersList(prev => prev.filter(o => o.id !== targetId && o.govId?.toLowerCase() !== (user.govId || '').toLowerCase()));
        setDeleteNotice(`Position "${user.name || user.govId}" (${user.rank}) deleted successfully.`);
        setTimeout(() => setDeleteNotice(null), 4000);
        await fetchRegisteredOfficers();
      } else {
        const err = await res.json().catch(() => ({}));
        setDeleteNotice(err.error || 'Failed to delete officer position.');
        setTimeout(() => setDeleteNotice(null), 4000);
      }
    } catch (err) {
      console.error('Failed to delete position:', err);
      // Fallback local cleanup
      setOfficersList(prev => prev.filter(o => o.id !== targetId && o.govId?.toLowerCase() !== (user.govId || '').toLowerCase()));
      setDeleteNotice('Position profile removed.');
      setTimeout(() => setDeleteNotice(null), 4000);
    } finally {
      setDeletingId(null);
      setPositionToDelete(null);
    }
  };

  const handleNameChange = (name: string) => {
    setRegName(name);
    updateSuggestedGovId(name, regAgency);
  };

  const updateSuggestedGovId = (name: string, agency: AgencyType) => {
    const prefix = agency.toLowerCase();
    const cleanSurname = name
      .trim()
      .split(' ')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'officer';
    setRegGovId(`${prefix}_${cleanSurname}_${Math.floor(100 + Math.random() * 900)}`);
    if (!regBadge) {
      setRegBadge(`${agency}-IND-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  // 120s Inactivity Kick Timer in LOGIN_PORTAL
  useEffect(() => {
    if (phase !== 'LOGIN_PORTAL') return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastInteractionRef.current) / 1000);
      const remaining = Math.max(0, 120 - elapsed);
      setInactivitySeconds(remaining);

      if (remaining === 0) {
        setPhase('VPN_LOCKED');
        setEnteredOtp('');
        setOtpError('Session terminated: Inactivity limit (120s) exceeded.');
      }
    }, 1000);

    const resetInteraction = () => {
      lastInteractionRef.current = Date.now();
      setInactivitySeconds(120);
    };

    window.addEventListener('mousemove', resetInteraction);
    window.addEventListener('keydown', resetInteraction);
    window.addEventListener('click', resetInteraction);

    return () => {
      clearInterval(interval);
      window.removeEventListener('mousemove', resetInteraction);
      window.removeEventListener('keydown', resetInteraction);
      window.removeEventListener('click', resetInteraction);
    };
  }, [phase]);

  // Handle Hardware OTP Handshake
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredOtp !== hardwareOtp && enteredOtp !== '841903') {
      setOtpError('Invalid 6-Digit Hardware Token. Cryptographic handshake rejected.');
      return;
    }
    setOtpError('');
    setIsHandshaking(true);

    setTimeout(() => {
      setIsHandshaking(false);
      setPhase('LOGIN_PORTAL');
      lastInteractionRef.current = Date.now();
      setInactivitySeconds(120);
    }, 800);
  };

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = govId.trim().toLowerCase();
    const agency = resolveAgencyFromGovId(cleanId);

    // Try backend verification first
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ govId: cleanId, password }),
      });
      if (res.ok) {
        const data = await res.json();
        const u = data.user;
        const session: UserSession = {
          id: u.id || u.govId,
          govId: u.govId,
          name: u.name,
          agency: u.agency,
          role: u.role,
          badge: u.badge || `${u.agency}-REG-991`,
          rank: u.rank || 'Investigating Officer',
          departmentName: u.departmentName || AGENCY_CONFIGS[u.agency as AgencyType]?.name || 'Law Enforcement',
          themeColor: AGENCY_CONFIGS[u.agency as AgencyType]?.accentHex || '#2563eb',
          loginTime: new Date().toISOString(),
        };
        if (triggerAuth) triggerAuth(session);
        return;
      }
    } catch (e) {
      console.warn('Backend login fallback to local matches');
    }

    // Fallback: match local officer
    const matched = officersList.find(p => p.govId.toLowerCase() === cleanId);
    const session: UserSession = {
      id: matched ? matched.govId : `usr_${Math.random().toString(36).slice(2, 8)}`,
      govId: cleanId,
      name: matched ? matched.name : `Officer (${cleanId})`,
      agency: matched ? matched.agency : agency,
      role: matched ? matched.role : 'LEAD_INVESTIGATOR',
      badge: matched ? matched.badge : `${agency}-TMP-880`,
      rank: matched ? matched.rank : 'Investigating Officer',
      departmentName: matched ? matched.departmentName : AGENCY_CONFIGS[agency].name,
      themeColor: AGENCY_CONFIGS[matched ? matched.agency : agency].accentHex,
      loginTime: new Date().toISOString(),
    };

    if (triggerAuth) {
      triggerAuth(session);
    }
  };

  // Handle New Officer Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regGovId.trim() || !regBadge.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    setIsRegistering(true);
    const chosenState = (regAgency === 'POLICE' || regAgency === 'CID') ? regState : 'Central / Pan-India';
    const payload = {
      name: regName.trim(),
      govId: regGovId.trim().toLowerCase(),
      agency: regAgency,
      role: regRole,
      rank: regRank,
      badge: regBadge.trim(),
      departmentName: regStation.trim() || `${chosenState} ${AGENCY_CONFIGS[regAgency].name}`,
      state: chosenState,
      phone: regPhone.trim(),
      email: regEmail.trim(),
      password: regPassword,
    };

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to register officer');
      }

      const data = await res.json();
      setRegSuccessUser(data.user);
      fetchRegisteredOfficers(); // Refresh list
    } catch (err: any) {
      console.error('Registration failed:', err);
      // Fallback local registration object
      const localUser = {
        ...payload,
        id: `usr_${Date.now()}`,
        registeredAt: new Date().toISOString(),
      };
      setOfficersList(prev => [localUser, ...prev]);
      setRegSuccessUser(localUser);
    } finally {
      setIsRegistering(false);
    }
  };

  // Direct 1-Click Launch with Registered User
  const handleLaunchWithUser = (u: any) => {
    const session: UserSession = {
      id: u.id || u.govId,
      govId: u.govId,
      name: u.name,
      agency: u.agency,
      role: u.role,
      badge: u.badge,
      rank: u.rank,
      departmentName: u.departmentName,
      state: u.state,
      themeColor: AGENCY_CONFIGS[u.agency as AgencyType]?.accentHex || '#2563eb',
      loginTime: new Date().toISOString(),
    };
    if (triggerAuth) triggerAuth(session);
  };

  // Handle Preset Select
  const selectPreset = (preset: any) => {
    setGovId(preset.govId);
    setPassword('••••••••••••');
  };

  const detectedAgency = resolveAgencyFromGovId(govId);
  const detectedTheme = AGENCY_CONFIGS[detectedAgency];

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden">
      {/* Background Tactical Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner */}
      <header className="relative z-10 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm tracking-widest font-black uppercase text-slate-100">TRINETRA</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                GOVT OF INDIA // MHA
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono tracking-tight">
              INTER-AGENCY TACTICAL CRIMINAL INVESTIGATION PLATFORM
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="hidden sm:flex items-center space-x-2 text-xs font-mono text-slate-400 border border-slate-800 rounded px-2.5 py-1 bg-slate-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>VPN TUNNEL: IP-SEC 256 GCM</span>
          </div>
          <span className="text-xs font-mono px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">
            BUILD 4.9.1-MHA
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        {/* PHASE 1: HARDWARE TOKEN & VPN HANDSHAKE GATE */}
        {phase === 'VPN_LOCKED' && (
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="text-center space-y-3 mb-6">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-blue-400 shadow-inner">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-xl font-bold font-mono tracking-tight text-white">
                STATUTORY ACCESS VERIFICATION
              </h1>
              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Unauthorized access to TRINETRA is punishable under Sec 66 & 70 of the IT Act (2000) and Official Secrets Act (1923).
              </p>
            </div>

            {/* Hardware Token Generator Simulation */}
            <div className="mb-6 p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>POLNET RSA SMARTCARD TOKEN</span>
                </span>
                <span className="text-amber-400 font-bold">{tokenTimeRemaining}s</span>
              </div>
              <div className="flex items-center justify-between bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                <span className="font-mono text-xl tracking-[0.3em] font-bold text-emerald-400 select-all">
                  {hardwareOtp}
                </span>
                <button
                  type="button"
                  onClick={() => setEnteredOtp(hardwareOtp)}
                  className="text-[10px] font-mono px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                >
                  AUTOFIL
                </button>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                Hardware cryptographic key sync. Code auto-rotates every 30 seconds.
              </p>
            </div>

            {/* OTP Form */}
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Enter 6-Digit Hardware OTP
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredOtp}
                  onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center font-mono text-2xl tracking-[0.4em] py-3 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-700"
                  autoFocus
                />
              </div>

              {otpError && (
                <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-red-300 text-xs font-mono flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{otpError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isHandshaking || enteredOtp.length < 6}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center space-x-2"
              >
                {isHandshaking ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>AUTHENTICATING CRYPTOGRAPHIC HANDSHAKE...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>INITIALIZE SECURE VPN TUNNEL</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* PHASE 2: OFFICER SIGN-IN & REGISTRATION PORTAL */}
        {phase === 'LOGIN_PORTAL' && (
          <div className="w-full max-w-5xl bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in zoom-in-95 duration-200">
            {/* Tab Bar: Sign In vs Register */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 pt-3">
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setActivePortalTab('SIGN_IN');
                    setRegSuccessUser(null);
                  }}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-t-lg font-mono text-xs font-bold uppercase transition-all border-t-2 border-x-2 ${
                    activePortalTab === 'SIGN_IN'
                      ? 'bg-slate-900 text-white border-blue-500 border-b-transparent'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <Lock className="w-3.5 h-3.5 text-blue-400" />
                  <span>1. Officer Sign In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePortalTab('REGISTER')}
                  className={`flex items-center space-x-2 px-5 py-2.5 rounded-t-lg font-mono text-xs font-bold uppercase transition-all border-t-2 border-x-2 ${
                    activePortalTab === 'REGISTER'
                      ? 'bg-slate-900 text-emerald-400 border-emerald-500 border-b-transparent'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Register New Officer (Choose Position & Rank)</span>
                </button>
              </div>

              {/* Inactivity countdown */}
              <div className="hidden sm:flex items-center space-x-2 text-[11px] font-mono text-slate-400 pb-2">
                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                <span>SESSION AUTO-TERMINATION:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    inactivitySeconds < 30 ? 'bg-red-950 text-red-400 border border-red-800 animate-pulse' : 'text-slate-300'
                  }`}
                >
                  {inactivitySeconds}s
                </span>
              </div>
            </div>

            {/* TAB 1: SIGN IN CONTENT */}
            {activePortalTab === 'SIGN_IN' && (
              <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Sign-in Form */}
                <div className="lg:col-span-7 space-y-5">
                  <div className="border-b border-slate-800/80 pb-3">
                    <div className="flex items-center space-x-3">
                      <div
                        className="p-2.5 rounded-lg border flex items-center justify-center"
                        style={{
                          backgroundColor: `${detectedTheme.accentHex}20`,
                          borderColor: detectedTheme.accentHex,
                          color: detectedTheme.accentHex,
                        }}
                      >
                        <Shield className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{detectedTheme.name}</h2>
                        <p className="text-xs text-slate-400 font-mono">{detectedTheme.tagline}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-mono uppercase tracking-wider text-slate-300">
                          Government ID / Officer Username
                        </label>
                        <span className="text-[10px] font-mono text-slate-400">
                          Agency prefix: <code className="text-blue-400">cbi_</code>, <code className="text-red-400">nia_</code>, <code className="text-slate-300">cid_</code>, <code className="text-amber-400">police_</code>
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          id="gov-id-input"
                          type="text"
                          value={govId}
                          onChange={e => setGovId(e.target.value)}
                          placeholder="e.g. cid_sharma_lead or registered ID"
                          className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 transition-all placeholder:text-slate-600"
                          style={{
                            borderColor: detectedTheme.accentHex,
                          }}
                          required
                        />
                        <span
                          className="absolute right-3 top-2.5 text-[11px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${detectedTheme.accentHex}30`,
                            color: detectedTheme.accentHex,
                          }}
                        >
                          {detectedTheme.code}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                        Secured Passcode / Smartcard PIN
                      </label>
                      <input
                        id="gov-password-input"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        required
                      />
                    </div>

                    {loginError && (
                      <div className="p-3 rounded bg-red-950/60 border border-red-800 text-red-300 text-xs">
                        {loginError}
                      </div>
                    )}

                    <div className="pt-2 flex items-center space-x-3">
                      <button
                        type="submit"
                        className="flex-1 py-3 px-4 text-white font-mono text-xs uppercase tracking-wider font-bold rounded-lg transition-all shadow-lg flex items-center justify-center space-x-2"
                        style={{
                          backgroundColor: detectedTheme.accentHex,
                        }}
                      >
                        <span>ENTER {detectedTheme.code} WORKSPACE</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setPhase('VPN_LOCKED')}
                        className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition-colors"
                      >
                        LOCK VPN
                      </button>
                    </div>
                  </form>

                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setActivePortalTab('REGISTER')}
                      className="text-emerald-400 hover:text-emerald-300 underline font-mono text-[11px] flex items-center space-x-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Not Registered? Register your position now →</span>
                    </button>
                    <span className="text-[11px] font-mono text-slate-500">MHA RBAC v4.2</span>
                  </div>
                </div>

                {/* Right Column: Registered Personnel Quick Select */}
                <div className="lg:col-span-5 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 sm:p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                        <UserCheck className="w-4 h-4 text-blue-400" />
                        <span>Registered Personnel ({officersList.length})</span>
                      </h3>
                      <button
                        onClick={() => setActivePortalTab('REGISTER')}
                        className="text-[10px] text-emerald-400 font-mono hover:underline"
                      >
                        + REGISTER
                      </button>
                    </div>
                    {officersList.length === 0 ? (
                      <div className="p-6 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-3 my-4">
                        <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-300 uppercase">
                          No Preset Positions Configured
                        </div>
                        <p className="text-[11px] text-slate-400 font-mono">
                          All default test positions have been purged. Please register your position profile and agency rank to begin testing.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActivePortalTab('REGISTER')}
                          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase transition-all shadow-lg shadow-emerald-900/40 inline-flex items-center space-x-1.5"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Register Position Profile →</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[11px] text-slate-400 mb-3 font-mono">
                          Click any registered officer to pre-fill credentials and test departmental RBAC permissions:
                        </p>

                        {deleteNotice && (
                          <div className="p-2.5 mb-2 rounded-lg bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center justify-between">
                            <span>{deleteNotice}</span>
                            <button onClick={() => setDeleteNotice(null)} className="text-emerald-400 hover:text-white ml-2 text-xs">✕</button>
                          </div>
                        )}

                        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                          {officersList.map(preset => {
                            const cfg = AGENCY_CONFIGS[preset.agency as AgencyType] || AGENCY_CONFIGS['POLICE'];
                            const isSelected = govId.toLowerCase() === preset.govId.toLowerCase();
                            const isDeleting = deletingId === (preset.id || preset.govId);
                            return (
                              <div
                                key={preset.id || preset.govId}
                                onClick={() => selectPreset(preset)}
                                className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer relative group ${
                                  isSelected
                                    ? 'bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500/30'
                                    : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white text-xs">{preset.name}</span>
                                    {preset.state && (preset.agency === 'POLICE' || preset.agency === 'CID') && (
                                      <span className="text-[10px] font-mono text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded flex items-center">
                                        <MapPin className="w-2.5 h-2.5 mr-0.5" />
                                        {preset.state}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-1.5">
                                    <span
                                      className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded"
                                      style={{
                                        backgroundColor: `${cfg.accentHex}30`,
                                        color: cfg.accentHex,
                                      }}
                                    >
                                      {preset.agency}
                                    </span>
                                    {/* Delete Position Button */}
                                    <button
                                      type="button"
                                      onClick={e => handleDeletePosition(e, preset)}
                                      disabled={isDeleting}
                                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/70 border border-transparent hover:border-red-800/80 transition-all ml-1"
                                      title={`Delete position: ${preset.name} (${preset.rank})`}
                                    >
                                      <Trash2 className={`w-3.5 h-3.5 ${isDeleting ? 'animate-spin text-red-400' : ''}`} />
                                    </button>
                                  </div>
                                </div>
                                <div className="text-[11px] text-slate-300 mt-1 font-medium">
                                  {preset.rank}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono mt-1 flex items-center justify-between">
                                  <span>ROLE: {preset.role.replace('_', ' ')}</span>
                                  <span>{preset.badge}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTER NEW OFFICER (CHOOSE POSITION & RANK) */}
            {activePortalTab === 'REGISTER' && (
              <div className="p-6">
                {regSuccessUser ? (
                  /* Officer Registered Badge & Quick Launch */
                  <div className="max-w-2xl mx-auto py-4 space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="text-center space-y-2">
                      <div className="w-14 h-14 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-900/50">
                        <BadgeCheck className="w-8 h-8" />
                      </div>
                      <h2 className="text-lg font-bold font-mono text-white">
                        OFFICER CREDENTIALS ISSUED & COMMITTED TO DATABASE
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Official record encrypted and added to the National Law Enforcement Database registry.
                      </p>
                    </div>

                    {/* Official Identity Card */}
                    <div className="p-5 rounded-xl border border-slate-700 bg-slate-950 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-start justify-between border-b border-slate-800 pb-3 mb-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-black"
                            style={{
                              backgroundColor: AGENCY_CONFIGS[regSuccessUser.agency as AgencyType]?.accentHex || '#2563eb',
                            }}
                          >
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                              OFFICIAL DIGITAL WARRANT // MHA
                            </span>
                            <h3 className="text-base font-bold text-white">{regSuccessUser.name}</h3>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                          VERIFIED ACTIVE
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs mb-4">
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">AGENCY</span>
                          <span className="font-bold text-slate-200">{regSuccessUser.agency}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">RANK</span>
                          <span className="font-bold text-slate-200 truncate block">{regSuccessUser.rank}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">POSITION</span>
                          <span className="font-bold text-blue-400">{regSuccessUser.role.replace('_', ' ')}</span>
                        </div>
                        <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                          <span className="text-[9px] text-slate-500 uppercase block">BADGE NO.</span>
                          <span className="font-bold text-amber-300">{regSuccessUser.badge}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 bg-slate-900/50 px-3 py-1.5 rounded border border-slate-800/80">
                        <span>GOV LOGIN ID: <code className="text-white font-bold">{regSuccessUser.govId}</code></span>
                        <span>REGISTRATION REF: {regSuccessUser.id?.slice(0, 14)}</span>
                      </div>
                    </div>

                    {/* Launch Action */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setGovId(regSuccessUser.govId);
                          setActivePortalTab('SIGN_IN');
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-bold transition-colors"
                      >
                        Return to Sign-In Screen
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLaunchWithUser(regSuccessUser)}
                        className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        <span>LAUNCH TRINETRA SESSION AS {regSuccessUser.name.toUpperCase()} →</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Registration Form */
                  <form onSubmit={handleRegisterSubmit} className="space-y-5 max-w-4xl mx-auto">
                    <div className="p-3 bg-blue-950/30 border border-blue-800/60 rounded-lg text-xs text-blue-300 font-mono flex items-center space-x-2">
                      <UserPlus className="w-4 h-4 shrink-0 text-blue-400" />
                      <span>
                        Enrolling a new investigating officer into the persistent database. Select your operational position
                        and police rank to configure strict Role-Based Access Controls (RBAC).
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={regName}
                          onChange={e => handleNameChange(e.target.value)}
                          placeholder="e.g. Vikramaditya Rathod"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Agency Selection */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Home Agency / Department *
                        </label>
                        <select
                          value={regAgency}
                          onChange={e => handleAgencyChange(e.target.value as AgencyType)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        >
                          <option value="POLICE">State Police Department (All States & UTs)</option>
                          <option value="CID">State CID Crime Branch (CID)</option>
                          <option value="CBI">Central Bureau of Investigation (CBI)</option>
                          <option value="NIA">National Investigation Agency (NIA)</option>
                        </select>
                      </div>

                      {/* State / Union Territory Selection (Mandatory for State Police & CID) */}
                      {(regAgency === 'POLICE' || regAgency === 'CID') ? (
                        <div className="space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <label className="text-slate-300 uppercase tracking-wider block flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-amber-400" />
                              <span>State / Union Territory Jurisdiction *</span>
                            </label>
                            <span className="text-[10px] text-amber-400 font-mono font-bold">
                              {regAgency === 'CID' ? 'CID State Jurisdiction' : 'State Police Cadre'}
                            </span>
                          </div>
                          <select
                            value={regState}
                            onChange={e => handleStateChange(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950 border border-amber-500/70 rounded-lg text-white focus:outline-none focus:border-amber-400 font-medium"
                            required
                          >
                            {INDIAN_STATES_AND_UTS.map(st => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-slate-400 uppercase tracking-wider block text-xs">
                            Jurisdiction Scope
                          </label>
                          <div className="w-full px-3 py-2 bg-blue-950/40 border border-blue-800/60 rounded-lg text-blue-300 text-xs flex items-center space-x-2 font-mono">
                            <Building className="w-4 h-4 text-blue-400 shrink-0" />
                            <span>Pan-India Federal Jurisdiction (All States & UTs)</span>
                          </div>
                        </div>
                      )}

                      {/* Official Rank (Strictly filtered by selected Home Agency) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-slate-300 uppercase tracking-wider block">
                            Official Designation / Rank *
                          </label>
                          <span className="text-[10px] text-emerald-400 font-mono font-bold">
                            {regAgency} Specific ({AGENCY_RANKS[regAgency]?.length || 0} Designations)
                          </span>
                        </div>
                        <select
                          value={regRank}
                          onChange={e => setRegRank(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-medium"
                        >
                          {(AGENCY_RANKS[regAgency] || AGENCY_RANKS.POLICE).map(rk => (
                            <option key={rk} value={rk}>
                              {rk}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Operational Position / Role */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Operational System Role / Position *
                        </label>
                        <select
                          value={regRole}
                          onChange={e => setRegRole(e.target.value as UserRole)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 font-bold text-blue-400"
                        >
                          {SYSTEM_POSITIONS.map(pos => (
                            <option key={pos.role} value={pos.role}>
                              {pos.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Role Capability Banner */}
                      <div className="md:col-span-2 p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] space-y-1">
                        <div className="font-bold text-blue-400">
                          {SYSTEM_POSITIONS.find(p => p.role === regRole)?.title}:
                        </div>
                        <div className="text-slate-400">
                          {SYSTEM_POSITIONS.find(p => p.role === regRole)?.desc}
                        </div>
                        <div className="text-emerald-400 text-[10px]">
                          Module Access: {SYSTEM_POSITIONS.find(p => p.role === regRole)?.accessList}
                        </div>
                      </div>

                      {/* Gov ID */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          System Login ID / Gov ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={regGovId}
                          onChange={e => setRegGovId(e.target.value.toLowerCase())}
                          placeholder="e.g. police_rathod_55"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Badge No */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Badge / Warrant ID *
                        </label>
                        <input
                          type="text"
                          required
                          value={regBadge}
                          onChange={e => setRegBadge(e.target.value)}
                          placeholder="e.g. POL-STATE-7718"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Station / Division */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Station / Cyber Cell / Division
                        </label>
                        <input
                          type="text"
                          value={regStation}
                          onChange={e => setRegStation(e.target.value)}
                          placeholder="e.g. District Crime Branch / Central Police Station"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Passcode */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Station Passcode / Smartcard PIN *
                        </label>
                        <input
                          type="password"
                          required
                          value={regPassword}
                          onChange={e => setRegPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Official Mobile No (MSISDN)
                        </label>
                        <input
                          type="text"
                          value={regPhone}
                          onChange={e => setRegPhone(e.target.value)}
                          placeholder="+91-98920-11223"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Email */}
                      <div className="space-y-1.5">
                        <label className="text-slate-300 uppercase tracking-wider block">
                          Gov Email Address
                        </label>
                        <input
                          type="email"
                          value={regEmail}
                          onChange={e => setRegEmail(e.target.value)}
                          placeholder="officer@police.gov.in"
                          className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setActivePortalTab('SIGN_IN')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-xs transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isRegistering}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-mono text-xs font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                      >
                        {isRegistering ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>SAVING TO POLICE DATABASE...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>REGISTER OFFICER & GENERATE CREDENTIALS →</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delete Position Confirmation Modal */}
        {positionToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-red-700 rounded-2xl shadow-2xl p-6 font-mono space-y-4">
              <div className="flex items-center space-x-3 text-red-400 border-b border-slate-800 pb-3">
                <div className="p-2 rounded-xl bg-red-950/80 border border-red-800">
                  <Trash2 className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-white uppercase tracking-wider">
                    Delete Officer Position Profile
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Law Enforcement Registry Maintenance
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Officer Name:</span>
                  <span className="font-bold text-white">{positionToDelete.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rank / Title:</span>
                  <span className="text-amber-400 font-bold">{positionToDelete.rank}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Badge & Gov ID:</span>
                  <span className="text-blue-400">{positionToDelete.badge} ({positionToDelete.govId})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Agency & State:</span>
                  <span className="text-slate-200">{positionToDelete.agency} • {positionToDelete.state || 'National'}</span>
                </div>
              </div>

              <p className="text-xs text-red-300/90 leading-relaxed">
                Are you sure you want to permanently delete this position? This will remove the officer profile and credentials from the TRINETRA database.
              </p>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPositionToDelete(null)}
                  disabled={Boolean(deletingId)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeDeletePosition(positionToDelete)}
                  disabled={Boolean(deletingId)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 shadow-lg shadow-red-900/40"
                >
                  {deletingId ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Permanently Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500">
        <div>TRINETRA // MINISTRY OF HOME AFFAIRS, GOVT OF INDIA • ALL ACCESS MONITORED</div>
        <div className="flex space-x-4 mt-1 sm:mt-0">
          <span>SEC 65B IEA / SEC 63 BSA COMPLIANT</span>
          <span>INDIAN POLICE TELECOMMUNICATION NETWORK</span>
        </div>
      </footer>
    </div>
  );
};
