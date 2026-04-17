'use client';
import { motion } from 'framer-motion';

interface Props {
  children: React.ReactNode;
  className?: string;
  hoverGlow?: boolean;
  intensity?: 'low' | 'medium' | 'high';
}

export function GlassCard({ 
  children, 
  className = '', 
  hoverGlow = false,
  intensity = 'medium' 
}: Props) {
  const intensities = {
    low: 'bg-[#0d1424]/20 backdrop-blur-md border-white/5',
    medium: 'glass-card',
    high: 'glass-panel'
  };

  return (
    <motion.div
      whileHover={hoverGlow ? { y: -5, boxShadow: '0 30px 60px -12px rgba(0,0,0,0.5), 0 0 40px 5px rgba(124,58,237,0.1)' } : {}}
      className={`
        relative rounded-[2.5rem] overflow-hidden transition-all duration-500
        ${intensities[intensity]}
        ${className}
      `}
    >
      {/* Subtle border highlight */}
      <div className="absolute inset-0 border border-white/5 rounded-[2.5rem] pointer-events-none" />
      
      {/* Content */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </motion.div>
  );
}
