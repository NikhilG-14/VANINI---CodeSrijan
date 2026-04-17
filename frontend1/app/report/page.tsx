'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CognitiveRadarChart } from '@/components/ui/CognitiveRadarChart';
import { AvatarMessage } from '@/components/ui/AvatarMessage';
import { MetricCard } from '@/components/ui/MetricCard';
import { useGameStore } from '@/store/gameStore';
import { calculateScores, getCognitiveInsights, getAvatarMessage } from '@/lib/cognitiveScoring';
import { generateAvatarResponse, checkOllamaHealth, saveGameSession } from '@/lib/ollamaClient';
import { loadResults } from '@/lib/gameSession';
import type { CognitiveInsight, CognitiveScores } from '@/lib/types';
import { useUserStore } from '@/store/userStore';
import { VaniChat } from '@/components/ui/VaniChat';
import { motion, AnimatePresence } from 'framer-motion';

export default function ReportPage() {
  const router = useRouter();
  const results = useGameStore(s => s.results);
  const scores = useGameStore(s => s.cognitiveScores);
  const setScores = useGameStore(s => s.setScores);
  const resetWorld = useGameStore(s => s.resetWorld);

  const [insights, setInsights] = useState<CognitiveInsight[]>([]);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [computed, setComputed] = useState<CognitiveScores | null>(null);

  useEffect(() => {
    let finalResults = results;
    if (!finalResults.length) {
      const saved = loadResults();
      if (saved) finalResults = saved.results;
    }
    if (!finalResults.length) {
      router.push('/');
      return;
    }
    const sc = calculateScores(finalResults);
    setComputed(sc);
    setScores(sc);
    setInsights(getCognitiveInsights(sc));
  }, [results, router, setScores]);

  // Persist session to backend
  useEffect(() => {
    if (!computed || !results.length) return;
    const vimid = useUserStore.getState().ensureVimid();
    saveGameSession(vimid, results, computed);
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
      setStreaming(true);
      let streamed = '';
      generateAvatarResponse(
        "I just completed the Mind Journey behavioral assessment. What did you notice?",
        computed,
        insightsData,
        chunk => {
          streamed += chunk;
          setAvatarMsg(streamed);
        }
      ).then(full => {
        if (!full) setAvatarMsg(fallback);
        setStreaming(false);
      }).catch(() => {
        setAvatarMsg(fallback);
        setStreaming(false);
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
