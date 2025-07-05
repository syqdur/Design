import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, User, Save, Upload } from 'lucide-react';
import { UserProfile, getUserProfile, createOrUpdateUserProfile, uploadUserProfilePicture } from '../services/firebaseService';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  deviceId: string;
  isDarkMode: boolean;
  onProfileUpdated?: (profile: UserProfile) => void;
  isAdmin?: boolean;
  currentUserName?: string;
  currentDeviceId?: string;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  userName,
  deviceId,
  isDarkMode,
  onProfileUpdated,
  isAdmin = false,
  currentUserName,
  currentDeviceId
}) => {
  // Check if current user is trying to edit their own profile
  const isOwnProfile = userName === currentUserName && deviceId === currentDeviceId;
  
  // Only allow editing if it's the user's own profile (not admin editing others)
  const canEdit = isOwnProfile;
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && userName && deviceId) {
      loadUserProfile();
    }
  }, [isOpen, userName, deviceId]);

  const loadUserProfile = async () => {
    try {
      const profile = await getUserProfile(userName, deviceId);
      if (profile) {
        setUserProfile(profile);
        setDisplayName(profile.displayName || profile.userName);
        setProfilePicture(profile.profilePicture || null);
      } else {
        setDisplayName(userName);
        setProfilePicture(null);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!canEdit) {
      alert('Sie können nur Ihr eigenes Profil bearbeiten.');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Bitte wählen Sie eine Bilddatei aus.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Die Datei ist zu groß. Bitte wählen Sie ein Bild unter 5MB.');
      return;
    }

    setIsUploading(true);
    try {
      const downloadURL = await uploadUserProfilePicture(file, userName, deviceId);
      setProfilePicture(downloadURL);
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      alert('Fehler beim Hochladen des Profilbildes. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      alert('Sie können nur Ihr eigenes Profil bearbeiten.');
      return;
    }

    if (!displayName.trim()) {
      alert('Bitte geben Sie einen Anzeigenamen ein.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfile = await createOrUpdateUserProfile(userName, deviceId, {
        displayName: displayName.trim(),
        profilePicture
      });
      
      setUserProfile(updatedProfile);
      onProfileUpdated?.(updatedProfile);
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Fehler beim Speichern des Profils. Bitte versuchen Sie es erneut.');
    } finally {
      setIsSaving(false);
    }
  };

  const getAvatarInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 max-w-sm sm:max-w-md w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-gray-900/95 border-gray-700/30 shadow-2xl shadow-purple-500/10' 
          : 'bg-white/95 border-gray-200/30 shadow-2xl shadow-pink-500/10'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className={`text-lg sm:text-xl font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Mein Profil
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

        {/* Profile Picture Section */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <div className={`w-24 h-24 rounded-full overflow-hidden border-4 transition-colors duration-300 ${
              isDarkMode ? 'border-gray-600' : 'border-gray-200'
            }`}>
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className={`w-full h-full flex items-center justify-center text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-purple-600 to-pink-600 text-white' 
                    : 'bg-gradient-to-br from-pink-500 to-purple-500 text-white'
                }`}>
                  {getAvatarInitials(displayName || userName)}
                </div>
              )}
            </div>
            
            {/* Upload Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || !canEdit}
              className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white'
              } ${(isUploading || !canEdit) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
          
          <p className={`text-sm mt-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Klicken Sie auf die Kamera, um ein Profilbild hochzuladen
          </p>
        </div>

        {/* Display Name Section */}
        <div className="mb-6">
          <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Anzeigename
          </label>
          <div className="relative">
            <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Wie möchten Sie genannt werden?"
              disabled={!canEdit}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border transition-colors duration-300 ${
                !canEdit ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-pink-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-pink-500'
              } focus:outline-none focus:ring-2 focus:ring-pink-500/20`}
            />
          </div>
          <p className={`text-xs mt-1 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-600'
          }`}>
            {canEdit ? 'Dieser Name wird bei Ihren Beiträgen und Kommentaren angezeigt' : 'Sie können nur Ihr eigenes Profil bearbeiten.'}
          </p>
        </div>

        {/* User Info */}
        <div className={`mb-6 p-3 rounded-xl transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
        }`}>
          <p className={`text-sm transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <strong>Benutzername:</strong> {userName}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className={`flex-1 py-3 px-4 rounded-xl transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Abbrechen
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving || !displayName.trim() || !canEdit}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors duration-300 ${
              (isSaving || !displayName.trim() || !canEdit)
                ? isDarkMode 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : isDarkMode 
                  ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white'
            }`}
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Speichern...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Speichern
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};