import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => {
  const savedTheme = (localStorage.getItem('fcc_theme') as 'light' | 'dark') || 'dark';
  
  // Apply initial theme
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: savedTheme,
    toggleTheme: () => set((state) => {
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('fcc_theme', newTheme);
      
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      return { theme: newTheme };
    }),
  };
});
