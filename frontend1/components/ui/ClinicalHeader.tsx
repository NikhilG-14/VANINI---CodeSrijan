'use client';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowLeft, Hexagon } from 'lucide-react';
import Link from 'next/link';

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
  rightAction?: React.ReactNode;
}

export function ClinicalHeader({ 
  title, 
  subtitle, 
  backHref,
  rightAction 
}: Props) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
        
        {/* Left: Back or Brand */}
        <div className="flex items-center gap-6">
          {backHref ? (
            <Link href={backHref}>
              <motion.div 
                whileHover={{ x: -4 }}
                className="w-12 h-12 rounded-full glass-card flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </motion.div>
            </Link>
          ) : (
            <div className="w-12 h-12 rounded-xl glass-card flex items-center justify-center text-violet-400">
              <Hexagon size={24} className="animate-pulse" />
            </div>
          )}
          
          <div className="flex flex-col">
            <h1 className="text-white font-black text-xs uppercase tracking-[0.4em] leading-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="text-white/30 text-[9px] font-black uppercase tracking-[0.3em] mt-1">
                {subtitle}
              </span>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {rightAction ? rightAction : (
            <div className="px-5 py-2 rounded-full glass-panel border-emerald-500/20 text-emerald-400 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
              <span className="text-[8px] font-black uppercase tracking-[0.3em]">SECURE_LINK.V4</span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
