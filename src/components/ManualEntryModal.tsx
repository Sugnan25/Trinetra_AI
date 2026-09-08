import React, { useState } from 'react';
import {
  UserPlus,
  Link as LinkIcon,
  MapPin,
  ClipboardList,
  FileCheck,
  Shield,
  Plus,
  X,
  Phone,
  Radio,
  Car,
  CreditCard,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  CaseData,
  GraphNode,
  GraphLink,
  TimelineEvent,
  OperationalTicket,
  EvidenceItem,
  NodeCommunity,
  UserSession,
} from '../types';

interface ManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase: CaseData;
  session: UserSession;
  onAddNode: (node: GraphNode) => void;
  onAddLink: (link: GraphLink) => void;
  onAddTimeline: (event: TimelineEvent) => void;
  onAddTicket: (ticket: OperationalTicket) => void;
  onAddEvidence: (evidence: EvidenceItem) => void;
}

type EntryTab = 'SUSPECT' | 'LINK' | 'GEO_POINT' | 'TASK_TICKET' | 'EVIDENCE';

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Ahmedabad: { lat: 23.0225, lng: 72.5714 },
  Surat: { lat: 21.1702, lng: 72.8311 },
  Vadodara: { lat: 22.3072, lng: 73.1812 },
  Bharuch: { lat: 21.7051, lng: 72.9959 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  'Navi Mumbai': { lat: 19.033, lng: 73.0297 },
  Delhi: { lat: 28.6139, lng: 77.209 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Pune: { lat: 18.5204, lng: 73.8567 },
  Hyderabad: { lat: 17.385, lng: 78.4867 },
};

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  isOpen,
  onClose,
  currentCase,
  session,
  onAddNode,
  onAddLink,
  onAddTimeline,
  onAddTicket,
  onAddEvidence,
}) => {
  const [tab, setTab] = useState<EntryTab>('SUSPECT');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Suspect State
  const [nodeLabel, setNodeLabel] = useState('');
  const [nodeType, setNodeType] = useState<GraphNode['type']>('SUSPECT');
  const [nodeCommunity, setNodeCommunity] = useState<NodeCommunity>('Core Command & Masterminds');
  const [nodeMsisdn, setNodeMsisdn] = useState('');
  const [nodeImei, setNodeImei] = useState('');
  const [nodePlate, setNodePlate] = useState('');
  const [nodeVpa, setNodeVpa] = useState('');
  const [nodeLocationName, setNodeLocationName] = useState('');
  const [nodeRoleDesc, setNodeRoleDesc] = useState('');
  const [isKingpin, setIsKingpin] = useState(false);

  // 2. Link State
  const [linkSource, setLinkSource] = useState('');
  const [linkTarget, setLinkTarget] = useState('');
  const [linkType, setLinkType] = useState<GraphLink['type']>('CALLS');
  const [linkDetails, setLinkDetails] = useState('');
  const [linkAmount, setLinkAmount] = useState('');
  const [linkWeight, setLinkWeight] = useState('1');
  const [linkEvidenceRef, setLinkEvidenceRef] = useState('');

  // 3. Geo State
  const [geoTitle, setGeoTitle] = useState('');
  const [geoCity, setGeoCity] = useState('Ahmedabad');
  const [geoLat, setGeoLat] = useState('23.0225');
  const [geoLng, setGeoLng] = useState('72.5714');
  const [geoEventType, setGeoEventType] = useState<TimelineEvent['type']>('BLAST_COORDINATION');
  const [geoAzimuth, setGeoAzimuth] = useState('120');
  const [geoRadius, setGeoRadius] = useState('1500');
  const [geoDesc, setGeoDesc] = useState('');

  // 4. Ticket State
  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketRole, setTicketRole] = useState<'CYBER_PERSONNEL' | 'FORENSIC_PERSONNEL' | 'FIELD_BEAT_OFFICER'>(
    'CYBER_PERSONNEL'
  );
  const [ticketPriority, setTicketPriority] = useState<'IMMEDIATE' | 'HIGH' | 'ROUTINE'>('HIGH');
  const [ticketDetails, setTicketDetails] = useState('');
  const [ticketDeadline, setTicketDeadline] = useState('24 Hours');

  // 5. Evidence State
  const [evTitle, setEvTitle] = useState('');
  const [evType, setEvType] = useState<EvidenceItem['type']>('CDR_LOG');
  const [evSummary, setEvSummary] = useState('');

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // 1. Submit Suspect Node
  const handleSuspectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nodeLabel.trim()) return;

    const id = `NODE-${nodeType}-${Date.now().toString().slice(-5)}`;
    const newNode: GraphNode = {
      id,
      label: nodeLabel.trim(),
      type: nodeType,
      community: nodeCommunity,
      degree: 0,
      betweenness: 0,
      pageRank: 0,
      isCutVertex: false,
      isKingpin: isKingpin,
      metadata: {
        msisdn: nodeMsisdn.trim() || undefined,
        imei: nodeImei.trim() || undefined,
        plateNo: nodePlate.trim() || undefined,
        vpa: nodeVpa.trim() || undefined,
        locationName: nodeLocationName.trim() || undefined,
        roleDesc: nodeRoleDesc.trim() || undefined,
        exhibitRef: `MANUAL-ENTRY-${session.badge}`,
        notes: `Entered by ${session.name} (${session.rank}) on ${new Date().toLocaleDateString()}`,
      },
    };

    onAddNode(newNode);
    showNotification(`Added entity: ${newNode.label} (${newNode.type}) to case topology.`);

    // Reset Form
    setNodeLabel('');
    setNodeMsisdn('');
    setNodeImei('');
    setNodePlate('');
    setNodeVpa('');
    setNodeRoleDesc('');
  };

  // 2. Submit Link
  const handleLinkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkSource || !linkTarget) {
      alert('Please select both Source and Target entities.');
      return;
    }
    if (linkSource === linkTarget) {
      alert('Source and Target cannot be the same entity.');
      return;
    }

    const id = `LINK-${Date.now().toString().slice(-5)}`;
    const newLink: GraphLink = {
      id,
      source: linkSource,
      target: linkTarget,
      type: linkType,
      weight: Number(linkWeight) || 1,
      details: linkDetails.trim() || `${linkType} connection logged by ${session.name}`,
      evidenceRef: linkEvidenceRef.trim() || `EXHIBIT-MANUAL-${Date.now().toString().slice(-4)}`,
      amount: linkAmount ? Number(linkAmount) : undefined,
      timestamp: new Date().toISOString(),
    };

    onAddLink(newLink);
    showNotification(`Connected ${linkSource} ➔ ${linkTarget} (${linkType}). Algorithms updated!`);

    // Reset Form
    setLinkDetails('');
    setLinkAmount('');
  };

  // 3. Submit Geo
  const handleGeoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!geoTitle.trim()) return;

    const id = `EVT-${Date.now().toString().slice(-5)}`;
    const newEvent: TimelineEvent = {
      id,
      timestamp: new Date().toISOString(),
      timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      location: `${geoTitle.trim()} (${geoCity})`,
      lat: Number(geoLat) || 23.0225,
      lng: Number(geoLng) || 72.5714,
      title: geoTitle.trim(),
      description: geoDesc.trim() || 'Manual surveillance / telemetry point entered into matrix.',
      nodeIds: [],
      type: geoEventType,
      azimuth: geoEventType === 'BTS_BURST' ? Number(geoAzimuth) : undefined,
      radius: geoEventType === 'BTS_BURST' ? Number(geoRadius) : undefined,
    };

    onAddTimeline(newEvent);
    showNotification(`Plotted geospatial point: ${newEvent.title} on GIS Matrix.`);

    setGeoTitle('');
    setGeoDesc('');
  };

  // 4. Submit Ticket
  const handleTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketTitle.trim()) return;

    const id = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket: OperationalTicket = {
      id,
      title: ticketTitle.trim(),
      assignedRole: ticketRole,
      assignedToName: `Investigator (${ticketRole.replace('_', ' ')})`,
      agency: session.agency,
      priority: ticketPriority,
      status: 'PENDING',
      details: ticketDetails.trim() || 'Dispatched for forensic review and telemetry correlation.',
      deadline: ticketDeadline,
      createdAt: new Date().toISOString(),
    };

    onAddTicket(newTicket);
    showNotification(`Dispatched task ${id} to ${ticketRole}.`);

    setTicketTitle('');
    setTicketDetails('');
  };

  // 5. Submit Evidence
  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim()) return;

    const id = `EXHIBIT-${Date.now().toString().slice(-4)}`;
    const newEvidence: EvidenceItem = {
      id,
      title: evTitle.trim(),
      type: evType,
      fileSize: '1.8 MB',
      sha256: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      uploadedBy: `${session.name} (${session.badge})`,
      uploadedAt: new Date().toISOString(),
      status: 'VERIFIED',
      caseRef: currentCase.caseNumber,
      jurisdictionOrigin: currentCase.jurisdiction || 'Crime Branch',
      extractedEntitiesCount: 3,
      summaryText: evSummary.trim() || 'Evidentiary exhibit logged into digital chain of custody.',
    };

    onAddEvidence(newEvidence);
    showNotification(`Evidence item ${id} certified with SHA-256 seal.`);

    setEvTitle('');
    setEvSummary('');
  };

  // Quick City Coordinate Picker
  const handleCityPick = (city: string) => {
    setGeoCity(city);
    const coords = CITY_COORDINATES[city];
    if (coords) {
      setGeoLat(coords.lat.toString());
      setGeoLng(coords.lng.toString());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-amber-900/40 border border-amber-600/60 flex items-center justify-center text-amber-400">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-mono font-bold text-white tracking-wide">
                  MANUAL CASE INTELLIGENCE & TELEMETRY INGESTION
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                  {currentCase.caseNumber}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manually populate suspect entities, CDR telephone connections, Hawala fund transfers, or GIS tower sights.
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 pt-2 overflow-x-auto">
          <button
            onClick={() => setTab('SUSPECT')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap border-b-2 ${
              tab === 'SUSPECT'
                ? 'border-red-500 text-red-400 bg-red-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>1. Suspect / Entity Node</span>
          </button>

          <button
            onClick={() => setTab('LINK')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap border-b-2 ${
              tab === 'LINK'
                ? 'border-blue-500 text-blue-400 bg-blue-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-4 h-4" />
            <span>2. Connection / CDR Link</span>
          </button>

          <button
            onClick={() => setTab('GEO_POINT')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap border-b-2 ${
              tab === 'GEO_POINT'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>3. Geo Point & Cell Tower</span>
          </button>

          <button
            onClick={() => setTab('TASK_TICKET')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap border-b-2 ${
              tab === 'TASK_TICKET'
                ? 'border-purple-500 text-purple-400 bg-purple-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>4. Operational Task</span>
          </button>

          <button
            onClick={() => setTab('EVIDENCE')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-mono font-bold uppercase transition-all whitespace-nowrap border-b-2 ${
              tab === 'EVIDENCE'
                ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>5. Evidence Exhibit</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-emerald-950/60 border border-emerald-700 text-emerald-300 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* TAB 1: ADD SUSPECT / ENTITY */}
          {tab === 'SUSPECT' && (
            <form onSubmit={handleSuspectSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Label */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Suspect Name & Known Aliases *
                  </label>
                  <input
                    type="text"
                    required
                    value={nodeLabel}
                    onChange={e => setNodeLabel(e.target.value)}
                    placeholder="e.g. Riyaz @ Doctor, Qasim Handler, MH-04-AZ-8890"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Entity Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Entity Classification</label>
                  <select
                    value={nodeType}
                    onChange={e => setNodeType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="SUSPECT">Suspect Person (Individual)</option>
                    <option value="PHONE">Mobile Phone / MSISDN Terminal</option>
                    <option value="IMEI">Physical Handset Hardware (IMEI)</option>
                    <option value="VEHICLE">Vehicle / Transport Asset</option>
                    <option value="FINANCIAL">Bank Account / Hawala Ledger / UPI</option>
                    <option value="LOCATION">Safehouse / Meeting Point / Hideout</option>
                  </select>
                </div>

                {/* Syndicate Community Cluster */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Syndicate Functional Cell</label>
                  <select
                    value={nodeCommunity}
                    onChange={e => setNodeCommunity(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  >
                    <option value="Core Command & Masterminds">Core Command & Masterminds (Red)</option>
                    <option value="Hawala Layering Cell">Hawala Layering Cell (Amber)</option>
                    <option value="Logistics & Procurement">Logistics & Procurement (Cyan)</option>
                    <option value="Ground Enforcement & Field">Ground Enforcement & Field (Purple)</option>
                  </select>
                </div>

                {/* MSISDN Phone */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Mobile Phone / MSISDN</label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={nodeMsisdn}
                      onChange={e => setNodeMsisdn(e.target.value)}
                      placeholder="+91-98920-11000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* IMEI */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Hardware Terminal IMEI (15 Digits)</label>
                  <div className="relative">
                    <Radio className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={nodeImei}
                      onChange={e => setNodeImei(e.target.value)}
                      placeholder="490154203237510"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Vehicle Plate */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Vehicle Registration Plate</label>
                  <div className="relative">
                    <Car className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={nodePlate}
                      onChange={e => setNodePlate(e.target.value)}
                      placeholder="GJ-01-AB-1234 / MH-04-AZ-8890"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* UPI VPA */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Bank Account / UPI Handle</label>
                  <div className="relative">
                    <CreditCard className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      value={nodeVpa}
                      onChange={e => setNodeVpa(e.target.value)}
                      placeholder="munshi.trade@oksbi"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Last Known Location / City</label>
                  <input
                    type="text"
                    value={nodeLocationName}
                    onChange={e => setNodeLocationName(e.target.value)}
                    placeholder="e.g. Kalupur Station, Ahmedabad"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>

                {/* Kingpin Flag */}
                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="kingpinCheck"
                    checked={isKingpin}
                    onChange={e => setIsKingpin(e.target.checked)}
                    className="w-4 h-4 rounded text-red-600 bg-slate-950 border-slate-700 focus:ring-red-500"
                  />
                  <label htmlFor="kingpinCheck" className="text-xs font-mono text-red-300 cursor-pointer font-bold">
                    Mark as Suspected Mastermind / Kingpin
                  </label>
                </div>

                {/* Role Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Intelligence Brief / Role Notes</label>
                  <textarea
                    rows={2}
                    value={nodeRoleDesc}
                    onChange={e => setNodeRoleDesc(e.target.value)}
                    placeholder="Enter investigative observations, informants reports, or wiretap summary..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-red-600/30 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADD ENTITY TO CASE TOPOLOGY →</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ADD CONNECTION / LINK */}
          {tab === 'LINK' && (
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              {currentCase.nodes.length < 2 && (
                <div className="p-3 bg-amber-950/40 border border-amber-700/60 rounded-lg text-xs text-amber-300 font-mono flex items-center space-x-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    You need at least 2 entities in the case before creating connections. Please add entities in Tab 1
                    first.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Source Entity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Source Entity (Initiator / Caller) *</label>
                  <select
                    value={linkSource}
                    onChange={e => setLinkSource(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Source Suspect / Entity --</option>
                    {currentCase.nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.label} [{n.type}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Entity */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Target Entity (Receiver / Beneficiary) *</label>
                  <select
                    value={linkTarget}
                    onChange={e => setLinkTarget(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Select Target Suspect / Entity --</option>
                    {currentCase.nodes.map(n => (
                      <option key={n.id} value={n.id}>
                        {n.label} [{n.type}]
                      </option>
                    ))}
                  </select>
                </div>

                {/* Link Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Evidentiary Link Modality</label>
                  <select
                    value={linkType}
                    onChange={e => setLinkType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="CALLS">Telecom CDR Call Intercept</option>
                    <option value="TRANSFERS_FUNDS">Hawala / Bank / UPI Fund Flow</option>
                    <option value="COORDINATES_WITH">Co-accused Conspirator Link</option>
                    <option value="SHARED_IMEI">Hardware Handset Swap (Burner Hopping)</option>
                    <option value="OPERATES_VEHICLE">Logistical Transport / Vehicle Driver</option>
                    <option value="SAFEHOUSE_MEET">Physical Safehouse Convergence</option>
                    <option value="CUT_OUT_PROXY">Proxy Relay / Intermediary Cut-out</option>
                    <option value="TOWER_PING">BTS Tower Co-location Azimuth</option>
                  </select>
                </div>

                {/* Amount if Hawala */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Financial Amount (₹) - Hawala / UPI
                  </label>
                  <input
                    type="number"
                    value={linkAmount}
                    onChange={e => setLinkAmount(e.target.value)}
                    placeholder="e.g. 49500 (triggers Smurfing alert)"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Weight / Call Count */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Call Frequency / Edge Weight
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={linkWeight}
                    onChange={e => setLinkWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Exhibit Reference */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Evidence Exhibit Citation</label>
                  <input
                    type="text"
                    value={linkEvidenceRef}
                    onChange={e => setLinkEvidenceRef(e.target.value)}
                    placeholder="e.g. EXHIBIT-CDR-TWR-884, Line 42"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Details */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Connection Observations</label>
                  <textarea
                    rows={2}
                    value={linkDetails}
                    onChange={e => setLinkDetails(e.target.value)}
                    placeholder="e.g. 18 short-duration night calls intercepted right before blast coordinate timing..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={currentCase.nodes.length < 2}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/30 transition-all"
                >
                  <LinkIcon className="w-4 h-4" />
                  <span>ESTABLISH EVIDENTIARY LINK & RUN ALGORITHMS →</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: ADD GEO POINT & CELL TOWER */}
          {tab === 'GEO_POINT' && (
            <form onSubmit={handleGeoSubmit} className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-[11px] font-mono text-slate-400">Quick City Coordinates:</span>
                {Object.keys(CITY_COORDINATES).map(city => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleCityPick(city)}
                    className={`px-2 py-1 rounded text-[10px] font-mono transition-colors ${
                      geoCity === city ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Title */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">
                    Location Name / Sighting / Landmark *
                  </label>
                  <input
                    type="text"
                    required
                    value={geoTitle}
                    onChange={e => setGeoTitle(e.target.value)}
                    placeholder="e.g. Civil Hospital Trauma Center Blast Point / Bharuch Highway Toll"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Event Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Geospatial Marker Type</label>
                  <select
                    value={geoEventType}
                    onChange={e => setGeoEventType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BLAST_COORDINATION">Crime Scene / Target Incident</option>
                    <option value="BTS_BURST">BTS Cell Tower Azimuth Sector</option>
                    <option value="TOLL_ANPR">Highway Toll ANPR Camera Scan</option>
                    <option value="SAFEHOUSE_MEET">Safehouse / Physical Conclave</option>
                    <option value="HAWALA_TRANCHE">Hawala Cash Handover Point</option>
                    <option value="VEHICLE_THEFT">Vehicle Theft / Recovery Point</option>
                  </select>
                </div>

                {/* City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">City / District</label>
                  <input
                    type="text"
                    value={geoCity}
                    onChange={e => setGeoCity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lat */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Latitude (WGS84)</label>
                  <input
                    type="text"
                    value={geoLat}
                    onChange={e => setGeoLat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Lng */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Longitude (WGS84)</label>
                  <input
                    type="text"
                    value={geoLng}
                    onChange={e => setGeoLng(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Azimuth & Radius if BTS */}
                {geoEventType === 'BTS_BURST' && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Tower Azimuth Angle (0° to 360°)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="360"
                        value={geoAzimuth}
                        onChange={e => setGeoAzimuth(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase text-slate-300">
                        Sector Range Radius (Meters)
                      </label>
                      <input
                        type="number"
                        value={geoRadius}
                        onChange={e => setGeoRadius(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </>
                )}

                {/* Description */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Tactical Recon Notes</label>
                  <textarea
                    rows={2}
                    value={geoDesc}
                    onChange={e => setGeoDesc(e.target.value)}
                    placeholder="Enter on-ground physical surveillance notes, camera footage verification, or tower dump references..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  <span>PLOT POINT ON GEOSPATIAL MATRIX →</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: ADD TASK TICKET */}
          {tab === 'TASK_TICKET' && (
            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Task Title *</label>
                  <input
                    type="text"
                    required
                    value={ticketTitle}
                    onChange={e => setTicketTitle(e.target.value)}
                    placeholder="e.g. Requisition BTS Tower Sector Dumps for Bharuch Highway"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Assigned Unit</label>
                  <select
                    value={ticketRole}
                    onChange={e => setTicketRole(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="CYBER_PERSONNEL">Cyber Telemetry & Telecommunications Unit</option>
                    <option value="FORENSIC_PERSONNEL">Forensic Science Laboratory (FSL)</option>
                    <option value="FIELD_BEAT_OFFICER">Field Beat Patrol / Station Responders</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Priority Level</label>
                  <select
                    value={ticketPriority}
                    onChange={e => setTicketPriority(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="IMMEDIATE">IMMEDIATE (Flash Dispatch)</option>
                    <option value="HIGH">HIGH (Within 12 Hours)</option>
                    <option value="ROUTINE">ROUTINE (Standard Verification)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Deadline</label>
                  <input
                    type="text"
                    value={ticketDeadline}
                    onChange={e => setTicketDeadline(e.target.value)}
                    placeholder="e.g. 12 Hours / Immediate"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Operational Directives</label>
                  <textarea
                    rows={3}
                    value={ticketDetails}
                    onChange={e => setTicketDetails(e.target.value)}
                    placeholder="Specific investigation tasks, statutory notices, or physical recon protocols..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-purple-600/30 transition-all"
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>DISPATCH OPERATIONAL TICKET →</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: ADD EVIDENCE EXHIBIT */}
          {tab === 'EVIDENCE' && (
            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Evidence Exhibit Title *</label>
                  <input
                    type="text"
                    required
                    value={evTitle}
                    onChange={e => setEvTitle(e.target.value)}
                    placeholder="e.g. Unexploded Timer PCB Extracted from Civil Hospital Vehicle"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono uppercase text-slate-300">Evidence Category</label>
                  <select
                    value={evType}
                    onChange={e => setEvType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="CDR_LOG">Telecom CDR Call Record</option>
                    <option value="VEHICLE_FIR">Vehicle Theft Certified FIR</option>
                    <option value="ANPR_TOLL">Highway ANPR Plate Capture</option>
                    <option value="BOMB_MEMO">Seizure Memo / Panchnama</option>
                    <option value="BANK_UPI">Bank Statement & UPI Clearing Ledger</option>
                    <option value="AUDIO_NOTE">Audio Intercept / Voice Memo</option>
                    <option value="FIELD_PHOTO">Scene of Crime Photo</option>
                    <option value="FORENSIC_CHIP">Forensic Chip Dump / EEPROM</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-mono uppercase text-slate-300">Forensic Summary & Notes</label>
                  <textarea
                    rows={3}
                    value={evSummary}
                    onChange={e => setEvSummary(e.target.value)}
                    placeholder="Summary of evidentiary findings, Section 65B compliance notes, or physical seal status..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-2 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>SEAL & DEPOSIT INTO FORENSIC VAULT →</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
