import { create } from 'zustand';

interface AuthState {
  token: string | null;
  username: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Read initial state from localStorage
  const savedToken = localStorage.getItem('fcc_token');
  const savedUsername = localStorage.getItem('fcc_username');
  const savedRole = localStorage.getItem('fcc_role');

  return {
    token: savedToken,
    username: savedUsername,
    role: savedRole,
    isAuthenticated: !!savedToken,
    login: (token, username, role) => {
      localStorage.setItem('fcc_token', token);
      localStorage.setItem('fcc_username', username);
      localStorage.setItem('fcc_role', role);
      set({ token, username, role, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('fcc_token');
      localStorage.removeItem('fcc_username');
      localStorage.removeItem('fcc_role');
      set({ token: null, username: null, role: null, isAuthenticated: false });
    },
  };
});
