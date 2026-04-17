'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CognitiveRadarChart } from '@/components/ui/CognitiveRadarChart';
import { AvatarMessage } from '@/components/ui/AvatarMessage';
import { MetricCard } from '@/components/ui/MetricCard';
import { useGameStore } from '@/store/gameStore';
import { calculateScores, getCognitiveInsights, getAvatarMessage } from '@/lib/cognitiveScoring';
import { generateAvatarResponse, checkOllamaHealth, saveGameSession, getSessionReport, getSessionHistory, type SessionReport } from '@/lib/ollamaClient';
import { loadResults } from '@/lib/gameSession';
import type { CognitiveInsight, CognitiveScores } from '@/lib/types';
import { useUserStore } from '@/store/userStore';
import { VaniChat } from '@/components/ui/VaniChat';
import { motion } from 'framer-motion';
import { GameDiagnosticModal } from '@/components/ui/GameDiagnosticModal';
import { generateGameDiagnostic } from '@/lib/ollamaClient';

export default function ReportPage() {
  const router = useRouter();
  const results = useGameStore(s => s.results);
  const setScores = useGameStore(s => s.setScores);
  const resetWorld = useGameStore(s => s.resetWorld);

  const [insights, setInsights] = useState<CognitiveInsight[]>([]);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [computed, setComputed] = useState<CognitiveScores | null>(null);
  const [reportData, setReportData] = useState<SessionReport | null>(null);
  const [resolvedResults, setResolvedResults] = useState(results);
  const [ready, setReady] = useState(false);

  // Diagnostic Modal State
  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>([]);
  const [diagnosticText, setDiagnosticText] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  const handleDeepAnalyze = useCallback(async (insight: CognitiveInsight, metrics: any[]) => {
    setSelectedInsight(insight);
    setSelectedMetrics(metrics);
    setDiagnosticOpen(true);
    setDiagnosticLoading(true);
    setDiagnosticText('');

    let streamed = '';
    try {
      await generateGameDiagnostic(insight, metrics, (chunk) => {
        streamed += chunk;
        setDiagnosticText(streamed);
      });
    } catch (err) {
      setDiagnosticText("Unable to generate diagnostic. Please ensure Ollama is active.");
    } finally {
      setDiagnosticLoading(false);
    }
  }, []);

  // Normalize scores from DB safely
  const normalizeScores = (value: any): CognitiveScores | null => {
    if (!value || typeof value !== 'object') return null;
    const toNum = (v: any, fallback: number) => typeof v === 'number' && isFinite(v) ? v : fallback;
    return {
      attention: toNum(value.attention, 50),
      memory: toNum(value.memory, 50),
      impulsivity: toNum(value.impulsivity, 20),
      flexibility: toNum(value.flexibility, 50),
      risk_behavior: toNum(value.risk_behavior, 30),
    };
  };

  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const vimid = useUserStore.getState().ensureVimid();
      let finalResults = results;
      let scoresToUse: CognitiveScores | null = null;

      // 1. Try Memory Store
      if (finalResults.length) {
        scoresToUse = calculateScores(finalResults);
        // Persist fresh session
        saveGameSession(vimid, finalResults, scoresToUse).then(() => {
            getSessionReport(vimid).then(rep => !cancelled && setReportData(rep));
        });
      } 
      // 2. Try LocalStorage
      else {
        const saved = loadResults();
        if (saved?.results?.length) {
            finalResults = saved.results;
            scoresToUse = calculateScores(finalResults);
        }
      }

      // 3. Try DB History (Last Data)
      if (!scoresToUse) {
        const history = await getSessionHistory(vimid);
        const latest = history?.sessions?.[0]; // Newest first from API
        if (latest) {
          if (latest.results?.length) {
            finalResults = latest.results;
            scoresToUse = calculateScores(finalResults);
          } else if (latest.scores) {
            scoresToUse = normalizeScores(latest.scores);
            finalResults = [];
          }
          // Fetch report (trajectory) for historical data too
          getSessionReport(vimid).then(rep => !cancelled && setReportData(rep));
        }
      }

      if (cancelled) return;

      if (scoresToUse) {
        setComputed(scoresToUse);
        setScores(scoresToUse);
        setInsights(getCognitiveInsights(scoresToUse));
        setResolvedResults(finalResults);
      }
      setReady(true);
    };

    hydrate();
    return () => { cancelled = true; };
  }, [results, setScores]);

  // AI Response Generation
  useEffect(() => {
    if (!computed || !ready) return;
    const insightsData = getCognitiveInsights(computed);
    const fallback = getAvatarMessage(computed);

    checkOllamaHealth().then(online => {
      setOllamaOnline(online);
      if (!online) {
        setAvatarMsg(fallback);
        return;
      }
      let streamed = '';
      generateAvatarResponse(
        "I just completed my assessment. Analyze my behavioral fingerprint.",
        computed,
        insightsData,
        undefined,
        chunk => {
          streamed += chunk;
          setAvatarMsg(streamed);
        }
      ).then(full => {
        if (!full) {
          setAvatarMsg(fallback);
        } else {
          // SYNC MASTER MEMOIR: Fuse current session findings into the long-term biography
          const vimid = useUserStore.getState().vimid;
          if (vimid) {
             syncMasterMemoir(vimid, full, computed);
          }
        }
      }).catch(() => setAvatarMsg(fallback));
    });
  }, [computed, ready]);

  const handleRestart = useCallback(() => {
    resetWorld();
    router.push('/world');
  }, [resetWorld, router]);

  const handleConsultVani = useCallback(() => {
    const telemetry = resolvedResults.map(r => ({
      game: r.gameId,
      rt: r.reactionTimeMs.length ? Math.round(avg(r.reactionTimeMs)) : 0,
      errors: r.errorCount,
      trials: r.totalActions
    }));
    const vimid = useUserStore.getState().vimid;
    const payload = btoa(encodeURIComponent(JSON.stringify({ scores: computed, insights, telemetry, vimid })));
    window.open(`http://localhost:5173/?sessionData=${payload}`, '_blank');
  }, [computed, insights, resolvedResults]);

  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const dominant = insights.length ? insights.reduce((a, b) => a.score >= b.score ? a : b) : null;

  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#060a14]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="font-pixel text-[10px] text-violet-400 animate-pulse tracking-widest uppercase">Calibrating Emotions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#060a14] selection:bg-violet-500/30 font-sans">
      {/* Dynamic Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
         <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[600px] rounded-full opacity-10 blur-[150px]"
              style={{ background: dominant?.color || '#7c3aed' }} />
         <div className="absolute inset-0 opacity-[0.03]" 
              style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-24 py-24 flex flex-col items-center gap-16 lg:gap-24 relative z-10">
        
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center w-full"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 mb-8 shadow-[0_0_20px_rgba(52,211,153,0.1)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full animate-shimmer" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
            Analysis Verified
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 text-center w-full">
            Behavioral <span className="text-gradient">Fingerprint</span>
          </h1>
          <p className="text-white/40 text-lg max-w-3xl mx-auto font-medium leading-relaxed text-center w-full">
            Your patterns across {resolvedResults.length || 'historical'} cognitive nodes have been synthesized into a unique performance dossier.
          </p>
        </motion.div>

        {/* Central Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch w-full">
          {/* Radar Visualization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-7 glass-card rounded-[2.5rem] p-8 lg:p-12 min-h-[500px] flex items-center justify-center relative overflow-hidden group border-white/5"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 w-full flex flex-col items-center">
               <CognitiveRadarChart insights={insights} size={500} />
               <div className="mt-8 text-[10px] font-black text-white/40 uppercase tracking-[0.6em] animate-pulse group-hover:text-violet-400 transition-colors">Cognitive Rhythm Detected</div>
            </div>
          </motion.div>

          {/* Assistant Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-[2rem] p-1 overflow-hidden"
            >
              <div className="bg-white/[0.03] py-6 pr-8 pl-[34px] border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Assistant Assessment</span>
                {ollamaOnline ? (
                  <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-widest uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Deep Logic Sync
                  </span>
                ) : (
                  <span className="px-4 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black tracking-widest uppercase">Adaptive Mode</span>
                )}
              </div>
              <div className="p-4">
                <AvatarMessage
                  message={avatarMsg || "Compiling observation data..."}
                  emoji={dominant?.emoji ?? '🧠'}
                />
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              whileHover={{ x: 5 }}
              className="flex-1 glass-card rounded-[2rem] p-8 flex flex-col justify-start gap-6 group hover:bg-white/[0.05] transition-all duration-300 border-white/5"
            >
              <h3 className="text-white font-black text-xl flex items-center gap-4">
                <span className="w-1.5 h-6 bg-violet-500 rounded-full" />
                Deeper Analysis
              </h3>
              <p className="text-white/50 text-sm leading-relaxed font-medium">
                Subtle behavioral markers in your patterns warrant a direct consultation.
              </p>
              <button 
                onClick={handleConsultVani}
                className="w-full py-5 rounded-2xl bg-violet-600/90 hover:bg-violet-500 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all transform hover:-translate-y-1 active:scale-95 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.4)] flex items-center justify-center gap-3 group-hover:neon-glow-violet border border-white/10"
              >
                Consult VANI Companion
                <span className="text-xl">→</span>
              </button>
            </motion.div>
          </div>
        </div>

        {/* Trajectory / Progression Section */}
        {reportData && (Object.keys(reportData.delta).length > 0 || reportData.ai_summary) && (
          <motion.section 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full space-y-12"
          >
            <div className="flex flex-col items-center text-center gap-4">
               <h2 className="text-3xl font-black text-white tracking-tight italic font-serif">Historical <span className="text-gradient">Trajectory</span></h2>
               <div className="max-w-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-6 relative">
                  <div className="absolute -top-3 -left-3 text-2xl opacity-50">✨</div>
                  <p className="text-sm text-white/80 font-medium leading-relaxed italic pl-4 border-l-2 border-violet-500/50">
                    {reportData.ai_summary}
                  </p>
               </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {Object.entries(reportData.delta).map(([key, value]) => {
                 const delta = Number(value);
                 if (Math.abs(delta) < 0.5) return null;
                 const improved = delta > 0;
                 return (
                   <div key={key} className={`rounded-2xl border p-5 flex flex-col gap-2 transition-all hover:-translate-y-2 ${improved ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20'}`}>
                     <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">{key.replace(/_/g, ' ')}</span>
                     <div className={`text-2xl font-black ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {improved ? '↑' : '↓'} {improved ? '+' : ''}{delta.toFixed(1)}%
                     </div>
                   </div>
                 );
               })}
            </div>
          </motion.section>
        )}

        {/* The Science section */}
        <section className="space-y-16 w-full">
          <div className="flex flex-col items-center text-center gap-6 group">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-6">
              <span className="w-12 h-px bg-white/10 group-hover:w-24 group-hover:bg-violet-500/50 transition-all duration-700" />
              The <span className="text-gradient">Science</span> of You
              <span className="w-12 h-px bg-white/10 group-hover:w-24 group-hover:bg-violet-500/50 transition-all duration-700" />
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {insights.map((ins, idx) => (
              <MetricCard 
                key={ins.cognitive} 
                insight={ins} 
                result={resolvedResults.find(r => r.gameId === ins.gameId || r.cognitive === ins.cognitive)}
                index={idx}
                onDeepAnalyze={handleDeepAnalyze}
              />
            ))}
          </div>
        </section>

        {/* Diagnostic Modal */}
        <GameDiagnosticModal
          isOpen={diagnosticOpen}
          onClose={() => setDiagnosticOpen(false)}
          insight={selectedInsight}
          diagnostic={diagnosticText}
          loading={diagnosticLoading}
          metrics={selectedMetrics}
        />

        {/* Final Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 lg:gap-12 pb-32 mt-12 w-full max-w-5xl px-6">
          <button
            onClick={handleRestart}
            className="flex-1 w-full py-16 rounded-[3rem] bg-violet-600/10 border-2 border-violet-500/30 font-pixel text-lg text-violet-300 hover:bg-violet-600/20 transition-all transform hover:-translate-y-2 active:scale-95 shadow-2xl tracking-[0.3em]"
          >
            RESTORE SYSTEM
          </button>
          <Link href="/"
            className="flex-1 w-full py-16 rounded-[3rem] bg-white/5 border-2 border-white/10 font-pixel text-lg text-white/20 hover:text-white/60 transition-all text-center hover:bg-white/10 hover:-translate-y-2 active:scale-95 shadow-2xl tracking-[0.3em] flex items-center justify-center"
          >
            DISCONNECT
          </Link>
        </div>
      </div>
    </div>
  );
}
