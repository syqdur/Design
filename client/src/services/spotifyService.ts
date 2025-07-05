import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SpotifyCredentials, SelectedPlaylist, SpotifyTrack } from '../types';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '4dbf85a8ca7c43d3b2ddc540194e9387';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || 'acf102b8834d48b497a7e98bf69021f6';

// 🔧 FIX: Dynamic redirect URI based on environment
const getRedirectUri = (): string => {
  // Use environment variable if set
  if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  }
  
  // For development, use current origin
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin + '/';
  }
  
  // Production fallback
  return 'https://kristinundmauro.de/';
};

const SPOTIFY_REDIRECT_URI = getRedirectUri();

// Storage keys for PKCE flow
const PKCE_CODE_VERIFIER_KEY = 'spotify_pkce_code_verifier';
const PKCE_STATE_KEY = 'spotify_pkce_state';

// 🚀 NEW: Snapshot ID-Based Optimistic Update Manager
class SnapshotOptimisticManager {
  private static instance: SnapshotOptimisticManager;
  private listeners: Set<(tracks: SpotifyApi.PlaylistTrackObject[]) => void> = new Set();
  private currentTracks: SpotifyApi.PlaylistTrackObject[] = [];
  private pendingOperations: Map<string, { type: 'add' | 'remove', track?: SpotifyTrack }> = new Map();
  private playlistId: string | null = null;
  private lastSnapshotId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;

  static getInstance(): SnapshotOptimisticManager {
    if (!SnapshotOptimisticManager.instance) {
      SnapshotOptimisticManager.instance = new SnapshotOptimisticManager();
    }
    return SnapshotOptimisticManager.instance;
  }

