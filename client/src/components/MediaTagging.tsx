import React, { useState, useEffect } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { 
  getCurrentLocation, 
  getLocationFromCoordinates, 
  searchLocations, 
  addLocationTag 
} from '../services/firebaseService';

interface MediaTaggingProps {
  mediaId: string;
  currentUser: string;
  currentDeviceId: string;
  isAdmin: boolean;
  isDarkMode: boolean;
  onTagsUpdated: () => void;
  getUserDisplayName: (name: string) => string;
  mediaUploader: string;
  mediaType: string;
  mediaUrl: string;
}

interface LocationSuggestion {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  placeId?: string;
}

export const MediaTagging: React.FC<MediaTaggingProps> = ({
  mediaId,
  currentUser,
  currentDeviceId,
  isAdmin,
  isDarkMode,
  onTagsUpdated,
  mediaUploader
}) => {
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isAddingLocation, setIsAddingLocation] = useState(false);

  // Check if current user can tag (admin or media uploader)
  const canTag = isAdmin || currentUser === mediaUploader;

  const handleGetCurrentLocation = async () => {
    if (!canTag) return;
    
    setIsLoadingLocation(true);
    try {
      const coordinates = await getCurrentLocation();
      const locationData = await getLocationFromCoordinates(
        coordinates.latitude,
        coordinates.longitude
      );
      
      await addLocationTag(
        mediaId,
        {
          name: locationData.name,
          address: locationData.address,
          coordinates
        },
        currentUser,
        currentDeviceId
      );
      
      onTagsUpdated();
      setShowLocationInput(false);
    } catch (error) {
      console.error('Error getting current location:', error);
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleLocationSearch = async (query: string) => {
    setLocationSearch(query);
    
    if (query.length < 3) {
      setLocationSuggestions([]);
      return;
    }

    try {
      const suggestions = await searchLocations(query);
      setLocationSuggestions(suggestions);
    } catch (error) {
      console.error('Error searching locations:', error);
      setLocationSuggestions([]);
    }
  };

  const handleSelectLocation = async (location: LocationSuggestion) => {
    if (!canTag) return;
    
    setIsAddingLocation(true);
    try {
      await addLocationTag(
        mediaId,
        location,
        currentUser,
        currentDeviceId
      );
      
      onTagsUpdated();
      setShowLocationInput(false);
      setLocationSearch('');
      setLocationSuggestions([]);
    } catch (error) {
      console.error('Error adding location tag:', error);
    } finally {
      setIsAddingLocation(false);
    }
  };

  if (!canTag) {
    return null;
  }

  return (
    <div className="py-3">
      {!showLocationInput ? (
        <button
          onClick={() => setShowLocationInput(true)}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 backdrop-blur-sm shadow-lg hover:scale-105 ${
            isDarkMode 
              ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-400/30 shadow-black/20' 
              : 'bg-green-50/80 hover:bg-green-100/80 text-green-600 border border-green-200/50 shadow-green-500/20'
          }`}
          title="Standort hinzufügen"
        >
          <MapPin className="w-4 h-4" />
          <span className="hidden sm:inline">Standort hinzufügen</span>
        </button>
      ) : (
        <div className={`space-y-4 p-5 rounded-2xl border transition-all duration-300 backdrop-blur-sm shadow-lg ${
          isDarkMode 
            ? 'bg-black/40 border-white/10 shadow-black/40' 
            : 'bg-white/60 border-white/30 shadow-gray-500/20'
        }`}>
          <div className="flex items-center justify-between">
            <h4 className={`font-semibold text-base transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              📍 Standort hinzufügen
            </h4>
            <button
              onClick={() => {
                setShowLocationInput(false);
                setLocationSearch('');
                setLocationSuggestions([]);
              }}
              className={`p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                isDarkMode 
                  ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                  : 'hover:bg-gray-100/50 text-gray-500 hover:text-gray-700'
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* GPS Location Button */}
          <button
            onClick={handleGetCurrentLocation}
            disabled={isLoadingLocation}
            className={`w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-300 shadow-md hover:scale-105 backdrop-blur-sm ${
              isDarkMode 
                ? 'bg-blue-500/80 hover:bg-blue-600/80 disabled:bg-gray-600/50 text-white shadow-blue-500/20 border border-blue-400/30' 
                : 'bg-blue-500/90 hover:bg-blue-600/90 disabled:bg-gray-400/70 text-white shadow-blue-500/30 border border-blue-300/50'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>{isLoadingLocation ? '🔍 GPS wird abgerufen...' : '📍 Aktueller Standort (GPS)'}</span>
          </button>

          {/* Location Search */}
          <div className="space-y-3">
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => handleLocationSearch(e.target.value)}
              placeholder="🔍 Standort suchen..."
              className={`w-full px-4 py-3 rounded-xl border font-medium transition-all duration-300 backdrop-blur-sm shadow-md ${
                isDarkMode 
                  ? 'bg-black/30 border-white/20 text-white placeholder-gray-400 focus:border-green-400/50 focus:bg-black/50' 
                  : 'bg-white/70 border-gray-200/50 text-gray-900 placeholder-gray-500 focus:border-green-400/50 focus:bg-white/90'
              }`}
            />

            {/* Location Suggestions */}
            {locationSuggestions.length > 0 && (
              <div className={`max-h-60 overflow-y-auto rounded-xl border transition-all duration-300 backdrop-blur-sm shadow-lg ${
                isDarkMode 
                  ? 'border-white/20 bg-black/40 shadow-black/40' 
                  : 'border-gray-200/50 bg-white/80 shadow-gray-500/20'
              }`}>
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectLocation(suggestion)}
                    disabled={isAddingLocation}
                    className={`w-full text-left px-4 py-4 border-b last:border-b-0 transition-all duration-300 hover:scale-[1.02] ${
                      isDarkMode 
                        ? 'border-white/10 hover:bg-white/10 text-white disabled:bg-black/20 disabled:text-gray-500' 
                        : 'border-gray-100/50 hover:bg-white/60 text-gray-900 disabled:bg-gray-100/50 disabled:text-gray-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full transition-colors duration-300 ${
                        isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-100/80 text-green-600'
                      }`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate text-base">{suggestion.name}</div>
                        <div className={`text-sm truncate transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {suggestion.address}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};