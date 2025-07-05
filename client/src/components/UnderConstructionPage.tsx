import React, { useState, useEffect } from 'react';
import { Heart, Sun, Moon, Lock, Unlock, Power, Globe, Users, Clock } from 'lucide-react';
import { SiteStatus, updateSiteStatus } from '../services/siteStatusService';

interface UnderConstructionPageProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  siteStatus: SiteStatus;
  isAdmin: boolean;
  onToggleAdmin: (isAdmin: boolean) => void;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export const UnderConstructionPage: React.FC<UnderConstructionPageProps> = ({
  isDarkMode,
  toggleDarkMode,
  siteStatus,
  isAdmin,
  onToggleAdmin
}) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const weddingDate = new Date('2025-07-12T00:00:00');
  const correctPIN = "2407";

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = weddingDate.getTime() - now.getTime();

      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPIN) {
      onToggleAdmin(true);
      setShowPasswordInput(false);
      setPassword('');
    } else {
      alert('Falscher Admin-Code!');
      setPassword('');
    }
  };

  const handleToggleSiteStatus = async () => {
    if (!isAdmin) return;

    const action = siteStatus.isUnderConstruction ? 'freischalten' : 'sperren';
    const confirmMessage = siteStatus.isUnderConstruction 
      ? '🌐 Website für alle Besucher freischalten?\n\nAlle Besucher können dann sofort auf die Galerie zugreifen.'
      : '🔒 Website für alle Besucher sperren?\n\nAlle Besucher sehen dann die Under Construction Seite.';

    if (window.confirm(confirmMessage)) {
      setIsUpdating(true);
      try {
        await updateSiteStatus(!siteStatus.isUnderConstruction, 'Admin');
        
        const successMessage = siteStatus.isUnderConstruction
          ? '✅ Website wurde erfolgreich freigeschaltet!\n\n🌐 Alle Besucher können jetzt auf die Galerie zugreifen.'
          : '🔒 Website wurde erfolgreich gesperrt!\n\n⏳ Alle Besucher sehen jetzt die Under Construction Seite.';
        
        alert(successMessage);
      } catch (error) {
        alert(`❌ Fehler beim ${action} der Website:\n${error}`);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-500 ${
      isDarkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50'
    }`}>
      {/* Header */}
      <div className="flex justify-between items-center p-6">
        <div></div>
        <button
          onClick={toggleDarkMode}
          className={`p-3 rounded-full transition-all duration-300 ${
            isDarkMode 
              ? 'text-yellow-400 hover:bg-white/10 hover:scale-110' 
              : 'text-gray-600 hover:bg-black/10 hover:scale-110'
          }`}
        >
          {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        {/* Profile Image */}
        <div className="mb-8 relative">
          <div className={`w-32 h-32 rounded-full overflow-hidden border-4 transition-all duration-500 ${
            isDarkMode ? 'border-pink-400 shadow-2xl shadow-pink-500/20' : 'border-pink-300 shadow-2xl shadow-pink-300/30'
          }`}>
            <img 
              src="https://i.ibb.co/PvXjwss4/profil.jpg" 
              alt="Kristin & Maurizio"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -top-2 -right-2 animate-pulse">
            <Heart className={`w-8 h-8 fill-current transition-colors duration-500 ${
              isDarkMode ? 'text-pink-400' : 'text-pink-500'
            }`} />
          </div>
        </div>

        {/* Title */}
        <h1 className={`text-4xl md:text-6xl font-light mb-4 transition-colors duration-500 ${
          isDarkMode ? 'text-white' : 'text-gray-800'
        }`}>
          Kristin & Maurizio
        </h1>

        <div className={`text-xl md:text-2xl mb-8 transition-colors duration-500 ${
          isDarkMode ? 'text-pink-300' : 'text-pink-600'
        }`}>
          12. Juli 2025
        </div>

        {/* Under Construction Message */}
        <div className={`max-w-2xl mb-12 transition-colors duration-500 ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          <h2 className={`text-2xl md:text-3xl font-light mb-4 transition-colors duration-500 ${
            isDarkMode ? 'text-white' : 'text-gray-800'
          }`}>
            Unsere Hochzeitswebsite entsteht
          </h2>
          <p className="text-lg leading-relaxed">
            Wir arbeiten gerade an etwas Wunderschönem für unseren besonderen Tag. 
            Bald könnt ihr hier alle magischen Momente unserer Hochzeit mit uns teilen!
          </p>
        </div>

        {/* Countdown - Instagram 2.0 Style */}
        <div className="mb-16">
          <div className={`mx-auto max-w-4xl p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
            isDarkMode 
              ? 'bg-gray-800/40 border border-gray-700/30 backdrop-blur-xl shadow-2xl shadow-purple-500/10' 
              : 'bg-white/60 border border-gray-200/40 backdrop-blur-xl shadow-2xl shadow-pink-500/10'
          }`}>
            {/* Decorative Background Elements */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl ${
                isDarkMode ? 'bg-pink-500' : 'bg-pink-300'
              }`} style={{ transform: 'translate(30%, -30%)' }}></div>
              <div className={`absolute bottom-0 left-0 w-32 h-32 rounded-full blur-3xl ${
                isDarkMode ? 'bg-purple-500' : 'bg-purple-300'
              }`} style={{ transform: 'translate(-30%, 30%)' }}></div>
            </div>

            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-4 mb-4">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-pink-600/20 to-purple-600/20 border border-pink-500/30' 
                      : 'bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-200/50'
                  }`}>
                    <span className="text-4xl">💒</span>
                  </div>
                </div>
                <h3 className={`text-3xl md:text-4xl font-bold tracking-tight mb-3 transition-colors duration-500 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Noch so lange bis zu unserem großen Tag
                </h3>
                <p className={`text-lg transition-colors duration-500 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Jeder Moment bringt uns näher zusammen ✨
                </p>
              </div>

              {/* Countdown Cards */}
              <div className="flex justify-center gap-8 max-w-2xl mx-auto">
                {[
                  { value: timeLeft.days, label: 'Tage', icon: '📅' },
                  { value: timeLeft.hours, label: 'Stunden', icon: '⏰' },
                  { value: timeLeft.minutes, label: 'Minuten', icon: '⏱️' },
                  { value: timeLeft.seconds, label: 'Sekunden', icon: '⚡' }
                ].map((item, index) => (
                  <div 
                    key={index}
                    className={`group w-28 h-32 rounded-2xl backdrop-blur-sm transition-all duration-500 hover:scale-105 ${
                      isDarkMode 
                        ? 'bg-gray-800/60 border border-gray-700/50 hover:bg-gray-800/80' 
                        : 'bg-white/80 border border-gray-200/60 hover:bg-white/90 shadow-lg hover:shadow-xl'
                    }`}
                    style={{
                      animation: 'pulse 2s ease-in-out infinite',
                      animationDelay: `${index * 0.3}s`
                    }}
                  >
                    <div className="h-full flex flex-col items-center justify-center text-center px-3">
                      {/* Icon */}
                      <div className="text-2xl mb-2 transform group-hover:scale-110 transition-transform duration-300">
                        {item.icon}
                      </div>

                      {/* Value */}
                      <div className={`text-2xl font-bold mb-2 transition-all duration-500 ${
                        isDarkMode 
                          ? 'text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400' 
                          : 'text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600'
                      }`}>
                        {item.value.toString().padStart(2, '0')}
                      </div>

                      {/* Label */}
                      <div className={`text-xs uppercase tracking-wide font-medium text-center transition-colors duration-500 leading-tight ${
                        isDarkMode ? 'text-gray-400 group-hover:text-gray-300' : 'text-gray-600 group-hover:text-gray-700'
                      }`}>
                        {item.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom Message */}
              <div className="mt-10 text-center">
                <div className={`inline-flex items-center gap-3 px-6 py-3 rounded-full transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-pink-600/20 border border-pink-500/30' 
                    : 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border border-pink-200/50'
                }`}>
                  <span className="text-2xl">💕</span>
                  <span className={`text-lg font-medium transition-colors duration-300 ${
                    isDarkMode ? 'text-pink-300' : 'text-pink-700'
                  }`}>
                    Wir freuen uns auf euch!
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hearts Animation */}
        <div className="flex items-center gap-2 mb-8">
          {[...Array(5)].map((_, i) => (
            <Heart 
              key={i}
              className={`w-4 h-4 fill-current animate-pulse transition-colors duration-500 ${
                isDarkMode ? 'text-pink-400' : 'text-pink-500'
              }`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {/* Footer Message */}
        <p className={`text-sm transition-colors duration-500 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          Wir freuen uns darauf, diesen besonderen Moment mit euch zu teilen! 💕
        </p>

        {/* Site Status Info */}
        <div className={`mt-8 p-4 rounded-xl transition-colors duration-500 ${
          isDarkMode ? 'bg-white/10 border border-white/20' : 'bg-white/60 border border-white/40'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className={`w-4 h-4 transition-colors duration-500 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} />
            <span className={`text-sm transition-colors duration-500 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Letztes Update: {formatDate(siteStatus.lastUpdated)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className={`w-4 h-4 transition-colors duration-500 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`} />
            <span className={`text-sm transition-colors duration-500 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              Aktualisiert von: {siteStatus.updatedBy}
            </span>
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      <div className="fixed bottom-6 left-6 flex flex-col gap-3">
        {/* Admin Login Button */}
        <button
          onClick={() => isAdmin ? onToggleAdmin(false) : setShowPasswordInput(true)}
          className={`p-3 rounded-full transition-all duration-300 ${
            isDarkMode
              ? isAdmin
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-800/50 hover:bg-gray-700/50 text-gray-400 hover:text-white backdrop-blur-sm'
              : isAdmin
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-white/50 hover:bg-white/70 text-gray-600 hover:text-gray-800 backdrop-blur-sm'
          }`}
          title={isAdmin ? "Admin-Modus verlassen" : "Admin-Modus"}
        >
          {isAdmin ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
        </button>

        {/* Site Control Button (only visible when admin) */}
        {isAdmin && (
          <button
            onClick={handleToggleSiteStatus}
            disabled={isUpdating}
            className={`p-3 rounded-full transition-all duration-300 ${
              isUpdating
                ? isDarkMode
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode
                  ? 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-110'
                  : 'bg-blue-500 hover:bg-blue-600 text-white hover:scale-110'
            }`}
            title={siteStatus.isUnderConstruction ? "Website für alle freischalten" : "Website für alle sperren"}
          >
            {isUpdating ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Globe className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* Password Input Modal */}
      {showPasswordInput && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className={`rounded-3xl p-8 max-w-sm w-full transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-semibold mb-6 text-center transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Admin-Zugang
            </h3>
            
            <div className={`mb-6 p-4 rounded-xl transition-colors duration-300 ${
              isDarkMode ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Power className={`w-4 h-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`} />
                <span className={`font-semibold text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Admin-Funktionen:
                </span>
              </div>
              <ul className={`text-sm space-y-1 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <li>• Website für alle Besucher freischalten/sperren</li>
                <li>• Medien und Kommentare verwalten</li>
                <li>• Alle Inhalte herunterladen</li>
              </ul>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin-Code eingeben..."
                className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent outline-none transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                }`}
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordInput(false);
                    setPassword('');
                  }}
                  className={`flex-1 py-3 px-4 rounded-xl transition-colors duration-300 ${
                    isDarkMode 
                      ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                      : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-pink-600 hover:bg-pink-700 text-white py-3 px-4 rounded-xl transition-colors"
                >
                  Anmelden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};