  // Subscribe to updates
  subscribe(callback: (tracks: SpotifyApi.PlaylistTrackObject[]) => void): () => void {
    this.listeners.add(callback);
    
    // Immediately send current tracks if available
    if (this.currentTracks.length > 0) {
      callback(this.currentTracks);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  // 🎯 NEW: Set tracks with snapshot ID tracking
  setTracks(tracks: SpotifyApi.PlaylistTrackObject[], playlistId: string, snapshotId?: string): void {
    console.log('📋 === SETTING TRACKS WITH SNAPSHOT ===');
    console.log(`Playlist: ${playlistId}`);
    console.log(`Tracks: ${tracks.length}`);
    console.log(`Snapshot ID: ${snapshotId || 'Not provided'}`);
    console.log(`Previous Snapshot: ${this.lastSnapshotId || 'None'}`);
    
    this.currentTracks = [...tracks];
    this.playlistId = playlistId;
    
    if (snapshotId) {
      this.lastSnapshotId = snapshotId;
      console.log(`✅ Snapshot ID updated: ${snapshotId}`);
    }
    
    this.notifyListeners();
    this.startSmartPolling();
  }

  // 🚀 INSTANT: Optimistically add track (shows immediately in UI)
  optimisticallyAddTrack(track: SpotifyTrack): void {
    console.log('🚀 === OPTIMISTIC ADD WITH SNAPSHOT TRACKING ===');
    console.log('Track:', track.name);
    console.log('Current Snapshot:', this.lastSnapshotId);
    
    // Create a mock playlist track object
    const mockPlaylistTrack: SpotifyApi.PlaylistTrackObject = {
      added_at: new Date().toISOString(),
      added_by: {
        id: 'current_user',
        type: 'user',
        uri: 'spotify:user:current_user',
        href: '',
        external_urls: { spotify: '' }
      },
      is_local: false,
      track: {
        id: track.id,
        name: track.name,
        artists: track.artists.map(a => ({
          id: `artist_${a.name}`,
          name: a.name,
          type: 'artist',
          uri: `spotify:artist:${a.name}`,
          href: '',
          external_urls: { spotify: '' }
        })),
        album: {
          id: 'album_' + track.album.name,
          name: track.album.name,
          images: track.album.images,
          type: 'album',
          uri: 'spotify:album:' + track.album.name,
          href: '',
          external_urls: { spotify: '' },
          album_type: 'album',
          total_tracks: 1,
          available_markets: [],
          release_date: '',
          release_date_precision: 'day'
        },
        duration_ms: 180000, // Default 3 minutes
        explicit: false,
        external_ids: {},
        external_urls: { spotify: `https://open.spotify.com/track/${track.id}` },
        href: '',
        is_playable: true,
        popularity: 50,
        preview_url: null,
        track_number: 1,
        type: 'track',
        uri: track.uri,
        is_local: false
      }
    };

    // Add to beginning of list for immediate visibility
    this.currentTracks.unshift(mockPlaylistTrack);
    this.pendingOperations.set(track.id, { type: 'add', track });
    
    // Notify listeners immediately
    this.notifyListeners();
    
    console.log('✅ Optimistic add completed, UI updated instantly');
  }

  // 🚀 INSTANT: Optimistically remove track (removes immediately from UI)
  optimisticallyRemoveTrack(trackId: string): void {
    console.log('🚀 === OPTIMISTIC REMOVE WITH SNAPSHOT TRACKING ===');
    console.log('Track ID:', trackId);
    console.log('Current Snapshot:', this.lastSnapshotId);
    
    // Remove from current tracks
    this.currentTracks = this.currentTracks.filter(item => item.track.id !== trackId);
    this.pendingOperations.set(trackId, { type: 'remove' });
    
    // Notify listeners immediately
    this.notifyListeners();
    
    console.log('✅ Optimistic remove completed, UI updated instantly');
  }

  // 🚀 INSTANT: Bulk optimistic remove
  optimisticallyBulkRemove(trackIds: string[]): void {
    console.log('🚀 === OPTIMISTIC BULK REMOVE WITH SNAPSHOT TRACKING ===');
    console.log('Track IDs:', trackIds.length);
    console.log('Current Snapshot:', this.lastSnapshotId);
    
    // Remove all tracks from current list
    this.currentTracks = this.currentTracks.filter(item => !trackIds.includes(item.track.id));
    
    // Mark all as pending removal
    trackIds.forEach(id => this.pendingOperations.set(id, { type: 'remove' }));
    
    // Notify listeners immediately
    this.notifyListeners();
    
    console.log('✅ Optimistic bulk remove completed, UI updated instantly');
  }

  // 🎯 NEW: Confirm operation with new snapshot ID
  confirmOperation(trackId: string, newSnapshotId?: string): void {
    console.log('✅ === CONFIRMING OPERATION ===');
    console.log('Track ID:', trackId);
    console.log('New Snapshot:', newSnapshotId);
    console.log('Previous Snapshot:', this.lastSnapshotId);
    
    this.pendingOperations.delete(trackId);
    
    if (newSnapshotId && newSnapshotId !== this.lastSnapshotId) {
      this.lastSnapshotId = newSnapshotId;
      console.log(`📋 Snapshot ID updated after operation: ${newSnapshotId}`);
      
      // Schedule a verification sync after a short delay
      setTimeout(() => {
        this.checkForUpdates();
      }, 2000);
    }
  }

  // Revert operation if it failed
  revertOperation(trackId: string, originalTracks: SpotifyApi.PlaylistTrackObject[]): void {
    console.log('🔄 === REVERTING OPERATION ===');
    console.log('Track ID:', trackId);
    
    const operation = this.pendingOperations.get(trackId);
    this.pendingOperations.delete(trackId);
    
    if (operation?.type === 'add') {
      // Remove the optimistically added track
      this.currentTracks = this.currentTracks.filter(item => item.track.id !== trackId);
    } else if (operation?.type === 'remove') {
      // Restore the original tracks
      this.currentTracks = [...originalTracks];
    }
    
    this.notifyListeners();
    console.log('✅ Operation reverted successfully');
  }

  // 🎯 NEW: Smart polling based on snapshot ID changes
  private startSmartPolling(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Start with frequent polling after operations, then reduce frequency
    let pollInterval = 2000; // Start with 2 seconds
    let consecutiveNoChanges = 0;

    const poll = async () => {
      try {
        const hasChanges = await this.checkForUpdates();
        
        if (hasChanges) {
          // Reset to frequent polling if changes detected
          pollInterval = 2000;
          consecutiveNoChanges = 0;
        } else {
          consecutiveNoChanges++;
          
          // Gradually increase polling interval if no changes
          if (consecutiveNoChanges >= 3) {
            pollInterval = Math.min(pollInterval * 1.5, 30000); // Max 30 seconds
          }
        }
        
        // Schedule next poll
        this.syncInterval = setTimeout(poll, pollInterval);
        
      } catch (error) {
        console.warn('Smart polling error:', error);
        // Continue polling even if there's an error
        this.syncInterval = setTimeout(poll, 10000);
      }
    };

    // Start polling
    poll();
  }

  // 🎯 NEW: Check for updates using snapshot ID
  private async checkForUpdates(): Promise<boolean> {
    if (!this.playlistId) return false;

    try {
      console.log('🔍 === CHECKING FOR SNAPSHOT CHANGES ===');
      console.log('Current Snapshot:', this.lastSnapshotId);
      
      // Get current playlist with snapshot_id
      const response = await makeSpotifyApiCall(
        `https://api.spotify.com/v1/playlists/${this.playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri),added_at,added_by)`
      );
      
      const data = await response.json();
      const currentSnapshot = data.snapshot_id;
      
      console.log('Remote Snapshot:', currentSnapshot);
      
      if (currentSnapshot !== this.lastSnapshotId) {
        console.log('🔄 === SNAPSHOT CHANGED - SYNCING ===');
        console.log(`${this.lastSnapshotId} → ${currentSnapshot}`);
        
        // Only update if there are no pending operations
        if (this.pendingOperations.size === 0) {
          this.currentTracks = data.tracks.items;
          this.lastSnapshotId = currentSnapshot;
          this.notifyListeners();
          console.log('✅ Synced with Spotify - UI updated');
          return true;
        } else {
          console.log('⏸️ Skipping sync - pending operations exist');
          console.log('Pending operations:', Array.from(this.pendingOperations.keys()));
        }
      } else {
        console.log('✅ Snapshot unchanged - no sync needed');
      }
      
      return false;
      
    } catch (error) {
      console.warn('Snapshot check failed:', error);
      return false;
    }
  }

  // Get current tracks
  getCurrentTracks(): SpotifyApi.PlaylistTrackObject[] {
    return this.currentTracks;
  }

  // Check if operation is pending
  isPending(trackId: string): boolean {
    return this.pendingOperations.has(trackId);
  }

  // Get current snapshot ID
  getCurrentSnapshotId(): string | null {
    return this.lastSnapshotId;
  }

  // Get pending operations count
  getPendingOperationsCount(): number {
    return this.pendingOperations.size;
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback([...this.currentTracks]);
      } catch (error) {
        console.error('Listener callback error:', error);
      }
    });
  }

  // Cleanup
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.listeners.clear();
    this.pendingOperations.clear();
  }
}

