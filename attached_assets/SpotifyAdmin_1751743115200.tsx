import React, { useState, useEffect } from 'react';
import { Music, LogOut, RefreshCw, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { 
  getAuthorizationUrl, 
  isSpotifyConnected, 
  disconnectSpotify, 
  getUserPlaylists,
  saveSelectedPlaylist,
  getSelectedPlaylist,
  getCurrentUser
} from '../services/spotifyService';

interface SpotifyAdminProps {
  isDarkMode: boolean;
}

export const SpotifyAdmin: React.FC<SpotifyAdminProps> = ({ isDarkMode }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyApi.PlaylistObjectSimplified[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [user, setUser] = useState<SpotifyApi.CurrentUsersProfileResponse | null>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSelectingPlaylist, setIsSelectingPlaylist] = useState(false);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, []);

  // Check if Spotify is connected
  const checkConnectionStatus = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const connected = await isSpotifyConnected();
      setIsConnected(connected);
      
      if (connected) {
        // Load user and playlists
        await loadUserData();
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setError('Failed to check Spotify connection status');
    } finally {
      setIsLoading(false);
    }
  };

  // Load user data and playlists
  const loadUserData = async () => {
    try {
      // Get user profile
      const userProfile = await getCurrentUser();
      setUser(userProfile);
      
      // Get playlists
      const userPlaylists = await getUserPlaylists();
      setPlaylists(userPlaylists);
      
      // Get selected playlist
      const selectedPlaylist = await getSelectedPlaylist();
      if (selectedPlaylist) {
        setSelectedPlaylistId(selectedPlaylist.playlistId);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load Spotify data');
    }
  };

  // Connect to Spotify
  const handleConnect = async () => {
    try {
      const authUrl = await getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to get authorization URL:', error);
      setError('Failed to initiate Spotify connection');
    }
  };

  // Disconnect from Spotify
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Spotify? This will revoke access and remove the connection.')) {
      return;
    }
    
    setIsDisconnecting(true);
    
    try {
      await disconnectSpotify();
      setIsConnected(false);
      setUser(null);
      setPlaylists([]);
      setSelectedPlaylistId(null);
    } catch (error) {
      console.error('Failed to disconnect Spotify:', error);
      setError('Failed to disconnect Spotify');
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Select playlist
  const handleSelectPlaylist = async (playlist: SpotifyApi.PlaylistObjectSimplified) => {
    setIsSelectingPlaylist(true);
    setError(null);
    
    try {
      await saveSelectedPlaylist(playlist.id, playlist.name);
      setSelectedPlaylistId(playlist.id);
    } catch (error) {
      console.error('Failed to select playlist:', error);
      setError('Failed to select playlist');
    } finally {
      setIsSelectingPlaylist(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 rounded-xl border transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
            <p className={`text-lg transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Loading Spotify data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className={`p-6 rounded-xl border transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors duration-300 ${
            isDarkMode ? 'bg-green-600' : 'bg-green-500'
          }`}>
            <Music className="w-8 h-8 text-white" />
          </div>
          
          <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Connect to Spotify
          </h3>
          
          <p className={`text-sm mb-6 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Connect your Spotify account to manage the wedding playlist
          </p>

          {error && (
            <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
              isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <AlertCircle className={`w-5 h-5 transition-colors duration-300 ${
                  isDarkMode ? 'text-red-400' : 'text-red-600'
                }`} />
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-red-300' : 'text-red-700'
                }`}>
                  {error}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleConnect}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 ${
              isDarkMode 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            <Music className="w-5 h-5" />
            Connect to Spotify
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-xl border transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      {/* Connection Status */}
      <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
        isDarkMode ? 'bg-green-900/20 border-green-700/30' : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full transition-colors duration-300 ${
            isDarkMode ? 'bg-green-600' : 'bg-green-500'
          }`}>
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className={`font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-green-300' : 'text-green-800'
            }`}>
              Connected to Spotify
            </h4>
            {user && (
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-green-200' : 'text-green-700'
              }`}>
                Logged in as {user.display_name} ({user.email})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
          isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            <AlertCircle className={`w-5 h-5 transition-colors duration-300 ${
              isDarkMode ? 'text-red-400' : 'text-red-600'
            }`} />
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              {error}
            </p>
          </div>
        </div>
      )}

      {/* Selected Playlist */}
      {selectedPlaylistId && (
        <div className={`mb-6 p-4 rounded-xl border transition-colors duration-300 ${
          isDarkMode ? 'bg-blue-900/20 border-blue-700/30' : 'bg-blue-50 border-blue-200'
        }`}>
          <h4 className={`font-semibold mb-2 transition-colors duration-300 ${
            isDarkMode ? 'text-blue-300' : 'text-blue-800'
          }`}>
            Selected Playlist
          </h4>
          <div className="flex items-center justify-between">
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              {playlists.find(p => p.id === selectedPlaylistId)?.name || 'Unknown Playlist'}
            </p>
            <a
              href={`https://open.spotify.com/playlist/${selectedPlaylistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-2 rounded-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
              title="Open in Spotify"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* Playlists */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className={`font-semibold transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Your Playlists
          </h4>
          <button
            onClick={loadUserData}
            className={`text-sm px-3 py-1 rounded transition-colors duration-300 ${
              isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {playlists.length > 0 ? (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {playlists.map(playlist => (
              <div
                key={playlist.id}
                className={`p-3 rounded-lg border transition-all duration-300 ${
                  selectedPlaylistId === playlist.id
                    ? isDarkMode
                      ? 'bg-green-900/20 border-green-700/30'
                      : 'bg-green-50 border-green-200'
                    : isDarkMode
                      ? 'bg-gray-700/50 border-gray-600 hover:bg-gray-700'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-300">
                    {playlist.images && playlist.images.length > 0 ? (
                      <img 
                        src={playlist.images[0].url} 
                        alt={playlist.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-5 h-5 text-gray-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className={`font-medium truncate transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {playlist.name}
                    </h5>
                    <p className={`text-xs truncate transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {playlist.tracks.total} songs • {playlist.owner.display_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSelectPlaylist(playlist)}
                      disabled={isSelectingPlaylist}
                      className={`p-2 rounded transition-colors duration-300 ${
                        selectedPlaylistId === playlist.id
                          ? isDarkMode
                            ? 'bg-green-600 text-white'
                            : 'bg-green-500 text-white'
                          : isDarkMode
                            ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title={selectedPlaylistId === playlist.id ? 'Selected' : 'Select playlist'}
                    >
                      {selectedPlaylistId === playlist.id ? (
                        <Check className="w-5 h-5" />
                      ) : (
                        <Music className="w-5 h-5" />
                      )}
                    </button>
                    <a
                      href={`https://open.spotify.com/playlist/${playlist.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2 rounded transition-colors duration-300 ${
                        isDarkMode
                          ? 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      }`}
                      title="Open in Spotify"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`p-8 text-center rounded-lg border transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-700/30 border-gray-600' : 'bg-gray-50 border-gray-200'
          }`}>
            <Music className={`w-12 h-12 mx-auto mb-3 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-400'
            }`} />
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              No playlists found
            </p>
          </div>
        )}
      </div>

      {/* Disconnect Button */}
      <button
        onClick={handleDisconnect}
        disabled={isDisconnecting}
        className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl transition-colors duration-300 ${
          isDisconnecting
            ? 'cursor-not-allowed opacity-50'
            : ''
        } ${
          isDarkMode 
            ? 'bg-red-600 hover:bg-red-700 text-white' 
            : 'bg-red-500 hover:bg-red-600 text-white'
        }`}
      >
        {isDisconnecting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        ) : (
          <LogOut className="w-5 h-5" />
        )}
        Disconnect Spotify
      </button>
    </div>
  );
};