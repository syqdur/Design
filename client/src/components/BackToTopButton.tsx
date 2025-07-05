import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';

interface BackToTopButtonProps {
  isDarkMode: boolean;
}

export const BackToTopButton: React.FC<BackToTopButtonProps> = ({ isDarkMode }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (!isVisible) {
    return null;
  }

  return (
    <button
      onClick={scrollToTop}
      className={`fixed z-50 w-8 h-8 sm:w-9 sm:h-9 rounded-full transition-all duration-300 hover:scale-110 shadow-lg flex items-center justify-center ${
        isDarkMode 
          ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 shadow-pink-500/25' 
          : 'bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600 shadow-pink-400/25'
      } backdrop-blur-sm border border-white/20`}
      style={{ 
        bottom: 'max(80px, calc(80px + env(safe-area-inset-bottom)))',
        right: '16px' // Position to the right
      }}
      title="Zum Anfang scrollen"
      aria-label="Back to top"
    >
      <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
    </button>
  );
};