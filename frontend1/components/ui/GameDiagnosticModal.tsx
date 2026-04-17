'use client';
import { motion } from 'framer-motion';
import { Modal } from './Modal';
import { Brain, Search, Activity, Target, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  insight: any;
  diagnostic: string;
  loading: boolean;
  metrics: any[];
}

const ICONS: any = {
  attention: Brain,
  memory: Search,
  flexibility: Activity,
  impulsivity: Target,
  risk_behavior: Shield
};

export function GameDiagnosticModal({ isOpen, onClose, insight, diagnostic, loading, metrics }: Props) {
  const Icon = insight ? (ICONS[insight.cognitive] || Brain) : Brain;
  
  const formatMarkdown = (text: string) => {
    // Basic markdown support for bold and italics
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-black uppercase tracking-widest">$1</strong>')
      .replace(/_(.*?)_/g, '<em class="text-white/40 italic font-normal block mt-2 text-[12px]">$1</em>');
    return html;
  };

  const points = diagnostic
    .split('\n')
    .filter(line => line.includes('STATEMENT') || line.trim().startsWith('-'))
    .map(line => line.replace(/^[-*•]\s?/, '').trim());

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${insight?.label || 'Cognitive'} Diagnostic`}
      subtitle={`Sequential Clinical Analysis for today's session`}
    >
      <div className="flex flex-col gap-10 pb-10">
        {/* Metric Grid Mini */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:bg-white/[0.04] transition-all">
               <div className="text-[8px] font-black tracking-[0.2em] text-white/30 truncate mb-1">{m.label}</div>
               <div className="text-xl font-black italic text-white tabular-nums">{m.value}</div>
            </div>
          ))}
        </div>

        {/* Diagnostic Section */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
             <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
             <div className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400">Clinical Statements</div>
             <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="grid gap-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 gap-6">
                <div className="relative w-12 h-12">
                   <div className="absolute inset-0 border-2 border-violet-500/10 rounded-full" />
                   <div className="absolute inset-0 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                </div>
                <p className="text-[9px] font-black uppercase tracking-widest text-violet-400 animate-pulse">Running Neural Synthesis...</p>
              </div>
            ) : (
              points.map((p, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="relative pl-12 group"
                >
                  <div className="absolute left-0 top-1 text-[9px] font-black text-violet-500/40 opacity-40 group-hover:opacity-100 transition-all border border-violet-500/20 px-2 py-0.5 rounded">
                    S-{idx + 1}
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 p-6 rounded-[1.5rem] hover:border-violet-500/20 transition-all shadow-xl">
                    <div 
                      className="text-sm font-medium text-white/80 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(p) }}
                    />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {!loading && (
          <div className="flex justify-center pt-8 border-t border-white/5">
            <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-violet-500/5 border border-violet-500/20">
               <div className="w-2 h-2 rounded-full bg-violet-400 animate-ping" />
               <span className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-300">Analysis Synthesized by VANI</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
