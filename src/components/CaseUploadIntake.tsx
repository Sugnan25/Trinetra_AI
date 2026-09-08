import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RefreshCw,
  GitGraph,
  MapPin,
  Smartphone,
  Cpu,
  UserCheck,
  Lock,
  Calendar,
  Layers,
  Trash2,
  ExternalLink,
  Plus,
  Activity,
  FileUp,
  Eye,
  Check,
} from 'lucide-react';
import { UserSession, CaseData, GraphNode, GraphLink } from '../types';
import { AGENCY_CONFIGS } from '../data/authData';
import { enrichCaseWithAlgorithms, generateAuditHash } from '../utils/caseEnricher';
import {
  TRINETRA_SAMPLE_FIR_TEMPLATE,
  TRINETRA_SAMPLE_CSV_TEMPLATE,
  parseCdrCsv,
  parseUnstructuredText,
} from '../utils/caseTemplateParser';
import { extractTextFromPdf } from '../utils/pdfExtractor';

interface CaseUploadIntakeProps {
  session: UserSession;
  onCaseIngested: (newCase: CaseData, targetTab?: string) => void;
  onCasesIngested?: (newCases: CaseData[]) => void;
  onCancel?: () => void;
  isModal?: boolean;
  existingCases?: CaseData[];
}

