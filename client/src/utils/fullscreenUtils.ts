// Mobile Vollbild Utilities für Wedding Gallery

export interface FullscreenAPI {
  requestFullscreen?: () => Promise<void>;
  webkitRequestFullscreen?: () => Promise<void>;
  msRequestFullscreen?: () => Promise<void>;
  mozRequestFullScreen?: () => Promise<void>;
}

export interface DocumentFullscreen extends Document {
  exitFullscreen?: () => Promise<void>;
  webkitExitFullscreen?: () => Promise<void>;
  msExitFullscreen?: () => Promise<void>;
  mozCancelFullScreen?: () => Promise<void>;
  fullscreenElement?: Element;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
  mozFullScreenElement?: Element;
}

/**
 * Überprüft ob Vollbild-Modus verfügbar ist
 */
export const isFullscreenSupported = (): boolean => {
  const elem = document.documentElement as any;
  return !!(
    elem.requestFullscreen ||
    elem.webkitRequestFullscreen ||
    elem.msRequestFullscreen ||
    elem.mozRequestFullScreen
  );
};

/**
 * Überprüft ob gerade im Vollbild-Modus
 */
export const isInFullscreen = (): boolean => {
  const doc = document as DocumentFullscreen;
  return !!(
    doc.fullscreenElement ||
    doc.webkitFullscreenElement ||
    doc.msFullscreenElement ||
    doc.mozFullScreenElement
  );
};

/**
 * Aktiviert Vollbild-Modus
 */
export const enterFullscreen = async (): Promise<void> => {
  const elem = document.documentElement as FullscreenAPI;
  
  try {
    if (elem.requestFullscreen) {
      await elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) {
      await elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      await elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      await elem.mozRequestFullScreen();
    } else {
      throw new Error('Vollbild-Modus nicht unterstützt');
    }
  } catch (error) {
    console.warn('Vollbild-Modus konnte nicht aktiviert werden:', error);
    throw error;
  }
};

/**
 * Verlässt Vollbild-Modus
 */
export const exitFullscreen = async (): Promise<void> => {
  const doc = document as DocumentFullscreen;
  
  try {
    if (doc.exitFullscreen) {
      await doc.exitFullscreen();
    } else if (doc.webkitExitFullscreen) {
      await doc.webkitExitFullscreen();
    } else if (doc.msExitFullscreen) {
      await doc.msExitFullscreen();
    } else if (doc.mozCancelFullScreen) {
      await doc.mozCancelFullScreen();
    }
  } catch (error) {
    console.warn('Vollbild-Modus konnte nicht verlassen werden:', error);
    throw error;
  }
};

/**
 * Toggle Vollbild-Modus
 */
export const toggleFullscreen = async (): Promise<boolean> => {
  try {
    if (isInFullscreen()) {
      await exitFullscreen();
      return false;
    } else {
      await enterFullscreen();
      return true;
    }
  } catch (error) {
    console.warn('Vollbild-Toggle fehlgeschlagen:', error);
    return isInFullscreen();
  }
};

/**
 * Mobile PWA Installation prüfen
 */
export const isPWAInstalled = (): boolean => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.matchMedia('(display-mode: fullscreen)').matches ||
         (window.navigator as any).standalone === true;
};

/**
 * Mobile Safe Area Insets abrufen
 */
export const getSafeAreaInsets = () => {
  const style = getComputedStyle(document.documentElement);
  return {
    top: style.getPropertyValue('env(safe-area-inset-top)') || '0px',
    bottom: style.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
    left: style.getPropertyValue('env(safe-area-inset-left)') || '0px',
    right: style.getPropertyValue('env(safe-area-inset-right)') || '0px',
  };
};

/**
 * Mobile Browser UI verstecken (durch Scrollen)
 */
export const hideMobileBrowserUI = (): void => {
  // Kleiner Scroll-Hack um mobile Browser UI zu verstecken
  window.scrollTo(0, 1);
  setTimeout(() => {
    window.scrollTo(0, 0);
  }, 100);
};

/**
 * Vollbild Event Listener
 */
export const onFullscreenChange = (callback: (isFullscreen: boolean) => void): () => void => {
  const handler = () => callback(isInFullscreen());
  
  document.addEventListener('fullscreenchange', handler);
  document.addEventListener('webkitfullscreenchange', handler);
  document.addEventListener('msfullscreenchange', handler);
  document.addEventListener('mozfullscreenchange', handler);
  
  return () => {
    document.removeEventListener('fullscreenchange', handler);
    document.removeEventListener('webkitfullscreenchange', handler);
    document.removeEventListener('msfullscreenchange', handler);
    document.removeEventListener('mozfullscreenchange', handler);
  };
};

/**
 * PWA Installation Event Listener
 */
export const onPWAInstallPrompt = (callback: (event: any) => void): () => void => {
  const handler = (e: any) => {
    e.preventDefault();
    callback(e);
  };
  
  window.addEventListener('beforeinstallprompt', handler);
  
  return () => {
    window.removeEventListener('beforeinstallprompt', handler);
  };
};