// Generate authorization URL with PKCE
export const getAuthorizationUrl = async (): Promise<string> => {
  // Generate code verifier and challenge
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  // Generate random state
  const state = Math.random().toString(36).substring(2, 15);
  
  // Store code verifier and state in localStorage
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(PKCE_STATE_KEY, state);
  
  // Define scopes
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ];
  
  // Build authorization URL with PKCE parameters
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: state,
    scope: scopes.join(' ')
  });
  
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

// Exchange authorization code for tokens
export const exchangeCodeForTokens = async (code: string, state: string): Promise<SpotifyCredentials> => {
  try {
    // Verify state parameter
    const storedState = localStorage.getItem(PKCE_STATE_KEY);
    if (state !== storedState) {
      throw new Error('State mismatch. Possible CSRF attack.');
    }
    
    // Get code verifier
    const codeVerifier = localStorage.getItem(PKCE_CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('Code verifier not found.');
    }
    
    // Exchange code for tokens
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: SPOTIFY_CLIENT_ID,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
        code_verifier: codeVerifier
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Token exchange failed: ${errorData.error_description || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Calculate expiry time
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    // Create credentials object
    const credentials: Omit<SpotifyCredentials, 'id'> = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      createdAt: new Date().toISOString()
    };
    
    // Store credentials in Firestore
    const credentialsRef = await addDoc(collection(db, 'spotifyCredentials'), credentials);
    
    // Clean up localStorage
    localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
    
    return {
      id: credentialsRef.id,
      ...credentials
    };
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};

// Refresh access token using direct API call
export const refreshAccessToken = async (credentials: SpotifyCredentials): Promise<SpotifyCredentials> => {
  try {
    console.log('🔄 Refreshing access token...');
    
    // Use direct fetch instead of SpotifyWebApi to avoid library issues
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: credentials.refreshToken
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(`Token refresh failed: ${errorData.error_description || response.statusText}`);
      (error as any).status = response.status;
      (error as any).body = errorData;
      throw error;
    }
    
    const data = await response.json();
    
    // Calculate new expiry time
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    // Update credentials in Firestore
    const updatedCredentials: Partial<SpotifyCredentials> = {
      accessToken: data.access_token,
      expiresAt: expiresAt
    };
    
    // If a new refresh token was provided, update it
    if (data.refresh_token) {
      updatedCredentials.refreshToken = data.refresh_token;
    }
    
    await updateDoc(doc(db, 'spotifyCredentials', credentials.id), updatedCredentials);
    
    console.log('✅ Token refreshed successfully');
    
    return {
      ...credentials,
      ...updatedCredentials
    };
  } catch (error) {
    console.error('Failed to refresh access token:', error);
    throw error;
  }
};