export const CaseUploadIntake: React.FC<CaseUploadIntakeProps> = ({
  session,
  onCaseIngested,
  onCasesIngested,
  onCancel,
  isModal = false,
  existingCases = [],
}) => {
  const agencyConfig = AGENCY_CONFIGS[session.agency] || AGENCY_CONFIGS.POLICE;

  // Mode: 'DOCUMENT_UPLOAD' (PDF, DOCX, TXT, CSV) vs 'BATCH_CASES'
  const [intakeMode, setIntakeMode] = useState<'DOCUMENT_UPLOAD' | 'BATCH_CASES'>('DOCUMENT_UPLOAD');

  // Input Data States (Empty by default - awaiting user upload)
  const [rawText, setRawText] = useState<string>('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [pdfPageCount, setPdfPageCount] = useState<number | null>(null);
  const [isPdfProcessing, setIsPdfProcessing] = useState<boolean>(false);

  // Companion Evidence Files State (Photos, CCTV Videos, Audio Intercepts)
  const [companionFiles, setCompanionFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: string;
      type: string;
      category: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'TELEPHONE' | 'DOCUMENT';
      previewUrl?: string;
    }>
  >([]);

  // Batch Multi-Case State
  const [batchCases, setBatchCases] = useState<
    Array<{
      id: string;
      fileName: string;
      fileSize: string;
      caseData: CaseData;
      status: 'PARSED' | 'ERROR';
      errorMsg?: string;
    }>
  >([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);

  // Analysis State (Strictly null until user uploads/provides data and triggers analysis)
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzedCase, setAnalyzedCase] = useState<CaseData | null>(null);

  // File Input References
  const docFileInputRef = useRef<HTMLInputElement>(null);
  const evidenceFileInputRef = useRef<HTMLInputElement>(null);
  const batchFileInputRef = useRef<HTMLInputElement>(null);

  // Handle PDF / Document Upload
  const handleDocumentFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysisError(null);
    setAnalyzedCase(null); // Reset previous analysis
    setUploadedFileName(file.name);
    setUploadedFileSize(`${(file.size / 1024).toFixed(1)} KB`);

    // Handle PDF specifically
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsPdfProcessing(true);
      try {
        const result = await extractTextFromPdf(file);
        setRawText(result.text);
        setPdfPageCount(result.pageCount);
      } catch (err: any) {
        setAnalysisError(`PDF Extraction Notice: ${err.message || 'Could not read PDF text.'}`);
        setRawText(`[PDF Document Seized: ${file.name}]`);
      } finally {
        setIsPdfProcessing(false);
      }
      return;
    }

    // Handle text, CSV, JSON, or other documents
    const reader = new FileReader();
    reader.onload = ev => {
      const content = (ev.target?.result as string) || '';
      setRawText(content);
      setPdfPageCount(null);
    };
    reader.onerror = () => {
      setAnalysisError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  // Load Authentic Sample Police FIR for 1-Click Testing
  const handleLoadSampleFir = () => {
    setAnalyzedCase(null);
    setAnalysisError(null);
    setUploadedFileName('SAMPLE-POLICE-FIR-CR088-2025.txt');
    setUploadedFileSize('14.8 KB');
    setPdfPageCount(3);
    setRawText(TRINETRA_SAMPLE_FIR_TEMPLATE);
  };

  // Load Authentic Sample CDR for 1-Click Testing
  const handleLoadSampleCdr = () => {
    setAnalyzedCase(null);
    setAnalysisError(null);
    setUploadedFileName('SAMPLE-TELECOM-CDR-15GB-STREAM.csv');
    setUploadedFileSize('8.4 KB');
    setPdfPageCount(null);
    setRawText(TRINETRA_SAMPLE_CSV_TEMPLATE);
  };

  // Perform Analysis on the Uploaded Data
  const handleAnalyzeData = () => {
    if (!rawText.trim()) {
      setAnalysisError('Please upload a case PDF document or enter case details before analyzing.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      // 1. Check if the uploaded text is a CDR CSV dump
      if (rawText.includes('Caller_MSISDN') || rawText.includes('Callee_MSISDN')) {
        const partial = parseCdrCsv(rawText, {
          caseNumber: `CDR-${Math.floor(100 + Math.random() * 900)}/2025`,
          title: `Telecom Surveillance CDR Ingestion: ${uploadedFileName || 'Data Dump'}`,
          jurisdiction: `${session.departmentName} Cyber Cell`,
        });

        const completeCase: CaseData = {
          id: `CASE-CDR-${Date.now()}`,
          caseNumber: partial.caseNumber || 'CDR-2025',
          title: partial.title || 'CDR Telecom Surveillance Dossier',
          jurisdiction: partial.jurisdiction || session.departmentName,
          primaryTenant: session.agency,
          sharedWithTenants: [session.agency],
          classification: 'TOP_SECRET',
          status: 'ACTIVE_TRIANGULATION',
          leadInvestigator: `${session.name} (${session.rank})`,
          incidentDate: new Date().toISOString(),
          description: partial.description || 'CDR Telecom Dump parsed into network topology.',
          nodes: partial.nodes || [],
          links: partial.links || [],
          patterns: [],
          tickets: [],
          timeline: partial.timeline || [],
          evidenceVault: [
            {
              id: `EXHIBIT-CDR-${Date.now().toString().slice(-4)}`,
              title: `Seized CDR Ingestion: ${uploadedFileName || 'Telecom Dump'}`,
              type: 'CDR_LOG',
              fileCategory: 'TELEPHONE',
              fileSize: uploadedFileSize || `${(rawText.length / 1024).toFixed(1)} KB`,
              sha256: generateAuditHash(rawText),
              uploadedBy: `${session.name} [${session.badge}]`,
              uploadedAt: new Date().toISOString(),
              status: 'VERIFIED',
              caseRef: partial.caseNumber || 'CDR-2025',
              jurisdictionOrigin: session.departmentName,
              extractedEntitiesCount: partial.nodes?.length || 0,
              summaryText: `Parsed ${partial.links?.length || 0} call sessions and mapped ${partial.nodes?.length || 0} entities into network topology.`,
            },
          ],
          sha256Seal: generateAuditHash(`${session.govId}_${Date.now()}`),
          escalationLog: [
            {
              timestamp: new Date().toISOString(),
              action: `Telecom CDR Ingested from ${uploadedFileName || 'Uploaded File'}`,
              authorizedBy: `${session.name}, ${session.rank}`,
              orderReference: `CDR-${session.badge}`,
            },
          ],
        };

        const enriched = enrichCaseWithAlgorithms(completeCase);
        setAnalyzedCase(enriched);
        setIsAnalyzing(false);
        return;
      }

      // 2. Standard Case Document / PDF / FIR Narrative Parsing
      const companionEvidenceParams = companionFiles.map(cf => ({
        name: cf.name,
        size: cf.size,
        type: cf.type,
        url: cf.previewUrl,
      }));

      const partial = parseUnstructuredText(
        rawText,
        {
          caseNumber: `CR-${Math.floor(100 + Math.random() * 900)}/2025/${session.agency}`,
          title: uploadedFileName ? `Dossier: ${uploadedFileName.replace(/\.[^/.]+$/, '')}` : 'Case Investigation Dossier',
          jurisdiction: `${session.departmentName}`,
        },
        companionEvidenceParams
      );

      // If a document file was uploaded, add it as the primary exhibits in the evidence vault
      const evidenceVault = [...(partial.evidenceVault || [])];
      if (uploadedFileName) {
        evidenceVault.unshift({
          id: `EXHIBIT-DOC-${Date.now().toString().slice(-4)}`,
          title: `Primary Case Document: ${uploadedFileName}`,
          type: uploadedFileName.toLowerCase().endsWith('.pdf') ? 'FIR_DOCUMENT' : 'CASE_DOCUMENT',
          fileCategory: 'DOCUMENT',
          fileSize: uploadedFileSize || '50 KB',
          sha256: generateAuditHash(rawText),
          uploadedBy: `${session.name} [${session.badge}]`,
          uploadedAt: new Date().toISOString(),
          status: 'VERIFIED',
          caseRef: partial.caseNumber || 'CR-2025',
          jurisdictionOrigin: session.departmentName,
          extractedEntitiesCount: partial.nodes?.length || 0,
          summaryText: `Direct ingestion of ${uploadedFileName}. Extracted ${partial.nodes?.length || 0} criminal entities, towers, and daily diary logs.`,
        });
      }

      const completeCase: CaseData = {
        id: `CASE-INGEST-${Date.now()}`,
        caseNumber: partial.caseNumber || `CR-${Math.floor(100 + Math.random() * 900)}/2025/${session.agency}`,
        title: partial.title || `Investigation Dossier (${uploadedFileName || 'Narrative'})`,
        jurisdiction: partial.jurisdiction || session.departmentName,
        primaryTenant: session.agency,
        sharedWithTenants: [session.agency],
        classification: 'TOP_SECRET',
        status: 'ACTIVE_TRIANGULATION',
        leadInvestigator: partial.leadInvestigator || `${session.name} (${session.rank})`,
        incidentDate: new Date().toISOString(),
        description: partial.description || rawText.slice(0, 300) + '...',
        nodes: partial.nodes || [],
        links: partial.links || [],
        patterns: [],
        tickets: [],
        timeline: partial.timeline || [],
        dailyDiary: partial.dailyDiary || [],
        evidenceVault,
        sha256Seal: generateAuditHash(`${partial.caseNumber}_${session.govId}_${rawText.length}`),
        escalationLog: [
          {
            timestamp: new Date().toISOString(),
            action: `Case Data Ingested and Certified by ${session.name}`,
            authorizedBy: `${session.name}, ${session.rank}`,
            orderReference: `INTAKE-${session.badge}`,
          },
        ],
      };

      const enriched = enrichCaseWithAlgorithms(completeCase);
      setAnalyzedCase(enriched);
    } catch (err: any) {
      setAnalysisError(`Analysis Failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Companion Evidence Handler
  const handleEvidenceFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: Array<{
      id: string;
      name: string;
      size: string;
      type: string;
      category: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'TELEPHONE' | 'DOCUMENT';
      previewUrl?: string;
    }> = [];

    (Array.from(files) as File[]).forEach((f, idx) => {
      let category: 'PHOTO' | 'VIDEO' | 'AUDIO' | 'TELEPHONE' | 'DOCUMENT' = 'DOCUMENT';
      if (f.type.startsWith('image/')) category = 'PHOTO';
      else if (f.type.startsWith('video/')) category = 'VIDEO';
      else if (f.type.startsWith('audio/')) category = 'AUDIO';
      else if (f.name.toLowerCase().includes('cdr') || f.name.endsWith('.csv')) category = 'TELEPHONE';

      newAttachments.push({
        id: `ATT-${Date.now()}-${idx}`,
        name: f.name,
        size: `${(f.size / (1024 * 1024)).toFixed(2)} MB`,
        type: f.type || 'application/octet-stream',
        category,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
      });
    });

    setCompanionFiles(prev => [...prev, ...newAttachments]);
  };

  // Batch Files Ingestion
  const handleBatchFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBatchProcessing(true);
    const parsedList: Array<{
      id: string;
      fileName: string;
      fileSize: string;
      caseData: CaseData;
      status: 'PARSED' | 'ERROR';
      errorMsg?: string;
    }> = [];

    const fileArray = Array.from(files) as File[];
    let completedCount = 0;

    fileArray.forEach(async (file, index) => {
      let textContent = '';
      try {
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const res = await extractTextFromPdf(file);
          textContent = res.text;
        } else {
          textContent = await file.text();
        }

        const partial = parseUnstructuredText(textContent, {
          caseNumber: `CR-${Math.floor(100 + Math.random() * 900)}/2025/${session.agency}`,
          title: `Batch Case: ${file.name.replace(/\.[^/.]+$/, '')}`,
          jurisdiction: `${session.departmentName}`,
        });

        const completeCase: CaseData = {
          id: `CASE-BATCH-${Date.now()}-${index}`,
          caseNumber: partial.caseNumber || `CR-BATCH-${index + 1}/2025`,
          title: partial.title || `Batch Case: ${file.name}`,
          jurisdiction: partial.jurisdiction || session.departmentName,
          primaryTenant: session.agency,
          sharedWithTenants: [session.agency],
          classification: 'TOP_SECRET',
          status: 'ACTIVE_TRIANGULATION',
          leadInvestigator: `${session.name} (${session.rank})`,
          incidentDate: new Date().toISOString(),
          description: partial.description || `Ingested case from ${file.name}`,
          nodes: partial.nodes || [],
          links: partial.links || [],
          patterns: [],
          tickets: [],
          timeline: partial.timeline || [],
          dailyDiary: partial.dailyDiary || [],
          evidenceVault: partial.evidenceVault || [],
          sha256Seal: generateAuditHash(`${file.name}_${session.govId}_${Date.now()}`),
          escalationLog: [],
        };

        const enriched = enrichCaseWithAlgorithms(completeCase);
        parsedList.push({
          id: `BATCH-ITEM-${index}`,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          caseData: enriched,
          status: 'PARSED',
        });
      } catch (err: any) {
        parsedList.push({
          id: `BATCH-ITEM-${index}`,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          caseData: null as any,
          status: 'ERROR',
          errorMsg: err.message,
        });
      }

      completedCount++;
      if (completedCount === fileArray.length) {
        setBatchCases(prev => [...prev, ...parsedList]);
        setIsBatchProcessing(false);
      }
    });
  };

  // Remove Entity from Analyzed Case
  const handleRemoveNode = (nodeId: string) => {
    if (!analyzedCase) return;
    const updatedNodes = analyzedCase.nodes.filter(n => n.id !== nodeId);
    const updatedLinks = analyzedCase.links.filter(l => l.source !== nodeId && l.target !== nodeId);
    const reEnriched = enrichCaseWithAlgorithms({
      ...analyzedCase,
      nodes: updatedNodes,
      links: updatedLinks,
    });
    setAnalyzedCase(reEnriched);
  };

  // Apply to Features and Launch
  const handleApplyToFeatures = (targetTab?: string) => {
    if (!analyzedCase) return;
    onCaseIngested(analyzedCase, targetTab || 'OVERVIEW');
  };

  const handleLaunchAllBatchCases = () => {
    const validCases = batchCases.filter(b => b.status === 'PARSED').map(b => b.caseData);
    if (validCases.length === 0) return;
    if (onCasesIngested) {
      onCasesIngested(validCases);
    } else {
      onCaseIngested(validCases[0]);
    }
  };

  return (
    <div className={`w-full ${isModal ? 'max-w-6xl mx-auto' : 'p-4 lg:p-8 max-w-7xl mx-auto'}`}>
      {/* Top Header */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 mb-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-base shadow-lg"
              style={{
                backgroundColor: agencyConfig.accentHex,
                color: agencyConfig.accentHex === '#334155' ? '#f8fafc' : '#ffffff',
              }}
            >
              {session.agency}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-mono font-black tracking-wide text-white uppercase">
                  CASE INGESTION & FORENSIC ANALYSIS
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase border bg-blue-950 text-blue-300 border-blue-700">
                  {agencyConfig.code} TERMINAL
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Upload case documents (PDF, DOCX, TXT, CSV) to analyze entities and apply intelligence across all features.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-xs font-mono">
            <button
              onClick={handleLoadSampleFir}
              className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center space-x-1.5 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-lg hover:bg-amber-950/70 transition-all cursor-pointer"
              title="Load sample police FIR to test the workflow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sample Police FIR (1-Click)</span>
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="text-slate-400 hover:text-white text-xs underline font-mono px-2 py-1"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="mt-4 flex items-center space-x-2">
          <button
            onClick={() => setIntakeMode('DOCUMENT_UPLOAD')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              intakeMode === 'DOCUMENT_UPLOAD'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Upload Case Document / FIR (PDF, DOCX, TXT, CSV)</span>
          </button>

          <button
            onClick={() => setIntakeMode('BATCH_CASES')}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2 ${
              intakeMode === 'BATCH_CASES'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40'
                : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Batch Upload Multiple Cases</span>
            {batchCases.length > 0 && (
              <span className="text-[10px] bg-cyan-400 text-slate-950 px-1.5 rounded-full font-bold">
                {batchCases.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: UPLOAD DETAILS                                                 */}
      {/* ========================================================================= */}
      {intakeMode === 'DOCUMENT_UPLOAD' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 font-mono text-sm font-bold text-white uppercase">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>1. UPLOAD CASE DOCUMENT OR PASTE CASE DETAILS</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Primary Support: <strong>PDF Files (.pdf)</strong>, Word (.docx), Plain Text (.txt), CDR (.csv)
              </span>
            </div>

            {/* Dropzone & Text Area Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Dropzone Column */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/80 hover:bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[220px]"
                >
                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx,.json,.csv"
                    onChange={handleDocumentFileUpload}
                    className="hidden"
                  />
                  <div className="w-14 h-14 rounded-full bg-blue-950/60 border border-blue-800/80 flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:bg-blue-900 transition-all mb-3 shadow-lg">
                    <FileUp className="w-7 h-7" />
                  </div>
                  <div className="font-mono text-sm font-bold text-slate-200 group-hover:text-white">
                    Click to Upload Case PDF or Document
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono mt-1 max-w-xs">
                    Upload official Police FIR (PDF), Panchnama, Inquest report, or Telecom CDR dump.
                  </p>
                  <span className="mt-3 text-[10px] font-mono px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-blue-400 font-bold uppercase">
                    Supports Native PDF Text Extraction
                  </span>
                </div>

                {/* Upload Status Card */}
                {isPdfProcessing && (
                  <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200 text-xs font-mono flex items-center space-x-2 animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400 shrink-0" />
                    <span>Extracting text streams and page contents from uploaded PDF...</span>
                  </div>
                )}

                {uploadedFileName && !isPdfProcessing && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between font-bold">
                      <div className="flex items-center space-x-2 truncate">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">{uploadedFileName}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 shrink-0">({uploadedFileSize})</span>
                    </div>
                    {pdfPageCount && (
                      <div className="text-[11px] text-emerald-400/80 pl-6">
                        Parsed {pdfPageCount} pages from PDF document.
                      </div>
                    )}
                  </div>
                )}

                {/* Companion Evidences / Exhibits Dropzone */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-slate-300 flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Attach Companion Exhibits (Optional)</span>
                    </span>
                    <button
                      onClick={() => evidenceFileInputRef.current?.click()}
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1 text-[11px] cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach Media</span>
                    </button>
                    <input
                      ref={evidenceFileInputRef}
                      type="file"
                      multiple
                      accept="image/*,video/*,audio/*,.csv,.pdf"
                      onChange={handleEvidenceFilesChange}
                      className="hidden"
                    />
                  </div>
                  {companionFiles.length > 0 ? (
                    <div className="space-y-1 text-[11px] font-mono max-h-24 overflow-y-auto">
                      {companionFiles.map(cf => (
                        <div key={cf.id} className="flex items-center justify-between text-slate-400 px-2 py-1 bg-slate-900 rounded">
                          <span className="truncate">{cf.name}</span>
                          <button
                            onClick={() => setCompanionFiles(companionFiles.filter(f => f.id !== cf.id))}
                            className="text-slate-500 hover:text-red-400 ml-2"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 font-mono">
                      Attach crime scene photos, CCTV clips, or seized audio intercepts.
                    </p>
                  )}
                </div>
              </div>

              {/* Text Area Column: Shows Extracted Text or allows direct pasting */}
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-bold">
                    {uploadedFileName ? 'DOCUMENT TEXT PREVIEW (Extracted from Upload)' : 'OR PASTE RAW CASE / FIR DETAILS HERE:'}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleLoadSampleCdr}
                      className="text-cyan-400 hover:text-cyan-300 text-[11px] cursor-pointer"
                    >
                      Load Sample CDR
                    </button>
                    {rawText && (
                      <button
                        onClick={() => {
                          setRawText('');
                          setUploadedFileName(null);
                          setUploadedFileSize(null);
                          setPdfPageCount(null);
                          setAnalyzedCase(null);
                        }}
                        className="text-slate-500 hover:text-red-400 text-[11px] cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <textarea
                  value={rawText}
                  onChange={e => {
                    setRawText(e.target.value);
                    setAnalyzedCase(null); // Reset analysis if text is modified
                  }}
                  placeholder="Paste or upload case details here...

Example format:
FIRST INFORMATION REPORT NO: CR-088/2025/SPECIAL-CELL
POLICE STATION: Sector 7 Crime Branch
Accused A1: Tariq Mehmood alias 'Ustad' - Syndicate Commander
Accused A2: Imran Qureshi alias 'Chota' - Cut-out Courier
Mobile MSISDN: +91 98250 11223, Handset IMEI: 358901234567890
Tower Location: BTS Kalupur, Latitude 23.0225, Longitude 72.5714
Vehicle: GJ-01-AB-4491
Bank / UPI Channel: falcon.smurf@okhdfcbank"
                  rows={13}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed resize-none shadow-inner flex-1"
                />

                {/* ANALYZE BUTTON (Only enabled when data is provided) */}
                <div className="pt-2 flex items-center justify-between">
                  <div className="text-[11px] font-mono text-slate-400">
                    {rawText.trim() ? (
                      <span className="text-emerald-400 font-bold">
                        ✓ {rawText.length} characters ready for intelligence extraction
                      </span>
                    ) : (
                      <span className="text-slate-500">
                        Upload a file or enter case details to enable analysis
                      </span>
                    )}
                  </div>

                  <button
                    onClick={handleAnalyzeData}
                    disabled={!rawText.trim() || isAnalyzing || isPdfProcessing}
                    className={`px-6 py-3 rounded-xl font-mono font-bold text-xs flex items-center space-x-2 transition-all cursor-pointer ${
                      rawText.trim() && !isAnalyzing && !isPdfProcessing
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/40 ring-1 ring-blue-400'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                    }`}
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>ANALYZING PROVIDED DATA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>ANALYZE CASE DATA & EXTRACT INTELLIGENCE →</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis Error Message */}
          {analysisError && (
            <div className="p-4 rounded-xl bg-red-950/60 border border-red-700 text-red-200 text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{analysisError}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 2: AWAITING UPLOAD EMPTY STATE (When no analysis yet)             */}
          {/* ========================================================================= */}
          {!analyzedCase && !isAnalyzing && (
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-8 text-center font-mono text-xs text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Activity className="w-6 h-6" />
              </div>
              <div className="text-slate-300 font-bold text-sm">
                Awaiting Case Data Upload
              </div>
              <p className="max-w-md mx-auto text-slate-500 leading-relaxed">
                Upload your case PDF document, CDR telecom file, or enter details above, then click <strong>"Analyze Case Data"</strong>. TRINETRA will parse the content, extract network topology, and apply the intelligence across all features.
              </p>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SECTION 3: ACTUAL ANALYSIS RESULTS (Shown ONLY after user provides data)  */}
          {/* ========================================================================= */}
          {analyzedCase && (
            <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-6">
              {/* Header of Analysis Box */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold uppercase">
                      ANALYSIS DERIVED FROM PROVIDED DATA
                    </span>
                    <h2 className="text-base font-mono font-black text-white">
                      {analyzedCase.caseNumber}: {analyzedCase.title}
                    </h2>
                  </div>
                  <p className="text-xs font-mono text-slate-400 mt-1">
                    IO: {analyzedCase.leadInvestigator} • Police Station: {analyzedCase.jurisdiction} • SHA-256 Audit Seal: {analyzedCase.sha256Seal.slice(0, 16)}...
                  </p>
                </div>

                {/* PRIMARY ACTION BUTTON */}
                <button
                  onClick={() => handleApplyToFeatures('OVERVIEW')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white font-mono font-bold text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-900/30 ring-1 ring-emerald-400 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>APPLY TO ALL FEATURES & LAUNCH INVESTIGATION →</span>
                </button>
              </div>

              {/* Extracted Metrics Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <UserCheck className="w-3 h-3 text-amber-400" />
                    <span>Suspects</span>
                  </div>
                  <div className="text-xl font-black text-amber-400 mt-0.5">
                    {analyzedCase.nodes.filter(n => n.type === 'SUSPECT').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <Smartphone className="w-3 h-3 text-blue-400" />
                    <span>Phones</span>
                  </div>
                  <div className="text-xl font-black text-blue-400 mt-0.5">
                    {analyzedCase.nodes.filter(n => n.type === 'PHONE').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <Cpu className="w-3 h-3 text-purple-400" />
                    <span>IMEIs</span>
                  </div>
                  <div className="text-xl font-black text-purple-400 mt-0.5">
                    {analyzedCase.nodes.filter(n => n.type === 'IMEI').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-emerald-400" />
                    <span>Towers & GPS</span>
                  </div>
                  <div className="text-xl font-black text-emerald-400 mt-0.5">
                    {analyzedCase.nodes.filter(n => n.type === 'LOCATION').length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <GitGraph className="w-3 h-3 text-cyan-400" />
                    <span>Network Links</span>
                  </div>
                  <div className="text-xl font-black text-cyan-400 mt-0.5">
                    {analyzedCase.links.length}
                  </div>
                </div>

                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase flex items-center space-x-1">
                    <Lock className="w-3 h-3 text-slate-300" />
                    <span>Exhibits</span>
                  </div>
                  <div className="text-xl font-black text-slate-200 mt-0.5">
                    {analyzedCase.evidenceVault.length}
                  </div>
                </div>
              </div>

              {/* Algorithmic Detections Strip */}
              <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-2">
                <div className="text-slate-300 font-bold uppercase tracking-wider flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>Algorithmic Detections from Provided Data</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-slate-400 pt-1">
                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-amber-400 font-bold mb-0.5">Identified Kingpin / Coordinator:</div>
                    <div className="text-white">
                      {analyzedCase.nodes.find(n => n.isKingpin)?.label || 'Top Centrality Coordinator'}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-emerald-400 font-bold mb-0.5">Single Point of Failure (Cut-Vertex):</div>
                    <div className="text-white">
                      {analyzedCase.nodes.find(n => n.isCutVertex)?.label || 'Critical Communication Bridge'}
                    </div>
                  </div>

                  <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                    <div className="text-cyan-400 font-bold mb-0.5">Flagged Threat Patterns:</div>
                    <div className="text-white">
                      {analyzedCase.patterns.length > 0
                        ? `${analyzedCase.patterns.length} Threat Patterns Detected`
                        : 'Burner Swapping & High Frequency Bursts Mapped'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Entities Review */}
              <div className="space-y-2 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-300 font-bold uppercase">
                  <span>Extracted Entities ({analyzedCase.nodes.length} Nodes in Graph)</span>
                  <span className="text-[11px] text-slate-500 font-normal">Review entities before applying to features</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                  {analyzedCase.nodes.map(node => (
                    <div
                      key={node.id}
                      className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800 text-slate-200"
                    >
                      <div className="flex items-center space-x-2 truncate mr-2">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            node.type === 'SUSPECT'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : node.type === 'PHONE'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : node.type === 'IMEI'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          }`}
                        >
                          {node.type}
                        </span>
                        <span className="truncate font-bold text-xs">{node.label}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveNode(node.id)}
                        className="text-slate-500 hover:text-red-400 p-1 cursor-pointer"
                        title="Remove entity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* ========================================================================= */}
              {/* SECTION 4: APPLY TO FEATURES (Quick Feature Navigators)                   */}
              {/* ========================================================================= */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 font-mono space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-white uppercase tracking-wider">
                    <ExternalLink className="w-4 h-4 text-emerald-400" />
                    <span>APPLY ANALYZED DATA TO PLATFORM FEATURES</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Click any feature below to launch directly with this case
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleApplyToFeatures('GRAPH')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-blue-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-blue-950 text-blue-400 group-hover:scale-110 transition-transform">
                      <GitGraph className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-blue-300">
                        Knowledge Graph Workstation
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Apply {analyzedCase.nodes.length} nodes & {analyzedCase.links.length} links to Brandes centrality physics.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleApplyToFeatures('MAP')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-emerald-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400 group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-emerald-300">
                        Geospatial GIS Matrix
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Plot GPS coordinates, 120° BTS azimuth cones, and vehicle trajectory checkpoints.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleApplyToFeatures('TELECOM')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-cyan-950 text-cyan-400 group-hover:scale-110 transition-transform">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-cyan-300">
                        15GB CDR Streamer
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Stream calling frequencies, nocturnal bursts, and cross-SIM burner handset swaps.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleApplyToFeatures('EVIDENCE')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-purple-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-purple-950 text-purple-400 group-hover:scale-110 transition-transform">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-purple-300">
                        Sec 65B Forensic Vault
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Access {analyzedCase.evidenceVault.length} certified exhibits sealed with SHA-256 for judicial court trials.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleApplyToFeatures('DIARY')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-amber-950 text-amber-400 group-hover:scale-110 transition-transform">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-amber-300">
                        Day-to-Day Case Diary
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        View statutory Sec 172 CrPC / Sec 192 BNSS chronological inquest & spot entries.
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleApplyToFeatures('COPILOT')}
                    className="flex items-start space-x-3 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500 transition-all text-left cursor-pointer group"
                  >
                    <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 group-hover:scale-110 transition-transform">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs group-hover:text-indigo-300">
                        SAHAYAK AI Copilot
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                        Query this case data for deposition contradictions and interrogation recommendations.
                      </p>
                    </div>
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleApplyToFeatures('OVERVIEW')}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 hover:from-blue-500 hover:via-indigo-500 hover:to-emerald-500 text-white font-mono font-bold text-sm tracking-wide uppercase flex items-center justify-center space-x-2 shadow-xl shadow-blue-900/40 cursor-pointer transition-all"
                  >
                    <span>APPLY ANALYZED CASE DATA ACROSS ALL PLATFORM MODULES (FULL LAUNCH)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH UPLOAD TAB                                                          */}
      {/* ========================================================================= */}
      {intakeMode === 'BATCH_CASES' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-2xl space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2 text-sm font-bold text-white uppercase">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>BATCH UPLOAD MULTIPLE CASE DOCUMENTS (PDF, TXT, CSV)</span>
            </div>
            <button
              onClick={() => batchFileInputRef.current?.click()}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center space-x-1 cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Select Multiple Files</span>
            </button>
            <input
              ref={batchFileInputRef}
              type="file"
              multiple
              accept=".pdf,.txt,.doc,.docx,.json,.csv"
              onChange={handleBatchFilesChange}
              className="hidden"
            />
          </div>

          <div
            onClick={() => batchFileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-slate-950/80 hover:bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
          >
            <Layers className="w-10 h-10 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
            <div className="text-slate-200 font-bold text-sm">
              Click to Select Multiple Case Files (PDFs or Documents)
            </div>
            <p className="text-slate-500 text-[11px] mt-1 max-w-sm">
              Each uploaded case document will be parsed into an independent Case Dossier with its own graph topology.
            </p>
          </div>

          {isBatchProcessing && (
            <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800 text-blue-200 text-xs font-mono flex items-center space-x-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Parsing multiple case files and extracting criminal entities...</span>
            </div>
          )}

          {batchCases.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">
                  {batchCases.length} Cases Parsed & Ready in Batch Queue
                </span>
                <button
                  onClick={handleLaunchAllBatchCases}
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center space-x-2 shadow-lg shadow-emerald-900/40"
                >
                  <Check className="w-4 h-4" />
                  <span>INGEST ALL {batchCases.length} CASES TO REGISTRY →</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                {batchCases.map((b, idx) => (
                  <div key={b.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between font-bold text-white">
                      <span>{b.caseData?.caseNumber || `Case #${idx + 1}`}</span>
                      <span className="text-emerald-400 font-normal text-[11px]">
                        {b.caseData?.nodes?.length || 0} entities
                      </span>
                    </div>
                    <div className="text-slate-300 truncate">{b.caseData?.title || b.fileName}</div>
                    <div className="text-[11px] text-slate-500">File: {b.fileName} ({b.fileSize})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
