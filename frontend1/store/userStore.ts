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
          if (typeof window !== 'undefined') {
            current = window.localStorage.getItem('guest_user_id') || window.sessionStorage.getItem('guest_user_id') || '';
          }
        }
        if (!current) {
          if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
            current = `guest_${window.crypto.randomUUID()}`;
          } else {
            current = `guest_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
          }
        }
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('guest_user_id', current);
          window.sessionStorage.setItem('guest_user_id', current);
        }
        set({ vimid: current });
        return current;
      },
    }),
    {
      name: 'vani-user-storage',
    }
  )
);