// Get valid credentials with automatic refresh
export const getValidCredentials = async (): Promise<SpotifyCredentials | null> => {
  try {
    // Query for credentials
    const credentialsQuery = query(collection(db, 'spotifyCredentials'));
    const credentialsSnapshot = await getDocs(credentialsQuery);
    
    if (credentialsSnapshot.empty) {
      return null;
    }
    
    // Get the first (and should be only) credentials
    const credentials = {
      id: credentialsSnapshot.docs[0].id,
      ...credentialsSnapshot.docs[0].data()
    } as SpotifyCredentials;
    
    // Check if token needs refresh
    const now = Date.now();
    const tokenExpiryBuffer = 5 * 60 * 1000; // 5 minutes buffer
    
    if (now + tokenExpiryBuffer >= credentials.expiresAt) {
      // Token is expired or about to expire, refresh it
      console.log('🔄 Token expiring soon, refreshing...');
      return await refreshAccessToken(credentials);
    }
    
    return credentials;
  } catch (error) {
    console.error('Failed to get valid credentials:', error);
    return null;
  }
};

// Disconnect Spotify account
export const disconnectSpotify = async (): Promise<void> => {
  try {
    // Get credentials
    const credentials = await getValidCredentials();
    
    if (!credentials) {
      return;
    }
    
    // Delete credentials from Firestore
    await deleteDoc(doc(db, 'spotifyCredentials', credentials.id));
    
    // Clear any cached tokens
    localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
    
    // Cleanup optimistic manager
    SnapshotOptimisticManager.getInstance().cleanup();
    
  } catch (error) {
    console.error('Failed to disconnect Spotify:', error);
    throw error;
  }
};

// Check if Spotify is connected
export const isSpotifyConnected = async (): Promise<boolean> => {
  try {
    const credentials = await getValidCredentials();
    return !!credentials;
  } catch (error) {
    console.error('Error checking Spotify connection:', error);
    return false;
  }
};

