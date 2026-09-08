import React, { useState, useRef } from 'react';
import {
  Shield,
  FileText,
  Camera,
  Video,
  Mic,
  PhoneCall,
  Calendar,
  Clock,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Sparkles,
  MapPin,
  Eye,
  Layers,
  Search,
  Building,
  UserCheck,
  Smartphone,
  Hash,
  ArrowRight,
  Filter,
  BadgeCheck,
  Settings2,
  X,
} from 'lucide-react';
import { UserSession, UserRole, CaseData, EvidenceItem, DailyDiaryEntry, GraphNode, GraphLink, TimelineEvent, NodeCommunity } from '../types';
import { AGENCY_CONFIGS } from '../data/authData';
import { generateAuditHash, enrichCaseWithAlgorithms } from '../utils/caseEnricher';

// Operational Role Mandates & Submission Profiles
export interface RoleSubmissionProfile {
  role: UserRole;
  title: string;
  designationScope: string;
  summary: string;
  recommendedCategories: Array<'FIR' | 'DOCS' | 'PHOTOS' | 'VIDEOS' | 'AUDIO' | 'TELECOM' | 'DIARY'>;
  legalAuthority: string;
}

export const ROLE_SUBMISSION_PROFILES: Record<UserRole, RoleSubmissionProfile> = {
  LEAD_INVESTIGATOR: {
    role: 'LEAD_INVESTIGATOR',
    title: 'Lead Investigating Officer (IO / ACP / DySP)',
    designationScope: 'Statutory Case Superintendence & Final Reporting',
    summary: 'Designated to register formal FIRs, maintain Day-to-Day Case Diaries (Sec 192 BNSS / 172 CrPC Roznamcha), author seizure Panchnamas, examine key witnesses, and submit charge sheet drafts.',
    recommendedCategories: ['FIR', 'DIARY', 'DOCS', 'PHOTOS', 'VIDEOS', 'TELECOM'],
    legalAuthority: 'Sec 173/193 BNSS, Sec 154 CrPC, Police Regulations Act',
  },
  FIELD_BEAT_OFFICER: {
    role: 'FIELD_BEAT_OFFICER',
    title: 'Field Beat Officer (Beat Constable / ASI / Field Operative)',
    designationScope: 'Tactical Reconnaissance, Spot Evidence & Beat Roznamcha',
    summary: 'Designated to submit in-situ crime scene spot photos, mobile/bodycam footage, spot seizure memos, oral field witness statements, and daily beat patrol diary entries.',
    recommendedCategories: ['PHOTOS', 'VIDEOS', 'DOCS', 'DIARY'],
    legalAuthority: 'Sec 100/105 BNSS Spot Seizures, Police Manual Beat Duties',
  },
  CYBER_PERSONNEL: {
    role: 'CYBER_PERSONNEL',
    title: 'Cyber Forensics & Telecom Analyst',
    designationScope: 'Digital Footprints, Telecom Intercepts & Hardware Extraction',
    summary: 'Designated to ingest Call Detail Records (CDR/SDR/Tower Dumps), intercepted wiretap audio logs, IPDR session records, burner IMEI hop matrices, and device extraction reports.',
    recommendedCategories: ['TELECOM', 'AUDIO', 'DOCS'],
    legalAuthority: 'Sec 65B Indian Evidence Act / Sec 63 BSA, IT Act Sec 69',
  },
  FORENSIC_PERSONNEL: {
    role: 'FORENSIC_PERSONNEL',
    title: 'Forensic Science Laboratory (FSL) Custodian',
    designationScope: 'Physical & Scientific Analysis, Ballistics & Chemical Reports',
    summary: 'Designated to upload FSL chemical analysis reports, ballistics firearm trajectory memos, latent fingerprint photographs, autopsy/injury certificates, and chain-of-custody memos.',
    recommendedCategories: ['DOCS', 'PHOTOS'],
    legalAuthority: 'Sec 293 CrPC / Sec 329 BNSS Scientific Expert Opinions',
  },
  DEPT_ADMIN: {
    role: 'DEPT_ADMIN',
    title: 'Departmental Administrator & Supervisory Authority (SP / DIG)',
    designationScope: 'Inter-Agency Coordination, Statutory Verification & Sanctions',
    summary: 'Designated to review full multi-tenant dossiers, authorize inter-state task forces, endorse Section 65B tamper-evident seals, and issue formal prosecution sanction orders.',
    recommendedCategories: ['FIR', 'DIARY', 'DOCS', 'PHOTOS', 'VIDEOS', 'AUDIO', 'TELECOM'],
    legalAuthority: 'CrPC Sec 196/197 Sanctions, MHA Inter-Agency Protocols',
  },
};

interface RoleBasedCaseIntakeProps {
  session: UserSession;
  caseMetadata: {
    caseNumber: string;
    caseTitle: string;
    jurisdiction: string;
    classification: 'TOP_SECRET' | 'SECRET' | 'RESTRICTED';
    incidentDate: string;
    legalSections: string;
    caseDescription: string;
  };
  onCaseSynthesized: (completeCase: CaseData) => void;
}

