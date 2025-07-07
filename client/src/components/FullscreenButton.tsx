import React, { useState, useEffect } from 'react';
import { Maximize, Minimize, Smartphone } from 'lucide-react';
import { 
  isFullscreenSupported, 
  isInFullscreen, 
  toggleFullscreen, 
  onFullscreenChange,
  isPWAInstalled,
  hideMobileBrowserUI
} from '../utils/fullscreenUtils';

interface FullscreenButtonProps {
  isDarkMode: boolean;
  className?: string;
}

export const FullscreenButton: React.FC<FullscreenButtonProps> = ({ 
  isDarkMode, 
  className = '' 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [showPWAHint, setShowPWAHint] = useState(false);

  useEffect(() => {
    // Prüfe Vollbild-Unterstützung
    setIsSupported(isFullscreenSupported());
    setIsFullscreen(isInFullscreen());

    // Überwache Vollbild-Änderungen
    const cleanup = onFullscreenChange((fullscreen) => {
      setIsFullscreen(fullscreen);
    });

    // Prüfe ob PWA installiert ist
    const checkPWA = () => {
      const isPWA = isPWAInstalled();
      if (!isPWA && /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        setShowPWAHint(true);
      }
    };

    checkPWA();

    // Verstecke mobile Browser UI beim Laden
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setTimeout(hideMobileBrowserUI, 1000);
    }

    return cleanup;
  }, []);

  const handleToggleFullscreen = async () => {
    if (!isSupported) {
      // Fallback für mobile Browser ohne Fullscreen API
      hideMobileBrowserUI();
      setShowPWAHint(true);
      return;
    }

    try {
      const newState = await toggleFullscreen();
      setIsFullscreen(newState);
    } catch (error) {
      console.warn('Vollbild-Toggle fehlgeschlagen:', error);
      // Zeige PWA Hinweis für mobile Browser
      if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        setShowPWAHint(true);
      }
    }
  };

  const dismissPWAHint = () => {
    setShowPWAHint(false);
    hideMobileBrowserUI();
  };

  if (!isSupported && !showPWAHint) {
    return null;
  }

  return (
    <>
      <button
        onClick={handleToggleFullscreen}
        className={`${className} p-2 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center ${
          isDarkMode 
            ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white border border-gray-600' 
            : 'bg-white/80 hover:bg-gray-100/80 text-gray-900 border border-gray-200'
        } backdrop-blur-sm shadow-lg`}
        title={
          isSupported 
            ? (isFullscreen ? "Vollbild verlassen" : "Vollbild aktivieren")
            : "Mobile Vollbild-Modus"
        }
        aria-label={
          isSupported 
            ? (isFullscreen ? "Vollbild verlassen" : "Vollbild aktivieren")
            : "Mobile Vollbild-Modus"
        }
      >
        {isSupported ? (
          isFullscreen ? (
            <Minimize className="w-5 h-5" />
          ) : (
            <Maximize className="w-5 h-5" />
          )
        ) : (
          <Smartphone className="w-5 h-5" />
        )}
      </button>

      {/* PWA Installation Hinweis */}
      {showPWAHint && (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4`}>
          <div className={`max-w-sm w-full rounded-2xl p-6 ${
            isDarkMode 
              ? 'bg-gray-900 border border-gray-700 text-white' 
              : 'bg-white border border-gray-200 text-gray-900'
          } shadow-2xl`}>
            <div className="text-center">
              <Smartphone className={`w-12 h-12 mx-auto mb-4 ${
                isDarkMode ? 'text-pink-400' : 'text-pink-600'
              }`} />
              <h3 className="text-lg font-semibold mb-2">Vollbild-Erfahrung</h3>
              <p className={`text-sm mb-4 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Für die beste mobile Erfahrung:
              </p>
              <div className={`text-xs mb-6 space-y-2 text-left ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <div>• iOS: "Zum Home-Bildschirm hinzufügen"</div>
                <div>• Android: "App installieren" oder Menü → "Zur Startseite hinzufügen"</div>
                <div>• Dann läuft die App vollbildschirmähnlich</div>
              </div>
              <button
                onClick={dismissPWAHint}
                className={`w-full py-3 px-4 rounded-xl font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                    : 'bg-pink-600 hover:bg-pink-700 text-white'
                }`}
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};