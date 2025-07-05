import React from 'react';
import { Lock, Image, Heart, Music, Zap, Plus } from 'lucide-react';

interface TabNavigationProps {
  activeTab: 'gallery' | 'music' | 'timeline' | 'challenges';
  onTabChange: (tab: 'gallery' | 'music' | 'timeline' | 'challenges') => void;
  onUploadClick?: () => void;
  isDarkMode: boolean;
  galleryEnabled?: boolean;
  musicWishlistEnabled?: boolean;
  challengesEnabled?: boolean;
  isCountdownActive?: boolean;
  tabsLockedUntilCountdown?: boolean;
  adminOverrideTabLock?: boolean;
  isAdmin?: boolean;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  onUploadClick,
  isDarkMode,
  galleryEnabled = true,
  musicWishlistEnabled = true,
  challengesEnabled = true,
  isCountdownActive = false,
  tabsLockedUntilCountdown = false,
  adminOverrideTabLock = false,
  isAdmin = false
}) => {
  // Determine if tabs should be locked based on countdown
  const shouldLockTabs = tabsLockedUntilCountdown && isCountdownActive && !adminOverrideTabLock && !isAdmin;
  
  const allTabs = [
    {
      id: 'gallery' as const,
      label: 'Fotos',
      icon: Image,
      enabled: galleryEnabled,
      locked: shouldLockTabs
    },
    {
      id: 'timeline' as const,
      label: 'Momente',
      icon: Heart,
      enabled: true, // Timeline is always enabled
      locked: false  // Timeline is never locked
    },
    {
      id: 'music' as const,
      label: 'Musik',
      icon: Music,
      enabled: musicWishlistEnabled,
      locked: shouldLockTabs
    },
    {
      id: 'challenges' as const,
      label: 'Challenges',
      icon: Zap,
      enabled: challengesEnabled,
      locked: shouldLockTabs
    }
  ];

  // Filter tabs based on enabled status
  const tabs = allTabs.filter(tab => tab.enabled);

  const handleTabClick = (tabId: 'gallery' | 'music' | 'timeline' | 'challenges') => {
    const tab = allTabs.find(t => t.id === tabId);
    if (tab && tab.locked) {
      // Show locked message for locked tabs
      alert('Diese Funktion ist bis zum Ende des Countdowns gesperrt.');
      return;
    }
    onTabChange(tabId);
  };

  // Split tabs into left and right groups
  const leftTabs = tabs.slice(0, 2); // Gallery and Timeline
  const rightTabs = tabs.slice(2); // Music and Challenges

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-50 pb-safe glass-card border-t rounded-none ${
      isDarkMode 
        ? 'bg-black/80 border-white/10' 
        : 'bg-white/90 border-black/10'
    }`} style={{
      background: isDarkMode 
        ? 'rgba(0, 0, 0, 0.9)' 
        : 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      paddingTop: '8px',
      paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      paddingLeft: '8px',
      paddingRight: '8px'
    }}>
      <div className="max-w-lg mx-auto">
        <div className="flex justify-between items-center relative">
          {/* Left tabs */}
          <div className="flex gap-6">
            {leftTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  disabled={tab.locked}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all duration-300 btn-touch ${
                    tab.locked
                      ? 'opacity-50 cursor-not-allowed'
                      : isActive
                        ? 'transform scale-105'
                        : 'active:scale-95'
                  }`}
                >
                  <div className={`relative p-1.5 rounded-full transition-all duration-300 ${
                    tab.locked
                      ? isDarkMode
                        ? 'bg-gray-700/50 text-gray-500'
                        : 'bg-gray-200/50 text-gray-400'
                      : isActive
                        ? 'bg-gradient-to-r from-pink-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                        : isDarkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-pink-500/20'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-pink-500/10'
                  }`}>
                    {tab.locked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                    
                    {/* Active indicator dot */}
                    {isActive && !tab.locked && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <span className={`text-xs font-medium transition-colors duration-300 ${
                    tab.locked
                      ? isDarkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      : isActive
                        ? 'text-pink-500 font-semibold'
                        : isDarkMode
                          ? 'text-gray-400'
                          : 'text-gray-600'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Center upload button - only show when gallery is enabled */}
          {onUploadClick && galleryEnabled && (
            <button
              onClick={onUploadClick}
              className={`absolute left-1/2 transform -translate-x-1/2 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 btn-touch bg-gradient-to-r from-pink-500 to-pink-500 hover:from-pink-600 hover:to-pink-500 text-white ${
                isDarkMode 
                  ? 'shadow-pink-500/40' 
                  : 'shadow-pink-500/30'
              }`}
              style={{
                boxShadow: isDarkMode 
                  ? '0 8px 25px rgba(236, 72, 153, 0.4)' 
                  : '0 8px 25px rgba(236, 72, 153, 0.3)'
              }}
            >
              <Plus className="w-6 h-6" />
            </button>
          )}

          {/* Right tabs */}
          <div className="flex gap-6">
            {rightTabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  disabled={tab.locked}
                  className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-lg transition-all duration-300 btn-touch ${
                    tab.locked
                      ? 'opacity-50 cursor-not-allowed'
                      : isActive
                        ? 'transform scale-105'
                        : 'active:scale-95'
                  }`}
                >
                  <div className={`relative p-1.5 rounded-full transition-all duration-300 ${
                    tab.locked
                      ? isDarkMode
                        ? 'bg-gray-700/50 text-gray-500'
                        : 'bg-gray-200/50 text-gray-400'
                      : isActive
                        ? 'bg-gradient-to-r from-pink-500 to-pink-500 text-white shadow-lg shadow-pink-500/30'
                        : isDarkMode
                          ? 'text-gray-400 hover:text-white hover:bg-gradient-to-r hover:from-pink-500/20 hover:to-pink-500/20'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gradient-to-r hover:from-pink-500/10 hover:to-pink-500/10'
                  }`}>
                    {tab.locked ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <IconComponent className="w-4 h-4" />
                    )}
                    
                    {/* Active indicator dot */}
                    {isActive && !tab.locked && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-pink-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  
                  <span className={`text-xs font-medium transition-colors duration-300 ${
                    tab.locked
                      ? isDarkMode
                        ? 'text-gray-500'
                        : 'text-gray-400'
                      : isActive
                        ? 'text-pink-500 font-semibold'
                        : isDarkMode
                          ? 'text-gray-400'
                          : 'text-gray-600'
                  }`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};