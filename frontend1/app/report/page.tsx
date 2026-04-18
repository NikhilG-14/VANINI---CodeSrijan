'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CognitiveRadarChart } from '@/components/ui/CognitiveRadarChart';
import { AvatarMessage } from '@/components/ui/AvatarMessage';
import { MetricCard } from '@/components/ui/MetricCard';
import { useGameStore } from '@/store/gameStore';
import { calculateScores, getCognitiveInsights, getAvatarMessage } from '@/lib/cognitiveScoring';
import {
  generateAvatarResponse,
  checkOllamaHealth,
  saveGameSession,
  getSessionReport,
  getSessionHistory,
  generateGameDiagnostic,
  syncMasterMemoir,
  type SessionReport,
} from '@/lib/ollamaClient';
import { loadResults } from '@/lib/gameSession';
import type { CognitiveInsight, CognitiveScores } from '@/lib/types';
import { useUserStore } from '@/store/userStore';
import { motion } from 'framer-motion';
import { GameDiagnosticModal } from '@/components/ui/GameDiagnosticModal';

const AVATAR_APP_URL = process.env.NEXT_PUBLIC_AVATAR_APP_URL ?? 'http://localhost:5173';

const traceResults = (results: any[]) => {
  console.table(results.map(r => ({
    game: r.gameId,
    rt: r.reactionTimeMs?.length ? (r.reactionTimeMs.reduce((a: number, b: number) => a + b, 0) / r.reactionTimeMs.length).toFixed(0) : '-',
    errors: r.errorCount,
    actions: r.totalActions,
    keys: Object.keys(r.rawData || {})
  })));
};

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

  const [diagnosticOpen, setDiagnosticOpen] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<any[]>([]);
  const [diagnosticText, setDiagnosticText] = useState('');
  const [diagnosticLoading, setDiagnosticLoading] = useState(false);

  // ── handlers ──────────────────────────────────────────────────────────────
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
    } catch {
      setDiagnosticText('Unable to generate diagnostic. Please ensure Ollama is active.');
    } finally {
      setDiagnosticLoading(false);
    }
  }, []);

  const normalizeScores = (value: any): CognitiveScores | null => {
    if (!value || typeof value !== 'object') return null;
    const toNum = (v: any, fallback: number) =>
      typeof v === 'number' && isFinite(v) ? v : fallback;
    return {
      attention: toNum(value.attention, 50),
      memory: toNum(value.memory, 50),
      impulsivity: toNum(value.impulsivity, 20),
      flexibility: toNum(value.flexibility, 50),
      risk_behavior: toNum(value.risk_behavior, 30),
    };
  };

  // ── hydration ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const vimid = useUserStore.getState().ensureVimid();
      let finalResults = results;
      let scoresToUse: CognitiveScores | null = null;

      if (finalResults.length) {
        console.log('%c[SESSION TRACE] Active Store Results:', 'background: #222; color: #10b981; font-weight: bold; padding: 2px 4px;');
        traceResults(finalResults);

        scoresToUse = calculateScores(finalResults);
        saveGameSession(vimid, finalResults, scoresToUse).then(() => {
          getSessionReport(vimid).then(rep => !cancelled && setReportData(rep));
        });
      } else {
        const saved = loadResults();
        if (saved?.results?.length) {
          console.log('%c[SESSION TRACE] Recovered from LocalStorage:', 'background: #222; color: #3b82f6; font-weight: bold; padding: 2px 4px;');
          traceResults(saved.results);
          finalResults = saved.results;
          scoresToUse = calculateScores(finalResults);
        }
      }

      setResolvedResults(finalResults);


      if (!scoresToUse) {
        const history = await getSessionHistory(vimid);
        const latest = history?.sessions?.[0];
        if (latest) {
          if (latest.results?.length) {
            finalResults = latest.results;
            scoresToUse = calculateScores(finalResults);
          } else if (latest.scores) {
            scoresToUse = normalizeScores(latest.scores);
            finalResults = [];
          }
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

  // ── AI response ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!computed || !ready) return;
    const insightsData = getCognitiveInsights(computed);
    const fallback = getAvatarMessage(computed);

    checkOllamaHealth().then(online => {
      setOllamaOnline(online);
      if (!online) { setAvatarMsg(fallback); return; }
      const partialCount = resolvedResults.filter(r => r.quitEarly).length;
      const partialGames = resolvedResults.filter(r => r.quitEarly).map(r => r.gameId).join(', ');
      const prompt = `I just completed my assessment. Analyze my behavioral fingerprint. ${partialCount > 0
          ? `NOTE: I quit ${partialCount} nodes early (${partialGames}). Adjust your clinical assessment to account for this incomplete data.`
          : ''
        }`;

      generateAvatarResponse(
        prompt,
        computed, insightsData, undefined,
        chunk => { streamed += chunk; setAvatarMsg(streamed); }
      ).then(full => {
        if (!full) { setAvatarMsg(fallback); }
        else {
          const vimid = useUserStore.getState().vimid;
          if (vimid) syncMasterMemoir(vimid, full, computed);
        }
      }).catch(() => setAvatarMsg(fallback));
    });
  }, [computed, ready]);

  // ── nav helpers ───────────────────────────────────────────────────────────
  const handleRestart = useCallback(() => {
    resetWorld();
    router.push('/world');
  }, [resetWorld, router]);

  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const handleConsultVani = useCallback(() => {
    const telemetry = resolvedResults.map(r => ({
      game: r.gameId,
      rt: r.reactionTimeMs.length ? Math.round(avg(r.reactionTimeMs)) : 0,
      errors: r.errorCount,
      trials: r.totalActions,
    }));
    const vimid = useUserStore.getState().vimid;
    const payload = btoa(
      encodeURIComponent(JSON.stringify({ scores: computed, insights, telemetry, vimid }))
    );
    window.open(`${AVATAR_APP_URL}/?sessionData=${payload}`, '_blank');
  }, [computed, insights, resolvedResults]);

  const dominant = insights.length
    ? insights.reduce((a, b) => (a.score >= b.score ? a : b))
    : null;

  // ── loading state ─────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#060a14] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: 'url("/backgrounds/report-bg.jpg")' }}
        />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-violet-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="font-pixel text-[10px] text-violet-400 animate-pulse tracking-widest uppercase">
            Calibrating Emotions…
          </p>
        </div>
      </div>
    );
  }

  // ── main render ───────────────────────────────────────────────────────────
  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#060a14] selection:bg-violet-500/30 font-sans">

      {/* Decorative background – fixed so it doesn't affect layout */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden ring-1 ring-inset ring-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-105"
          style={{ backgroundImage: 'url("/backgrounds/report-bg.jpg")' }}
        />
        <div className="absolute inset-0 bg-[#060a14]/80 backdrop-blur-[2px]" />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full opacity-[0.15] blur-[160px]"
          style={{ background: dominant?.color ?? '#7c3aed' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/*
        Centering wrapper:
        - `flex flex-col items-center` horizontally centers the inner container
        - The inner container uses `max-w-6xl w-full` so it expands up to 6xl
          then stays centered via the outer flex.
      */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="w-full max-w-6xl px-4 sm:px-8 lg:px-12 py-20 flex flex-col items-center gap-20">

          {/* ═══════════════════════════════ HEADER ══════════════════════════════ */}
          <motion.header
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full flex flex-col items-center text-center gap-5"
          >
            <div className="flex gap-4">
              <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 shadow-[0_0_20px_rgba(52,211,153,0.08)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399] animate-pulse" />
                Analysis Verified
              </div>

              {resolvedResults.some(r => r.quitEarly) && (
                <div className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.3em] border border-amber-500/30 text-amber-400 bg-amber-500/5">
                  ⚠️ Partial Sessions Detected
                </div>
              )}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tighter leading-none">
              Behavioral{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}
              >
                Fingerprint
              </span>
            </h1>

            <div className="flex flex-col items-center gap-2">
              <p className="text-white/40 text-base max-w-xl leading-relaxed">
                Your patterns across{' '}
                <span className="text-white/60 font-semibold tracking-wider">
                  {resolvedResults.filter(r => !r.quitEarly).length}/5 Complete Nodes
                </span>{' '}
                synthesized into a unique performance dossier.
              </p>

              {/* Progress Bar */}
              <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden mt-2 relative">
                <div
                  className="absolute inset-y-0 left-0 bg-violet-500 transition-all duration-1000"
                  style={{ width: `${(resolvedResults.length / 5) * 100}%` }}
                />
              </div>
            </div>
          </motion.header>

          {/* ═══════════════════════════ CENTRAL DASHBOARD ═══════════════════════ */}
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

            {/* Radar chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="lg:col-span-7 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-6 lg:p-10 flex flex-col items-center justify-center gap-6 min-h-[460px]"
            >
              <CognitiveRadarChart insights={insights} size={400} />
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.5em]">
                Cognitive Rhythm Detected
              </p>
            </motion.div>

            {/* Right sidebar */}
            <div className="lg:col-span-5 flex flex-col gap-5">

              {/* Assistant card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between gap-3">
                  <span className="text-[9px] font-black text-white/35 uppercase tracking-widest whitespace-nowrap">
                    Assistant Assessment
                  </span>
                  {ollamaOnline ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black tracking-widest uppercase whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Deep Logic Sync
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black tracking-widest uppercase whitespace-nowrap">
                      Adaptive Mode
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <AvatarMessage
                    message={avatarMsg || 'Compiling observation data…'}
                    emoji={dominant?.emoji ?? '🧠'}
                  />
                </div>
              </motion.div>

              {/* Deeper analysis card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-7 flex flex-col justify-between gap-5"
              >
                <div className="flex flex-col gap-3">
                  <h3 className="text-white font-black text-lg flex items-center gap-3">
                    <span className="w-1 h-5 bg-violet-500 rounded-full flex-shrink-0" />
                    Deeper Analysis
                  </h3>
                  <p className="text-white/40 text-sm leading-relaxed">
                    Subtle behavioral markers in your patterns warrant a direct consultation.
                  </p>
                </div>
                <button
                  onClick={handleConsultVani}
                  className="w-full py-4 rounded-lg bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-black text-[10px] uppercase tracking-[0.3em] transition-all duration-200 shadow-[0_12px_30px_-8px_rgba(124,58,237,0.5)] flex items-center justify-center gap-3"
                >
                  Consult VANI Companion
                  <span className="text-base">→</span>
                </button>
              </motion.div>
            </div>
          </div>

          {/* ════════════════════════════ TRAJECTORY ════════════════════════════ */}
          {reportData && (Object.keys(reportData.delta).length > 0 || reportData.ai_summary) && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="w-full flex flex-col items-center gap-10"
            >
              <div className="w-full flex flex-col items-center text-center gap-4">
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Historical{' '}
                  <span
                    className="bg-clip-text text-transparent"
                    style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}
                  >
                    Trajectory
                  </span>
                </h2>
                {reportData.ai_summary && (
                  <div className="w-full max-w-2xl bg-white/[0.03] border border-white/[0.07] rounded-lg p-6 relative">
                    <span className="absolute -top-3 -left-2 text-xl opacity-40">✨</span>
                    <p className="text-sm text-white/70 leading-relaxed italic pl-4 border-l-2 border-violet-500/40">
                      {reportData.ai_summary}
                    </p>
                  </div>
                )}
              </div>

              <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {Object.entries(reportData.delta).map(([key, value]) => {
                  const delta = Number(value);
                  if (Math.abs(delta) < 0.5) return null;
                  const improved = delta > 0;
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-5 flex flex-col gap-2 transition-transform duration-200 hover:-translate-y-1 ${improved
                          ? 'bg-emerald-500/[0.06] border-emerald-500/25'
                          : 'bg-rose-500/[0.06] border-rose-500/25'
                        }`}
                    >
                      <span className="text-[9px] uppercase font-bold tracking-widest text-white/35">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div className={`text-xl font-black ${improved ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {improved ? '↑' : '↓'} {improved ? '+' : ''}{delta.toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.section>
          )}

          {/* ══════════════════════════ THE SCIENCE OF YOU ══════════════════════ */}
          <section className="w-full flex flex-col items-center gap-12">
            <div className="w-full flex items-center justify-center gap-6">
              <span className="flex-1 max-w-[80px] h-px bg-white/[0.08]" />
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight text-center">
                The{' '}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: 'linear-gradient(135deg, #a78bfa, #38bdf8)' }}
                >
                  Science
                </span>{' '}
                of You
              </h2>
              <span className="flex-1 max-w-[80px] h-px bg-white/[0.08]" />
            </div>

            <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {insights.map((ins, idx) => (
                <MetricCard
                  key={ins.cognitive}
                  insight={ins}
                  result={resolvedResults.find(
                    r => r.gameId === ins.gameId || r.cognitive === ins.cognitive
                  )}
                  index={idx}
                  onDeepAnalyze={handleDeepAnalyze}
                />
              ))}
            </div>
          </section>

          {/* Diagnostic modal */}
          <GameDiagnosticModal
            isOpen={diagnosticOpen}
            onClose={() => setDiagnosticOpen(false)}
            insight={selectedInsight}
            diagnostic={diagnosticText}
            loading={diagnosticLoading}
            metrics={selectedMetrics}
          />

          {/* ════════════════════════════ FINAL ACTIONS ═════════════════════════ */}
          <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-4 pb-16">
            <button
              onClick={handleRestart}
              className="py-5 rounded-lg border-2 border-violet-500/40 bg-violet-600/10 text-violet-300 font-black text-[11px] uppercase tracking-[0.3em] hover:bg-violet-600/20 hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-lg"
            >
              Restore System
            </button>
            <Link
              href="/"
              className="py-5 rounded-lg border-2 border-white/10 bg-white/[0.04] text-white/30 font-black text-[11px] uppercase tracking-[0.3em] hover:text-white/70 hover:bg-white/[0.08] hover:-translate-y-1 active:scale-95 transition-all duration-200 shadow-lg flex items-center justify-center"
            >
              Disconnect
            </Link>
          </div>

        </div>{/* /inner max-w container */}
      </div>{/* /centering column */}
    </div>/* /root */
  );
}