export const RoleBasedCaseIntake: React.FC<RoleBasedCaseIntakeProps> = ({
  session,
  caseMetadata,
  onCaseSynthesized,
}) => {
  // Operational Role Perspective Switcher
  const [activeRole, setActiveRole] = useState<UserRole>(session.role);
  const [filterByRole, setFilterByRole] = useState<boolean>(false);

  // Dynamic Case Positions List with Delete and Add capability
  const [positionsList, setPositionsList] = useState<Array<{
    id: string;
    role: UserRole;
    title: string;
    description: string;
    isCustom?: boolean;
  }>>([
    {
      id: 'POS_LEAD',
      role: 'LEAD_INVESTIGATOR',
      title: 'Lead Investigating Officer (IO / ACP / DySP)',
      description: 'Strategic Command, Centrality Algorithms, Court Dossiers & Comprehensive Evidence Ingestion',
    },
    {
      id: 'POS_FIELD',
      role: 'FIELD_BEAT_OFFICER',
      title: 'Field Beat Officer (Beat Constable / ASI / Field Ops)',
      description: 'Tactical on-scene evidence, incident photos, CCTV videos, bodycam & spot diary',
    },
    {
      id: 'POS_CYBER',
      role: 'CYBER_PERSONNEL',
      title: 'Cyber Forensics & Telecom Surveillance Analyst',
      description: '15GB CDR Streamer, cell tower pings, burner handset IMEI logs & telecom lists',
    },
    {
      id: 'POS_FSL',
      role: 'FORENSIC_PERSONNEL',
      title: 'Forensic Science Laboratory (FSL) Custodian',
      description: 'Chain of custody, physical exhibits, SHA-256 seals, ballistics & audio intercepts',
    },
    {
      id: 'POS_ADMIN',
      role: 'DEPT_ADMIN',
      title: 'Departmental Administrator & Supervisory Authority (SP / DIG)',
      description: 'Multi-agency escalations, jurisdictional warrants & administrative governance',
    },
  ]);

  const [showManagePositionsModal, setShowManagePositionsModal] = useState<boolean>(false);
  const [newPositionTitle, setNewPositionTitle] = useState<string>('');
  const [newPositionRole, setNewPositionRole] = useState<UserRole>('LEAD_INVESTIGATOR');
  const [newPositionDesc, setNewPositionDesc] = useState<string>('');
  const [posToDelete, setPosToDelete] = useState<any | null>(null);
  const [posDeleteNotice, setPosDeleteNotice] = useState<string | null>(null);

  const confirmDeletePosition = (posId: string) => {
    const pos = positionsList.find(p => p.id === posId);
    if (!pos) return;
    if (positionsList.length <= 1) {
      setPosDeleteNotice('At least one operational position must remain in the case intake system.');
      setTimeout(() => setPosDeleteNotice(null), 3500);
      setPosToDelete(null);
      return;
    }
    const remaining = positionsList.filter(p => p.id !== posId);
    setPositionsList(remaining);
    if (activeRole === pos.role && !remaining.some(r => r.role === pos.role)) {
      setActiveRole(remaining[0].role);
    }
    setPosDeleteNotice(`Position "${pos.title}" deleted.`);
    setTimeout(() => setPosDeleteNotice(null), 3000);
    setPosToDelete(null);
  };

  const handleAddCustomPosition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPositionTitle.trim()) return;
    const newPos = {
      id: `POS_CUSTOM_${Date.now()}`,
      role: newPositionRole,
      title: newPositionTitle.trim(),
      description: newPositionDesc.trim() || 'Designated departmental operational position for statutory investigation.',
      isCustom: true,
    };
    setPositionsList(prev => [...prev, newPos]);
    setNewPositionTitle('');
    setNewPositionDesc('');
  };

  // Active Category Tab
  type CategoryTab = 'FIR' | 'DOCS' | 'PHOTOS' | 'VIDEOS' | 'AUDIO' | 'TELECOM' | 'DIARY';
  const [activeCategory, setActiveCategory] = useState<CategoryTab>('FIR');

  const currentProfile = ROLE_SUBMISSION_PROFILES[activeRole] || ROLE_SUBMISSION_PROFILES.LEAD_INVESTIGATOR;

  // ----------------------------------------------------
  // 1. FIR File & Crime Registration State
  // ----------------------------------------------------
  const [firNumber, setFirNumber] = useState(caseMetadata.caseNumber);
  const [firStation, setFirStation] = useState(caseMetadata.jurisdiction);
  const [firDate, setFirDate] = useState(caseMetadata.incidentDate);
  const [firSections, setFirSections] = useState(caseMetadata.legalSections);
  const [firComplainant, setFirComplainant] = useState(`Inspector V. Rathod, ${session.departmentName}`);
  const [firAccused, setFirAccused] = useState('Tariq Mehmood @ Ustad, Imran Qureshi, and unnamed syndicate operatives');
  const [firGist, setFirGist] = useState(
    'Organized crime syndicate orchestrating inter-state sleeper cell communications, nocturnal burner handset IMEI hopping, and Hawala smurfing.'
  );
  const [firUploadedFile, setFirUploadedFile] = useState<{
    name: string;
    size: string;
    hash: string;
    uploadedAt: string;
  } | null>({
    name: 'FIR_088_2025_STATE_POLICE.pdf',
    size: '1.8 MB',
    hash: generateAuditHash('FIR_088_2025_STATE_POLICE_OFFICIAL_RECORD'),
    uploadedAt: new Date().toISOString(),
  });
  const firFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // 2. Case Related Documents (Text) State
  // ----------------------------------------------------
  interface StagedDoc {
    id: string;
    title: string;
    category: 'PANCHNAMA_SEIZURE' | 'WITNESS_STATEMENT' | 'CHARGE_SHEET' | 'FSL_REPORT' | 'COURT_REMAND' | 'INTEL_INTERCEPT';
    officer: string;
    text: string;
    hash: string;
    date: string;
    extractedEntities: number;
  }
  const [docsList, setDocsList] = useState<StagedDoc[]>([
    {
      id: 'DOC-01',
      title: 'Spot Search & Seizure Panchnama (Sec 105 BNSS)',
      category: 'PANCHNAMA_SEIZURE',
      officer: `${session.name} (${session.rank})`,
      text: 'Conducted search at Godown #4. Seized 3 Nokia 105 burner handsets (IMEI: 358901234567890), 8 pre-activated SIM cards registered in fake names, and Hawala ledger notebooks detailing ₹48,500 transfers to VPA falcon.smurf@okhdfcbank.',
      hash: generateAuditHash('PANCHNAMA_DOC_01_GODOWN_SEIZURE'),
      date: new Date(Date.now() - 86400000).toISOString(),
      extractedEntities: 6,
    },
    {
      id: 'DOC-02',
      title: 'Witness Deposition of Mobile Recharge Vendor (Sec 180 BNSS)',
      category: 'WITNESS_STATEMENT',
      officer: `${session.name} (${session.rank})`,
      text: 'Witness stated that a man matching Tariq Mehmood purchased 5 Airtel SIM cards without submitting genuine Aadhaar OTP, paying cash at 23:45 IST.',
      hash: generateAuditHash('WITNESS_STATEMENT_02_VENDOR'),
      date: new Date(Date.now() - 43200000).toISOString(),
      extractedEntities: 3,
    },
  ]);

  const [newDocCategory, setNewDocCategory] = useState<StagedDoc['category']>('PANCHNAMA_SEIZURE');
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocText, setNewDocText] = useState('');

  // ----------------------------------------------------
  // 3. Crime Scene & Evidence Photos State
  // ----------------------------------------------------
  interface StagedPhoto {
    id: string;
    name: string;
    category: 'CRIME_SCENE' | 'WEAPON' | 'CONTRABAND' | 'VEHICLE_PLATE' | 'FINGERPRINT' | 'MUGSHOT';
    caption: string;
    geoCoords: string;
    size: string;
    hash: string;
    timestamp: string;
  }
  const [photosList, setPhotosList] = useState<StagedPhoto[]>([
    {
      id: 'PHOTO-01',
      name: 'seized_burner_handsets_in_situ.jpg',
      category: 'WEAPON',
      caption: '3 seized dual-SIM burner handsets recovered from Godown #4 false ceiling',
      geoCoords: '23.0225° N, 72.5714° E (Kalupur Sector)',
      size: '2.4 MB',
      hash: generateAuditHash('PHOTO_BURNER_HANDSETS_EVIDENCE'),
      timestamp: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'PHOTO-02',
      name: 'getaway_bike_license_stamp.png',
      category: 'VEHICLE_PLATE',
      caption: 'Black Pulsar motorcycle bearing forged registration plate GJ-01-AB-4491',
      geoCoords: '23.0300° N, 72.5800° E (Relay Point)',
      size: '3.1 MB',
      hash: generateAuditHash('PHOTO_VEHICLE_PLATE_4491'),
      timestamp: new Date(Date.now() - 54000000).toISOString(),
    },
  ]);

  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState<StagedPhoto['category']>('CRIME_SCENE');
  const [newPhotoGeo, setNewPhotoGeo] = useState('23.0225° N, 72.5714° E');
  const photoFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // 4. Video Evidence State
  // ----------------------------------------------------
  interface StagedVideo {
    id: string;
    name: string;
    source: 'SHOP_CCTV' | 'TRAFFIC_ANPR' | 'BODYCAM' | 'DRONE_SURVEY' | 'MOBILE_SPOT';
    location: string;
    duration: string;
    observations: string;
    size: string;
    hash: string;
    timestamp: string;
  }
  const [videosList, setVideosList] = useState<StagedVideo[]>([
    {
      id: 'VID-01',
      name: 'cctv_junction_7_rendezvous.mp4',
      source: 'TRAFFIC_ANPR',
      location: 'Sector 7 Highway Crossing ANPR Dome #14',
      duration: '04:12 mins (1080p 60fps)',
      observations: 'Courier Imran Qureshi observed handing brown package to rider Kabir Varma at 23:42:10 IST.',
      size: '84.5 MB',
      hash: generateAuditHash('CCTV_JUNCTION_7_VIDEO_RECORD'),
      timestamp: new Date(Date.now() - 72000000).toISOString(),
    },
  ]);

  const [newVideoName, setNewVideoName] = useState('');
  const [newVideoSource, setNewVideoSource] = useState<StagedVideo['source']>('SHOP_CCTV');
  const [newVideoLocation, setNewVideoLocation] = useState('');
  const [newVideoDuration, setNewVideoDuration] = useState('02:30 mins');
  const [newVideoObservations, setNewVideoObservations] = useState('');
  const videoFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // 5. Audio Recordings State
  // ----------------------------------------------------
  interface StagedAudio {
    id: string;
    name: string;
    audioType: 'INTERCEPT_WIRETAP' | 'EMERGENCY_100' | 'WITNESS_VOICE' | 'CONFESSION_MEMO';
    speakerA: string;
    speakerB: string;
    duration: string;
    transcriptSummary: string;
    size: string;
    hash: string;
    timestamp: string;
  }
  const [audiosList, setAudiosList] = useState<StagedAudio[]>([
    {
      id: 'AUD-01',
      name: 'intercept_wiretap_session_88.mp3',
      audioType: 'INTERCEPT_WIRETAP',
      speakerA: 'Tariq Mehmood (+91 98250 11223)',
      speakerB: 'Imran Qureshi (+91 98980 22334)',
      duration: '01:45 mins (PCM 44.1kHz)',
      transcriptSummary: 'Speaker A instructs Speaker B: "Switch handset immediately after drop. Do not reuse old IMEI at Kalupur tower."',
      size: '3.8 MB',
      hash: generateAuditHash('WIRETAP_SESSION_88_TRANSCRIPT'),
      timestamp: new Date(Date.now() - 60000000).toISOString(),
    },
  ]);

  const [newAudioName, setNewAudioName] = useState('');
  const [newAudioType, setNewAudioType] = useState<StagedAudio['audioType']>('INTERCEPT_WIRETAP');
  const [newAudioSpeakerA, setNewAudioSpeakerA] = useState('');
  const [newAudioSpeakerB, setNewAudioSpeakerB] = useState('');
  const [newAudioDuration, setNewAudioDuration] = useState('01:15 mins');
  const [newAudioTranscript, setNewAudioTranscript] = useState('');
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // 6. Telephone / Phone Call List (CDR / SDR) State
  // ----------------------------------------------------
  interface CallRecord {
    id: string;
    caller: string;
    callee: string;
    timestamp: string;
    duration: number;
    callType: 'VOICE' | 'SMS' | 'VOLTE';
    tower: string;
    imei: string;
  }
  const [callsList, setCallsList] = useState<CallRecord[]>([
    { id: 'CALL-01', caller: '+91 98250 11223', callee: '+91 98980 22334', timestamp: '2025-02-28 22:15:00', duration: 184, callType: 'VOICE', tower: 'BTS Kalupur Tower 104', imei: '358901234567890' },
    { id: 'CALL-02', caller: '+91 98980 22334', callee: '+91 97120 33445', timestamp: '2025-02-28 22:45:00', duration: 92, callType: 'VOICE', tower: 'BTS Sector 7 Relay', imei: '358901234567890' },
    { id: 'CALL-03', caller: '+91 98250 11223', callee: '+91 98980 22334', timestamp: '2025-02-28 23:30:00', duration: 45, callType: 'SMS', tower: 'BTS Kalupur Tower 104', imei: '358901234567890' },
    { id: 'CALL-04', caller: '+91 97120 33445', callee: '+91 98980 22334', timestamp: '2025-02-28 23:55:00', duration: 210, callType: 'VOICE', tower: 'BTS Highway Node 09', imei: '354678129034561' },
  ]);

  const [newCaller, setNewCaller] = useState('+91 ');
  const [newCallee, setNewCallee] = useState('+91 ');
  const [newCallDuration, setNewCallDuration] = useState('120');
  const [newCallType, setNewCallType] = useState<CallRecord['callType']>('VOICE');
  const [newCallTower, setNewCallTower] = useState('BTS Kalupur Tower 104');
  const [newCallImei, setNewCallImei] = useState('358901234567890');
  const telecomFileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------------------------------
  // 7. Day-to-Day Case Diary (Sec 192 BNSS / 172 CrPC)
  // ----------------------------------------------------
  const [diaryList, setDiaryList] = useState<DailyDiaryEntry[]>([
    {
      id: 'DIARY-01',
      entryNumber: 1,
      date: '2025-02-28',
      time: '10:30',
      officerName: session.name,
      officerRank: session.rank,
      officerBadge: session.badge,
      locationVisited: `${session.departmentName}, Control Room`,
      actionTaken: 'Registered FIR based on secret intelligence regarding inter-state Hawala-backed burner phone ring. Formed special investigation squad.',
      investigationFindings: 'Identified primary suspect Tariq Mehmood @ Ustad. Initiated lawful telecom interception application under Sec 69 IT Act.',
      signatureHash: generateAuditHash(`DIARY_ENTRY_1_${session.badge}_FIR_LAUNCH`),
    },
    {
      id: 'DIARY-02',
      entryNumber: 2,
      date: '2025-03-01',
      time: '18:45',
      officerName: session.name,
      officerRank: session.rank,
      officerBadge: session.badge,
      locationVisited: 'Godown #4, Sector 7 Industrial Corridor',
      actionTaken: 'Executed raid along with beat staff. Intercepted suspect courier Imran Qureshi. Conducted spot search and seizure under Sec 105 BNSS.',
      investigationFindings: 'Recovered 3 dual-SIM handsets, 8 pre-activated SIM cards, and financial ledger showing smurfed UPI payouts. Handsets seized under Panchnama.',
      signatureHash: generateAuditHash(`DIARY_ENTRY_2_${session.badge}_RAID_GODOWN`),
    },
  ]);

  const [newDiaryAction, setNewDiaryAction] = useState('');
  const [newDiaryFindings, setNewDiaryFindings] = useState('');
  const [newDiaryLocation, setNewDiaryLocation] = useState(`${session.departmentName}`);
  const [newDiaryDate, setNewDiaryDate] = useState(new Date().toISOString().slice(0, 10));
  const [newDiaryTime, setNewDiaryTime] = useState('11:00');

  // ----------------------------------------------------
  // Handlers
  // ----------------------------------------------------

  // FIR File Upload
  const handleFirFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFirUploadedFile({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      hash: generateAuditHash(`${file.name}_${file.size}_${Date.now()}`),
      uploadedAt: new Date().toISOString(),
    });
  };

  // Add Document
  const handleAddDoc = () => {
    if (!newDocTitle.trim() || !newDocText.trim()) {
      alert('Please provide a document title and text narrative.');
      return;
    }
    // Count detected entities roughly
    const phoneMatches = newDocText.match(/(\+?91[\s-]?)?[6789]\d{9}/g) || [];
    const amountMatches = newDocText.match(/₹[\d,]+/g) || [];
    const entityCount = phoneMatches.length + amountMatches.length + 2;

    const docItem: StagedDoc = {
      id: `DOC-0${docsList.length + 1}`,
      title: newDocTitle.trim(),
      category: newDocCategory,
      officer: `${session.name} (${session.rank})`,
      text: newDocText.trim(),
      hash: generateAuditHash(newDocText),
      date: new Date().toISOString(),
      extractedEntities: entityCount,
    };
    setDocsList(prev => [docItem, ...prev]);
    setNewDocTitle('');
    setNewDocText('');
  };

  // Add Photo
  const handleAddPhotoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const photoItem: StagedPhoto = {
      id: `PHOTO-0${photosList.length + 1}`,
      name: file.name,
      category: newPhotoCategory,
      caption: newPhotoCaption.trim() || `Exhibit photo seized during investigation: ${file.name}`,
      geoCoords: newPhotoGeo,
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      hash: generateAuditHash(`${file.name}_${Date.now()}`),
      timestamp: new Date().toISOString(),
    };
    setPhotosList(prev => [photoItem, ...prev]);
    setNewPhotoCaption('');
  };

  // Add Video
  const handleAddVideo = () => {
    if (!newVideoName.trim() || !newVideoLocation.trim()) {
      alert('Please specify video filename and camera location.');
      return;
    }
    const videoItem: StagedVideo = {
      id: `VID-0${videosList.length + 1}`,
      name: newVideoName.trim(),
      source: newVideoSource,
      location: newVideoLocation.trim(),
      duration: newVideoDuration,
      observations: newVideoObservations.trim() || 'Footage verified under continuous electronic surveillance chain.',
      size: '42.8 MB',
      hash: generateAuditHash(`${newVideoName}_${Date.now()}`),
      timestamp: new Date().toISOString(),
    };
    setVideosList(prev => [videoItem, ...prev]);
    setNewVideoName('');
    setNewVideoLocation('');
    setNewVideoObservations('');
  };

  // Add Audio
  const handleAddAudio = () => {
    if (!newAudioName.trim() || !newAudioSpeakerA.trim()) {
      alert('Please specify audio filename and speaker details.');
      return;
    }
    const audioItem: StagedAudio = {
      id: `AUD-0${audiosList.length + 1}`,
      name: newAudioName.trim(),
      audioType: newAudioType,
      speakerA: newAudioSpeakerA.trim(),
      speakerB: newAudioSpeakerB.trim() || 'Unknown Respondent',
      duration: newAudioDuration,
      transcriptSummary: newAudioTranscript.trim() || 'Oral voice log recorded and verified under statutory conditions.',
      size: '2.1 MB',
      hash: generateAuditHash(`${newAudioName}_${Date.now()}`),
      timestamp: new Date().toISOString(),
    };
    setAudiosList(prev => [audioItem, ...prev]);
    setNewAudioName('');
    setNewAudioSpeakerA('');
    setNewAudioSpeakerB('');
    setNewAudioTranscript('');
  };

  // Add Call
  const handleAddCall = () => {
    if (!newCaller.trim() || !newCallee.trim()) {
      alert('Please enter both calling and called numbers.');
      return;
    }
    const record: CallRecord = {
      id: `CALL-0${callsList.length + 1}`,
      caller: newCaller.trim(),
      callee: newCallee.trim(),
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      duration: parseInt(newCallDuration) || 60,
      callType: newCallType,
      tower: newCallTower,
      imei: newCallImei,
    };
    setCallsList(prev => [...prev, record]);
  };

  // Load sample realistic telecom dump
  const handleLoadSampleCalls = () => {
    const extraCalls: CallRecord[] = [
      { id: `CALL-${Date.now()}-1`, caller: '+91 98250 11223', callee: '+91 98980 22334', timestamp: '2025-03-01 01:10:22', duration: 320, callType: 'VOICE', tower: 'BTS Kalupur Tower 104', imei: '358901234567890' },
      { id: `CALL-${Date.now()}-2`, caller: '+91 98980 22334', callee: '+91 97120 33445', timestamp: '2025-03-01 01:45:10', duration: 180, callType: 'VOICE', tower: 'BTS Sector 7 Relay', imei: '358901234567890' },
      { id: `CALL-${Date.now()}-3`, caller: '+91 97120 33445', callee: '+91 99090 55667', timestamp: '2025-03-01 02:15:00', duration: 60, callType: 'SMS', tower: 'BTS Highway Node 09', imei: '354678129034561' },
      { id: `CALL-${Date.now()}-4`, caller: '+91 98250 11223', callee: '+91 99090 55667', timestamp: '2025-03-01 02:50:40', duration: 410, callType: 'VOICE', tower: 'BTS Kalupur Tower 104', imei: '358901234567890' },
    ];
    setCallsList(prev => [...prev, ...extraCalls]);
  };

  // Add Day-to-Day Diary Entry
  const handleAddDiaryEntry = () => {
    if (!newDiaryAction.trim() || !newDiaryFindings.trim()) {
      alert('Please specify action taken and investigation findings for the day-to-day diary entry.');
      return;
    }
    const newEntry: DailyDiaryEntry = {
      id: `DIARY-${Date.now()}`,
      entryNumber: diaryList.length + 1,
      date: newDiaryDate,
      time: newDiaryTime,
      officerName: session.name,
      officerRank: session.rank,
      officerBadge: session.badge,
      locationVisited: newDiaryLocation.trim(),
      actionTaken: newDiaryAction.trim(),
      investigationFindings: newDiaryFindings.trim(),
      signatureHash: generateAuditHash(`DIARY_ENTRY_${diaryList.length + 1}_${newDiaryAction}_${Date.now()}`),
    };
    setDiaryList(prev => [newEntry, ...prev]);
    setNewDiaryAction('');
    setNewDiaryFindings('');
  };

  // ----------------------------------------------------
  // Synthesize Complete Case into TRINETRA
  // ----------------------------------------------------
  const handleSynthesizeAndLaunch = () => {
    const nodesMap = new Map<string, GraphNode>();
    const links: GraphLink[] = [];
    const timeline: TimelineEvent[] = [];
    const evidenceVault: EvidenceItem[] = [];

    // 1. Ingest FIR as Evidence Item
    if (firUploadedFile) {
      evidenceVault.push({
        id: 'EXHIBIT-FIR-01',
        title: `First Information Report (FIR): ${firNumber}`,
        type: 'FIR_DOCUMENT',
        fileSize: firUploadedFile.size,
        sha256: firUploadedFile.hash,
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: firUploadedFile.uploadedAt,
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: 5,
        summaryText: `FIR registered under ${firSections} at ${firStation}. Gist: ${firGist}`,
        fileCategory: 'FIR',
      });
    }

    // 2. Ingest Case Documents
    docsList.forEach((doc, idx) => {
      evidenceVault.push({
        id: `EXHIBIT-DOC-${idx + 1}`,
        title: doc.title,
        type: 'CASE_DOCUMENT',
        fileSize: '14.5 KB',
        sha256: doc.hash,
        uploadedBy: doc.officer,
        uploadedAt: doc.date,
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: doc.extractedEntities,
        summaryText: doc.text.slice(0, 180) + '...',
        fileCategory: 'DOCUMENT',
      });
    });

    // 3. Ingest Photos
    photosList.forEach((photo, idx) => {
      evidenceVault.push({
        id: `EXHIBIT-PHOTO-${idx + 1}`,
        title: `Photo Exhibit: ${photo.name} (${photo.category})`,
        type: 'CRIME_PHOTO',
        fileSize: photo.size,
        sha256: photo.hash,
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: photo.timestamp,
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: 1,
        summaryText: `${photo.caption} | Geo: ${photo.geoCoords}`,
        fileCategory: 'PHOTO',
      });
    });

    // 4. Ingest Videos
    videosList.forEach((vid, idx) => {
      evidenceVault.push({
        id: `EXHIBIT-VID-${idx + 1}`,
        title: `Video Surveillance Exhibit: ${vid.name}`,
        type: 'CCTV_VIDEO',
        fileSize: vid.size,
        sha256: vid.hash,
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: vid.timestamp,
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: 2,
        summaryText: `Camera: ${vid.location} (${vid.source}). Duration: ${vid.duration}. Observations: ${vid.observations}`,
        fileCategory: 'VIDEO',
      });
    });

    // 5. Ingest Audios
    audiosList.forEach((aud, idx) => {
      evidenceVault.push({
        id: `EXHIBIT-AUD-${idx + 1}`,
        title: `Audio Intercept Exhibit: ${aud.name}`,
        type: 'AUDIO_RECORDING',
        fileSize: aud.size,
        sha256: aud.hash,
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: aud.timestamp,
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: 2,
        summaryText: `Speakers: ${aud.speakerA} <-> ${aud.speakerB}. Duration: ${aud.duration}. Transcript: ${aud.transcriptSummary}`,
        fileCategory: 'AUDIO',
      });
    });

    // 6. Ingest Telephone Call Records into Evidence Vault
    if (callsList.length > 0) {
      evidenceVault.push({
        id: 'EXHIBIT-TELECOM-CDR',
        title: `Telephone & Call Detail Records List (${callsList.length} Sessions)`,
        type: 'TELEPHONE_LIST',
        fileSize: `${(callsList.length * 0.8).toFixed(1)} KB`,
        sha256: generateAuditHash(`TELECOM_CDR_LIST_${callsList.length}_RECORDS`),
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: callsList.length * 2,
        summaryText: `Ingested ${callsList.length} telephone calls across cell towers and burner IMEI devices.`,
        fileCategory: 'TELEPHONE',
      });
    }

    // 7. Ingest Day-to-Day Case Diary into Evidence Vault
    if (diaryList.length > 0) {
      evidenceVault.push({
        id: 'EXHIBIT-DAY-TO-DAY-DIARY',
        title: `Daily Case Diary (Sec 192 BNSS / 172 CrPC Roznamcha - ${diaryList.length} Entries)`,
        type: 'DAILY_CASE_DIARY',
        fileSize: `${(diaryList.length * 3.2).toFixed(1)} KB`,
        sha256: generateAuditHash(`DAILY_DIARY_${diaryList.length}_ENTRIES`),
        uploadedBy: `${session.name} [${session.badge}]`,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        caseRef: firNumber,
        jurisdictionOrigin: firStation,
        extractedEntitiesCount: diaryList.length,
        summaryText: `Comprehensive day-to-day statutory investigation diary containing ${diaryList.length} chronologically sealed entries.`,
        fileCategory: 'DIARY',
      });
    }

    // Build Suspect Nodes from FIR
    const suspects: Array<{ id: string; label: string; community: NodeCommunity }> = [
      { id: 'SUSPECT_TARIQ', label: 'Tariq Mehmood @ Ustad', community: 'Core Command & Masterminds' },
      { id: 'SUSPECT_IMRAN', label: 'Imran Qureshi @ Chota', community: 'Logistics & Procurement' },
      { id: 'SUSPECT_KABIR', label: 'Kabir Varma @ Rider', community: 'Ground Enforcement & Field' },
    ];
    suspects.forEach(s => {
      nodesMap.set(s.id, {
        id: s.id,
        label: s.label,
        type: 'SUSPECT',
        community: s.community,
        degree: 0,
        betweenness: 0,
        pageRank: 0,
        isCutVertex: false,
        isKingpin: false,
        metadata: { roleDesc: s.community },
      });
    });

    // Build Nodes & Links from Telephone Call List
    callsList.forEach((c, idx) => {
      // Caller Phone Node
      const callerId = `PHONE-${c.caller.replace(/[^0-9]/g, '')}`;
      if (!nodesMap.has(callerId)) {
        nodesMap.set(callerId, {
          id: callerId,
          label: c.caller,
          type: 'PHONE',
          community: 'Core Command & Masterminds',
          degree: 0,
          betweenness: 0,
          pageRank: 0,
          isCutVertex: false,
          isKingpin: false,
          metadata: { msisdn: c.caller },
        });
      }

      // Callee Phone Node
      const calleeId = `PHONE-${c.callee.replace(/[^0-9]/g, '')}`;
      if (!nodesMap.has(calleeId)) {
        nodesMap.set(calleeId, {
          id: calleeId,
          label: c.callee,
          type: 'PHONE',
          community: 'Core Command & Masterminds',
          degree: 0,
          betweenness: 0,
          pageRank: 0,
          isCutVertex: false,
          isKingpin: false,
          metadata: { msisdn: c.callee },
        });
      }

      // Call Link
      links.push({
        id: `CALL-LINK-${idx}`,
        source: callerId,
        target: calleeId,
        type: 'CALLS',
        weight: 1,
        details: `${c.callType} call (${c.duration}s) via ${c.tower}`,
        evidenceRef: `CDR-${c.id}`,
      });

      // IMEI Node & Link
      if (c.imei) {
        const imeiId = `IMEI-${c.imei}`;
        if (!nodesMap.has(imeiId)) {
          nodesMap.set(imeiId, {
            id: imeiId,
            label: `IMEI: ${c.imei}`,
            type: 'IMEI',
            community: 'Ground Enforcement & Field',
            degree: 0,
            betweenness: 0,
            pageRank: 0,
            isCutVertex: false,
            isKingpin: false,
            metadata: { imei: c.imei },
          });
        }
        links.push({
          id: `IMEI-LINK-${idx}`,
          source: callerId,
          target: imeiId,
          type: 'SHARED_IMEI',
          weight: 1,
          details: 'Handset activation log',
          evidenceRef: `IMEI-SLOT-${c.id}`,
        });
      }

      // Tower Node & Link
      if (c.tower) {
        const towerId = `TOWER-${c.tower.replace(/[^a-zA-Z0-9]/g, '')}`;
        if (!nodesMap.has(towerId)) {
          nodesMap.set(towerId, {
            id: towerId,
            label: c.tower,
            type: 'LOCATION',
            community: 'Ground Enforcement & Field',
            degree: 0,
            betweenness: 0,
            pageRank: 0,
            isCutVertex: false,
            isKingpin: false,
            metadata: { locationName: c.tower, lat: 23.0225, lng: 72.5714 },
          });
        }
        links.push({
          id: `TWR-LINK-${idx}`,
          source: callerId,
          target: towerId,
          type: 'TOWER_PING',
          weight: 1,
          details: `Cell tower ping at ${c.timestamp}`,
          evidenceRef: `BTS-${c.id}`,
        });
      }
    });

    // Link suspects to phones
    links.push({
      id: 'AFFIL-1',
      source: 'SUSPECT_TARIQ',
      target: `PHONE-${callsList[0]?.caller.replace(/[^0-9]/g, '') || '9825011223'}`,
      type: 'COORDINATES_WITH',
      weight: 2,
      details: 'Primary subscriber identified in wiretap intelligence',
      evidenceRef: 'EXHIBIT-AUD-1',
    });
    links.push({
      id: 'AFFIL-2',
      source: 'SUSPECT_IMRAN',
      target: `PHONE-${callsList[0]?.callee.replace(/[^0-9]/g, '') || '9898022334'}`,
      type: 'COORDINATES_WITH',
      weight: 2,
      details: 'Courier handset recovered in spot seizure',
      evidenceRef: 'EXHIBIT-DOC-1',
    });

    // Financial Smurfing Node & Link
    const finId = 'FIN-UPI-FALCON';
    nodesMap.set(finId, {
      id: finId,
      label: 'falcon.smurf@okhdfcbank',
      type: 'FINANCIAL',
      community: 'Hawala Layering Cell',
      degree: 0,
      betweenness: 0,
      pageRank: 0,
      isCutVertex: false,
      isKingpin: false,
      metadata: { vpa: 'falcon.smurf@okhdfcbank' },
    });
    links.push({
      id: 'LINK-FIN-1',
      source: `PHONE-${callsList[0]?.callee.replace(/[^0-9]/g, '') || '9898022334'}`,
      target: finId,
      type: 'TRANSFERS_FUNDS',
      weight: 1,
      amount: 48500,
      details: 'Smurfed payout ₹48,500 recorded in seizure Panchnama',
      evidenceRef: 'EXHIBIT-DOC-2',
    });

    // Build Chronological Timeline from Diary, Videos & Calls
    diaryList.forEach((d, idx) => {
      timeline.push({
        id: `TL-DIARY-${idx}`,
        timestamp: `${d.date}T${d.time || '12:00'}:00.000Z`,
        timeLabel: `Day ${d.entryNumber}`,
        location: d.locationVisited,
        lat: 23.0225 + idx * 0.008,
        lng: 72.5714 + idx * 0.006,
        title: `Diary Entry #${d.entryNumber}: ${d.actionTaken.slice(0, 40)}...`,
        description: `${d.actionTaken} | Findings: ${d.investigationFindings}`,
        nodeIds: ['SUSPECT_TARIQ', 'SUSPECT_IMRAN'],
        type: 'SAFEHOUSE_MEET',
      });
    });

    // Construct Complete Case
    const rawCase: Partial<CaseData> = {
      id: `CASE-${Date.now()}`,
      caseNumber: firNumber,
      title: caseMetadata.caseTitle,
      jurisdiction: firStation,
      primaryTenant: session.agency,
      sharedWithTenants: [session.agency, 'CID'],
      classification: caseMetadata.classification,
      status: 'ACTIVE_TRIANGULATION',
      leadInvestigator: `${session.name} (${session.rank})`,
      description: `${caseMetadata.caseDescription} | Sections: ${firSections}`,
      incidentDate: firDate,
      nodes: Array.from(nodesMap.values()),
      links,
      timeline,
      evidenceVault,
      dailyDiary: diaryList,
      tickets: [],
      sha256Seal: generateAuditHash(`${firNumber}_${session.govId}_${nodesMap.size}_${Date.now()}`),
      escalationLog: [
        {
          timestamp: new Date().toISOString(),
          action: `Ingested via Role-Based Multi-Source Gateway (${currentProfile.title})`,
          authorizedBy: `${session.name} [${session.badge}], ${session.rank}`,
          orderReference: `STATUTORY-RECORD-${firNumber}`,
        },
      ],
    };

    const enriched = enrichCaseWithAlgorithms(rawCase as any);
    onCaseSynthesized(enriched);
  };

  // Categories list with count and recommendation check
  const categories: Array<{
    id: CategoryTab;
    label: string;
    icon: React.ReactNode;
    count: number;
    recommended: boolean;
  }> = [
    { id: 'FIR', label: '1. FIR File & Registration', icon: <FileText className="w-4 h-4" />, count: firUploadedFile ? 1 : 0, recommended: currentProfile.recommendedCategories.includes('FIR') },
    { id: 'DOCS', label: '2. Case Related Documents (Text)', icon: <Layers className="w-4 h-4" />, count: docsList.length, recommended: currentProfile.recommendedCategories.includes('DOCS') },
    { id: 'PHOTOS', label: '3. Evidence Photos', icon: <Camera className="w-4 h-4" />, count: photosList.length, recommended: currentProfile.recommendedCategories.includes('PHOTOS') },
    { id: 'VIDEOS', label: '4. Video Recordings', icon: <Video className="w-4 h-4" />, count: videosList.length, recommended: currentProfile.recommendedCategories.includes('VIDEOS') },
    { id: 'AUDIO', label: '5. Audio Recordings', icon: <Mic className="w-4 h-4" />, count: audiosList.length, recommended: currentProfile.recommendedCategories.includes('AUDIO') },
    { id: 'TELECOM', label: '6. Telephone / Phone Call List', icon: <PhoneCall className="w-4 h-4" />, count: callsList.length, recommended: currentProfile.recommendedCategories.includes('TELECOM') },
    { id: 'DIARY', label: '7. Day-to-Day Case Diary', icon: <Calendar className="w-4 h-4" />, count: diaryList.length, recommended: currentProfile.recommendedCategories.includes('DIARY') },
  ];

  const visibleCategories = filterByRole
    ? categories.filter(c => c.recommended)
    : categories;

  return (
    <div className="space-y-6 animate-fadeIn font-mono">
      {/* ---------------------------------------------------- */}
      {/* Operational System Role Perspective Bar               */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Shield className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Operational System Role Submission Context
              </span>
              <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded font-bold">
                ACTIVE: {activeRole.replace('_', ' ')}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              File & document upload options are dynamically tailored to the designated operational responsibilities of the officer.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Perspective:</span>
            <select
              value={activeRole}
              onChange={e => setActiveRole(e.target.value as UserRole)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs font-bold focus:outline-none focus:border-blue-500"
            >
              {positionsList.map(pos => (
                <option key={pos.id} value={pos.role}>
                  {pos.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowManagePositionsModal(true)}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 hover:bg-slate-800 transition-colors"
              title="Manage and delete case operational positions"
            >
              <Settings2 className="w-3.5 h-3.5 text-blue-400" />
              <span>Positions ({positionsList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterByRole(!filterByRole)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                filterByRole
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{filterByRole ? 'Filtered to Role Mandate' : 'Show All Categories'}</span>
            </button>
          </div>
        </div>

        {/* Manage & Delete Positions Modal */}
        {showManagePositionsModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn font-mono">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-blue-950 border border-blue-800 text-blue-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      Operational Positions & Roles Management
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Configure and delete operational positions authorized to submit evidence for this case.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManagePositionsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-5 flex-1">
                {/* Positions List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Configured Positions ({positionsList.length})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Click trash icon to delete redundant or unassigned positions
                    </span>
                  </div>

                  {posDeleteNotice && (
                    <div className="p-2.5 rounded-lg bg-amber-950/70 border border-amber-700 text-amber-300 text-xs font-mono">
                      {posDeleteNotice}
                    </div>
                  )}

                  <div className="space-y-2">
                    {positionsList.map(pos => (
                      <div
                        key={pos.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-white text-xs">{pos.title}</span>
                            <span className="text-[10px] font-mono uppercase bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded">
                              {pos.role.replace('_', ' ')}
                            </span>
                            {pos.isCustom && (
                              <span className="text-[9px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{pos.description}</p>
                        </div>

                        {/* Delete Position Button / Inline Confirm */}
                        {posToDelete?.id === pos.id ? (
                          <div className="flex items-center space-x-1.5 shrink-0 bg-red-950/80 p-1.5 rounded-lg border border-red-800">
                            <button
                              type="button"
                              onClick={() => setPosToDelete(null)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => confirmDeletePosition(pos.id)}
                              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold cursor-pointer"
                            >
                              Confirm
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPosToDelete(pos)}
                            className="px-2.5 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-400 hover:text-white border border-red-800/80 transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer"
                            title={`Delete position: ${pos.title}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            <span className="text-[11px] font-bold">Delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Custom Position Form */}
                <form
                  onSubmit={handleAddCustomPosition}
                  className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-200">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>ADD CUSTOM INVESTIGATION POSITION</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Position / Designation Title *</label>
                      <input
                        type="text"
                        value={newPositionTitle}
                        onChange={e => setNewPositionTitle(e.target.value)}
                        placeholder="e.g. Anti-Narcotics Special Squad Lead"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Base System RBAC Role *</label>
                      <select
                        value={newPositionRole}
                        onChange={e => setNewPositionRole(e.target.value as UserRole)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="LEAD_INVESTIGATOR">Lead Investigator (All Modules)</option>
                        <option value="FIELD_BEAT_OFFICER">Field Beat Officer (Field Mobile & Photos)</option>
                        <option value="CYBER_PERSONNEL">Cyber Analyst (15GB Streamer & Graph)</option>
                        <option value="FORENSIC_PERSONNEL">Forensic Custodian (Vault & Seals)</option>
                        <option value="DEPT_ADMIN">Department Administrator (Supervisory)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Mandate & Responsibilities</label>
                    <input
                      type="text"
                      value={newPositionDesc}
                      onChange={e => setNewPositionDesc(e.target.value)}
                      placeholder="e.g. In charge of seizing financial ledgers and tracking smurfed UPI VPAs."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-colors shadow-lg shadow-emerald-900/30"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Position to Case</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowManagePositionsModal(false)}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold uppercase transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Mandate Highlight Banner */}
        <div className="mt-3 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg flex items-start space-x-3 text-xs">
          <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-white">{currentProfile.title}</span>
              <span className="text-blue-300 text-[11px]">• {currentProfile.designationScope}</span>
              <span className="text-[10px] text-amber-300 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.2 rounded ml-auto">
                Statutory: {currentProfile.legalAuthority}
              </span>
            </div>
            <p className="text-slate-300 text-[11px]">
              {currentProfile.summary}
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* Category Navigation Tabs                              */}
      {/* ---------------------------------------------------- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {visibleCategories.map(cat => {
          const isSelected = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-900/30 ring-1 ring-blue-400'
                  : 'bg-slate-900/80 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={isSelected ? 'text-white' : 'text-blue-400'}>
                  {cat.icon}
                </span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isSelected
                      ? 'bg-blue-900 text-white'
                      : cat.count > 0
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-950 text-slate-500'
                  }`}
                >
                  {cat.count}
                </span>
              </div>
              <div className="text-xs font-bold leading-tight line-clamp-2">
                {cat.label}
              </div>
              {cat.recommended && (
                <span className="text-[9px] font-mono text-amber-300 mt-1 block">
                  ★ Role Priority
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---------------------------------------------------- */}
      {/* Category 1: FIR File & Crime Registration            */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'FIR' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>FIRST INFORMATION REPORT (FIR) & STATUTORY CRIME INTAKE</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload signed FIR document and enter primary legal registration metadata.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              Sec 154 CrPC / Sec 173 BNSS
            </span>
          </div>

          {/* FIR Document File Upload Box */}
          <div
            onClick={() => firFileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/60 hover:bg-slate-950 rounded-xl p-6 text-center cursor-pointer transition-all group"
          >
            <input
              ref={firFileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg"
              className="hidden"
              onChange={handleFirFileUpload}
            />
            <div className="w-12 h-12 rounded-xl bg-blue-950 text-blue-400 border border-blue-800 flex items-center justify-center mx-auto mb-2 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div className="font-bold text-white text-xs">
              {firUploadedFile ? 'REPLACE ATTACHED FIR DOCUMENT' : 'CLICK TO UPLOAD OFFICIAL FIR FILE (PDF / SCANNED COPY)'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Supports scanned PDF, DOCX, TIFF, or image format up to 50MB with SHA-256 seal.
            </div>
          </div>

          {firUploadedFile && (
            <div className="p-3 bg-slate-950 border border-emerald-800/80 rounded-lg flex items-center justify-between text-xs">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-bold text-white">{firUploadedFile.name}</div>
                  <div className="text-[11px] text-slate-400">
                    Size: {firUploadedFile.size} • Uploaded by {session.name} [{session.badge}]
                  </div>
                  <div className="text-[10px] text-amber-400 select-all">
                    SHA-256 SEAL: {firUploadedFile.hash}
                  </div>
                </div>
              </div>
              <span className="text-emerald-400 text-[11px] font-bold px-2 py-1 bg-emerald-950 rounded border border-emerald-800">
                ATTACHED & VERIFIED
              </span>
            </div>
          )}

          {/* Structured FIR Input Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <label className="text-slate-400 block mb-1">FIR / CRIME NUMBER *</label>
              <input
                type="text"
                value={firNumber}
                onChange={e => setFirNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">POLICE STATION / JURISDICTION *</label>
              <input
                type="text"
                value={firStation}
                onChange={e => setFirStation(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">DATE & TIME OF REGISTRATION</label>
              <input
                type="datetime-local"
                value={firDate}
                onChange={e => setFirDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-slate-400 block mb-1">PENAL ACTS & STATUTORY SECTIONS *</label>
              <input
                type="text"
                value={firSections}
                onChange={e => setFirSections(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-bold text-blue-400"
              />
            </div>
            <div>
              <label className="text-slate-400 block mb-1">COMPLAINANT / INFORMANT</label>
              <input
                type="text"
                value={firComplainant}
                onChange={e => setFirComplainant(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-slate-400 block mb-1">NAMED ACCUSED / SUSPECTS</label>
              <input
                type="text"
                value={firAccused}
                onChange={e => setFirAccused(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-slate-400 block mb-1">GIST OF INCIDENT / ALLEGATION</label>
              <textarea
                rows={3}
                value={firGist}
                onChange={e => setFirGist(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 2: Case Related Documents (Text)            */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'DOCS' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span>CASE RELATED DOCUMENTS & TEXT MEMOS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Submit Panchnamas, witness statements, remand reports, or intelligence intercept summaries.
              </p>
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
              Sec 105 BNSS / Sec 180 BNSS
            </span>
          </div>

          {/* New Document Entry Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add New Case Related Document / Statement</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">DOCUMENT CATEGORY *</label>
                <select
                  value={newDocCategory}
                  onChange={e => setNewDocCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="PANCHNAMA_SEIZURE">Search / Seizure Panchnama (Sec 105 BNSS)</option>
                  <option value="WITNESS_STATEMENT">Witness Statement (Sec 180 BNSS / 161 CrPC)</option>
                  <option value="CHARGE_SHEET">Final Report / Charge Sheet Draft (Sec 193 BNSS)</option>
                  <option value="FSL_REPORT">FSL Forensic Examination Memo</option>
                  <option value="COURT_REMAND">Police Remand Application</option>
                  <option value="INTEL_INTERCEPT">Confidential Intercept Intelligence Memo</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">DOCUMENT TITLE / REFERENCE *</label>
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                  placeholder="e.g. Panchnama of Recovered Burner SIM Cards from Courier Hideout"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-slate-400 block mb-1">DOCUMENT NARRATIVE / EXTRACTED TEXT *</label>
                <textarea
                  rows={4}
                  value={newDocText}
                  onChange={e => setNewDocText(e.target.value)}
                  placeholder="Paste or type document text. TRINETRA will automatically identify mobile numbers, suspect aliases, vehicle registration plates, and financial VPAs to map them into the intelligence graph."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddDoc}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Document to Dossier</span>
              </button>
            </div>
          </div>

          {/* Staged Documents List */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-300 uppercase">
              Staged Case Documents ({docsList.length})
            </div>
            {docsList.map(doc => (
              <div
                key={doc.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{doc.title}</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-bold">
                      {doc.category}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDocsList(prev => prev.filter(d => d.id !== doc.id))}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-slate-300 text-[11px] line-clamp-2">
                  {doc.text}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
                  <span>Signed: {doc.officer}</span>
                  <span className="text-amber-400">SHA-256: {doc.hash.slice(0, 20)}...</span>
                  <span className="text-emerald-400 font-bold">{doc.extractedEntities} ENTITIES DETECTED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 3: Evidence Photos                          */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'PHOTOS' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Camera className="w-4 h-4 text-blue-400" />
                <span>CRIME SCENE & FORENSIC EVIDENCE PHOTOS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload photographs of crime scenes, seized firearms/weapons, contraband, license plates, or suspect mugshots.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              Sec 65B Certified Media
            </span>
          </div>

          {/* Upload New Photo Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Attach Crime Scene Photograph</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">PHOTO CLASSIFICATION *</label>
                <select
                  value={newPhotoCategory}
                  onChange={e => setNewPhotoCategory(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="CRIME_SCENE">Crime Scene In-Situ</option>
                  <option value="WEAPON">Seized Weapon / Firearm</option>
                  <option value="CONTRABAND">Recovered Hawala Cash / Contraband</option>
                  <option value="VEHICLE_PLATE">Vehicle License Plate / Chassis</option>
                  <option value="FINGERPRINT">Latent Fingerprint / Footwear</option>
                  <option value="MUGSHOT">Suspect Mugshot / Identification</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">GEO-COORDINATES / LOCATION</label>
                <input
                  type="text"
                  value={newPhotoGeo}
                  onChange={e => setNewPhotoGeo(e.target.value)}
                  placeholder="e.g. 23.0225° N, 72.5714° E"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CAPTION / OBSERVATION *</label>
                <input
                  type="text"
                  value={newPhotoCaption}
                  onChange={e => setNewPhotoCaption(e.target.value)}
                  placeholder="e.g. In-situ seizure of dual-SIM handsets"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <input
                ref={photoFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAddPhotoFile}
              />
              <button
                type="button"
                onClick={() => photoFileInputRef.current?.click()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <UploadCloud className="w-4 h-4 text-blue-400" />
                <span>Select Image File from Device</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!newPhotoCaption.trim()) {
                    alert('Please enter a caption for the simulated photo exhibit.');
                    return;
                  }
                  const item: StagedPhoto = {
                    id: `PHOTO-0${photosList.length + 1}`,
                    name: `exhibit_photo_${Date.now().toString().slice(-4)}.jpg`,
                    category: newPhotoCategory,
                    caption: newPhotoCaption.trim(),
                    geoCoords: newPhotoGeo,
                    size: '2.8 MB',
                    hash: generateAuditHash(`PHOTO_${Date.now()}_${newPhotoCaption}`),
                    timestamp: new Date().toISOString(),
                  };
                  setPhotosList(prev => [item, ...prev]);
                  setNewPhotoCaption('');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Attach Photo Exhibit</span>
              </button>
            </div>
          </div>

          {/* Photo Gallery Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {photosList.map(photo => (
              <div
                key={photo.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white truncate">{photo.name}</span>
                    <button
                      type="button"
                      onClick={() => setPhotosList(prev => prev.filter(p => p.id !== photo.id))}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-bold">
                      {photo.category}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center">
                      <MapPin className="w-2.5 h-2.5 mr-0.5" /> {photo.geoCoords}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1.5">
                    {photo.caption}
                  </p>
                </div>
                <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-900 flex justify-between">
                  <span>SIZE: {photo.size}</span>
                  <span className="text-amber-400">HASH: {photo.hash.slice(0, 16)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 4: Video Recordings                         */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'VIDEOS' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Video className="w-4 h-4 text-blue-400" />
                <span>VIDEO EVIDENCE & SURVEILLANCE FOOTAGE</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload or register traffic junction ANPR footage, shop CCTV footage, drone surveillance, or police bodycam recordings.
              </p>
            </div>
            <span className="text-[11px] font-mono text-blue-400 bg-blue-950/60 border border-blue-800 px-2 py-0.5 rounded">
              High-Resolution Video Vault
            </span>
          </div>

          {/* New Video Entry Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Register Video Surveillance Record</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">VIDEO FILENAME *</label>
                <input
                  type="text"
                  value={newVideoName}
                  onChange={e => setNewVideoName(e.target.value)}
                  placeholder="e.g. cctv_sector_7_crossing.mp4"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CAMERA SOURCE *</label>
                <select
                  value={newVideoSource}
                  onChange={e => setNewVideoSource(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="SHOP_CCTV">Commercial / Shop CCTV</option>
                  <option value="TRAFFIC_ANPR">Traffic Junction ANPR Camera</option>
                  <option value="BODYCAM">Officer Body-Worn Camera</option>
                  <option value="DRONE_SURVEY">Aerial Drone Surveillance</option>
                  <option value="MOBILE_SPOT">Mobile Phone Spot Recording</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CAMERA LOCATION / POLE ID *</label>
                <input
                  type="text"
                  value={newVideoLocation}
                  onChange={e => setNewVideoLocation(e.target.value)}
                  placeholder="e.g. Junction 14 Dome Camera"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">FOOTAGE DURATION</label>
                <input
                  type="text"
                  value={newVideoDuration}
                  onChange={e => setNewVideoDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">KEY OBSERVATIONS / TIMESTAMPED EVENTS</label>
                <input
                  type="text"
                  value={newVideoObservations}
                  onChange={e => setNewVideoObservations(e.target.value)}
                  placeholder="e.g. Suspect seen arriving on black motorcycle at 23:42 IST"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddVideo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Attach Video Footage</span>
              </button>
            </div>
          </div>

          {/* Staged Videos List */}
          <div className="space-y-2 pt-2">
            {videosList.map(vid => (
              <div
                key={vid.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{vid.name}</span>
                    <span className="text-[10px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-bold">
                      {vid.source}
                    </span>
                    <span className="text-[10px] text-slate-400">{vid.duration}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVideosList(prev => prev.filter(v => v.id !== vid.id))}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500 font-bold">Location:</span> {vid.location} • <span className="text-slate-500 font-bold">Observation:</span> {vid.observations}
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                  <span>SIZE: {vid.size}</span>
                  <span className="text-amber-400">SHA-256: {vid.hash.slice(0, 20)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 5: Audio Recordings                         */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'AUDIO' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Mic className="w-4 h-4 text-blue-400" />
                <span>AUDIO RECORDINGS & INTERCEPT TRANSCRIPTS</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Upload lawful telecom wiretap intercepts, Dial 100/112 emergency calls, or recorded oral depositions.
              </p>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded">
              Sec 69 IT Act / Sec 65B BSA
            </span>
          </div>

          {/* New Audio Entry Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Audio Recording & Transcript</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">AUDIO FILENAME *</label>
                <input
                  type="text"
                  value={newAudioName}
                  onChange={e => setNewAudioName(e.target.value)}
                  placeholder="e.g. wiretap_call_89.mp3"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">AUDIO CATEGORY *</label>
                <select
                  value={newAudioType}
                  onChange={e => setNewAudioType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="INTERCEPT_WIRETAP">Lawful Telecom Wiretap Intercept</option>
                  <option value="EMERGENCY_100">Dial 100 / 112 Emergency Call</option>
                  <option value="WITNESS_VOICE">Recorded Witness Oral Statement</option>
                  <option value="CONFESSION_MEMO">Undercover Wire Recording</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">RECORDING DURATION</label>
                <input
                  type="text"
                  value={newAudioDuration}
                  onChange={e => setNewAudioDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">SPEAKER A (CALLER / INTERVIEWEE) *</label>
                <input
                  type="text"
                  value={newAudioSpeakerA}
                  onChange={e => setNewAudioSpeakerA(e.target.value)}
                  placeholder="e.g. Tariq Mehmood (+91 98250 11223)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">SPEAKER B (CALLEE / OFFICER)</label>
                <input
                  type="text"
                  value={newAudioSpeakerB}
                  onChange={e => setNewAudioSpeakerB(e.target.value)}
                  placeholder="e.g. Imran Qureshi (+91 98980 22334)"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-slate-400 block mb-1">KEY TRANSCRIPT EXTRACT / CONVERSATION SUMMARY</label>
                <textarea
                  rows={2}
                  value={newAudioTranscript}
                  onChange={e => setNewAudioTranscript(e.target.value)}
                  placeholder="Enter verbatim transcript snippets or intelligence translation."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddAudio}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Attach Audio Recording</span>
              </button>
            </div>
          </div>

          {/* Staged Audio List */}
          <div className="space-y-2 pt-2">
            {audiosList.map(aud => (
              <div
                key={aud.id}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{aud.name}</span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-bold">
                      {aud.audioType}
                    </span>
                    <span className="text-[10px] text-slate-400">{aud.duration}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudiosList(prev => prev.filter(a => a.id !== aud.id))}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-[11px] text-slate-300">
                  <span className="text-slate-500 font-bold">Speakers:</span> {aud.speakerA} ↔ {aud.speakerB}
                </div>
                <div className="p-2 bg-slate-900/60 rounded border border-slate-800/80 text-[11px] text-slate-200 font-mono italic">
                  "{aud.transcriptSummary}"
                </div>
                <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-900">
                  <span>SIZE: {aud.size}</span>
                  <span className="text-amber-400">SHA-256: {aud.hash.slice(0, 20)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 6: Telephone / Phone Call List (CDR / SDR)   */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'TELECOM' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-blue-400" />
                <span>TELEPHONE & CALL DETAIL RECORDS (CDR / SDR LIST)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ingest telecom call lists, cell tower pings, and burner handset IMEI connections into network topology.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleLoadSampleCalls}
                className="px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 rounded-lg text-xs font-bold transition-colors"
              >
                + Load 4 Nocturnal Call Dumps
              </button>
            </div>
          </div>

          {/* Quick Call Add Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Add Telephone Call Record</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">CALLING NUMBER (A-PARTY) *</label>
                <input
                  type="text"
                  value={newCaller}
                  onChange={e => setNewCaller(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">CALLED NUMBER (B-PARTY) *</label>
                <input
                  type="text"
                  value={newCallee}
                  onChange={e => setNewCallee(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">DURATION (SECONDS)</label>
                <input
                  type="number"
                  value={newCallDuration}
                  onChange={e => setNewCallDuration(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">COMMUNICATION TYPE</label>
                <select
                  value={newCallType}
                  onChange={e => setNewCallType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                >
                  <option value="VOICE">VOICE CALL</option>
                  <option value="SMS">SMS TEXT</option>
                  <option value="VOLTE">VoLTE DATA CALL</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">CELL TOWER ID & AZIMUTH</label>
                <input
                  type="text"
                  value={newCallTower}
                  onChange={e => setNewCallTower(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-slate-400 block mb-1">DEVICE IMEI (15 DIGITS)</label>
                <input
                  type="text"
                  value={newCallImei}
                  onChange={e => setNewCallImei(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddCall}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Call Session to CDR Table</span>
              </button>
            </div>
          </div>

          {/* Staged Telephone Call Table */}
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <div className="p-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-slate-300 flex justify-between items-center">
              <span>Staged Call Detail Records ({callsList.length} Entries)</span>
              <span className="text-[10px] text-blue-400">Automatic Network Topology Mapping Active</span>
            </div>
            <div className="overflow-x-auto max-h-[300px]">
              <table className="w-full text-[11px] text-left">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 uppercase font-mono">
                  <tr>
                    <th className="p-2.5">Time</th>
                    <th className="p-2.5">Caller (A-Party)</th>
                    <th className="p-2.5">Callee (B-Party)</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Cell Tower</th>
                    <th className="p-2.5">IMEI</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {callsList.map((call, idx) => (
                    <tr key={call.id || idx} className="hover:bg-slate-900/40">
                      <td className="p-2.5 text-slate-400">{call.timestamp.slice(11, 19)}</td>
                      <td className="p-2.5 font-bold text-blue-400">{call.caller}</td>
                      <td className="p-2.5 font-bold text-emerald-400">{call.callee}</td>
                      <td className="p-2.5">
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px]">
                          {call.callType}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-300">{call.duration}s</td>
                      <td className="p-2.5 text-slate-400 truncate max-w-[150px]">{call.tower}</td>
                      <td className="p-2.5 text-amber-400">{call.imei}</td>
                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setCallsList(prev => prev.filter(c => c.id !== call.id))}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Category 7: Day-to-Day Case Diary (Sec 192 BNSS)      */}
      {/* ---------------------------------------------------- */}
      {activeCategory === 'DIARY' && (
        <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>DAY-TO-DAY INVESTIGATION CASE DIARY (ROZNAMCHA)</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Statutory day-to-day record of actions taken, locations visited, spot findings, and investigation progress.
              </p>
            </div>
            <span className="text-[11px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded">
              Sec 172 CrPC / Sec 192 BNSS Mandatory
            </span>
          </div>

          {/* New Daily Diary Entry Form */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-blue-400" />
              <span>File Day-to-Day Case Diary Entry #{diaryList.length + 1}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="text-slate-400 block mb-1">ENTRY DATE *</label>
                <input
                  type="date"
                  value={newDiaryDate}
                  onChange={e => setNewDiaryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">ENTRY TIME *</label>
                <input
                  type="time"
                  value={newDiaryTime}
                  onChange={e => setNewDiaryTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">STATION / SPOT / LOCATION VISITED *</label>
                <input
                  type="text"
                  value={newDiaryLocation}
                  onChange={e => setNewDiaryLocation(e.target.value)}
                  placeholder="e.g. Sector 7 Industrial Corridor"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">INVESTIGATING OFFICER (PREFILLED)</label>
                <input
                  type="text"
                  disabled
                  value={`${session.name} (${session.rank}) [${session.badge}]`}
                  className="w-full px-3 py-2 bg-slate-900/60 border border-slate-800 rounded-lg text-slate-400"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-slate-400 block mb-1">INVESTIGATION ACTION TAKEN TODAY *</label>
                <input
                  type="text"
                  value={newDiaryAction}
                  onChange={e => setNewDiaryAction(e.target.value)}
                  placeholder="e.g. Conducted raid at suspect safehouse, examined 2 independent witnesses, and retrieved CDR records from telecom nodal officer."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium"
                />
              </div>

              <div className="md:col-span-4">
                <label className="text-slate-400 block mb-1">DETAILED INVESTIGATION FINDINGS & OBSERVATIONS *</label>
                <textarea
                  rows={3}
                  value={newDiaryFindings}
                  onChange={e => setNewDiaryFindings(e.target.value)}
                  placeholder="Specify key intelligence unraveled, witness names recorded, exhibits recovered, or next statutory actions mandated."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={handleAddDiaryEntry}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center space-x-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Save Day-to-Day Diary Entry</span>
              </button>
            </div>
          </div>

          {/* Chronological Daily Diary Timeline */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold text-slate-300 uppercase">
              Chronological Case Diary Entries ({diaryList.length})
            </div>
            {diaryList.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs space-y-2 relative"
              >
                <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-400">
                      DIARY ENTRY #{entry.entryNumber}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-300">
                      {entry.date} {entry.time ? `• ${entry.time}` : ''}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-400 flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5 text-blue-400" />
                      {entry.locationVisited}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiaryList(prev => prev.filter(d => d.id !== entry.id))}
                    className="text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-400">Action Taken: </span>
                    <span className="text-white font-medium">{entry.actionTaken}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Findings: </span>
                    <span className="text-slate-300">{entry.investigationFindings}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900/80">
                  <span>Recorded by: {entry.officerName} ({entry.officerRank}) [Badge: {entry.officerBadge}]</span>
                  <span className="text-amber-400 font-mono">SEAL: {(entry.signatureHash || 'SEALED').slice(0, 20)}...</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* Bottom Sticky Action Bar: Review & Ingest Dossier     */}
      {/* ---------------------------------------------------- */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xl sticky bottom-4 z-40 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Staged Ingestion Summary:</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            FIR: <strong className="text-white">{firUploadedFile ? 1 : 0}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Docs: <strong className="text-white">{docsList.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Photos: <strong className="text-white">{photosList.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Videos: <strong className="text-white">{videosList.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Audio: <strong className="text-white">{audiosList.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Calls: <strong className="text-white">{callsList.length}</strong>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
            Diary: <strong className="text-white">{diaryList.length}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={handleSynthesizeAndLaunch}
          className="w-full md:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-900/40 transition-all text-xs"
        >
          <Sparkles className="w-4 h-4" />
          <span>Ingest & Commit Case into TRINETRA</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
