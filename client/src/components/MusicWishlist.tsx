import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Music, Search, X, Plus, Trash2, ExternalLink, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { 
  searchTracks, 
  addTrackToPlaylist, 
  removeTrackFromPlaylist,
  getSelectedPlaylist,
  getPlaylistTracks,
  isSpotifyConnected,
  getCurrentUser,
  subscribeToPlaylistUpdates,
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
  const [songOwnerships, setSongOwnerships] = useState<SongOwnership[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connecting' | 'live' | 'syncing' | 'error'>('connecting');
  
  // 🔧 FIX: Enhanced refs for cleanup
  const unsubscribeSnapshotRef = useRef<(() => void) | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const successTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const errorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  
  // 🔧 FIX: Enhanced state management
  const [lastSnapshotId, setLastSnapshotId] = useState<string | null>(null);
  const [pendingOperations, setPendingOperations] = useState<number>(0);

  useEffect(() => {
    setIsAdmin(adminProp);
  }, [adminProp]);

  // 🔧 FIX: Enhanced ownership data loading with debounce
  const loadSongOwnerships = useCallback(async () => {
    if (!selectedPlaylist || !mountedRef.current) return;

    try {
      const q = query(
        collection(db, 'songOwnerships'),
        where('playlistId', '==', selectedPlaylist.playlistId)
      );
      const querySnapshot = await getDocs(q);
      const ownerships: SongOwnership[] = [];

      querySnapshot.forEach((doc) => {
        ownerships.push({ id: doc.id, ...doc.data() } as SongOwnership);
      });

      if (mountedRef.current) {
        console.log(`🎵 Refreshed ${ownerships.length} song ownerships`);
        setSongOwnerships(ownerships);
      }
    } catch (error) {
      console.error('Failed to load song ownerships:', error);
      if (mountedRef.current) {
        setError('Failed to load song data');
      }
    }
  }, [selectedPlaylist]);

  // 🔧 FIX: Enhanced useEffect with proper dependencies
  useEffect(() => {
    if (playlistTracks.length > 0 && selectedPlaylist) {
      // Debounce ownership loading
      const timeoutId = setTimeout(() => {
        loadSongOwnerships();
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [playlistTracks, selectedPlaylist, loadSongOwnerships]);

  // 🔧 FIX: Enhanced Spotify initialization
  useEffect(() => {
    const initializeSpotify = async () => {
      if (!mountedRef.current) return;

      try {
        setIsLoading(true);
        setSyncStatus('connecting');
        setError(null);

        const connected = await isSpotifyConnected();
        
        if (!mountedRef.current) return;
        
        setIsSpotifyAvailable(connected);

        if (connected) {
          const playlist = await getSelectedPlaylist();
          
          if (!mountedRef.current) return;
          
          if (playlist) {
            setSelectedPlaylist(playlist);
            
            // 🔧 FIX: Enhanced subscription with error handling
            const cleanup = subscribeToPlaylistUpdates(playlist.playlistId, (tracks) => {
              if (!mountedRef.current) return;
              
              console.log('📋 Received tracks update:', tracks.length);
              setPlaylistTracks(tracks);
              setSyncStatus('live');
              
              // Update snapshot tracking
              const currentSnapshot = getCurrentSnapshotId();
              if (currentSnapshot !== lastSnapshotId) {
                setLastSnapshotId(currentSnapshot);
              }
              
              // Update pending operations count
              const pendingCount = getPendingOperationsCount();
              setPendingOperations(pendingCount);
            });

            unsubscribeSnapshotRef.current = cleanup;
            
            // Load initial ownership data
            await loadSongOwnerships();
          }
        }
      } catch (error) {
        console.error('Failed to initialize Spotify:', error);
        if (mountedRef.current) {
          setError('Failed to load Spotify data');
          setSyncStatus('error');
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
      }
    };

    initializeSpotify();

    // 🔧 FIX: Enhanced cleanup
    return () => {
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
        unsubscribeSnapshotRef.current = null;
      }
    };
  }, [lastSnapshotId, loadSongOwnerships]);

  // 🔧 FIX: Simplified search with stable dependencies
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Handle empty search
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Handle Spotify not available
    if (!isSpotifyAvailable) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Start search with debounce
    searchTimeoutRef.current = setTimeout(async () => {
      if (!mountedRef.current || !searchQuery.trim()) return;
      
      setIsSearching(true);
      setError(null);

      try {
        const results = await searchTracks(searchQuery);
        
        if (mountedRef.current) {
          setSearchResults(results);
        }
      } catch (error) {
        console.error('Search error:', error);
        if (mountedRef.current) {
          setError('Failed to search tracks');
          setSearchResults([]);
        }
      } finally {
        if (mountedRef.current) {
          setIsSearching(false);
        }
      }
    }, 300); // Reduced debounce time

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [searchQuery]); // Only depend on searchQuery

  // Separate effect for Spotify availability
  useEffect(() => {
    if (!isSpotifyAvailable && searchResults.length > 0) {
      setSearchResults([]);
      setIsSearching(false);
    }
  }, [isSpotifyAvailable, searchResults.length]);

  // 🔧 FIX: Enhanced track song ownership
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

      const docRef = await addDoc(collection(db, 'songOwnerships'), ownership);
      
      if (mountedRef.current) {
        setSongOwnerships(prev => [...prev, { ...ownership, id: docRef.id }]);
      }
    } catch (error) {
      console.error('Failed to track song ownership:', error);
    }
  };

  // 🔧 FIX: Enhanced remove song ownership
  const removeSongOwnership = async (trackId: string) => {
    try {
      const ownership = songOwnerships.find(o => o.trackId === trackId);
      if (ownership) {
        await deleteDoc(doc(db, 'songOwnerships', ownership.id));
        
        if (mountedRef.current) {
          setSongOwnerships(prev => prev.filter(o => o.id !== ownership.id));
        }
      }
    } catch (error) {
      console.error('Failed to remove song ownership:', error);
    }
  };

  // 🔧 FIX: Enhanced add track with better error handling
  const handleAddTrack = async (track: SpotifyTrack) => {
    if (isAddingTrack) return;

    // 🔧 FIX: Enhanced duplicate check
    const isTrackAlreadyInPlaylist = playlistTracks.some(playlistTrack => 
      playlistTrack.track?.id === track.id
    );

    if (isTrackAlreadyInPlaylist) {
      const errorMessage = 'Dieser Song ist bereits in der Playlist vorhanden.';
      setError(errorMessage);
      
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      errorTimeoutRef.current = setTimeout(() => {
        if (mountedRef.current) {
          setError(null);
        }
      }, 3000);
      return;
    }

    setIsAddingTrack(track.id);
    setError(null);
    setSyncStatus('syncing');

    try {
      // 🔧 FIX: Enhanced add operation
      await addTrackToPlaylist(track.uri);
      await trackSongOwnership(track.id, track.uri);

      if (mountedRef.current) {
        setShowAddSuccess(true);
        setSearchQuery('');
        setSearchResults([]);
        
        // Clear success message after delay
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }
        successTimeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            setShowAddSuccess(false);
          }
        }, 2000);
      }
    } catch (error: any) {
      console.error('Failed to add track:', error);

      if (mountedRef.current) {
        if (error.requiresReauth || (error.status === 403 && error.message?.includes('Insufficient'))) {
          setError('Spotify permissions insufficient. Please disconnect and reconnect to grant full access.');
        } else {
          setError('Failed to add track to playlist: ' + (error.message || 'Unknown error'));
        }

        setSyncStatus('error');
        
        // Reset sync status after delay
        setTimeout(() => {
          if (mountedRef.current) {
            setSyncStatus('live');
          }
        }, 3000);
      }
    } finally {
      if (mountedRef.current) {
        setIsAddingTrack(null);
      }
    }
  };

  // 🔧 FIX: Enhanced remove track with better error handling
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
      
      if (mountedRef.current) {
        setError('Failed to remove track from playlist: ' + (error.message || 'Unknown error'));
        setSyncStatus('error');
        
        setTimeout(() => {
          if (mountedRef.current) {
            setSyncStatus('live');
          }
        }, 3000);
      }
    } finally {
      if (mountedRef.current) {
        setIsRemovingTrack(null);
      }
    }
  };

  // 🔧 FIX: Enhanced permission check
  const canDeleteTrack = useCallback((track: any) => {
    if (isAdmin) {
      return true;
    }

    const currentUserName = getUserName();
    const currentDeviceId = getDeviceId();

    if (!currentUserName) {
      return false;
    }

    const ownership = songOwnerships.find(o => o.trackId === track.track.id);
    if (!ownership) {
      return false;
    }

    return ownership.addedByUser === currentUserName && ownership.addedByDeviceId === currentDeviceId;
  }, [isAdmin, songOwnerships]);

  // 🔧 FIX: Enhanced duration formatting
  const formatDuration = useCallback((ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // 🔧 FIX: Enhanced cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      
      // Clear all timeouts
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      // Clear subscription
      if (unsubscribeSnapshotRef.current) {
        unsubscribeSnapshotRef.current();
      }
    };
  }, []);

  if (!isSpotifyAvailable) {
    return (
      <div className="mx-4 my-6 p-8 rounded-2xl glass-card relative overflow-hidden bg-pink-500/10 border-pink-400/20" style={{
        background: isDarkMode 
          ? 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(219, 39, 119, 0.05) 100%)' 
          : 'linear-gradient(135deg, rgba(236, 72, 153, 0.05) 0%, rgba(219, 39, 119, 0.02) 100%)'
      }}>
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-pink-500 to-pink-500' : 'bg-gradient-to-br from-pink-300 to-pink-500'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gradient-to-br from-rose-300 to-pink-500'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-pink-500/20' : 'bg-pink-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-pink-400' : 'text-pink-600'
            }`} />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-pink-500 to-emerald-600 bg-clip-text text-transparent`}>
            Spotify nicht verbunden
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst ein Spotify-Konto verbinden und eine Playlist auswählen, bevor Musikwünsche möglich sind.
          </p>
        </div>
      </div>
    );
  }

  if (!selectedPlaylist) {
    return (
      <div className={`mx-4 my-6 p-8 rounded-3xl transition-all duration-500 relative overflow-hidden ${
        isDarkMode 
          ? 'bg-gradient-to-br from-pink-900/40 via-pink-500/30 to-rose-900/30 border border-pink-500/20 backdrop-blur-xl shadow-2xl shadow-pink-500/20' 
          : 'bg-gradient-to-br from-pink-50/90 via-purple-50/80 to-rose-50/80 border border-pink-200/60 backdrop-blur-xl shadow-2xl shadow-pink-500/15'
      }`}>
        <div className="absolute inset-0 opacity-25">
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl ${
            isDarkMode ? 'bg-gradient-to-br from-pink-500 to-pink-500' : 'bg-gradient-to-br from-pink-300 to-pink-500'
          }`} style={{ transform: 'translate(50%, -50%)' }}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full blur-2xl ${
            isDarkMode ? 'bg-gradient-to-br from-rose-500 to-pink-500' : 'bg-gradient-to-br from-rose-300 to-pink-500'
          }`} style={{ transform: 'translate(-50%, 50%)' }}></div>
        </div>
        
        <div className="relative z-10 text-center py-8">
          <div className={`w-20 h-20 mx-auto mb-6 p-4 rounded-2xl transition-all duration-300 ${
            isDarkMode ? 'bg-pink-500/20' : 'bg-pink-500/10'
          }`}>
            <Music className={`w-full h-full ${
              isDarkMode ? 'text-pink-400' : 'text-pink-600'
            }`} />
          </div>
          
          <h3 className={`text-2xl font-bold mb-4 bg-gradient-to-br from-pink-500 to-emerald-600 bg-clip-text text-transparent`}>
            Keine Playlist ausgewählt
          </h3>
          
          <p className={`text-sm max-w-md mx-auto leading-relaxed transition-colors duration-300 ${
            isDarkMode ? 'text-white/70' : 'text-gray-600'
          }`}>
            Ein Administrator muss zuerst eine Playlist für Musikwünsche auswählen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4 my-6 space-y-4">
      {/* 🔧 FIX: Enhanced Header with Sync Status */}
      <div className={`p-4 rounded-2xl transition-all duration-500 ${
        isDarkMode 
          ? 'bg-gray-900 border border-gray-700 shadow-2xl' 
          : 'bg-white border border-gray-200 shadow-2xl'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 p-2 rounded-full ${
              isDarkMode ? 'bg-pink-500/20' : 'bg-pink-100'
            }`}>
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path fill="#ff69b4" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.5 14.424c-.2.32-.623.42-.943.223-2.587-1.581-5.845-1.94-9.68-1.063-.414.094-.83-.156-.924-.57-.094-.414.156-.83.57-.924 4.195-.96 7.744-.546 10.633 1.223.32.2.42.623.223.943zm1.35-3.005c-.25.4-.781.525-1.181.275-2.96-1.82-7.473-2.349-10.98-1.285-.518.157-1.066-.132-1.223-.65-.157-.518.132-1.066.65-1.223 4.009-1.22 9.068-.643 12.459 1.477.4.25.525.781.275 1.181zm.116-3.129c-3.547-2.106-9.395-2.301-12.78-1.273-.622.189-1.278-.164-1.467-.786-.189-.622.164-1.278.786-1.467 3.876-1.178 10.44-.964 14.564 1.473.513.304.681 1.026.377 1.539-.304.513-1.026.681-1.539.377z"/>
              </svg>
            </div>
            <div>
              <h3 className={`text-lg font-normal ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {selectedPlaylist.name}
              </h3>
              <div className="flex items-center gap-2 text-sm">
                <span className={isDarkMode ? 'text-white/70' : 'text-gray-600'}>
                  {playlistTracks.length} Songs
                </span>
                {/* 🔧 FIX: Enhanced sync status indicator */}
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  syncStatus === 'live' ? 'bg-green-500/20 text-green-400' : 
                  syncStatus === 'syncing' ? 'bg-yellow-500/20 text-yellow-400' :
                  syncStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                  'bg-gray-500/20 text-gray-400'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    syncStatus === 'live' ? 'bg-green-400' : 
                    syncStatus === 'syncing' ? 'bg-yellow-400 animate-pulse' :
                    syncStatus === 'error' ? 'bg-red-400' :
                    'bg-gray-400'
                  }`}></div>
                  <span>
                    {syncStatus === 'live' ? 'Live' : 
                     syncStatus === 'syncing' ? 'Syncing...' :
                     syncStatus === 'error' ? 'Error' :
                     'Offline'}
                  </span>
                </div>
                {/* 🔧 FIX: Pending operations indicator */}
                {pendingOperations > 0 && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>{pendingOperations} pending</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <a
            href={`https://open.spotify.com/playlist/${selectedPlaylist.playlistId}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2 rounded-lg transition-all duration-300 hover:scale-105 flex items-center justify-center ${
              isDarkMode 
                ? 'bg-pink-600/20 hover:bg-pink-600/30 text-pink-300' 
                : 'bg-pink-100 hover:bg-pink-200 text-pink-600'
            }`}
            title="In Spotify öffnen"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* 🔧 FIX: Completely Stable Search Input */}
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 transition-colors duration-200 ${
            isDarkMode ? 'text-pink-400' : 'text-pink-600'
          }`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Suche nach einem Song..."
            disabled={!isSpotifyAvailable}
            className={`w-full pl-10 pr-10 py-3 rounded-full outline-none text-sm transition-colors duration-200 ${
              isDarkMode 
                ? 'bg-gray-800 text-white placeholder-gray-400 border border-gray-600/30 focus:border-pink-500' 
                : 'bg-white text-gray-900 placeholder-gray-500 border border-pink-300 focus:border-pink-500'
            } ${!isSpotifyAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
          />
          {isSearching && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <RefreshCw className="w-4 h-4 animate-spin text-pink-500" />
            </div>
          )}
          {searchQuery && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
              }}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-all duration-200 hover:scale-110 ${
                isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-200 text-gray-600'
              }`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 🔧 FIX: Enhanced Success Message */}
      {showAddSuccess && (
        <div className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-green-500/20 border border-green-400/30 text-green-300' 
            : 'bg-green-100/80 border border-green-300/50 text-green-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isDarkMode ? 'bg-green-400/20' : 'bg-green-500/20'
            }`}>
              <Check className="w-4 h-4" />
            </div>
            <span className="font-medium">Song erfolgreich hinzugefügt!</span>
          </div>
        </div>
      )}

      {/* 🔧 FIX: Enhanced Error Message */}
      {error && (
        <div className={`p-4 rounded-2xl backdrop-blur-sm transition-all duration-500 ${
          isDarkMode 
            ? 'bg-red-500/20 border border-red-400/30 text-red-300' 
            : 'bg-red-100/80 border border-red-300/50 text-red-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              isDarkMode ? 'bg-red-400/20' : 'bg-red-500/20'
            }`}>
              <AlertCircle className="w-4 h-4" />
            </div>
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* 🔧 FIX: Enhanced Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          {searchResults.map((track) => (
            <div key={track.id} className={`p-3 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
              isDarkMode 
                ? 'bg-gray-900 border border-pink-500/20 hover:bg-gray-800 hover:border-pink-500/40 shadow-lg shadow-pink-500/5' 
                : 'bg-white border border-pink-200 hover:bg-pink-50 hover:border-pink-300 shadow-md shadow-pink-100'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={track.album.images[0]?.url}
                    alt={track.album.name}
                    className="w-10 h-10 rounded-xl shadow-lg"
                  />
                  <div>
                    <h4 className={`font-medium text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {track.name}
                    </h4>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-white/70' : 'text-gray-600'
                    }`}>
                      {track.artists.map(artist => artist.name).join(', ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleAddTrack(track)}
                  disabled={isAddingTrack === track.id}
                  className={`w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center ${
                    isDarkMode 
                      ? 'bg-pink-500/20 hover:bg-pink-500/30 text-pink-400' 
                      : 'bg-pink-500 hover:bg-pink-600 text-white'
                  }`}
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

      {/* 🔧 FIX: Enhanced Playlist Tracks */}
      <div className="space-y-2">
        {playlistTracks.map((item) => (
          <div key={`${item.track.id}-${item.added_at}`} className={`p-3 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
            isDarkMode 
              ? 'bg-gray-900 border border-pink-500/20 hover:bg-gray-800 hover:border-pink-500/40 shadow-lg shadow-pink-500/5' 
              : 'bg-white border border-pink-200 hover:bg-pink-50 hover:border-pink-300 shadow-md shadow-pink-100'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={item.track.album.images[0]?.url}
                  alt={item.track.album.name}
                  className="w-10 h-10 rounded-xl shadow-lg"
                />
                <div>
                  <h4 className={`font-medium text-sm ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {item.track.name}
                  </h4>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-white/70' : 'text-gray-600'
                  }`}>
                    {item.track.artists.map((artist: any) => artist.name).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={item.track.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 flex items-center justify-center hover:bg-pink-600 text-white bg-pink-500/80"
                  title="In Spotify öffnen"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {canDeleteTrack(item) && (
                  <button
                    onClick={() => handleRemoveTrack(item)}
                    disabled={isRemovingTrack === item.track.id}
                    className={`w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 disabled:opacity-50 disabled:hover:scale-100 flex items-center justify-center ${
                      isDarkMode 
                        ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400' 
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
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
          </div>
        ))}
      </div>

      {/* 🔧 FIX: Enhanced Empty State */}
      {playlistTracks.length === 0 && !isLoading && (
        <div className={`text-center py-8 rounded-2xl ${
          isDarkMode 
            ? 'bg-gray-900 border border-pink-500/20 shadow-lg shadow-pink-500/5' 
            : 'bg-white border border-pink-200 shadow-md shadow-pink-100'
        }`}>
          <Music className={`w-16 h-16 mx-auto mb-4 ${
            isDarkMode ? 'text-pink-400' : 'text-pink-500'
          }`} />
          <p className={`text-lg font-medium ${
            isDarkMode ? 'text-white/80' : 'text-gray-700'
          }`}>
            Noch keine Songs in der Playlist
          </p>
          <p className={`text-sm mt-2 ${
            isDarkMode ? 'text-white/60' : 'text-gray-500'
          }`}>
            Suche nach Songs und füge sie zur Playlist hinzu
          </p>
        </div>
      )}
    </div>
  );
};
