import { create } from 'zustand';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
}

interface AuthStore {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: { id: 'local', name: 'Admin User', email: 'admin@example.com', role: 'ADMIN' },
  setUser: (user) => set({ user }),
}));
