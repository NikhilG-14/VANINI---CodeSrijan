'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { getSessionHistory } from '@/lib/aiClient';
import { useUserStore } from '@/store/userStore';

type ActionEntry = Record<string, unknown>;

type SessionEntry = {
  id: string;
  game_type?: string;
  session_start?: string;
  session_end?: string;
  created_at?: string;
  actions?: ActionEntry[];
  behavioral_signals?: Record<string, unknown>;
  final_outcome?: Record<string, unknown>;
  results?: Record<string, unknown>[];
  scores?: Record<string, number>;
};

export default function HistoryPage() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const id = useUserStore.getState().ensureVimid();
    setUserId(id);
    getSessionHistory(id)
      .then((data) => setSessions((data?.sessions as SessionEntry[]) ?? []))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, SessionEntry[]>();
    for (const session of sessions) {
      const key = session.game_type || 'unknown';
      if (!map.has(key)) map.set(key, []);
      map.get(key)?.push(session);
    }
    return Array.from(map.entries());
  }, [sessions]);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#060a14] text-white flex flex-col font-sans">
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] select-none" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-12 w-full relative z-10">
        <div className="flex items-end justify-between border-b border-white/5 pb-6">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-violet-500/30 text-violet-400 bg-violet-500/5 mb-4 shadow-[0_0_15px_rgba(124,58,237,0.1)] relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-violet-400/20 to-transparent -translate-x-full animate-shimmer" />
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              Memory Node Letger
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Session <span className="text-gradient">Timeline</span></h1>
            <p className="text-sm font-medium text-white/40 mt-3 max-w-lg leading-relaxed">Your entire chronological history of cognitive and emotional assessments across all nodes.</p>
          </div>
          <Link href="/report" className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs uppercase tracking-widest font-bold text-white/50 hover:text-white hover:bg-white/10 hover:-translate-y-0.5 transition-all shadow-xl active:scale-95">
            Return to Report
          </Link>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
            <p className="text-violet-400 text-[10px] uppercase font-black tracking-[0.3em] animate-pulse">Reconstructing memories...</p>
          </div>
        )}
        
        {!loading && sessions.length === 0 && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center flex flex-col items-center gap-4 shadow-xl">
            <span className="text-5xl">🌌</span>
            <div className="text-white/40 font-medium">Your timeline is empty. Complete a node to begin tracking.</div>
          </div>
        )}

        {grouped.map(([gameType, entries]) => (
          <section key={gameType} className="space-y-6">
            <h2 className="text-sm font-black uppercase tracking-[0.3em] text-white/30 flex items-center gap-4">
              <span className="w-4 h-px bg-white/10" />
              {gameType.replace('_', ' ')}
              <span className="flex-1 h-px bg-white/5" />
            </h2>
            
            <div className="space-y-4 relative">
              {/* Vertical timeline line */}
              <div className="absolute top-0 bottom-0 left-8 w-px bg-gradient-to-b from-white/10 via-white/5 to-transparent z-0" />
              
              {entries.map((entry) => {
                const isExpanded = expandedId === entry.id;
                const when = entry.session_end || entry.created_at || entry.session_start;
                const dateObj = when ? new Date(when) : null;
                const dateStr = dateObj ? dateObj.toLocaleDateString() : 'Unknown';
                const timeStr = dateObj ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                
                // Parse scores if possible
                const scoresList = Object.entries(entry.scores ?? {});
                
                return (
                  <div key={entry.id} className="relative z-10 pl-20">
                    {/* Timeline dot */}
                    <div className="absolute left-[31px] top-6 w-2.5 h-2.5 rounded-full bg-violet-500 shadow-[0_0_10px_#8b5cf6]" />
                    
                    <div className={`rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-all duration-300 ${isExpanded ? 'shadow-[0_10px_30px_-10px_rgba(124,58,237,0.15)] bg-white/[0.04] border-violet-500/20' : 'hover:bg-white/[0.03] hover:border-white/10'}`}>
                      <button
                        className="w-full text-left px-6 py-5 flex items-center justify-between"
                        onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      >
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-white/80 font-bold tracking-wide">Session {entry.id.slice(0, 8)}</div>
                            <div className="text-xs font-medium text-white/40 mt-1 flex items-center gap-2">
                              <span className="text-violet-400">{dateStr}</span>
                              <span className="w-1 h-1 rounded-full bg-white/10" />
                              <span>{timeStr}</span>
                            </div>
                          </div>
                          
                          {/* Quick summary snippets if not expanded */}
                          {!isExpanded && scoresList.length > 0 && (
                            <div className="hidden md:flex items-center gap-3">
                              {scoresList.slice(0, 3).map(([k, v]) => (
                                <div key={k} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase font-bold text-white/50 tracking-wider">
                                  {k.slice(0, 3)}: <span className="text-white/80">{v}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-violet-500/20 text-violet-300' : 'text-white/40'}`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="px-6 pb-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            
                            {/* Scores / Outcomes */}
                            <div className="glass-card rounded-xl p-4 border border-white/5">
                              <div className="text-[9px] uppercase tracking-[0.2em] font-black text-violet-400 mb-4">Cognitive Resonance</div>
                              <div className="grid grid-cols-2 gap-3">
                                {scoresList.map(([k, v]) => (
                                  <div key={k} className="flex flex-col gap-1">
                                    <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider overflow-hidden text-ellipsis">{k.replace('_', ' ')}</span>
                                    <span className="text-lg font-black text-white/90">{v}</span>
                                  </div>
                                ))}
                                {scoresList.length === 0 && (
                                  <div className="text-xs text-white/30 italic col-span-2">No score metrics captured.</div>
                                )}
                              </div>
                            </div>
                            
                            {/* Behavioral Signals */}
                            <div className="glass-card rounded-xl p-4 border border-white/5">
                              <div className="text-[9px] uppercase tracking-[0.2em] font-black text-emerald-400 mb-4">Behavioral Signals</div>
                              <div className="space-y-3">
                                {Object.entries(entry.behavioral_signals ?? {}).map(([k, v]) => {
                                  if (!v || (Array.isArray(v) && v.length === 0)) return null;
                                  return (
                                    <div key={k} className="flex justify-between items-center bg-white/[0.02] rounded px-3 py-2 border border-white/5">
                                      <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">{k.replace(/_/g, ' ')}</span>
                                      <span className="text-xs font-medium text-white/80">{Array.isArray(v) ? v.join(', ') : String(v)}</span>
                                    </div>
                                  );
                                })}
                                {(!entry.behavioral_signals || Object.keys(entry.behavioral_signals).length === 0) && (
                                  <div className="text-xs text-white/30 italic">No behavioral anomalies detected.</div>
                                )}
                              </div>
                            </div>

                            {/* Raw Actions */}
                            <div className="glass-card rounded-xl p-4 border border-white/5 flex flex-col">
                              <div className="text-[9px] uppercase tracking-[0.2em] font-black text-amber-400 mb-4">Action Telemetry</div>
                              <div className="flex-1 bg-black/40 rounded-lg p-3 overflow-y-auto max-h-[150px] border border-white/5 scrollbar-thin scrollbar-thumb-white/10">
                                {entry.actions && entry.actions.length > 0 ? (
                                  <pre className="text-[10px] text-white/50 font-mono">
                                    {JSON.stringify(entry.actions, null, 2)}
                                  </pre>
                                ) : (
                                  <div className="text-xs text-white/30 italic h-full flex items-center justify-center">No telemetry actions logged.</div>
                                )}
                              </div>
                            </div>
                            
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
