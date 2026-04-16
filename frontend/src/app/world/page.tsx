'use client';

import React from 'react';
import StoreProvider from '../../state/StoreProvider';
import { GameManager } from '../../components/world/GameManager';

export default function GameWorldPage() {
  return (
    <StoreProvider>
      <main className="w-full h-screen bg-black overflow-hidden font-pixel">
        <GameManager />
      </main>
    </StoreProvider>
  );
}
