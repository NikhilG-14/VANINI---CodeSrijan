import React from 'react';

interface RetroModalProps {
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  primaryAction?: { label: string; onClick: () => void };
}

export const RetroModal = ({ title, children, onClose, primaryAction }: RetroModalProps) => {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 animate-in fade-in duration-200">
      
      {/* Gameboy Advance / Pokemon style container */}
      <div 
        className="w-[90%] max-w-2xl h-[80%] max-h-[600px] bg-white relative flex flex-col font-pixel overflow-hidden"
        style={{
          boxShadow: 'inset -4px -4px 0px 0px rgba(0,0,0,0.2), 0 0 0 6px #000, 0 0 0 10px #f8f8f8, 0 0 0 14px #000',
          borderRadius: '8px'
        }}
      >
        {/* Header Bar */}
        {title && (
          <div className="bg-blue-800 text-white p-4 border-b-[6px] border-black flex justify-between items-center text-sm">
            <span>{title}</span>
            <div className="text-yellow-400">Lv. ??</div>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#f0f0f0] text-black">
          {children}
        </div>

        {/* Retro A/B Action Bar */}
        {(onClose || primaryAction) && (
          <div className="bg-white border-t-[6px] border-black p-4 flex justify-end gap-6 text-sm">
            {onClose && (
              <button 
                onClick={onClose}
                className="hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-red-600 border-2 border-black flex items-center justify-center text-white text-[10px]">&times;</div>
                <span className="font-bold">B</span>
              </button>
            )}
            {primaryAction && (
              <button 
                onClick={primaryAction.onClick}
                className="hover:scale-105 active:scale-95 transition-transform flex items-center gap-2"
              >
                <div className="w-6 h-6 rounded-full bg-green-500 border-2 border-black flex items-center justify-center text-white text-[10px]">!</div>
                <span className="font-bold">A</span>
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