// Helper function to make authenticated Spotify API calls
const makeSpotifyApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const credentials = await getValidCredentials();
  
  if (!credentials) {
    throw new Error('Not connected to Spotify');
  }
  
  // 🔧 FIX: Clean headers to avoid CORS issues
  const headers: Record<string, string> = {
    'Authorization': `Bearer ${credentials.accessToken}`,
    'Content-Type': 'application/json'
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    
    // Check for insufficient scope error (403 with specific message)
    if (response.status === 403 && errorData.error?.message?.includes('Insufficient client scope')) {
      console.log('🔒 === INSUFFICIENT SCOPE DETECTED ===');
      console.log('Error:', errorData.error.message);
      console.log('Required action: Re-authentication needed');
      
      // Clear existing credentials to force re-auth
      await disconnectSpotify();
      
      // Create enhanced error with re-auth instructions
      const scopeError = new Error('Insufficient Spotify permissions. Please reconnect to grant required access.');
      (scopeError as any).status = response.status;
      (scopeError as any).body = errorData;
      (scopeError as any).requiresReauth = true;
      throw scopeError;
    }
    
    const error = new Error(`Spotify API error: ${errorData.error?.message || response.statusText}`);
    (error as any).status = response.status;
    (error as any).body = errorData;
    throw error;
  }
  
  return response;
};

// Get user's playlists with error handling
export const getUserPlaylists = async (): Promise<SpotifyApi.PlaylistObjectSimplified[]> => {
  try {
    const response = await makeSpotifyApiCall('https://api.spotify.com/v1/me/playlists?limit=50');
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Failed to get user playlists:', error);
    throw error;
  }
};

// Save selected playlist
export const saveSelectedPlaylist = async (playlistId: string, name: string): Promise<SelectedPlaylist> => {
  try {
    // Check if a playlist is already selected
    const playlistQuery = query(collection(db, 'selectedPlaylist'));
    const playlistSnapshot = await getDocs(playlistQuery);
    
    // If a playlist is already selected, update it
    if (!playlistSnapshot.empty) {
      const selectedPlaylist = {
        id: playlistSnapshot.docs[0].id,
        ...playlistSnapshot.docs[0].data()
      } as SelectedPlaylist;
      
      await updateDoc(doc(db, 'selectedPlaylist', selectedPlaylist.id), {
        playlistId,
        name
      });
      
      return {
        ...selectedPlaylist,
        playlistId,
        name
      };
    }
    
    // Otherwise, create a new selected playlist
    const newPlaylist: Omit<SelectedPlaylist, 'id'> = {
      playlistId,
      name
    };
    
    const playlistRef = await addDoc(collection(db, 'selectedPlaylist'), newPlaylist);
    
    return {
      id: playlistRef.id,
      ...newPlaylist
    };
  } catch (error) {
    console.error('Failed to save selected playlist:', error);
    throw error;
  }
};

// Get selected playlist
export const getSelectedPlaylist = async (): Promise<SelectedPlaylist | null> => {
  try {
    const playlistQuery = query(collection(db, 'selectedPlaylist'));
    const playlistSnapshot = await getDocs(playlistQuery);
    
    if (playlistSnapshot.empty) {
      return null;
    }
    
    return {
      id: playlistSnapshot.docs[0].id,
      ...playlistSnapshot.docs[0].data()
    } as SelectedPlaylist;
  } catch (error) {
    console.error('Failed to get selected playlist:', error);
    return null;
  }
};

