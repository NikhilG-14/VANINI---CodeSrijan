'use client';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
}

export function GlassButton({ 
  children, 
  onClick, 
  icon: Icon, 
  variant = 'primary', 
  className = '', 
  size = 'md',
  disabled = false
}: Props) {
  const variants = {
    primary: 'bg-violet-600/90 border-violet-400/30 text-white shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:bg-violet-500 hover:shadow-[0_0_30px_rgba(124,58,237,0.5)]',
    secondary: 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.08] hover:text-white hover:border-white/20',
    ghost: 'bg-transparent border-transparent text-white/40 hover:text-white/80 hover:bg-white/5',
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40'
  };

  const sizes = {
    sm: 'px-4 py-2 text-[10px] rounded-lg tracking-[0.2em]',
    md: 'px-6 py-3 text-xs rounded-xl tracking-[0.3em]',
    lg: 'px-10 py-5 text-sm rounded-2xl tracking-[0.4em]',
    xl: 'px-16 py-8 text-base rounded-[2rem] tracking-[0.5em]'
  };

  return (
    <motion.button
      whileHover={disabled ? {} : { y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-3 font-black uppercase transition-all duration-300 border backdrop-blur-md outline-none
        ${variants[variant]}
        ${sizes[size]}
        ${disabled ? 'opacity-30 cursor-not-allowed grayscale' : ''}
        ${className}
      `}
    >
      {Icon && <Icon className={`${size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} stroke-[3px]`} />}
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
}
