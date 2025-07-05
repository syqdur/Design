import React, { useState, useEffect } from 'react';
import { Music, Search, X, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Clock, Heart, Play, Volume2, Check, CheckSquare, Square, Zap, Wifi, Activity } from 'lucide-react';
import { 
  searchTracks, 
  addTrackToPlaylist, 
  removeTrackFromPlaylist,
  getSelectedPlaylist,
  getPlaylistTracks,
  isSpotifyConnected,
  getCurrentUser,
  subscribeToPlaylistUpdates,
  bulkRemoveTracksFromPlaylist,
  getCurrentSnapshotId,
  getPendingOperationsCount
} from '../services/spotifyService';
import { SpotifyTrack } from '../types';
import { getUserName, getDeviceId } from '../utils/deviceId';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface MusicWishlistProps {
  isDarkMode: boolean;
  isAdmin?: boolean;
}

interface SongOwnership {
  id: string;
  trackId: string;
  spotifyTrackUri: string;
  addedByUser: string;
  addedByDeviceId: string;
  addedAt: string;
  playlistId: string;
}

export const MusicWishlist: React.FC<MusicWishlistProps> = ({ isDarkMode, isAdmin: adminProp = false }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [playlistTracks, setPlaylistTracks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSpotifyAvailable, setIsSpotifyAvailable] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string; playlistId: string } | null>(null);
  const [isAddingTrack, setIsAddingTrack] = useState<string | null>(null);
  const [isRemovingTrack, setIsRemovingTrack] = useState<string | null>(null);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [songOwnerships, setSongOwnerships] = useState<SongOwnership[]>([]);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'syncing' | 'error'>('connecting');
  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [unsubscribeSnapshot, setUnsubscribeSnapshot] = useState<(() => void) | null>(null);

  // Update admin state when prop changes
  useEffect(() => {
    setIsAdmin(adminProp);
  }, [adminProp]);

  // Check Spotify availability and load data
  useEffect(() => {
    const checkSpotify = async () => {
      try {
        setIsLoading(true);
        setSyncStatus('connecting');

        const connected = await isSpotifyConnected();
        setIsSpotifyAvailable(connected);

        if (connected) {
          try {
            const user = await getCurrentUser();
            setCurrentUser(user);
          } catch (userError) {
            console.log('Could not get current user:', userError);
          }

          const playlist = await getSelectedPlaylist();
          if (playlist) {
            setSelectedPlaylist(playlist);

            try {
              const cleanup = subscribeToPlaylistUpdates(playlist.playlistId, (tracks) => {
                setPlaylistTracks(tracks);
                setLastUpdate(new Date());
                setSyncStatus('live');
                setPendingOperations(getPendingOperationsCount());
                const currentSnapshot = getCurrentSnapshotId();
                setSnapshotId(currentSnapshot);
              });

              setUnsubscribeSnapshot(() => cleanup);
              await loadSongOwnerships();
            } catch (playlistError) {
              console.error('Failed to load playlist tracks:', playlistError);
              setError('Failed to load playlist tracks. The playlist may no longer exist or you may not have access to it.');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check Spotify:', error);
        setError('Failed to load Spotify data');
      } finally {
        setIsLoading(false);
      }
    };

    checkSpotify();

    return () => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Search with debounce
  useEffect(() => {
    if (!searchQuery.trim() || !isSpotifyAvailable) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      setError(null);

      try {
        const results = await searchTracks(searchQuery);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search tracks');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isSpotifyAvailable]);

  // Song ownership management
  const loadSongOwnerships = async () => {
    if (!selectedPlaylist) return;

    try {
      console.log('📋 === LOADING SONG OWNERSHIPS ===');
      console.log('Playlist ID:', selectedPlaylist.playlistId);

      const q = query(
        collection(db, 'songOwnerships'),
        where('playlistId', '==', selectedPlaylist.playlistId)
      );
      const querySnapshot = await getDocs(q);
      const ownerships: SongOwnership[] = [];

      querySnapshot.forEach((doc) => {
        ownerships.push({ id: doc.id, ...doc.data() } as SongOwnership);
      });

      console.log(`📋 Loaded ${ownerships.length} ownership records`);
      ownerships.forEach(o => console.log(`  - ${o.trackId} by ${o.addedByUser} (${o.addedByDeviceId?.slice(0, 8)}...)`));

      setSongOwnerships(ownerships);
    } catch (error) {
      console.error('Failed to load song ownerships:', error);
    }
  };

  const trackSongOwnership = async (trackId: string, spotifyTrackUri: string) => {
    if (!selectedPlaylist) return;

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    if (!currentUserName) return;

    try {
      const ownership: Omit<SongOwnership, 'id'> = {
        trackId,
        spotifyTrackUri,
        addedByUser: currentUserName,
        addedByDeviceId: currentDeviceId,
        addedAt: new Date().toISOString(),
        playlistId: selectedPlaylist.playlistId
      };

      await addDoc(collection(db, 'songOwnerships'), ownership);
      setSongOwnerships(prev => [...prev, { ...ownership, id: Date.now().toString() }]);
    } catch (error) {
      console.error('Failed to track song ownership:', error);
    }
  };

  const removeSongOwnership = async (trackId: string) => {
    try {
      const ownership = songOwnerships.find(o => o.trackId === trackId);
      if (ownership) {
        await deleteDoc(doc(db, 'songOwnerships', ownership.id));
        setSongOwnerships(prev => prev.filter(o => o.id !== ownership.id));
      }
    } catch (error) {
      console.error('Failed to remove song ownership:', error);
    }
  };

  const handleAddTrack = async (track: SpotifyTrack) => {
    if (isAddingTrack) return;

    setIsAddingTrack(track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await addTrackToPlaylist(track.uri);
      await trackSongOwnership(track.id, track.uri);

      setShowAddSuccess(true);
      setTimeout(() => setShowAddSuccess(false), 2000);

      setSearchQuery('');
      setSearchResults([]);
    } catch (error: any) {
      console.error('Failed to add track:', error);

      if (error.requiresReauth || (error.status === 403 && error.message?.includes('Insufficient'))) {
        setError('Spotify permissions insufficient. Please disconnect and reconnect to grant full access.');
      } else {
        setError('Failed to add track to playlist: ' + (error.message || 'Unknown error'));
      }

      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsAddingTrack(null);
    }
  };

  const handleRemoveTrack = async (track: any) => {
    if (isRemovingTrack) return;

    if (!confirm(`Remove "${track.track.name}" from the playlist?`)) {
      return;
    }

    setIsRemovingTrack(track.track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      await removeTrackFromPlaylist(track.track.uri);
      await removeSongOwnership(track.track.id);
    } catch (error: any) {
      console.error('Failed to remove track:', error);
      setError('Failed to remove track from playlist: ' + (error.message || 'Unknown error'));
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('live'), 3000);
    } finally {
      setIsRemovingTrack(null);
    }
  };

  // Check if user can delete a track
  const canDeleteTrack = (track: any) => {
    if (isAdmin) {
      console.log(`✅ Admin can delete "${track.track.name}"`);
      return true;
    }

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    console.log(`🔍 Checking delete permission for "${track.track.name}"`);
    console.log(`👤 Current user: ${currentUserName} (${currentDeviceId})`);

    if (!currentUserName) {
      console.log('❌ No username found');
      return false;
    }

    const ownership = songOwnerships.find(o => o.trackId === track.track.id);
    if (!ownership) {
      console.log('❌ No ownership record found');
      return false;
    }

    console.log(`🏷️ Track added by: ${ownership.addedByUser} (${ownership.addedByDeviceId})`);

    const canDelete = ownership.addedByUser === currentUserName && ownership.addedByDeviceId === currentDeviceId;
    console.log(`${canDelete ? '✅' : '❌'} Can delete: ${canDelete}`);

    return canDelete;
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isSpotifyAvailable) {
    return (
      <div className={`mx-4 my-6 p-6 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center py-8">
          <div className={`w-16 h-16 mx-auto mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-xl font-semibold mb-3 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst ein Spotify-Konto verbinden und eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPlaylist) {
    return (
      <div className={`mx-4 my-6 p-6 rounded-lg border ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        <div className="text-center py-8">
          <div className={`w-16 h-16 mx-auto mb-4 p-3 rounded-lg ${
            isDarkMode ? 'bg-green-500/20' : 'bg-green-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-green-400' : 'text-green-600'
            }`} />
          </div>
          
          <h3 className={`text-xl font-semibold mb-3 ${
            isDarkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist für Musikwünsche auswählen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6 space-y-6">
      {/* Header with Instagram 2.0 Glassmorphism */}
      <div className={`p-6 rounded-3xl mb-6 transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-purple-900/30 via-pink-900/20 to-orange-900/30 border border-white/10 backdrop-blur-xl shadow-2xl shadow-purple-500/20' 
          : 'bg-gradient-to-br from-purple-50/80 via-pink-50/60 to-orange-50/80 border border-white/50 backdrop-blur-xl shadow-2xl shadow-purple-500/20'
      }`}>
        {/* Decorative background elements */}
        <div className="absolute inset-0 opacity-20">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-purple-500 to-pink-500' : 'bg-gradient-to-br from-purple-300 to-pink-300'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-orange-300 to-red-300'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
          <div className={`absolute top-1/2 left-1/2 w-16 h-16 rounded-full blur-xl ${
            isDarkMode ? 'bg-gradient-to-br from-blue-500 to-purple-500' : 'bg-gradient-to-br from-blue-300 to-purple-300'
          }`} style={{ transform: 'translate(-50%, -50%)' }}></div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 p-3 rounded-2xl transition-all duration-300 shadow-lg ${
                isDarkMode ? 'bg-gradient-to-br from-purple-600/40 to-pink-600/40 backdrop-blur-sm' : 'bg-gradient-to-br from-purple-100/80 to-pink-100/80 backdrop-blur-sm'
              }`}>
                <svg
                  viewBox="0 0 24 24"
                  className={`w-full h-full transition-colors duration-300 ${
                    isDarkMode ? 'fill-purple-300' : 'fill-purple-600'
                  }`}
                >
                  <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.2.32-.623.42-.943.223-2.587-1.581-5.845-1.94-9.68-1.063-.414.094-.83-.156-.924-.57-.094-.414.156-.83.57-.924 4.195-.96 7.744-.546 10.633 1.223.32.2.42.623.223.943zm1.35-3.005c-.25.4-.781.525-1.181.275-2.96-1.82-7.473-2.349-10.98-1.285-.518.157-1.066-.132-1.223-.65-.157-.518.132-1.066.65-1.223 4.009-1.22 9.068-.643 12.459 1.477.4.25.525.781.275 1.181zm.116-3.129c-3.547-2.106-9.395-2.301-12.78-1.273-.622.189-1.278-.164-1.467-.786-.189-.622.164-1.278.786-1.467 3.876-1.178 10.44-.964 14.564 1.473.513.304.681 1.026.377 1.539-.304.513-1.026.681-1.539.377z"/>
                </svg>
              </div>
              <div>
                <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${
                  isDarkMode ? 'text-purple-300' : 'text-purple-600'
                }`}>Wedding Playlist</p>
                <h3 className={`text-2xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 bg-clip-text text-transparent`}>
                  {selectedPlaylist.name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-white/80' : 'text-gray-700'
                  }`}>
                    {playlistTracks.length} Songs • Live Requests
                  </p>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 backdrop-blur-sm ${
                    syncStatus === 'connecting' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                    syncStatus === 'syncing' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                    syncStatus === 'live' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                    'bg-red-500/20 text-red-300 border border-red-500/30'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${
                      syncStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                      syncStatus === 'syncing' ? 'bg-blue-400 animate-pulse' :
                      syncStatus === 'live' ? 'bg-green-400' :
                      'bg-red-400'
                    }`}></div>
                    <span>
                      {syncStatus === 'connecting' ? 'Verbinde...' :
                       syncStatus === 'syncing' ? 'Sync...' :
                       syncStatus === 'live' ? 'Live' :
                       'Fehler'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <a
              href={`https://open.spotify.com/playlist/${selectedPlaylist.playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`p-3 rounded-2xl transition-all duration-300 hover:scale-110 shadow-lg ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white' 
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
              }`}
              title="In Spotify öffnen"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>

          {/* Search Section with Instagram 2.0 Style */}
          <div className={`relative p-6 rounded-2xl transition-all duration-500 backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-white/5 border border-white/10' 
              : 'bg-white/50 border border-white/30'
          }`}>
            <div className="relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                isDarkMode ? 'text-purple-300/60' : 'text-purple-500/60'
              }`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your favorite songs..."
                className={`w-full pl-12 pr-12 py-4 rounded-xl transition-all duration-300 focus:ring-2 focus:ring-purple-500/50 outline-none backdrop-blur-sm ${
                  isDarkMode 
                    ? 'bg-white/10 text-white placeholder-white/50 border border-white/20 focus:bg-white/15' 
                    : 'bg-white/70 text-gray-900 placeholder-gray-500 border border-white/30 focus:bg-white/90'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className={`absolute right-4 top-1/2 transform -translate-y-1/2 p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                    isDarkMode ? 'hover:bg-white/20' : 'hover:bg-gray-200/50'
                  }`}
                >
                  <X className={`w-4 h-4 ${
                    isDarkMode ? 'text-white/70' : 'text-gray-500'
                  }`} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success Message */}
        {showAddSuccess && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-green-900/20 border border-green-500/30 text-green-400' 
              : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span className="text-sm font-medium">Song erfolgreich hinzugefügt!</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-4 p-3 rounded-lg ${
            isDarkMode 
              ? 'bg-red-900/20 border border-red-500/30 text-red-400' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 mb-4">
            {searchResults.map((track) => (
              <div key={track.id} className={`p-3 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700' 
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={track.album.images[0]?.url}
                      alt={track.album.name}
                      className="w-12 h-12 rounded"
                    />
                    <div>
                      <h4 className={`font-medium ${
                        isDarkMode ? 'text-gray-100' : 'text-gray-900'
                      }`}>
                        {track.name}
                      </h4>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {track.artists.map(artist => artist.name).join(', ')}
                      </p>
                      <p className={`text-xs ${
                        isDarkMode ? 'text-gray-500' : 'text-gray-500'
                      }`}>
                        {formatDuration(track.duration_ms)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddTrack(track)}
                    disabled={isAddingTrack === track.id}
                    className={`p-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {isAddingTrack === track.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Playlist Tracks */}
        <div className="space-y-2">
          {playlistTracks.map((item) => (
            <div key={item.track.id} className={`p-3 rounded-lg border ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={item.track.album.images[0]?.url}
                    alt={item.track.album.name}
                    className="w-12 h-12 rounded"
                  />
                  <div>
                    <h4 className={`font-medium ${
                      isDarkMode ? 'text-gray-100' : 'text-gray-900'
                    }`}>
                      {item.track.name}
                    </h4>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {item.track.artists.map((artist: any) => artist.name).join(', ')}
                    </p>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {formatDuration(item.track.duration_ms)}
                    </p>
                  </div>
                </div>
                {canDeleteTrack(item) && (
                  <button
                    onClick={() => handleRemoveTrack(item)}
                    disabled={isRemovingTrack === item.track.id}
                    className={`p-2 rounded-lg ${
                      isDarkMode 
                        ? 'bg-red-600 hover:bg-red-700 text-white' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    } disabled:opacity-50`}
                  >
                    {isRemovingTrack === item.track.id ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {playlistTracks.length === 0 && !isLoading && (
          <div className="text-center py-8">
            <Music className={`w-12 h-12 mx-auto mb-4 ${
              isDarkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={`text-sm ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Noch keine Songs in der Playlist
            </p>
          </div>
        )}
      </div>
    </div>
  );
};