// Search for tracks with error handling
export const searchTracks = async (query: string): Promise<SpotifyTrack[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=20`);
    const data = await response.json();
    
    // Map to our SpotifyTrack interface
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => ({ name: artist.name })),
      album: {
        name: track.album.name,
        images: track.album.images
      },
      uri: track.uri
    }));
  } catch (error) {
    console.error('Failed to search tracks:', error);
    throw error;
  }
};

// 🚀 NEW: Add track with INSTANT optimistic update and snapshot tracking
export const addTrackToPlaylist = async (trackUri: string): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  let trackToAdd: SpotifyTrack | null = null;
  
  try {
    console.log('🚀 === INSTANT ADD WITH SNAPSHOT TRACKING ===');
    console.log('Track URI:', trackUri);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    // Extract track ID from URI
    const trackId = trackUri.split(':').pop() || '';
    
    // Get track details for optimistic update
    try {
      const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/tracks/${trackId}`);
      const trackData = await response.json();
      
      trackToAdd = {
        id: trackData.id,
        name: trackData.name,
        artists: trackData.artists.map((a: any) => ({ name: a.name })),
        album: {
          name: trackData.album.name,
          images: trackData.album.images
        },
        uri: trackData.uri
      };
      
      // 🚀 INSTANT: Show in UI immediately
      updateManager.optimisticallyAddTrack(trackToAdd);
      
    } catch (trackError) {
      console.warn('Could not get track details for optimistic update:', trackError);
    }
    
    // Get selected playlist
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }

    // 🎯 NEW: Add track to playlist and get new snapshot_id
    const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/playlists/${selectedPlaylist.playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: [trackUri],
        position: 0 // Add to beginning for immediate visibility
      })
    });
    
    const result = await response.json();
    const newSnapshotId = result.snapshot_id;
    
    console.log('✅ Track added to Spotify successfully');
    console.log('New Snapshot ID:', newSnapshotId);

    // 🎯 NEW: Confirm the operation with new snapshot ID
    if (trackToAdd) {
      updateManager.confirmOperation(trackToAdd.id, newSnapshotId);
    }
    
    console.log('🎉 === INSTANT ADD COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to add track to playlist:', error);
    
    // Revert optimistic update on error
    if (trackToAdd) {
      const currentTracks = updateManager.getCurrentTracks();
      updateManager.revertOperation(trackToAdd.id, currentTracks);
    }
    
    throw error;
  }
};

// 🚀 NEW: Remove track with INSTANT optimistic update and snapshot tracking
export const removeTrackFromPlaylist = async (trackUri: string): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  const trackId = trackUri.split(':').pop() || '';
  const originalTracks = updateManager.getCurrentTracks();
  
  try {
    console.log('🚀 === INSTANT REMOVE WITH SNAPSHOT TRACKING ===');
    console.log('Track URI:', trackUri);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    // 🚀 INSTANT: Remove from UI immediately
    updateManager.optimisticallyRemoveTrack(trackId);
    
    // Get selected playlist
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }
    
    // 🎯 NEW: Remove track from playlist and get new snapshot_id
    const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/playlists/${selectedPlaylist.playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({
        tracks: [{ uri: trackUri }]
      })
    });
    
    const result = await response.json();
    const newSnapshotId = result.snapshot_id;
    
    console.log('✅ Track removed from Spotify successfully');
    console.log('New Snapshot ID:', newSnapshotId);

    // 🎯 NEW: Confirm the operation with new snapshot ID
    updateManager.confirmOperation(trackId, newSnapshotId);
    
    console.log('🎉 === INSTANT REMOVE COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to remove track from playlist:', error);
    
    // Revert optimistic update on error
    updateManager.revertOperation(trackId, originalTracks);
    
    throw error;
  }
};

