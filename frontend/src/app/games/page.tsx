'use client';
import Link from 'next/link';

const EMOTION_ZONES = [
  { emoji: '⚡', label: 'Anxiety & Stress', color: '#60a5fa', desc: 'Reaction speed under pressure' },
  { emoji: '🌫️', label: 'Depression', color: '#818cf8', desc: 'Engagement and motivation patterns' },
  { emoji: '🌀', label: 'Overthinking', color: '#a855f7', desc: 'Decision loops and hesitation' },
  { emoji: '⚖️', label: 'Paralysis', color: '#fb923c', desc: 'Choice avoidance and delay' },
  { emoji: '🔋', label: 'Mental Fatigue', color: '#06b6d4', desc: 'Focus stamina over time' },
];

export default function GamesLandingPage() {
  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto bg-[#050816]">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-20 overflow-hidden">
        {/* Radial blur blobs */}
        <div className="absolute top-[-20%] left-[10%] w-[500px] h-[500px] rounded-full bg-violet-700/20 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-blue-700/15 blur-[130px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-3xl">
          <div className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-violet-500/30 text-violet-400 bg-violet-500/10">
            10-Minute Behavioral Analysis
          </div>

          <h1 className="text-6xl md:text-8xl font-black text-white tracking-tighter leading-none">
            MIND<br />
            <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">JOURNEY</span>
          </h1>

          <p className="text-white/50 text-lg md:text-xl leading-relaxed max-w-xl">
            Five uniquely designed games. Each measures a different dimension of your
            emotional and cognitive state — through behavior, not surveys.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm mt-4">
            <Link href="/games/session"
              className="flex-1 group relative py-4 rounded-2xl bg-violet-600 font-bold text-white text-base text-center shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_50px_rgba(124,58,237,0.6)] hover:bg-violet-500 transition-all active:scale-95 overflow-hidden">
              <span className="relative z-10">Begin Session →</span>
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          <p className="text-white/20 text-xs uppercase tracking-widest font-bold">
            ~10 minutes · 5 games · 1 randomly chosen per emotion
          </p>
        </div>
      </section>

      {/* Emotion Zones */}
      <section className="px-6 pb-16 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-white font-bold text-xl whitespace-nowrap">Emotion Zones</h2>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {EMOTION_ZONES.map((zone) => (
            <div key={zone.label}
              className="group p-5 rounded-2xl border border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04] transition-all flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: `${zone.color}22` }}>
                {zone.emoji}
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{zone.label}</h3>
                <p className="text-white/30 text-xs mt-1 leading-relaxed">{zone.desc}</p>
              </div>
              <div className="h-0.5 w-8 rounded-full transition-all group-hover:w-full duration-500"
                style={{ backgroundColor: zone.color }} />
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-20 max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-white font-bold text-xl whitespace-nowrap">How It Works</h2>
          <div className="flex-1 h-px bg-white/5" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { step: '01', title: 'Play 5 Games', desc: 'Each game tests a different emotional state. Difficulty increases automatically as you play.' },
            { step: '02', title: 'We Observe Behavior', desc: 'We measure reaction time, hesitation, error rate, engagement, and performance drop — silently.' },
            { step: '03', title: 'VANI Responds', desc: 'Your AI companion analyzes the data and delivers a personalized, supportive insight report.' },
          ].map((item) => (
            <div key={item.step} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] flex flex-col gap-3">
              <span className="text-4xl font-black text-white/5">{item.step}</span>
              <h3 className="text-white font-bold">{item.title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Safety note */}
        <div className="mt-8 p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex items-start gap-3">
          <span className="text-amber-400 text-lg">⚠️</span>
          <p className="text-white/30 text-xs leading-relaxed">
            <strong className="text-white/50">Not a clinical tool.</strong> Mind Journey is designed to surface behavioral patterns for personal awareness and AI-driven conversation. It is <em>not</em> a medical diagnosis. If you are in distress, please reach out to a qualified mental health professional.
          </p>
        </div>
      </section>
    </div>
  );
}
