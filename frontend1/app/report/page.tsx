'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { EmotionRadarChart } from '@/components/ui/EmotionRadarChart';
import { AvatarMessage } from '@/components/ui/AvatarMessage';
import { useGameStore } from '@/store/gameStore';
import { calculateScores, getEmotionInsights, getAvatarMessage } from '@/lib/emotionScoring';
import { generateAvatarResponse, checkOllamaHealth, saveGameSession } from '@/lib/ollamaClient';
import { loadResults } from '@/lib/gameSession';
import type { EmotionInsight, EmotionScores } from '@/lib/types';
import { useUserStore } from '@/store/userStore';
import { VaniChat } from '@/components/ui/VaniChat';

export default function ReportPage() {
  const router = useRouter();
  const results = useGameStore(s => s.results);
  const scores = useGameStore(s => s.emotionScores);
  const setScores = useGameStore(s => s.setScores);
  const resetWorld = useGameStore(s => s.resetWorld);

  const [insights, setInsights] = useState<EmotionInsight[]>([]);
  const [avatarMsg, setAvatarMsg] = useState('');
  const [ollamaOnline, setOllamaOnline] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [computed, setComputed] = useState<EmotionScores | null>(null);

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
    setInsights(getEmotionInsights(sc));
  }, [results, router, setScores]);

  // Persist session to backend
  useEffect(() => {
    if (!computed || !results.length) return;
    const vimid = useUserStore.getState().ensureVimid();
    saveGameSession(vimid, results, computed);
  }, [computed, results]);

  useEffect(() => {
    if (!computed) return;
    const insightsData = getEmotionInsights(computed);
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
    <div className="w-full h-full overflow-y-auto bg-[#060a14] selection:bg-violet-500/30">
      <div className="fixed top-[-10%] left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-10 blur-[150px] pointer-events-none"
        style={{ background: dominant?.color || '#7c3aed' }} />

      <div className="max-w-4xl mx-auto px-6 py-16 flex flex-col gap-12">
        {/* Header */}
        <div className="text-center relative">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
            Analysis Verified
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter mb-4">
            Behavioral <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">Fingerprint</span>
          </h1>
          <p className="text-white/40 text-lg max-w-xl mx-auto font-medium">
            Based on your interactions across {results.length} mini-games, here is your current emotional landscape.
          </p>
        </div>

        {/* Insights Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl">
          <div className="flex justify-center relative">
             <div className="absolute inset-0 bg-violet-500/20 blur-[100px] rounded-full" />
             <div className="relative z-10">
               <EmotionRadarChart insights={insights} size={320} />
             </div>
          </div>

          <div className="flex flex-col gap-5">
            <h3 className="text-white font-black text-xl mb-2 flex items-center gap-3">
              <span className="w-2 h-8 bg-violet-500 rounded-full" />
              Emotional Metrics
            </h3>
            {insights.map(ins => (
              <div key={ins.emotion} className="group">
                <div className="flex justify-between items-end mb-2">
                   <div className="flex items-center gap-3">
                     <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">{ins.emoji}</span>
                     <span className="text-white/60 text-[11px] font-black uppercase tracking-wider">{ins.label}</span>
                   </div>
                   <span className="text-white font-black text-xl" style={{ color: ins.color }}>{ins.score}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${ins.score}%`, background: `linear-gradient(90deg, ${ins.color}88, ${ins.color})`, boxShadow: `0 0 10px ${ins.color}44` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Analysis Message */}
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
          <div className="relative bg-[#0d1424] border border-white/10 rounded-[2.5rem] p-4">
             <div className="flex items-center justify-between px-6 py-2 mb-2 border-b border-white/5">
                <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.3em]">AI Synthesis Engine</span>
                {ollamaOnline && <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> SYSTEM LIVE</span>}
             </div>
             <AvatarMessage
               message={avatarMsg || "Compiling observation data..."}
               emoji={dominant?.emoji ?? '🧠'}
             />
          </div>
        </div>

        {/* Detailed Dialogue with VANI */}
        <div className="flex flex-col gap-8">
           <div className="text-center">
             <h2 className="text-3xl font-black text-white tracking-tight mb-2">Consult with <span className="text-violet-400">VANI</span></h2>
             <p className="text-white/40 text-sm max-w-lg mx-auto">
               VANI has access to your full behavioral dossier and past sessions. Discuss your results or ask for specific mindfulness techniques.
             </p>
           </div>
           
           <VaniChat scores={computed} insights={insights} />
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {insights.map(ins => (
             <div 
               key={ins.emotion} 
               className="p-8 rounded-[2.5rem] border transition-all hover:bg-white/[0.04] group relative overflow-hidden"
               style={{ background: `${ins.color}05`, borderColor: `${ins.color}15` }}
             >
               <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl transition-all group-hover:opacity-10">{ins.emoji}</div>
               <div className="relative z-10">
                 <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg transition-transform group-hover:scale-110" style={{ background: `${ins.color}22`, border: `1px solid ${ins.color}44` }}>
                     {ins.emoji}
                   </div>
                   <div>
                     <h4 className="text-white font-black text-sm tracking-wide uppercase">{ins.label}</h4>
                     <p className="text-white/30 text-[10px] font-bold">SIG: {ins.score}%</p>
                   </div>
                 </div>
                 <p className="text-white/60 text-sm leading-relaxed mb-6 font-medium">{ins.insight}</p>
                 <div className="bg-white/5 rounded-2xl p-5 border border-white/5 flex gap-4 items-center">
                   <div className="text-2xl">⚡</div>
                   <p className="text-white/80 text-xs font-bold leading-relaxed pr-4">{ins.suggestion}</p>
                 </div>
               </div>
             </div>
          ))}
        </div>

        {/* Final Actions */}
        <div className="flex flex-col sm:flex-row gap-6 pb-20 mt-8">
          <button
            onClick={handleRestart}
            className="flex-1 py-6 rounded-[2rem] bg-violet-600 font-pixel text-[10px] text-white hover:bg-violet-500 transition-all transform hover:-translate-y-1 active:scale-95 shadow-[0_20px_40px_-10px_rgba(124,58,237,0.5)]"
          >
            RESTORE SYSTEM
          </button>
          <Link href="/"
            className="flex-1 py-6 rounded-[2rem] bg-white/5 border border-white/10 font-pixel text-[10px] text-white/40 hover:text-white/80 transition-all text-center hover:bg-white/10"
          >
            DISCONNECT
          </Link>
        </div>
      </div>
    </div>
  );
}
