import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: string;
  name: string;
  age: number;
  tags: string[];
  friends?: User[];
  location?: {
    lat: number;
    lng: number;
  };
  maxDistance?: number;
  filterKeywords?: string;
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
