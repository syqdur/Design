import React, { useState, useEffect } from 'react';
import { Tag, UserPlus, X, MapPin, Navigation } from 'lucide-react';
import {
  addMediaTag,
  removeMediaTag,
  getMediaTags,
  addLocationTag,
  removeLocationTag,
  getLocationTags,
  getAllUsers,
  addNotification,
  getLocationFromCoordinates,
  searchLocations,
  getCurrentLocation,
  getUserProfilesOnce
} from '../services/firebaseService';
import { MediaTag, LocationTag } from '../types';

interface MediaTaggingProps {
  mediaId: string;
  tags: MediaTag[];
  currentUser: string;
  currentDeviceId: string;
  isAdmin: boolean;
  isDarkMode: boolean;
  onTagsUpdated: () => void;
  getUserDisplayName: (userName: string, deviceId?: string) => string;
  mediaUploader?: string; // The user who uploaded this media
  mediaType?: string; // Type of media (image/video)
  mediaUrl?: string; // URL of the media for notifications
}

interface User {
  userName: string;
  deviceId: string;
  displayName?: string;
  profilePicture?: string;
}

interface LocationSuggestion {
  name: string;
  address: string;
}

export const MediaTagging: React.FC<MediaTaggingProps> = ({
  mediaId,
  tags,
  currentUser,
  currentDeviceId,
  isAdmin,
  isDarkMode,
  onTagsUpdated,
  getUserDisplayName,
  mediaUploader,
  mediaType,
  mediaUrl
}) => {
  const [showTagInput, setShowTagInput] = useState(false);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);
  const [userProfiles, setUserProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadUsers();
    loadLocationTags();
    loadUserProfiles();
  }, []);

  const loadUserProfiles = async () => {
    try {
      const profiles = await getUserProfilesOnce();
      setUserProfiles(profiles);
    } catch (error) {
      console.error('Error loading user profiles:', error);
    }
  };

  const getUserAvatar = (userName: string, deviceId?: string): string | null => {
    const profile = userProfiles.find(p => 
      p.userName === userName && (!deviceId || p.deviceId === deviceId)
    );
    return profile?.profilePicture || null;
  };

  useEffect(() => {
    if (customLocationName && customLocationName.length > 2) {
      const debounceTimer = setTimeout(async () => {
        await searchLocationSuggestions(customLocationName);
      }, 500);
      
      return () => clearTimeout(debounceTimer);
    } else {
      setLocationSuggestions([]);
    }
  }, [customLocationName]);

  const loadUsers = async () => {
    try {
      const allUsers = await getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadLocationTags = async () => {
    try {
      const tags = await getLocationTags(mediaId);
      setLocationTags(tags);
    } catch (error) {
      console.error('Error loading location tags:', error);
    }
  };

  const searchLocationSuggestions = async (query: string) => {
    setIsSearchingLocations(true);
    try {
      const suggestions = await searchLocations(query);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching locations:', error as any);
      setLocationSuggestions([]);
    } finally {
      setIsSearchingLocations(false);
    }
  };

  const handleAddTag = async (user: User) => {
    // Check if user is already tagged
    const isAlreadyTagged = tags.some(tag => 
      tag.userName === user.userName && tag.deviceId === user.deviceId
    );
    
    if (isAlreadyTagged) {
      alert('Diese Person ist bereits markiert.');
      return;
    }
    
    setIsLoading(true);
    try {
      await addMediaTag(mediaId, user.userName, user.deviceId, currentUser, currentDeviceId);
      
      // Send notification to tagged user (only if not tagging themselves)
      if (user.userName !== currentUser || user.deviceId !== currentDeviceId) {
        await addNotification(
          user.userName,
          user.deviceId,
          'tagged',
          `${getUserDisplayName(currentUser, currentDeviceId)} hat Sie in einem ${mediaType === 'video' ? 'Video' : 'Foto'} markiert`,
          mediaId,
          mediaUrl
        );
      }
      
      setShowTagInput(false);
      setSearchTerm('');
      onTagsUpdated();
    } catch (error) {
      console.error('Error adding tag:', error);
      alert('Fehler beim Hinzufügen der Markierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveTag = async (tag: MediaTag) => {
    // Permission check:
    // 1. User created the tag themselves
    // 2. User is admin (can remove any tag)
    // 3. User uploaded the media (can remove tags from their own media)
    const canRemove = 
      tag.taggedBy === currentUser || 
      isAdmin || 
      (mediaUploader && mediaUploader === currentUser);
    
    if (!canRemove) {
      alert('Sie können nur Ihre eigenen Markierungen entfernen.');
      return;
    }
    
    setIsLoading(true);
    try {
      await removeMediaTag(tag.id);
      onTagsUpdated();
    } catch (error) {
      console.error('Error removing tag:', error);
      alert('Fehler beim Entfernen der Markierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCurrentLocation = async () => {
    setIsLoadingLocation(true);
    try {
      const coordinates = await getCurrentLocation();
      const location = await getLocationFromCoordinates(coordinates.latitude, coordinates.longitude);
      
      await addLocationTag(mediaId, {
        name: location.name,
        address: location.address,
        coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude }
      }, currentUser, currentDeviceId);
      await loadLocationTags();
      onTagsUpdated(); // Notify parent component to refresh
      setShowLocationInput(false);
    } catch (error) {
      console.error('Error adding current location:', error);
      alert('Fehler beim Hinzufügen des aktuellen Standorts. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleAddCustomLocation = async () => {
    if (!customLocationName.trim()) return;
    
    setIsLoadingLocation(true);
    try {
      await addLocationTag(mediaId, {
        name: customLocationName.trim()
      }, currentUser, currentDeviceId);
      await loadLocationTags();
      onTagsUpdated(); // Notify parent component to refresh
      setShowLocationInput(false);
      setCustomLocationName('');
    } catch (error) {
      console.error('Error adding custom location:', error);
      alert('Fehler beim Hinzufügen des Standorts. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleSelectLocationSuggestion = async (suggestion: LocationSuggestion) => {
    setIsLoadingLocation(true);
    try {
      await addLocationTag(mediaId, {
        name: suggestion.name,
        address: suggestion.address
      }, currentUser, currentDeviceId);
      await loadLocationTags();
      onTagsUpdated(); // Notify parent component to refresh
      setShowLocationInput(false);
      setCustomLocationName('');
      setLocationSuggestions([]);
    } catch (error) {
      console.error('Error adding suggested location:', error);
      alert('Fehler beim Hinzufügen des Standorts. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleRemoveLocationTag = async (locationTag: LocationTag) => {
    // Permission check:
    // 1. User created the location tag themselves
    // 2. User is admin (can remove any location tag)
    // 3. User uploaded the media (can remove location tags from their own media)
    const canRemove = 
      locationTag.addedBy === currentUser || 
      isAdmin || 
      (mediaUploader && mediaUploader === currentUser);
    
    if (!canRemove) {
      alert('Sie können nur Ihre eigenen Standort-Tags entfernen.');
      return;
    }
    
    setIsLoadingLocation(true);
    try {
      await removeLocationTag(locationTag.id);
      await loadLocationTags();
      onTagsUpdated(); // Notify parent component to refresh
    } catch (error) {
      console.error('Error removing location tag:', error);
      alert('Fehler beim Entfernen des Standort-Tags. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Filter users based on search term and exclude already tagged users
  const filteredUsers = users.filter(user => {
    const isAlreadyTagged = tags.some(tag => 
      tag.userName === user.userName && tag.deviceId === user.deviceId
    );
    if (isAlreadyTagged) return false;
    
    const displayName = getUserDisplayName(user.userName, user.deviceId);
    return displayName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="py-2">
      {/* Add Tag and Location Buttons - Only show for media uploader or admin */}
      {(mediaUploader === currentUser || isAdmin) && (
        <>
          {!showTagInput && !showLocationInput && (
            <div className="flex items-center gap-1 mb-3">
              <button
                onClick={() => setShowTagInput(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-500 dark:text-pink-500 border border-pink-500/30 dark:border-pink-500/30"
                style={{ minHeight: '32px', minWidth: '32px' }}
              >
                <UserPlus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setShowLocationInput(true)}
                className="flex items-center justify-center w-8 h-8 rounded-full text-xs bg-green-500/20 hover:bg-green-500/30 text-green-600 dark:text-green-400 border border-green-300/30 dark:border-green-500/30 relative"
                style={{ minHeight: '32px', minWidth: '32px' }}
              >
                <MapPin className="w-4 h-4" />
                <span className="absolute -top-1 -right-1 text-[10px] font-bold">+</span>
              </button>
            </div>
          )}
        </>
      )}

      {/* Existing User Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-full text-xs font-medium bg-pink-500/20 text-pink-500 dark:text-pink-500 border border-pink-500/30 dark:border-pink-500/30"
              style={{ minHeight: '32px', minWidth: '32px' }}
            >
              <span className="truncate max-w-12 text-xs leading-none">{getUserDisplayName(tag.userName, tag.deviceId)}</span>
              {(tag.taggedBy === currentUser || isAdmin || (mediaUploader && mediaUploader === currentUser)) && (
                <button
                  onClick={() => handleRemoveTag(tag)}
                  disabled={isLoading}
                  className={`hover:opacity-70 ${
                    isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <X className="w-2 h-2" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input forms - Only show for media uploader or admin */}
      {(mediaUploader === currentUser || isAdmin) && (
        <>

          {showTagInput && (
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 shadow-xl">
              {/* Search Input */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nach Person suchen..."
                className="w-full px-3 py-2 rounded-lg border-2 border-transparent bg-white/60 dark:bg-gray-800/80 backdrop-blur-lg focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 transition-all duration-300 mb-3 text-sm"
                autoFocus
              />

              {/* User List */}
              <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const userAvatar = getUserAvatar(user.userName, user.deviceId);
                    const displayName = getUserDisplayName(user.userName, user.deviceId);
                    
                    return (
                      <button
                        key={`${user.userName}_${user.deviceId}`}
                        onClick={() => handleAddTag(user)}
                        disabled={isLoading}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg transition-all duration-300 transform hover:scale-[1.02] ${
                          isLoading ? 'opacity-50 cursor-not-allowed' : ''
                        } bg-white/60 dark:bg-gray-800/80 hover:bg-white/80 dark:hover:bg-gray-700/90 backdrop-blur-lg text-gray-900 dark:text-gray-100 border border-white/30 dark:border-gray-700/50 hover:border-pink-500 dark:hover:border-pink-500 shadow-md hover:shadow-lg`}
                      >
                        {/* Profile Picture */}
                        <div className="relative flex-shrink-0">
                          {userAvatar ? (
                            <img
                              src={userAvatar}
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover border-2 border-white/50 dark:border-gray-600/50 shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-pink-400 flex items-center justify-center text-white font-medium text-xs border-2 border-white/50 dark:border-gray-600/50 shadow-sm">
                              {displayName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        
                        {/* User Name */}
                        <div className="flex-1 text-left">
                          <span className="font-medium text-sm truncate">{displayName}</span>
                        </div>
                        
                        {/* Add Icon */}
                        <div className="flex-shrink-0">
                          <UserPlus className="w-3 h-3 text-pink-500 dark:text-pink-500" />
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <UserPlus className="w-6 h-6 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {searchTerm ? 'Keine Personen gefunden' : 'Alle Personen bereits markiert'}
                    </p>
                  </div>
                )}
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => {
                    setShowTagInput(false);
                    setSearchTerm('');
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 bg-white/30 dark:bg-gray-800/60 hover:bg-white/50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-100 backdrop-blur-lg border border-white/30 dark:border-gray-700/40 shadow-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}

          {showLocationInput && (
            <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-900/95 backdrop-blur-xl border border-white/20 dark:border-gray-800/50 shadow-xl">
              {/* Current Location Button */}
              <button
                onClick={handleAddCurrentLocation}
                disabled={isLoadingLocation}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 mb-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                  isLoadingLocation ? 'opacity-50 cursor-not-allowed' : ''
                } bg-gradient-to-r from-green-500/20 to-blue-500/20 hover:from-green-500/30 hover:to-blue-500/30 text-green-700 dark:text-green-300 backdrop-blur-sm border border-green-200/30 dark:border-green-600/30 shadow-lg hover:shadow-xl`}
              >
                <Navigation className="w-3 h-3" />
                {isLoadingLocation ? 'Standort wird ermittelt...' : 'Aktueller Standort'}
              </button>

              {/* Custom Location Input */}
              <div className="space-y-2 relative">
                <div className="relative">
                  <input
                    type="text"
                    value={customLocationName}
                    onChange={(e) => setCustomLocationName(e.target.value)}
                    placeholder="Standort eingeben"
                    className="w-full px-3 py-2 rounded-lg border-2 border-transparent bg-white/60 dark:bg-gray-800/80 backdrop-blur-lg focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-gray-100 transition-all duration-300 text-sm"
                  />
                  {isSearchingLocations && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-green-500 border-t-transparent"></div>
                    </div>
                  )}
                </div>

                {/* Location Suggestions Dropdown */}
                {locationSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-white/30 dark:border-gray-700/50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectLocationSuggestion(suggestion)}
                        disabled={isLoadingLocation}
                        className={`w-full text-left px-3 py-2 hover:bg-green-500/10 dark:hover:bg-green-500/20 transition-colors duration-200 border-b border-gray-200/30 dark:border-gray-700/30 last:border-b-0 ${
                          isLoadingLocation ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <MapPin className="w-3 h-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate text-xs">
                              {suggestion.name}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {suggestion.address}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleAddCustomLocation}
                  disabled={isLoadingLocation || !customLocationName.trim() || locationSuggestions.length > 0}
                  className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 transform hover:scale-[1.02] ${
                    isLoadingLocation || !customLocationName.trim() || locationSuggestions.length > 0
                      ? 'opacity-50 cursor-not-allowed' 
                      : ''
                  } bg-white/40 dark:bg-gray-800/60 hover:bg-white/60 dark:hover:bg-gray-700/80 backdrop-blur-sm text-gray-700 dark:text-gray-100 border border-white/20 dark:border-gray-700/40 hover:border-pink-300 dark:hover:border-pink-500 shadow-sm hover:shadow-md`}
                >
                  {isLoadingLocation ? 'Wird hinzugefügt...' : 'Standort hinzufügen'}
                </button>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end mt-3">
                <button
                  onClick={() => {
                    setShowLocationInput(false);
                    setCustomLocationName('');
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all duration-300 transform hover:scale-105 active:scale-95 bg-white/30 dark:bg-gray-800/60 hover:bg-white/50 dark:hover:bg-gray-700/80 text-gray-700 dark:text-gray-100 backdrop-blur-lg border border-white/30 dark:border-gray-700/40 shadow-lg"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};