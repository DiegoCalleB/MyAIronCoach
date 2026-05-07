'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'light-neutral';

interface ThemeContextType {
  theme: Theme;
  setThemeChoice: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setThemeChoice: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('fitapp_theme') as Theme | null;
    let initialTheme: Theme = 'dark';
    if (savedTheme === 'light') initialTheme = 'light';
    else if (savedTheme === 'light-neutral') initialTheme = 'light-neutral';
    
    // eslint-disable-next-line
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
    setMounted(true);
  }, []);

  const setThemeChoice = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem('fitapp_theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  // Prevent flash by avoiding rendering until mounted (or render children directly, script in layout prevents flash)
  return (
    <ThemeContext.Provider value={{ theme, setThemeChoice }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