// Get current user profile with error handling
export const getCurrentUser = async (): Promise<SpotifyApi.CurrentUsersProfileResponse | null> => {
  try {
    const response = await makeSpotifyApiCall('https://api.spotify.com/v1/me');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};

// 🎯 NEW: Get playlist tracks with snapshot ID
export const getPlaylistTracks = async (playlistId: string): Promise<SpotifyApi.PlaylistTrackObject[]> => {
  try {
    console.log('📋 === FETCHING PLAYLIST WITH SNAPSHOT ===');
    console.log('Playlist ID:', playlistId);
    
    // 🎯 NEW: Get playlist with snapshot_id included
    const response = await makeSpotifyApiCall(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri),added_at,added_by)`
    );
    
    const data = await response.json();
    const snapshotId = data.snapshot_id;
    const tracks = data.tracks.items;
    
    console.log(`✅ Fetched ${tracks.length} tracks from playlist`);
    console.log('Snapshot ID:', snapshotId);
    
    // Store snapshot ID in the manager
    const updateManager = SnapshotOptimisticManager.getInstance();
    updateManager.setTracks(tracks, playlistId, snapshotId);
    
    return tracks;
  } catch (error) {
    console.error('Failed to get playlist tracks:', error);
    throw error;
  }
};

// 🚀 NEW: Subscribe to snapshot-based optimistic updates
export const subscribeToPlaylistUpdates = (
  playlistId: string,
  callback: (tracks: SpotifyApi.PlaylistTrackObject[]) => void
): (() => void) => {
  console.log('🚀 === SUBSCRIBING TO SNAPSHOT-BASED UPDATES ===');
  console.log('Playlist ID:', playlistId);
  
  const updateManager = SnapshotOptimisticManager.getInstance();
  
  // Load initial tracks with snapshot ID
  getPlaylistTracks(playlistId).then(tracks => {
    console.log('✅ Initial tracks loaded with snapshot tracking');
  }).catch(error => {
    console.error('Failed to load initial tracks:', error);
  });
  
  // Subscribe to updates
  const unsubscribe = updateManager.subscribe(callback);
  
  console.log('✅ Snapshot-based optimistic update subscription active');
  
  return () => {
    console.log('🧹 Cleaning up snapshot-based updates');
    unsubscribe();
  };
};

// 🚀 NEW: Bulk remove tracks with snapshot tracking
export const bulkRemoveTracksFromPlaylist = async (trackUris: string[]): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  const trackIds = trackUris.map(uri => uri.split(':').pop() || '');
  const originalTracks = updateManager.getCurrentTracks();
  
  try {
    console.log(`🚀 === INSTANT BULK REMOVE WITH SNAPSHOT TRACKING ===`);
    console.log(`Track URIs: ${trackUris.length}`);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    // 🚀 INSTANT: Remove all tracks from UI immediately
    updateManager.optimisticallyBulkRemove(trackIds);
    
    // Get selected playlist
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }
    
    // 🎯 NEW: Remove tracks in batches and get final snapshot_id
    const batchSize = 100;
    let finalSnapshotId: string | null = null;
    
    for (let i = 0; i < trackUris.length; i += batchSize) {
      const batch = trackUris.slice(i, i + batchSize);
      
      const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/playlists/${selectedPlaylist.playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({
          tracks: batch.map(uri => ({ uri }))
        })
      });
      
      const result = await response.json();
      finalSnapshotId = result.snapshot_id; // Keep the last snapshot_id
    }
    
    console.log('✅ Bulk remove completed in Spotify');
    console.log('Final Snapshot ID:', finalSnapshotId);

    // 🎯 NEW: Confirm all operations with final snapshot ID
    trackIds.forEach(id => updateManager.confirmOperation(id, finalSnapshotId || undefined));
    
    console.log('🎉 === INSTANT BULK REMOVE COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to bulk remove tracks from playlist:', error);
    
    // Revert all optimistic updates on error
    trackIds.forEach(id => updateManager.revertOperation(id, originalTracks));
    
    throw error;
  }
};

// 🎯 NEW: Get current snapshot ID for debugging
export const getCurrentSnapshotId = (): string | null => {
  return SnapshotOptimisticManager.getInstance().getCurrentSnapshotId();
};

// 🎯 NEW: Get pending operations count for UI
export const getPendingOperationsCount = (): number => {
  return SnapshotOptimisticManager.getInstance().getPendingOperationsCount();
};