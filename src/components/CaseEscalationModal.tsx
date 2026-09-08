import React, { useState } from 'react';
import {
  ShieldAlert,
  ArrowUpRight,
  Lock,
  CheckCircle2,
  AlertTriangle,
  History,
  FileCheck,
  Building,
} from 'lucide-react';
import { CaseData, UserSession, AgencyType } from '../types';

interface CaseEscalationModalProps {
  currentCase: CaseData;
  session: UserSession;
  onClose: () => void;
  onExecuteEscalation: (type: 'PATH_A_CID' | 'PATH_B_CBI', orderRef: string) => void;
}

export const CaseEscalationModal: React.FC<CaseEscalationModalProps> = ({
  currentCase,
  session,
  onClose,
  onExecuteEscalation,
}) => {
  const [orderReference, setOrderReference] = useState('MHA-CENTRAL-DIR-2008/CBI-TAKEOVER-09');
  const [confirmedLockout, setConfirmedLockout] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  const isCbiAdmin = session.agency === 'CBI' && session.role === 'DEPT_ADMIN';
  const isCidAdmin = (session.agency === 'CID' || session.agency === 'CBI') && session.role === 'DEPT_ADMIN';

  const handleExecute = (path: 'PATH_A_CID' | 'PATH_B_CBI') => {
    if (path === 'PATH_B_CBI' && !confirmedLockout) {
      alert('You must acknowledge the Zero-Trust Atomic Lockout protocol before executing Path B.');
      return;
    }

    onExecuteEscalation(path, orderReference);
    setActionSuccess(
      path === 'PATH_B_CBI'
        ? 'Path B Federal Central Takeover executed. Atomic lockout severed state police access; case sealed in CBI repository.'
        : 'Path A Internal State Escalation executed. Case migrated to State CID pool.'
    );

    setTimeout(() => {
      onClose();
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-mono font-bold uppercase text-white tracking-wider">
                Multi-Tenant Case Migration & Escalation Engine
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                Jurisdictional Transfer Protocols • State CID Pool vs Federal CBI Repository
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-mono text-xs">
            ✕ CLOSE
          </button>
        </div>

        {actionSuccess && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Current Jurisdictional Boundaries */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-3 gap-3 text-xs font-mono">
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">PRIMARY TENANT</span>
            <span className="text-white font-bold text-sm">{currentCase.primaryTenant}</span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">SHARED WITH TENANTS</span>
            <span className="text-slate-300 font-bold">
              {currentCase.sharedWithTenants.length > 0
                ? currentCase.sharedWithTenants.join(', ')
                : 'SEALED (NONE)'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 text-[10px] block uppercase">CASE STATUS</span>
            <span className="text-amber-400 font-bold">{currentCase.status}</span>
          </div>
        </div>

        {/* Order Directive Input */}
        <div className="text-xs font-mono space-y-1">
          <label className="block text-slate-300">Statutory / Judicial Escalation Order Reference</label>
          <input
            type="text"
            value={orderReference}
            onChange={e => setOrderReference(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded text-white"
          />
        </div>

        {/* The Two Migration Paths from Blueprint */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Path A */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-slate-200">
                  Path A: State CID Escalation
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  INTERNAL STATE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Case moves to State CID pool for inter-district collaboration across the State. Originating State Police retain read-only visibility for ground operations.
              </p>
            </div>

            <button
              onClick={() => handleExecute('PATH_A_CID')}
              disabled={currentCase.status === 'ESCALATED_CID' || currentCase.status === 'CBI_CENTRAL_TAKEOVER'}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white rounded font-mono text-xs font-bold transition-colors"
            >
              {currentCase.status === 'ESCALATED_CID' ? 'CID Escalation Active' : 'Execute Path A (CID)'}
            </button>
          </div>

          {/* Path B */}
          <div className="p-4 rounded-xl bg-slate-950 border border-red-900/60 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono font-bold text-red-400 flex items-center space-x-1">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Path B: Federal CBI Takeover</span>
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">
                  ZERO-TRUST
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Atomic Lockout Protocol: All previous State Police and CID access is severed instantly. Case data, evidence blobs, and graph telemetry are sealed into the federal CBI vault.
              </p>
            </div>

            <div className="space-y-2">
              <label className="flex items-start space-x-2 text-[10px] font-mono text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmedLockout}
                  onChange={e => setConfirmedLockout(e.target.checked)}
                  className="mt-0.5 accent-red-600"
                />
                <span>Confirm instant revocation of all state police credentials</span>
              </label>

              <button
                onClick={() => handleExecute('PATH_B_CBI')}
                disabled={currentCase.status === 'CBI_CENTRAL_TAKEOVER'}
                className="w-full py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded font-mono text-xs font-bold transition-all shadow-md"
              >
                {currentCase.status === 'CBI_CENTRAL_TAKEOVER'
                  ? 'CBI Vault Sealed'
                  : 'Trigger Central Takeover (CBI)'}
              </button>
            </div>
          </div>
        </div>

        {/* Escalation Audit History */}
        <div className="pt-3 border-t border-slate-800 text-xs font-mono space-y-2">
          <div className="text-slate-400 text-[10px] uppercase font-bold flex items-center space-x-1">
            <History className="w-3 h-3 text-slate-500" />
            <span>Multi-Tenant Audit Trail</span>
          </div>
          <div className="space-y-1.5 max-h-28 overflow-y-auto">
            {currentCase.escalationLog.map((log, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-950 border border-slate-800/80 text-[10px]">
                <div className="text-slate-300 font-bold">{log.action}</div>
                <div className="text-slate-500 flex justify-between mt-0.5">
                  <span>Auth: {log.authorizedBy} ({log.orderReference})</span>
                  <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
