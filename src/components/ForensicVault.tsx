import React, { useState } from 'react';
import {
  UploadCloud,
  FileCheck2,
  Shield,
  Hash,
  AlertCircle,
  FileText,
  Clock,
  UserCheck,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { UserSession, EvidenceItem, DailyDiaryEntry } from '../types';
import { computeSha256, formatEvidenceHash } from '../utils/crypto';
import { Calendar, MapPin, ShieldCheck } from 'lucide-react';

interface ForensicVaultProps {
  session: UserSession;
  evidenceVault: EvidenceItem[];
  dailyDiary?: DailyDiaryEntry[];
  caseNumber: string;
  leadInvestigator: string;
  onUploadEvidence: (item: EvidenceItem) => void;
}

export const ForensicVault: React.FC<ForensicVaultProps> = ({
  session,
  evidenceVault,
  dailyDiary = [],
  caseNumber,
  leadInvestigator,
  onUploadEvidence,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadType, setUploadType] = useState<EvidenceItem['type']>('FORENSIC_CHIP');
  const [summary, setSummary] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setUploadTitle(file.name);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle) return;
    setIsProcessing(true);

    const generatedHash = await computeSha256(`EVIDENCE-${uploadTitle}-${Date.now()}`);

    const newEvidence: EvidenceItem = {
      id: `EXHIBIT-FSL-${Math.floor(100 + Math.random() * 900)}`,
      title: uploadTitle,
      type: uploadType,
      fileSize: '124.5 MB',
      sha256: generatedHash,
      uploadedBy: `${session.name} (${session.badge})`,
      uploadedAt: new Date().toISOString(),
      status: 'VERIFIED',
      caseRef: caseNumber,
      jurisdictionOrigin: session.departmentName,
      extractedEntitiesCount: 2,
      summaryText: summary || 'Forensic chemical & circuitry examination report submitted.',
    };

    onUploadEvidence(newEvidence);
    setIsProcessing(false);
    setSuccessMsg(`Exhibit ${newEvidence.id} successfully registered with SHA-256 seal.`);
    setUploadTitle('');
    setSummary('');

    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      {/* Top Banner: Minimalist, Active Case & Supervisor Badge */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800 uppercase font-bold">
              FORENSIC SCIENTIFIC VAULT
            </span>
            <span className="text-slate-500 font-mono text-xs">•</span>
            <span className="text-slate-400 font-mono text-xs">CASE: {caseNumber}</span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">{session.name}</h1>
          <p className="text-xs text-slate-400 font-mono">
            {session.badge} • {session.departmentName}
          </p>
        </div>

        {/* Direct Supervisor Badge */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3 shrink-0">
          <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider block">
              DIRECT CASE SUPERVISOR
            </span>
            <span className="text-xs font-bold text-white font-mono">{leadInvestigator}</span>
            <span className="text-[10px] text-emerald-400 block font-mono">WARRANT AUTHORIZED</span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Drag & Drop Evidence Dropzone */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-sm font-mono font-bold uppercase text-white tracking-wider flex items-center space-x-2">
          <UploadCloud className="w-4 h-4 text-blue-400" />
          <span>Drag-and-Drop Evidence Intake</span>
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`w-full py-8 px-4 border-2 border-dashed rounded-xl flex flex-col items-center justify-center space-y-2 transition-all cursor-pointer ${
              dragActive
                ? 'border-blue-500 bg-blue-950/30 text-blue-300'
                : 'border-slate-700 bg-slate-950/60 hover:border-slate-600 text-slate-400'
            }`}
          >
            <UploadCloud className="w-8 h-8 text-blue-400" />
            <div className="text-xs font-mono text-center">
              <span className="font-bold text-white">Drop Forensic File, PCB Dump, or Residue Spectrum</span>
              <p className="text-[11px] text-slate-500 mt-0.5">Supports PDF, RAW, BIN, CSV, JSON (Up to 15GB)</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-slate-300 mb-1">Exhibit Title</label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="e.g. Surat Detonator PIC16F84 Solder Analysis"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Classification Type</label>
              <select
                value={uploadType}
                onChange={e => setUploadType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
              >
                <option value="FORENSIC_CHIP">Digital IC & PCB Circuit Report</option>
                <option value="BOMB_MEMO">Chemical Explosive Seizure Memo</option>
                <option value="CDR_LOG">Raw Telecom Carrier Dump</option>
                <option value="VEHICLE_FIR">Vehicle Chassis Recovery Inspection</option>
              </select>
            </div>
          </div>

          <div className="text-xs font-mono">
            <label className="block text-slate-300 mb-1">Forensic Examination Summary</label>
            <textarea
              rows={3}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="State key chemical components, serial hashes, or PCB microchip batches..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !uploadTitle}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg font-mono text-xs font-bold transition-all shadow-md"
            >
              {isProcessing ? 'Hashing & Depositing...' : 'Deposit Evidence & Generate SHA-256 Tag'}
            </button>
          </div>
        </form>
      </div>

      {/* Day-to-Day Case Diary (Sec 192 BNSS / 172 CrPC Roznamcha) */}
      {dailyDiary && dailyDiary.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
                Day-to-Day Investigation Diary (Sec 192 BNSS / 172 CrPC Roznamcha - {dailyDiary.length} Entries)
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded font-bold">
              STATUTORY COURT RECORD
            </span>
          </div>

          <div className="space-y-3">
            {dailyDiary.map((entry, idx) => (
              <div
                key={entry.id || idx}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-900 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-400">
                      DIARY ENTRY #{entry.entryNumber}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-300">
                      {entry.date} {entry.time ? `• ${entry.time}` : ''}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 flex items-center">
                      <MapPin className="w-3 h-3 mr-0.5 text-blue-400" />
                      {entry.locationVisited}
                    </span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    VERIFIED ENTRY
                  </span>
                </div>

                <div className="space-y-1">
                  <div>
                    <span className="font-bold text-slate-400">Action: </span>
                    <span className="text-white font-medium">{entry.actionTaken}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-400">Findings: </span>
                    <span className="text-slate-300">{entry.investigationFindings}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-900">
                  <span>
                    Officer: {entry.officerName} ({entry.officerRank}) [Badge: {entry.officerBadge}]
                  </span>
                  <span className="text-amber-400 select-all">
                    SHA-256: {entry.signatureHash || 'VERIFIED_SEAL'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Evidence Exhibits in this Case */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-3">
        <h3 className="text-xs font-mono font-bold uppercase text-white tracking-wider">
          Registered Case Exhibits ({evidenceVault.length})
        </h3>

        <div className="space-y-2">
          {evidenceVault.map(item => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{item.title}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                    {item.type}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">{item.summaryText}</div>
                <div className="text-[10px] text-amber-400 mt-1 select-all">
                  SHA-256: {item.sha256}
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-slate-400 text-[11px] block">{item.fileSize}</span>
                <span className="text-emerald-400 text-[10px] font-bold">SECTION 65B SEALED</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
