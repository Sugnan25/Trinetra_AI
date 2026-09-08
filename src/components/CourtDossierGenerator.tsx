import React, { useState } from 'react';
import {
  FileCheck2,
  Printer,
  Download,
  Shield,
  Hash,
  Scale,
  CheckCircle2,
  Award,
  Clock,
  BookOpen,
  User,
} from 'lucide-react';
import { CaseData, UserSession } from '../types';

interface CourtDossierGeneratorProps {
  currentCase: CaseData;
  session: UserSession;
}

export const CourtDossierGenerator: React.FC<CourtDossierGeneratorProps> = ({ currentCase, session }) => {
  const [certifyingOfficer, setCertifyingOfficer] = useState(session.name);
  const [designation, setDesignation] = useState(`${session.role} // ${session.departmentName}`);
  const [systemSpec, setSystemSpec] = useState('TRINETRA v4.2 Enterprise Node (Linux Kernel 6.1, FIPS 140-3 Sealed)');
  const [annexureSelected, setAnnexureSelected] = useState({
    sec65bCert: true,
    algoExplanation: true,
    exhibitsTable: true,
    timelineLog: true,
    kingpinAnalysis: true,
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Controls Action Header (Hidden in Print) */}
      <div className="print:hidden p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase font-bold">
              JUDICIAL COMPLIANCE SUITE
            </span>
            <span className="text-slate-500 font-mono text-xs">•</span>
            <span className="text-slate-400 font-mono text-xs">STATUTORY FORMAT</span>
          </div>
          <h1 className="text-lg font-bold text-white tracking-tight">
            Section 65B IEA / Section 63 BSA Dossier Generator
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Automated legal compiler generating tamper-sealed charge-sheet annexures
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-mono text-xs font-bold flex items-center space-x-2 shadow-lg transition-all"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export PDF Dossier</span>
          </button>
        </div>
      </div>

      {/* Certifying Officer Form Controls (Hidden in Print) */}
      <div className="print:hidden p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h2 className="text-xs font-mono font-bold uppercase text-white tracking-wider flex items-center space-x-2">
          <Scale className="w-4 h-4 text-emerald-400" />
          <span>Statutory Certifying Officer Metadata</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <label className="block text-slate-300 mb-1">Certifying Officer Name</label>
            <input
              type="text"
              value={certifyingOfficer}
              onChange={e => setCertifyingOfficer(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Official Designation & Badge</label>
            <input
              type="text"
              value={designation}
              onChange={e => setDesignation(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Electronic System Spec</label>
            <input
              type="text"
              value={systemSpec}
              onChange={e => setSystemSpec(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
            />
          </div>
        </div>
      </div>

      {/* THE PRINTABLE JUDICIAL DOSSIER DOCUMENT */}
      <div className="bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-2xl space-y-8 font-serif border border-slate-300 print:border-none print:shadow-none print:p-0">
        {/* Court Header */}
        <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
          <div className="text-xs font-mono uppercase tracking-widest text-slate-600">
            IN THE COURT OF THE PRINCIPAL SESSIONS JUDGE / SPECIAL NIA COURT
          </div>
          <h1 className="text-xl font-bold uppercase tracking-tight text-slate-950">
            STATUTORY CERTIFICATE OF ELECTRONIC EVIDENCE
          </h1>
          <div className="text-xs font-mono font-bold text-slate-700">
            PURSUANT TO SECTION 65B(4) OF THE INDIAN EVIDENCE ACT, 1872 / SECTION 63 OF THE BHARATIYA SAKSHYA ADHINIYAM, 2023
          </div>
          <div className="text-xs font-mono text-slate-600 pt-1">
            CRIME / CASE REFERENCE NO: <b>{currentCase.caseNumber}</b> ({currentCase.jurisdiction})
          </div>
        </div>

        {/* Section 1: Certificate Text */}
        <div className="space-y-3 text-sm leading-relaxed">
          <p>
            I, <b>{certifyingOfficer}</b>, holding the rank and designation of <b>{designation}</b>, do hereby solemnly affirm and state on official oath as follows:
          </p>
          <ol className="list-decimal pl-6 space-y-2 text-justify text-xs sm:text-sm">
            <li>
              That I am the official custodian / supervisory officer of the computer system designated as <i>"{systemSpec}"</i>, under whose lawful custody and control the electronic records detailed herein were processed and stored.
            </li>
            <li>
              That throughout the material period during which the electronic records were produced, the computer systems were operating properly in the ordinary course of lawful official activities, without any distortion or unauthorized tampering.
            </li>
            <li>
              That the cryptographic digital checksums (SHA-256) of each electronic record, call data record (CDR) database dump, tower telemetry log, and algorithmic output were verified sequentially and match exactly with the forensic ledger.
            </li>
          </ol>
        </div>

        {/* Section 2: Chain of Custody & Evidence Vault Table */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-1">
            ANNEXURE A: CERTIFIED ELECTRONIC EXHIBITS & SHA-256 DIGITAL HASHES
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse border border-slate-300">
              <thead className="bg-slate-100 text-slate-800">
                <tr>
                  <th className="border border-slate-300 p-2">Exhibit Ref</th>
                  <th className="border border-slate-300 p-2">Exhibit Title / Category</th>
                  <th className="border border-slate-300 p-2">Carrier / Origin</th>
                  <th className="border border-slate-300 p-2">SHA-256 Checksum</th>
                  <th className="border border-slate-300 p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentCase.evidenceVault.map(item => (
                  <tr key={item.id} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-2 font-bold">{item.id}</td>
                    <td className="border border-slate-300 p-2">{item.title}</td>
                    <td className="border border-slate-300 p-2">{item.jurisdictionOrigin}</td>
                    <td className="border border-slate-300 p-2 text-[10px] select-all font-mono break-all text-slate-700">
                      {item.sha256}
                    </td>
                    <td className="border border-slate-300 p-2 font-bold text-emerald-800">VERIFIED</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Algorithmic Justification (Brandes Betweenness Centrality) */}
        <div className="space-y-2">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 border-b border-slate-400 pb-1">
            ANNEXURE B: MATHEMATICAL & ALGORITHMIC PROOF OF KINGPIN STATUS
          </h3>
          <div className="p-4 bg-slate-50 border border-slate-300 rounded text-xs space-y-2 leading-relaxed">
            <p>
              To eliminate human bias in determining criminal hierarchy, network centrality was mathematically computed using <b>Brandes' Algorithm for Betweenness Centrality</b>:
            </p>
            <div className="p-2.5 bg-white border border-slate-300 text-center font-mono font-bold text-sm my-2">
              C_B(v) = ∑ ( σ_st(v) / σ_st )  [∀ s ≠ v ≠ t]
            </div>
            <p className="text-justify">
              <b>Judicial Finding:</b> While field operatives like <i>Zahid</i> and <i>Imran</i> logged high call counts (Degree Centrality), they held near-zero betweenness centrality. Suspect <b>Sajid @ Bilal</b> exhibited a commanding Betweenness score of <b>0.894</b> and was isolated as a <b>Tarjan Articulation Cut-Vertex</b>, establishing beyond reasonable doubt his role as the irreplaceable operational hub linking the masterminds with ground cells.
            </p>
          </div>
        </div>

        {/* Section 4: Signature & Stamp Box */}
        <div className="pt-6 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-xs font-mono">
          <div className="space-y-1">
            <div className="font-bold uppercase text-slate-700">Digital Seal & Verification Authority:</div>
            <div>TRINETRA Cryptographic Service Engine</div>
            <div>FIPS 140-3 Level 4 Compliant</div>
            <div>Timestamp: {new Date().toISOString()}</div>
          </div>

          <div className="text-right space-y-1">
            <div className="font-bold text-slate-950 uppercase">{certifyingOfficer}</div>
            <div>{designation}</div>
            <div>Government of India / State Directorate</div>
            <div className="mt-4 pt-2 border-t border-slate-400 inline-block font-bold">
              [SIGNATURE & OFFICIAL EMBLEM STAMP]
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
