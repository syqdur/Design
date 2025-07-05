import React, { useState } from 'react';
import { X, Lock, User, Eye, EyeOff } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (username: string) => void;
  isDarkMode: boolean;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin,
  isDarkMode
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Admin credentials
  const adminCredentials = {
    "Ehepaar": "test",
    "Mauro": "2407"
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if credentials match
    if (adminCredentials[username as keyof typeof adminCredentials] === password) {
      onLogin(username);
      setError('');
      setUsername('');
      setPassword('');
    } else {
      setError('Ungültige Anmeldedaten. Bitte versuche es erneut.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-700/30 shadow-2xl shadow-purple-500/10' 
          : 'bg-white/95 border-gray-200/30 shadow-2xl shadow-pink-500/10'
      }`}>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Admin-Anmeldung
          </h3>
          <button
            onClick={onClose}
            className={`p-2 sm:p-3 rounded-full backdrop-blur-sm transition-all duration-300 touch-manipulation ${
              isDarkMode 
                ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
            }`}
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {error && (
          <div className={`mb-4 p-3 sm:p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
            isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50/80 border-red-200/60 text-red-700'
          }`}>
            <p className="text-sm sm:text-base">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className={`block text-sm sm:text-base font-medium mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Benutzername
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <User className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 text-base ${
                  isDarkMode 
                    ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                    : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Benutzername eingeben"
                required
              />
            </div>
          </div>

          <div>
            <label className={`block text-sm sm:text-base font-medium mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Passwort
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Lock className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full pl-10 sm:pl-12 pr-12 sm:pr-14 py-3 sm:py-4 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 text-base ${
                  isDarkMode 
                    ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                    : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="Passwort eingeben"
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center touch-manipulation"
                onClick={() => setShowPassword(!showPassword)}
                style={{ minWidth: '48px', minHeight: '48px' }}
              >
                {showPassword ? (
                  <EyeOff className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                ) : (
                  <Eye className={`w-5 h-5 sm:w-6 sm:h-6 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`} />
                )}
              </button>
            </div>
          </div>

          <div className="pt-2 sm:pt-4">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white py-3 sm:py-4 px-4 sm:px-6 rounded-xl backdrop-blur-sm transition-all duration-300 font-medium text-base sm:text-lg shadow-lg shadow-pink-500/25 touch-manipulation"
              style={{ minHeight: '48px' }}
            >
              Anmelden
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};