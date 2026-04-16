'use client';
import { useState, useEffect, useRef } from 'react';
import { generateAvatarResponse, saveChatMessage, getUserDossier } from '@/lib/ollamaClient';
import type { CognitiveScores, CognitiveInsight } from '@/lib/types';
import { useUserStore } from '@/store/userStore';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface Props {
  scores: CognitiveScores;
  insights: CognitiveInsight[];
}

export function VaniChat({ scores, insights }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const vimid = useUserStore(s => s.ensureVimid());
  const [dossier, setDossier] = useState<{ recent_sessions: any[], recent_chat: any[] } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    getUserDossier(vimid).then(data => {
      if (data) {
        setDossier(data);
        if (data.recent_chat?.length > 0) {
          setMessages(data.recent_chat.map((m: any) => ({
            role: m.role,
            content: m.content
          })));
        }
      }
    });
  }, [vimid]);

  // Scroll to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    // Save user message to backend
    saveChatMessage(vimid, 'user', userMsg);

    let assistantMsg = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      await generateAvatarResponse(
        userMsg,
        scores,
        insights,
        dossier || undefined,
        (chunk) => {
          assistantMsg += chunk;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1].content = assistantMsg;
            return next;
          });
        }
      );
      
      // Save assistant message to backend
      saveChatMessage(vimid, 'assistant', assistantMsg);
      
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1].content = "I'm sorry, I'm having a bit of trouble connecting right now. Let's try again in a moment.";
        return next;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] w-full bg-[#0d1424] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-thin scrollbar-thumb-white/10">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-40">
            <div className="text-4xl">🧠</div>
            <p className="text-white text-sm font-medium italic">
              "I remember our journey. What would you like to discuss about your results?"
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-6 py-4 rounded-3xl text-sm leading-relaxed ${
              m.role === 'user' 
                ? 'bg-violet-600 text-white rounded-tr-none' 
                : 'bg-white/5 text-white/90 border border-white/10 rounded-tl-none'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/5 px-6 py-4 rounded-3xl rounded-tl-none border border-white/10 flex gap-1">
              <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/5 bg-black/20">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your reflection..."
            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-violet-500/50 focus:bg-white/10 transition-all pr-16"
          />
          <button
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="absolute right-2 p-3 rounded-xl bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
