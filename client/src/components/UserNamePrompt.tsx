import React, { useState } from 'react';
import { Heart, Camera, Image, X } from 'lucide-react';
import { CameraCapture } from './CameraCapture';

interface UserNamePromptProps {
  onSubmit: (name: string, profilePicture?: File) => void;
  isDarkMode: boolean;
}

export const UserNamePrompt: React.FC<UserNamePromptProps> = ({ onSubmit, isDarkMode }) => {
  const [name, setName] = useState('');
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim(), profilePicture || undefined);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setProfilePicture(file);
    }
  };

  const handleCameraCapture = (blob: Blob) => {
    const file = new File([blob], `profile-${Date.now()}.jpg`, { type: 'image/jpeg' });
    setProfilePicture(file);
    setShowCamera(false);
  };

  return (
    <div className={`fixed inset-0 flex items-center justify-center p-4 z-50 transition-colors duration-300 ${
      isDarkMode ? 'bg-neutral-900' : 'bg-gray-100'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl shadow-2xl transition-colors duration-300 ${
        isDarkMode ? 'bg-neutral-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 bg-pink-500 rounded-full flex items-center justify-center shadow-lg">
            <Heart className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            Willkommen zur Hochzeit! 💕
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
            Bitte gib deinen Namen ein, um deine Erinnerungen zu teilen
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Profile Picture Upload Section */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold text-center ${isDarkMode ? 'text-neutral-200' : 'text-gray-800'}`}>
              Profilbild hinzufügen (optional)
            </h3>
            
            <div className="flex justify-center gap-4">
              {/* Upload Photo Button */}
              <label className={`cursor-pointer p-3 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-105 ${
                isDarkMode 
                  ? 'border-neutral-600 hover:border-pink-500 hover:bg-pink-500/10' 
                  : 'border-gray-300 hover:border-pink-500 hover:bg-pink-500/10'
              }`}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <Image className={`w-6 h-6 ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`} />
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
                    Foto
                  </span>
                </div>
              </label>

              {/* Take Selfie Button */}
              <button
                type="button"
                onClick={() => setShowCamera(true)}
                className={`p-3 rounded-xl border-2 border-dashed transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'border-neutral-600 hover:border-pink-500 hover:bg-pink-500/10' 
                    : 'border-gray-300 hover:border-pink-500 hover:bg-pink-500/10'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <Camera className={`w-6 h-6 ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`} />
                  <span className={`text-xs font-medium ${isDarkMode ? 'text-neutral-400' : 'text-gray-600'}`}>
                    Selfie
                  </span>
                </div>
              </button>
            </div>

            {/* Profile Picture Preview */}
            {profilePicture && (
              <div className="flex justify-center">
                <div className="relative">
                  <img
                    src={URL.createObjectURL(profilePicture)}
                    alt="Profilbild Vorschau"
                    className="w-20 h-20 rounded-full object-cover border-4 border-pink-500"
                  />
                  <button
                    type="button"
                    onClick={() => setProfilePicture(null)}
                    className={`absolute -top-1 -right-1 w-6 h-6 rounded-full transition-colors duration-300 ${
                      isDarkMode ? 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                    }`}
                  >
                    <X className="w-3 h-3 mx-auto" />
                  </button>
                </div>
              </div>
            )}
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            className={`w-full p-4 rounded-xl border-2 focus:outline-none focus:ring-2 transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-neutral-700 border-neutral-600 text-white placeholder-neutral-400 focus:border-pink-500 focus:ring-pink-500/20' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-pink-500 focus:ring-pink-500/20'
            }`}
            maxLength={50}
            required
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className={`w-full p-4 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
              name.trim()
                ? 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                : isDarkMode ? 'bg-neutral-700 text-neutral-400' : 'bg-gray-200 text-gray-500'
            }`}
          >
            Weitermachen
          </button>
        </form>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          isDarkMode={isDarkMode}
        />
      )}
    </div>
  );
};