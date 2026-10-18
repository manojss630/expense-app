import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  colors: {
    background: string;
    card: string;
    text: string;
    subtext: string;
    border: string;
    primary: string;
    primaryDark: string;
    emerald: string;
    rose: string;
  };
}

const lightColors = {
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  subtext: '#64748B',
  border: '#E2E8F0',
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  emerald: '#10B981',
  rose: '#EF4444',
};

const darkColors = {
  background: '#090D16',
  card: '#131A29',
  text: '#F8FAFC',
  subtext: '#94A3B8',
  border: '#1E293B',
  primary: '#818CF8',
  primaryDark: '#6366F1',
  emerald: '#34D399',
  rose: '#F87171',
};

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
  colors: lightColors,
});

export function MobileThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<ThemeMode>(systemScheme === 'dark' ? 'dark' : 'light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useMobileTheme = () => useContext(ThemeContext);

