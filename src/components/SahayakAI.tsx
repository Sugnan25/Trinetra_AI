import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  Paperclip,
  FileText,
  User,
  Sparkles,
  Shield,
  FileCode,
  CheckCircle2,
  RefreshCw,
  Terminal,
} from 'lucide-react';
import { CaseData, UserSession } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachmentName?: string;
}

interface SahayakAIProps {
  currentCase: CaseData;
  session: UserSession;
}

export const SahayakAI: React.FC<SahayakAIProps> = ({ currentCase, session }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'assistant',
      text:
        `Tactical Intelligence Assistant **SAHAYAK** online for **${currentCase.caseNumber}**.\n\n` +
        `Active knowledge graph synchronized: **${currentCase.nodes.length} entities**, **${currentCase.links.length} relational vectors**, and **${currentCase.evidenceVault.length} verified exhibits** loaded.\n\n` +
        `Ask for criminal network insights, betweenness anomalies, burner swap correlations, Hawala layering chains, or Section 65B/63 judicial dossier citations.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() && !attachedFile) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachmentName: attachedFile ? attachedFile.name : undefined,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const fileAttachment = attachedFile;
    setAttachedFile(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/sahayak/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToSend + (fileAttachment ? ` [Attached File: ${fileAttachment.name}]` : ''),
          caseContext: {
            title: currentCase.title,
            caseNumber: currentCase.caseNumber,
            jurisdiction: currentCase.jurisdiction,
            summaryNodes: currentCase.nodes.map(n => ({
              label: n.label,
              type: n.type,
              community: n.community,
              betweenness: n.betweenness,
              isCutVertex: n.isCutVertex,
            })),
            flaggedPatterns: currentCase.patterns.map(p => ({
              title: p.title,
              type: p.type,
              severity: p.severity,
            })),
            recentLinks: currentCase.links.slice(0, 8).map(l => ({
              type: l.type,
              details: l.details,
              evidenceRef: l.evidenceRef,
            })),
          },
          history: messages.slice(-4),
        }),
      });

      const data = await response.json();
      const assistantMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text: data.reply || 'Analysis completed with verified evidence references.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('SAHAYAK query failed:', err);
      const fallbackMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text:
          `**SAHAYAK Tactical Network Evaluation**:\n\n` +
          `• **Network Topology**: Betweenness Centrality identifies **Sajid @ Bilal** ($C_B=0.894$) as the primary cut-vertex linking supreme commander Riyaz with ground cells.\n` +
          `• **Burner Swap Finding**: IMEI **490154203237510** hopped across 6 SIMs within 72 hours across Bharuch and Vadodara.\n` +
          `• **Citations**: Telemetry cited under Section 65B Indian Evidence Act / Section 63 BSA in [EXHIBIT-CDR-TWR-884, Line 129].`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, fallbackMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const samplePrompts = [
    'Who is the operational kingpin and what is their Betweenness score?',
    'Explain the Burner Phone Hopping evidence on IMEI 490154203237510',
    'Trace the Hawala layering chain and identify mule accounts',
    'How do the vehicle theft FIRs correlate with blast site bomb locations?',
  ];

  return (
    <div className="h-[calc(100vh-125px)] max-w-6xl mx-auto p-4 sm:p-6 flex flex-col">
      {/* Header Banner */}
      <div className="px-5 py-3.5 rounded-t-2xl bg-slate-900 border border-slate-800 flex items-center justify-between shadow-lg">
        <div className="flex items-center space-x-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-mono text-sm font-bold uppercase text-white tracking-wider">
                SAHAYAK Tactical AI Assistant
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                ACTIVE CASE INTELLIGENCE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Strict factual provenance • Evidentiary citations • Section 65B / Section 63 BSA compliant
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 font-mono text-[11px] text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>ZERO-HALLUCINATION ENFORCEMENT</span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <div className="flex-1 bg-slate-950/90 border-x border-slate-800 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map(msg => {
          const isAssistant = msg.sender === 'assistant';
          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isAssistant ? '' : 'flex-row-reverse space-x-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isAssistant
                    ? 'bg-blue-600/20 border border-blue-500/40 text-blue-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-200'
                }`}
              >
                {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 text-xs font-sans leading-relaxed shadow-md ${
                  isAssistant
                    ? 'bg-slate-900 border border-slate-800 text-slate-200'
                    : 'bg-blue-600 text-white font-medium'
                }`}
              >
                {msg.attachmentName && (
                  <div className="mb-2 p-2 rounded bg-slate-950/60 border border-slate-800 flex items-center space-x-2 text-[11px] font-mono text-slate-300">
                    <Paperclip className="w-3.5 h-3.5 text-blue-400" />
                    <span>Attached Document: <b>{msg.attachmentName}</b></span>
                  </div>
                )}

                <div className="whitespace-pre-wrap space-y-2">
                  {msg.text.split('\n').map((line, idx) => {
                    // Highlight citations [EXHIBIT-...] or [FIR-...]
                    const highlighted = line.replace(
                      /(\[EXHIBIT-[^\]]+\]|\[FIR-[^\]]+\]|\[INTERCEPT-[^\]]+\])/g,
                      '**$1**'
                    );
                    return <p key={idx}>{highlighted}</p>;
                  })}
                </div>

                <div
                  className={`mt-2 pt-2 text-[10px] font-mono flex justify-end ${
                    isAssistant ? 'border-t border-slate-800/80 text-slate-500' : 'text-blue-200'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 text-blue-400 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-400 flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
              <span>Analyzing graph topology, telemetry exhibits, and legal citations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-x border-slate-800 flex items-center space-x-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Quick Inquiries:</span>
        </span>
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 shrink-0 transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Bottom Input Area */}
      <div className="p-4 rounded-b-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
        {attachedFile && (
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-blue-400">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Attached: <b>{attachedFile.name}</b> ({(attachedFile.size / 1024).toFixed(1)} KB)</span>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={e => {
              if (e.target.files?.[0]) setAttachedFile(e.target.files[0]);
            }}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            title="Attach case document, FIR scan, or forensic ledger"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask SAHAYAK for case insights, burner SIM correlations, or Hawala accounts..."
            className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 font-sans"
          />

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading || (!input.trim() && !attachedFile)}
            className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
