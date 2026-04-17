'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CognitiveRadarChart } from '@/components/ui/CognitiveRadarChart';
import { AvatarMessage } from '@/components/ui/AvatarMessage';
import { MetricCard } from '@/components/ui/MetricCard';
import { useGameStore } from '@/store/gameStore';
import { calculateScores, getCognitiveInsights, getAvatarMessage } from '@/lib/cognitiveScoring';
import { generateAvatarResponse, checkOllamaHealth, saveGameSession, getSessionReport, type SessionReport } from '@/lib/ollamaClient';
import { loadResults } from '@/lib/gameSession';
import type { CognitiveInsight, CognitiveScores } from '@/lib/types';
import { useUserStore } from '@/store/userStore';
import { VaniChat } from '@/components/ui/VaniChat';
import { motion } from 'framer-motion';

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

  useEffect(() => {
    let finalResults = results;
    let localStartTimestamp: number | undefined;
    if (!finalResults.length) {
      const saved = loadResults();
      if (saved) {
        finalResults = saved.results;
        localStartTimestamp = saved.timestamp;
      }
    }
    if (!finalResults.length) {
      router.push('/');
      return;
    }
    const sc = calculateScores(finalResults);
    setComputed(sc);
    setScores(sc);
    setInsights(getCognitiveInsights(sc));
    if (localStartTimestamp) {
      saveGameSession(useUserStore.getState().ensureVimid(), finalResults, sc, localStartTimestamp);
    }
  }, [results, router, setScores]);

  // Persist session to backend
  useEffect(() => {
    if (!computed || !results.length) return;
    const vimid = useUserStore.getState().ensureVimid();
    saveGameSession(vimid, results, computed).then(() => {
      getSessionReport(vimid).then(setReportData).catch(() => setReportData(null));
    });
  }, [computed, results]);

  useEffect(() => {
    if (!computed) return;
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
        "I just completed the Mind Journey behavioral assessment. What did you notice?",
        computed,
        insightsData,
        undefined,
        chunk => {
          streamed += chunk;
          setAvatarMsg(streamed);
        }
      ).then(full => {
        if (!full) setAvatarMsg(fallback);
      }).catch(() => {
        setAvatarMsg(fallback);
      });
    });
  }, [computed]);

  const handleRestart = useCallback(() => {
    resetWorld();
    router.push('/world');
  }, [resetWorld, router]);

  const dominant = insights.length
    ? insights.reduce((a, b) => a.score >= b.score ? a : b)
    : null;

  const handleConsultVani = useCallback(() => {
    // Extract a high-fidelity telemetry summary for VANI
    const telemetry = results.map(r => ({
      game: r.gameId,
      avgRT: r.reactionTimeMs.length ? Math.round(r.reactionTimeMs.reduce((a, b) => a + b, 0) / r.reactionTimeMs.length) : 0,
      errors: r.errorCount,
      totalTrials: r.totalActions,
      specifics: r.rawData 
    }));

    // Unicode-safe Base64 encoding for payloads with emojis
    const json = JSON.stringify({
      scores: computed,
      insights: insights.slice(0, 3),
      telemetry
    });
    const payload = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode(parseInt(p1, 16))
    ));
    window.open(`http://localhost:5173/?sessionData=${payload}`, '_blank');
  }, [computed, insights, results]);

  if (!computed || !insights.length) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#060a14]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="font-pixel text-[10px] text-violet-400 animate-pulse tracking-widest">CALIBRATING EMOTIONS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-y-auto bg-[#060a14] selection:bg-violet-500/30 font-sans">
      {/* Grid Pattern Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] select-none" 
           style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-24 py-24 flex flex-col items-center gap-16 lg:gap-24">
        {/* Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center relative pt-12 w-full"
        >
          <div className="inline-flex items-center gap-3 px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 mb-8 shadow-[0_0_20px_rgba(52,211,153,0.1)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-400/20 to-transparent -translate-x-full animate-shimmer" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
            Vocal Profile Verified
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-4 text-center w-full">
            Cognitive <span className="text-gradient">Signature</span>
          </h1>
          <p className="text-white/40 text-lg max-w-3xl mx-auto font-medium leading-relaxed text-center w-full">
            Your behavioral patterns across {results.length} cognitive nodes have been synthesized into a unique performance dossier.
          </p>
        </motion.div>

        {/* Central Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10 items-stretch w-full">
          {/* Radar Visualization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, scale: 1.01 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="lg:col-span-7 glass-card rounded-2xl p-8 lg:p-14 min-h-[500px] flex items-center justify-center relative overflow-hidden group hover:shadow-[0_20px_50px_-12px_rgba(124,58,237,0.3)] border-white/5 active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10 w-full flex flex-col items-center">
               <CognitiveRadarChart insights={insights} size={500} />
               <div className="mt-8 text-[10px] font-black text-white/40 uppercase tracking-[0.6em] animate-pulse group-hover:text-violet-400 transition-colors">Emotional Rhythm Detected</div>
            </div>
          </motion.div>

          {/* Assistant Sidebar */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card rounded-2xl p-1 overflow-hidden"
            >
              <div className="bg-white/[0.03] py-6 pr-8 pl-[34px] border-b border-white/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Assistant Assessment</span>
                {ollamaOnline ? (
                  <span className="px-4 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-widest uppercase flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Deep Logic Sync
                  </span>
                ) : (
                  <span className="px-4 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black tracking-widest uppercase">Hybrid Mode</span>
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
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              className="flex-1 glass-card rounded-2xl pt-32 pb-8 px-8 flex flex-col justify-start gap-8 group hover:bg-white/[0.05] transition-all duration-200 border-white/5"
            >
              <h3 className="text-white font-black text-xl flex items-center gap-4">
                <span className="w-1.5 h-6 bg-violet-500 rounded-full" />
                Deeper Analysis
              </h3>
              <p className="text-white/50 text-sm leading-relaxed font-medium">
                VANI has detected several subtle behavioral markers in your reaction patterns that warrant a direct consultation.
              </p>
              <div className="flex justify-center w-full">
                <button 
                  onClick={handleConsultVani}
                  className="w-24 h-24 rounded-full bg-violet-600/90 hover:bg-violet-500 text-white font-black transition-all transform hover:scale-110 active:scale-95 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.5)] flex flex-col items-center justify-center gap-1 group-hover:neon-glow-violet border border-white/20"
                >
                  <span className="text-sm uppercase tracking-[0.2em] ml-1 leading-none">VANI</span>
                  <span className="text-xl animate-pulse">→</span>
                </button>
              </div>
            </motion.div>
          </div>
        </div>

        {/* The Science: Metrics Breakdown */}
        <section className="space-y-16 lg:space-y-24 w-full pt-12">
          <div className="flex flex-col items-center text-center gap-6 group">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight flex items-center gap-6">
              <span className="w-12 h-px bg-white/10 group-hover:w-24 group-hover:bg-violet-500/50 transition-all duration-700" />
              The <span className="text-gradient">Science</span> of You
              <span className="w-12 h-px bg-white/10 group-hover:w-24 group-hover:bg-violet-500/50 transition-all duration-700" />
            </h2>
            <p className="text-white/40 text-lg font-medium max-w-3xl group-hover:text-white/60 transition-colors duration-500">Behind every score is a stream of sub-second decisions and automatic responses.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {insights.map((ins, idx) => (
              <MetricCard 
                key={ins.cognitive} 
                insight={ins} 
                result={results.find(r => r.cognitive === ins.cognitive)}
                index={idx}
              />
            ))}
          </div>

          {reportData && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card rounded-2xl p-8 border-2 border-white/5 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-start justify-between gap-6 mb-8 border-b border-white/5 pb-8">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-violet-500/30 text-violet-400 bg-violet-500/5 mb-4 shadow-[0_0_15px_rgba(124,58,237,0.1)]">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                    Vani Progression Snapshot
                  </div>
                  <h3 className="text-3xl font-black text-white tracking-tight mb-4">Cross-Session <span className="text-gradient hover-shift">Trajectory</span></h3>
                  
                  {/* AI Summary Block */}
                  <div className="bg-white/[0.02] border border-white/5 rounded-xl p-5 relative">
                    <div className="absolute -top-3 -left-3 text-2xl opacity-50">✨</div>
                    <p className="text-sm text-white/80 font-medium leading-relaxed italic pl-4 border-l-2 border-violet-500/50">
                      "{reportData.ai_summary}"
                    </p>
                  </div>
                </div>
                
                <Link
                  href="/history"
                  className="shrink-0 group flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 text-violet-300 font-bold text-xs uppercase tracking-widest transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(124,58,237,0.2)] border border-violet-500/20"
                >
                  <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Access Timeline
                </Link>
              </div>

              {/* Deltas Grid */}
              <div className="relative z-10">
                <h4 className="text-[10px] font-black tracking-[0.3em] text-white/30 uppercase mb-5">Metric Fluctuations (vs Previous)</h4>
                {Object.keys(reportData.delta ?? {}).length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {Object.entries(reportData.delta ?? {}).map(([key, value]) => {
                      const delta = Number(value);
                      if (delta === 0) return null; // Only show meaningful changes
                      
                      const isImprovement = delta > 0;
                      const cls = isImprovement ? 'text-emerald-400' : 'text-rose-400';
                      const bgCls = isImprovement ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20';
                      const icon = isImprovement ? '↑' : '↓';
                      const sign = isImprovement ? '+' : '';
                      
                      return (
                        <div key={key} className={`rounded-xl border p-4 flex flex-col gap-2 transition-all hover:-translate-y-1 ${bgCls}`}>
                          <div className="text-[10px] uppercase font-bold tracking-wider text-white/50 truncate" title={key.replace(/_/g, ' ')}>
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className={`text-2xl font-black flex items-center gap-2 ${cls}`}>
                            {icon} {sign}{Math.abs(delta).toFixed(1)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-white/40 italic py-4 bg-white/[0.02] rounded-xl text-center border border-white/5">
                    No significant metric fluctuations detected compared to your historical baseline.
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </section>

        {/* Contextual Chat */}
        <section className="space-y-16 lg:space-y-24 pb-24 border-t border-white/5 pt-24 lg:pt-32 w-full flex flex-col items-center">
          <div className="text-center group px-4">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-6 flex items-center justify-center gap-6 italic font-serif">
              <span className="w-10 h-px bg-white/10 group-hover:bg-violet-500/50 transition-colors" />
              Interactive Discovery
              <span className="w-10 h-px bg-white/10 group-hover:bg-violet-500/50 transition-colors" />
            </h2>
            <p className="text-white/40 text-lg max-w-2xl mx-auto font-medium group-hover:text-white/60 transition-colors">
              Ask VANI specifics about these metrics. She can explain how your reaction times correlate with real-world scenarios.
            </p>
          </div>
          <div className="max-w-4xl mx-auto w-full px-4">
            <VaniChat scores={computed} insights={insights} />
          </div>
        </section>

        {/* Final Actions */}
        <div className="flex flex-col sm:flex-row justify-center items-center gap-8 lg:gap-12 pb-32 mt-12 w-full max-w-5xl px-6">
          <button
            onClick={handleRestart}
            className="w-full sm:flex-1 py-14 lg:py-16 rounded-[2.5rem] lg:rounded-[3rem] bg-violet-600/10 border-2 border-violet-500/30 font-pixel text-lg lg:text-xl text-violet-300 hover:bg-violet-600/20 transition-all transform hover:-translate-y-2 active:scale-95 shadow-2xl tracking-[0.3em] backdrop-blur-sm"
          >
            RESTORE SYSTEM
          </button>
          <Link href="/"
            className="w-full sm:flex-1 py-14 lg:py-16 rounded-[2.5rem] lg:rounded-[3rem] bg-white/[0.02] border-2 border-white/5 font-pixel text-lg lg:text-xl text-white/30 hover:text-white/70 transition-all text-center hover:bg-white/[0.05] hover:-translate-y-2 active:scale-95 shadow-2xl tracking-[0.3em] flex items-center justify-center backdrop-blur-sm"
          >
            DISCONNECT SESSION
          </Link>
        </div>
      </div>
    </div>
  );
}
