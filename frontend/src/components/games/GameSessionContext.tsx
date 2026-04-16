'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { SessionConfig, GameResult } from '@/lib/gameSession';
import { buildSession, saveSession, saveResults } from '@/lib/gameSession';

interface GameSessionContextValue {
  session: SessionConfig | null;
  currentIndex: number;
  results: GameResult[];
  isComplete: boolean;
  startSession: () => void;
  submitResult: (result: GameResult) => void;
  skipGame: () => void;
}

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export function GameSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<GameResult[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const initialized = useRef(false);

  const startSession = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;
    const config = buildSession();
    saveSession(config);
    setSession(config);
    setCurrentIndex(0);
    setResults([]);
    setIsComplete(false);
  }, []);

  const advance = useCallback((nextResults: GameResult[], config: SessionConfig) => {
    const nextIdx = nextResults.length;
    if (nextIdx >= config.games.length) {
      saveResults(nextResults);
      setIsComplete(true);
    } else {
      setCurrentIndex(nextIdx);
    }
  }, []);

  const submitResult = useCallback((result: GameResult) => {
    if (!session) return;
    
    setResults((prev) => {
      const updated = [...prev, result];
      // Trigger side-effect synchronously for state consistency
      advance(updated, session);
      return updated;
    });
  }, [session, advance]);

  const skipGame = useCallback(() => {
    if (!session) return;
    
    setResults((prev) => {
      const updated = [...prev];
      // For skip, we might need a placeholder result or handle length manually
      // but current logic uses results.length to track index.
      // So we push a dummy result if we want it to count.
      // Actually, skip should probably just advance the index without a result.
      return prev; 
    });
    
    setCurrentIndex(prev => {
      const next = prev + 1;
      if (next >= session.games.length) {
        setIsComplete(true);
        return prev;
      }
      return next;
    });
  }, [session]);

  return (
    <GameSessionContext.Provider value={{ session, currentIndex, results, isComplete, startSession, submitResult, skipGame }}>
      {children}
    </GameSessionContext.Provider>
  );
}

export function useGameSession() {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error('useGameSession must be used within GameSessionProvider');
  return ctx;
}
