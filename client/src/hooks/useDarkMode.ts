import { useState, useEffect } from 'react';

const DARK_MODE_KEY = 'wedding_dark_mode';

export const useDarkMode = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(DARK_MODE_KEY);
    return stored ? JSON.parse(stored) : false;
  });

  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDarkMode));
    
    // Update document class for global dark mode styles
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return {
    isDarkMode,
    toggleDarkMode
  };
};