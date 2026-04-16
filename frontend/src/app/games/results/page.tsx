'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadResults } from '@/lib/gameSession';
import { calculateScores, getEmotionInsights, getAvatarMessage, getDominantEmotion } from '@/lib/emotionScoring';
import { EmotionRadarChart } from '@/components/games/EmotionRadarChart';
import { AvatarMessage } from '@/components/games/AvatarMessage';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

export default function GameResultsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [resultsData, setResultsData] = useState<ReturnType<typeof loadResults>>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'insights' | 'raw'>('insights');

  useEffect(() => {
    const data = loadResults();
    if (!data) { router.replace('/games'); return; }
    setResultsData(data);
  }, [router]);

  const { scores, insights, avatarMsg, dominant } = useMemo(() => {
    if (!resultsData) return { scores: null, insights: [], avatarMsg: '', dominant: null };
    const s = calculateScores(resultsData.results);
    return {
      scores: s,
      insights: getEmotionInsights(s),
      avatarMsg: getAvatarMessage(s),
      dominant: getDominantEmotion(s),
    };
  }, [resultsData]);

  // Auto-save to backend
  useEffect(() => {
    if (!user || !scores || !resultsData || saveStatus !== 'idle') return;
    setSaveStatus('saving');

    fetch('http://localhost:8000/save-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        results: resultsData.results,
        scores,
      }),
    })
      .then(r => r.ok ? setSaveStatus('success') : setSaveStatus('error'))
      .catch(() => setSaveStatus('error'));
  }, [user, scores, resultsData, saveStatus]);

  if (!resultsData || !scores) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#050816]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
          <p className="text-white/30 text-sm">Analyzing your session...</p>
        </div>
      </div>
    );
  }

  const maxEmotion = insights.reduce((a, b) => a.score > b.score ? a : b);

  return (
    <div className="flex-1 overflow-y-auto bg-[#050816]">
      {/* Header gradient */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 30% 50%, ${maxEmotion.color}12 0%, transparent 70%)` }} />
        <div className="max-w-6xl mx-auto px-6 py-12 relative z-10 flex flex-col md:flex-row items-center gap-10">
          <EmotionRadarChart insights={insights} size={280} />
          <div className="flex flex-col gap-5 flex-1">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: maxEmotion.color }}>Session Complete</span>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mt-1">Your Emotional<br />
                <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">Profile</span>
              </h1>
            </div>
            <AvatarMessage message={avatarMsg} dominantEmotion={maxEmotion.label} dominantEmoji={maxEmotion.emoji} />
            {saveStatus === 'saving' && (
              <div className="flex items-center gap-2 text-white/30 text-xs">
                <div className="w-3 h-3 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                Saving your session...
              </div>
            )}
            {saveStatus === 'success' && (
              <div className="flex items-center gap-2 text-emerald-400 text-xs bg-emerald-400/10 px-3 py-1.5 rounded-full w-fit">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Session saved to your profile
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-8">
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl w-fit border border-white/5">
          {(['insights', 'raw'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${activeTab === tab ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              {tab === 'insights' ? '🧠 Insights' : '📊 Raw Scores'}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Panels */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === 'insights' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map(ins => (
              <div key={ins.emotion}
                className="group p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{ins.emoji}</span>
                    <h3 className="text-white font-bold">{ins.label}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black" style={{ color: ins.color }}>{ins.score}</span>
                    <span className="text-white/30 text-xs">/100</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-4">
                  <div className="h-full rounded-full" style={{ width: `${ins.score}%`, backgroundColor: ins.color, transition: 'width 1s ease-out' }} />
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-white/20 mb-1">What we noticed</p>
                    <p className="text-white/60 text-xs leading-relaxed">{ins.insight}</p>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                    <p className="text-[9px] font-bold uppercase tracking-widest mb-1" style={{ color: ins.color }}>VANI Suggests</p>
                    <p className="text-white/80 text-[11px] leading-relaxed italic">"{ins.suggestion}"</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {insights.map(ins => (
              <div key={ins.emotion} className="flex items-center gap-4 p-4 rounded-xl border border-white/5 bg-white/[0.02]">
                <span className="text-xl w-8">{ins.emoji}</span>
                <span className="text-white/60 text-sm flex-1">{ins.label}</span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ins.score}%`, backgroundColor: ins.color }} />
                </div>
                <span className="text-white font-mono font-bold text-sm w-12 text-right">{ins.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="max-w-6xl mx-auto px-6 pb-16 flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/games/session"
          className="px-8 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm text-center hover:bg-violet-500 transition-all active:scale-95 shadow-[0_0_20px_rgba(124,58,237,0.3)]">
          Retake Session
        </Link>
        <Link href="/"
          className="px-8 py-3 rounded-xl border border-white/10 bg-white/[0.03] text-white/60 font-bold text-sm text-center hover:text-white hover:bg-white/10 transition-all active:scale-95">
          Return Home
        </Link>
      </div>
    </div>
  );
}
