'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserState {
  vimid: string;
  setVimid: (id: string) => void;
  ensureVimid: () => string;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      vimid: '',
      setVimid: (id) => set({ vimid: id }),
      ensureVimid: () => {
        let current = get().vimid;
        if (!current) {
          if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
            current = window.crypto.randomUUID();
          } else {
            current = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          }
          set({ vimid: current });
        }
        return current;
      },
    }),
    {
      name: 'vani-user-storage',
    }
  )
);
