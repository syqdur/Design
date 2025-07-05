import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SpotifyCredentials, SelectedPlaylist, SpotifyTrack } from '../types';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';

// Spotify API Configuration
const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || '4dbf85a8ca7c43d3b2ddc540194e9387';
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET || 'acf102b8834d48b497a7e98bf69021f6';

const getRedirectUri = (): string => {
  if (import.meta.env.VITE_SPOTIFY_REDIRECT_URI) {
    return import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
  }
  
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    return window.location.origin + '/';
  }
  
  return 'https://kristinundmauro.de/';
};

const SPOTIFY_REDIRECT_URI = getRedirectUri();

// Storage keys for PKCE flow
const PKCE_CODE_VERIFIER_KEY = 'spotify_pkce_code_verifier';
const PKCE_STATE_KEY = 'spotify_pkce_state';

// 🚀 FIXED: Enhanced Snapshot Manager with Race Condition Prevention
class SnapshotOptimisticManager {
  private static instance: SnapshotOptimisticManager;
  private listeners: Set<(tracks: SpotifyApi.PlaylistTrackObject[]) => void> = new Set();
  private currentTracks: SpotifyApi.PlaylistTrackObject[] = [];
  private pendingOperations: Map<string, { type: 'add' | 'remove', track?: SpotifyTrack, timestamp: number }> = new Map();
  private playlistId: string | null = null;
  private lastSnapshotId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  
  // 🔧 FIX: Race Condition Prevention
  private syncLock: boolean = false;
  private pendingSyncPromise: Promise<boolean> | null = null;
  private operationQueue: Array<() => Promise<void>> = [];
  private processingQueue: boolean = false;
  
  // 🔧 FIX: Retry Logic
  private maxRetries = 3;
  private baseDelay = 1000;
  private consecutiveErrors = 0;

  static getInstance(): SnapshotOptimisticManager {
    if (!SnapshotOptimisticManager.instance) {
      SnapshotOptimisticManager.instance = new SnapshotOptimisticManager();
    }
    return SnapshotOptimisticManager.instance;
  }

  // 🔧 FIX: Enhanced Subscribe with proper cleanup
  subscribe(callback: (tracks: SpotifyApi.PlaylistTrackObject[]) => void): () => void {
    this.listeners.add(callback);
    
    if (this.currentTracks.length > 0) {
      // Use setTimeout to avoid sync issues
      setTimeout(() => callback([...this.currentTracks]), 0);
    }

    return () => {
      this.listeners.delete(callback);
    };
  }

  // 🔧 FIX: Enhanced setTracks with validation and newest first sorting
  setTracks(tracks: SpotifyApi.PlaylistTrackObject[], playlistId: string, snapshotId?: string): void {
    console.log('📋 === SETTING TRACKS WITH ENHANCED VALIDATION ===');
    console.log(`Playlist: ${playlistId}`);
    console.log(`Tracks: ${tracks.length}`);
    console.log(`Snapshot ID: ${snapshotId || 'Not provided'}`);
    console.log(`Previous Snapshot: ${this.lastSnapshotId || 'None'}`);
    
    // 🔧 FIX: Validate tracks before setting
    const validTracks = tracks.filter(item => item && item.track && item.track.id);
    
    // Sort by added_at to ensure newest first (descending order)
    validTracks.sort((a: any, b: any) => {
      const dateA = new Date(a.added_at).getTime();
      const dateB = new Date(b.added_at).getTime();
      return dateB - dateA; // Newest first
    });
    
    this.currentTracks = [...validTracks];
    this.playlistId = playlistId;
    
    if (snapshotId && snapshotId !== this.lastSnapshotId) {
      this.lastSnapshotId = snapshotId;
      this.consecutiveErrors = 0; // Reset error count on successful update
      console.log(`✅ Snapshot ID updated: ${snapshotId}`);
    }
    
    this.notifyListeners();
    this.startSmartPolling();
  }

  // 🔧 FIX: Queue-based optimistic operations
  optimisticallyAddTrack(track: SpotifyTrack): void {
    this.queueOperation(async () => {
      console.log('🚀 === QUEUED OPTIMISTIC ADD ===');
      console.log('Track:', track.name);
      
      // Check if track already exists
      const existingTrack = this.currentTracks.find(item => item.track.id === track.id);
      if (existingTrack) {
        console.log('⚠️ Track already exists, skipping optimistic add');
        return;
      }
      
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
          duration_ms: 180000,
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

      this.currentTracks.unshift(mockPlaylistTrack);
      this.pendingOperations.set(track.id, { 
        type: 'add', 
        track,
        timestamp: Date.now()
      });
      
      this.notifyListeners();
      console.log('✅ Queued optimistic add completed');
    });
  }

  // 🔧 FIX: Queue-based optimistic remove
  optimisticallyRemoveTrack(trackId: string): void {
    this.queueOperation(async () => {
      console.log('🚀 === QUEUED OPTIMISTIC REMOVE ===');
      console.log('Track ID:', trackId);
      
      this.currentTracks = this.currentTracks.filter(item => item.track.id !== trackId);
      this.pendingOperations.set(trackId, { 
        type: 'remove',
        timestamp: Date.now()
      });
      
      this.notifyListeners();
      console.log('✅ Queued optimistic remove completed');
    });
  }

  // 🔧 FIX: Enhanced bulk remove with validation
  optimisticallyBulkRemove(trackIds: string[]): void {
    this.queueOperation(async () => {
      console.log('🚀 === QUEUED OPTIMISTIC BULK REMOVE ===');
      console.log('Track IDs:', trackIds.length);
      
      // Validate trackIds
      const validTrackIds = trackIds.filter(id => id && typeof id === 'string');
      
      this.currentTracks = this.currentTracks.filter(item => !validTrackIds.includes(item.track.id));
      
      validTrackIds.forEach(id => this.pendingOperations.set(id, { 
        type: 'remove',
        timestamp: Date.now()
      }));
      
      this.notifyListeners();
      console.log('✅ Queued optimistic bulk remove completed');
    });
  }

  // 🔧 FIX: Enhanced operation queue processor
  private queueOperation(operation: () => Promise<void>): void {
    this.operationQueue.push(operation);
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.operationQueue.length === 0) {
      return;
    }

    this.processingQueue = true;
    
    try {
      while (this.operationQueue.length > 0) {
        const operation = this.operationQueue.shift();
        if (operation) {
          await operation();
        }
      }
    } catch (error) {
      console.error('Queue processing error:', error);
    } finally {
      this.processingQueue = false;
    }
  }

  // 🔧 FIX: Enhanced confirm with timeout cleanup
  confirmOperation(trackId: string, newSnapshotId?: string): void {
    console.log('✅ === CONFIRMING OPERATION WITH TIMEOUT CLEANUP ===');
    console.log('Track ID:', trackId);
    console.log('New Snapshot:', newSnapshotId);
    
    const operation = this.pendingOperations.get(trackId);
    if (operation) {
      this.pendingOperations.delete(trackId);
      
      // Reset error count on successful operation
      this.consecutiveErrors = 0;
    }
    
    if (newSnapshotId && newSnapshotId !== this.lastSnapshotId) {
      this.lastSnapshotId = newSnapshotId;
      console.log(`📋 Snapshot ID updated after operation: ${newSnapshotId}`);
      
      // Schedule verification with backoff
      setTimeout(() => {
        this.checkForUpdates();
      }, 2000);
    }
    
    // Clean up old pending operations (older than 5 minutes)
    this.cleanupOldOperations();
  }

  // 🔧 FIX: Enhanced revert with state validation
  revertOperation(trackId: string, originalTracks: SpotifyApi.PlaylistTrackObject[]): void {
    console.log('🔄 === REVERTING OPERATION WITH STATE VALIDATION ===');
    console.log('Track ID:', trackId);
    
    const operation = this.pendingOperations.get(trackId);
    this.pendingOperations.delete(trackId);
    
    // 🔧 FIX: Validate original tracks before reverting
    const validOriginalTracks = originalTracks.filter(item => item && item.track && item.track.id);
    
    if (operation?.type === 'add') {
      this.currentTracks = this.currentTracks.filter(item => item.track.id !== trackId);
    } else if (operation?.type === 'remove') {
      this.currentTracks = [...validOriginalTracks];
    }
    
    this.notifyListeners();
    console.log('✅ Operation reverted with state validation');
  }

  // 🔧 FIX: Race condition safe polling
  private startSmartPolling(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    let pollInterval = 2000;
    let consecutiveNoChanges = 0;

    const poll = async () => {
      try {
        // Skip polling if sync is locked
        if (this.syncLock) {
          console.log('⏸️ Skipping poll - sync locked');
          this.syncInterval = setTimeout(poll, pollInterval);
          return;
        }

        const hasChanges = await this.checkForUpdates();
        
        if (hasChanges) {
          pollInterval = 2000;
          consecutiveNoChanges = 0;
        } else {
          consecutiveNoChanges++;
          
          if (consecutiveNoChanges >= 3) {
            // 🔧 FIX: Better backoff calculation
            pollInterval = Math.min(pollInterval * 1.2, 30000);
          }
        }
        
        // 🔧 FIX: Adjust interval based on error rate
        if (this.consecutiveErrors > 0) {
          pollInterval = Math.min(pollInterval * (1 + this.consecutiveErrors * 0.5), 60000);
        }
        
        this.syncInterval = setTimeout(poll, pollInterval);
        
      } catch (error) {
        console.warn('Smart polling error:', error);
        this.consecutiveErrors++;
        
        // 🔧 FIX: Exponential backoff on errors
        const errorDelay = Math.min(this.baseDelay * Math.pow(2, this.consecutiveErrors), 30000);
        this.syncInterval = setTimeout(poll, errorDelay);
      }
    };

    poll();
  }

  // 🔧 FIX: Enhanced sync with race condition prevention
  private async checkForUpdates(): Promise<boolean> {
    if (!this.playlistId) return false;

    // 🔧 FIX: Prevent race conditions
    if (this.syncLock) {
      if (this.pendingSyncPromise) {
        return await this.pendingSyncPromise;
      }
      return false;
    }

    this.syncLock = true;
    this.pendingSyncPromise = this.performSync();
    
    try {
      return await this.pendingSyncPromise;
    } finally {
      this.syncLock = false;
      this.pendingSyncPromise = null;
    }
  }

  // 🔧 FIX: Separated sync logic
  private async performSync(): Promise<boolean> {
    try {
      console.log('🔍 === PERFORMING RACE-SAFE SYNC ===');
      console.log('Current Snapshot:', this.lastSnapshotId);
      console.log('Pending Operations:', this.pendingOperations.size);
      
      // 🎵 NEW: Include preview_url in sync requests
      const response = await makeSpotifyApiCall(
        `https://api.spotify.com/v1/playlists/${this.playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri,preview_url),added_at,added_by)`
      );
      
      const data = await response.json();
      const currentSnapshot = data.snapshot_id;
      
      console.log('Remote Snapshot:', currentSnapshot);
      
      if (currentSnapshot !== this.lastSnapshotId) {
        console.log('🔄 === SNAPSHOT CHANGED - CONDITIONAL SYNC ===');
        console.log(`${this.lastSnapshotId} → ${currentSnapshot}`);
        
        // 🔧 FIX: Only sync if no critical pending operations
        const criticalOperations = Array.from(this.pendingOperations.values())
          .filter(op => Date.now() - op.timestamp < 5000); // Only recent operations
        
        if (criticalOperations.length === 0) {
          const validTracks = data.tracks.items.filter(item => item && item.track && item.track.id);
          
          // Sort by added_at to ensure newest first (descending order)
          validTracks.sort((a: any, b: any) => {
            const dateA = new Date(a.added_at).getTime();
            const dateB = new Date(b.added_at).getTime();
            return dateB - dateA; // Newest first
          });
          
          this.currentTracks = validTracks;
          this.lastSnapshotId = currentSnapshot;
          this.notifyListeners();
          console.log('✅ Synced with Spotify - UI updated (newest first)');
          return true;
        } else {
          console.log('⏸️ Skipping sync - critical operations pending');
          console.log('Critical operations:', criticalOperations.length);
        }
      } else {
        console.log('✅ Snapshot unchanged - no sync needed');
      }
      
      return false;
      
    } catch (error) {
      console.warn('Sync performance failed:', error);
      this.consecutiveErrors++;
      return false;
    }
  }

  // 🔧 FIX: Cleanup old operations
  private cleanupOldOperations(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    for (const [trackId, operation] of this.pendingOperations.entries()) {
      if (operation.timestamp < fiveMinutesAgo) {
        console.log(`🧹 Cleaning up old operation for track ${trackId}`);
        this.pendingOperations.delete(trackId);
      }
    }
  }

  // Enhanced getters
  getCurrentTracks(): SpotifyApi.PlaylistTrackObject[] {
    return [...this.currentTracks];
  }

  isPending(trackId: string): boolean {
    return this.pendingOperations.has(trackId);
  }

  getCurrentSnapshotId(): string | null {
    return this.lastSnapshotId;
  }

  getPendingOperationsCount(): number {
    return this.pendingOperations.size;
  }

  // 🔧 FIX: Enhanced cleanup
  cleanup(): void {
    console.log('🧹 === COMPREHENSIVE CLEANUP ===');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Clear all pending operations
    this.pendingOperations.clear();
    
    // Clear operation queue
    this.operationQueue = [];
    this.processingQueue = false;
    
    // Reset sync state
    this.syncLock = false;
    this.pendingSyncPromise = null;
    
    // Clear listeners
    this.listeners.clear();
    
    // Reset error counter
    this.consecutiveErrors = 0;
    
    console.log('✅ Comprehensive cleanup completed');
  }

  // 🔧 FIX: Enhanced notify with error handling
  private notifyListeners(): void {
    const tracksCopy = [...this.currentTracks];
    
    this.listeners.forEach(callback => {
      try {
        // Use setTimeout to prevent sync blocking
        setTimeout(() => callback(tracksCopy), 0);
      } catch (error) {
        console.error('Listener callback error:', error);
      }
    });
  }
}

// 🔧 FIX: Enhanced retry mechanism
class RetryManager {
  private maxRetries = 3;
  private baseDelay = 1000;

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    retryCount: number = 0,
    operationName: string = 'Unknown'
  ): Promise<T> {
    try {
      console.log(`🔄 Executing ${operationName} (attempt ${retryCount + 1})`);
      return await operation();
    } catch (error: any) {
      if (retryCount < this.maxRetries) {
        const delay = this.baseDelay * Math.pow(2, retryCount);
        console.log(`⏳ Retrying ${operationName} in ${delay}ms (${retryCount + 1}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retryCount + 1, operationName);
      }
      
      console.error(`❌ ${operationName} failed after ${this.maxRetries} attempts`);
      throw error;
    }
  }
}

const retryManager = new RetryManager();

// Generate authorization URL with PKCE
export const getAuthorizationUrl = async (): Promise<string> => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  
  const state = Math.random().toString(36).substring(2, 15);
  
  localStorage.setItem(PKCE_CODE_VERIFIER_KEY, codeVerifier);
  localStorage.setItem(PKCE_STATE_KEY, state);
  
  const scopes = [
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-read-private',
    'user-read-email'
  ];
  
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
  return await retryManager.executeWithRetry(async () => {
    const storedState = localStorage.getItem(PKCE_STATE_KEY);
    if (state !== storedState) {
      throw new Error('State mismatch. Possible CSRF attack.');
    }
    
    const codeVerifier = localStorage.getItem(PKCE_CODE_VERIFIER_KEY);
    if (!codeVerifier) {
      throw new Error('Code verifier not found.');
    }
    
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
    
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    const credentials: Omit<SpotifyCredentials, 'id'> = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: expiresAt,
      createdAt: new Date().toISOString()
    };
    
    const credentialsRef = await addDoc(collection(db, 'spotifyCredentials'), credentials);
    
    localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
    
    return {
      id: credentialsRef.id,
      ...credentials
    };
  }, 0, 'Token Exchange');
};

// 🔧 FIX: Enhanced refresh with retry
export const refreshAccessToken = async (credentials: SpotifyCredentials): Promise<SpotifyCredentials> => {
  return await retryManager.executeWithRetry(async () => {
    console.log('🔄 Refreshing access token with retry...');
    
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
    
    const expiresAt = Date.now() + (data.expires_in * 1000);
    
    const updatedCredentials: Partial<SpotifyCredentials> = {
      accessToken: data.access_token,
      expiresAt: expiresAt
    };
    
    if (data.refresh_token) {
      updatedCredentials.refreshToken = data.refresh_token;
    }
    
    await updateDoc(doc(db, 'spotifyCredentials', credentials.id), updatedCredentials);
    
    console.log('✅ Token refreshed successfully with retry');
    
    return {
      ...credentials,
      ...updatedCredentials
    };
  }, 0, 'Token Refresh');
};

// Get valid credentials with automatic refresh
export const getValidCredentials = async (): Promise<SpotifyCredentials | null> => {
  try {
    const credentialsQuery = query(collection(db, 'spotifyCredentials'));
    const credentialsSnapshot = await getDocs(credentialsQuery);
    
    if (credentialsSnapshot.empty) {
      return null;
    }
    
    const credentials = {
      id: credentialsSnapshot.docs[0].id,
      ...credentialsSnapshot.docs[0].data()
    } as SpotifyCredentials;
    
    const now = Date.now();
    const tokenExpiryBuffer = 5 * 60 * 1000;
    
    if (now + tokenExpiryBuffer >= credentials.expiresAt) {
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
    const credentials = await getValidCredentials();
    
    if (!credentials) {
      return;
    }
    
    await deleteDoc(doc(db, 'spotifyCredentials', credentials.id));
    
    localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
    
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

// 🔧 FIX: Enhanced API call with retry
const makeSpotifyApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  return await retryManager.executeWithRetry(async () => {
    const credentials = await getValidCredentials();
    
    if (!credentials) {
      throw new Error('Not connected to Spotify');
    }
    
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
      
      if (response.status === 403 && errorData.error?.message?.includes('Insufficient client scope')) {
        console.log('🔒 === INSUFFICIENT SCOPE DETECTED ===');
        console.log('Error:', errorData.error.message);
        
        await disconnectSpotify();
        
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
  }, 0, `Spotify API Call: ${url}`);
};

// Get user's playlists with enhanced error handling
export const getUserPlaylists = async (): Promise<SpotifyApi.PlaylistObjectSimplified[]> => {
  const response = await makeSpotifyApiCall('https://api.spotify.com/v1/me/playlists?limit=50');
  const data = await response.json();
  return data.items || [];
};

// Save selected playlist
export const saveSelectedPlaylist = async (playlistId: string, name: string): Promise<SelectedPlaylist> => {
  const playlistQuery = query(collection(db, 'selectedPlaylist'));
  const playlistSnapshot = await getDocs(playlistQuery);
  
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
  
  const newPlaylist: Omit<SelectedPlaylist, 'id'> = {
    playlistId,
    name
  };
  
  const playlistRef = await addDoc(collection(db, 'selectedPlaylist'), newPlaylist);
  
  return {
    id: playlistRef.id,
    ...newPlaylist
  };
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

// Search for tracks with enhanced error handling
export const searchTracks = async (query: string): Promise<SpotifyTrack[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/search?q=${encodedQuery}&type=track&limit=20`);
    const data = await response.json();
    
    // 🔧 FIX: Enhanced validation
    if (!data.tracks || !data.tracks.items) {
      return [];
    }
    
    // 🎵 NEW: Include preview_url in track data
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => ({ name: artist.name })),
      album: {
        name: track.album.name,
        images: track.album.images
      },
      uri: track.uri,
      preview_url: track.preview_url // Add preview URL for audio playback
    })).filter((track: SpotifyTrack) => track.id && track.name); // Filter out invalid tracks
  } catch (error) {
    console.error('Failed to search tracks:', error);
    throw error;
  }
};

// 🚀 ENHANCED: Add track with comprehensive error handling
export const addTrackToPlaylist = async (trackUri: string): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  let trackToAdd: SpotifyTrack | null = null;
  
  try {
    console.log('🚀 === ENHANCED INSTANT ADD ===');
    console.log('Track URI:', trackUri);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    const trackId = trackUri.split(':').pop() || '';
    if (!trackId) {
      throw new Error('Invalid track URI format');
    }
    
    // Get track details with retry
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
      // Continue without optimistic update
    }
    
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }

    // 🔧 FIX: Enhanced add with retry - position 0 for newest first
    const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/playlists/${selectedPlaylist.playlistId}/tracks`, {
      method: 'POST',
      body: JSON.stringify({
        uris: [trackUri],
        position: 0 // Add to beginning for newest first
      })
    });
    
    const result = await response.json();
    const newSnapshotId = result.snapshot_id;
    
    console.log('✅ Track added to Spotify successfully');
    console.log('New Snapshot ID:', newSnapshotId);

    if (trackToAdd) {
      updateManager.confirmOperation(trackToAdd.id, newSnapshotId);
    }
    
    console.log('🎉 === ENHANCED INSTANT ADD COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to add track to playlist:', error);
    
    if (trackToAdd) {
      const currentTracks = updateManager.getCurrentTracks();
      updateManager.revertOperation(trackToAdd.id, currentTracks);
    }
    
    throw error;
  }
};

// 🚀 ENHANCED: Remove track with comprehensive error handling
export const removeTrackFromPlaylist = async (trackUri: string): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  const trackId = trackUri.split(':').pop() || '';
  
  if (!trackId) {
    throw new Error('Invalid track URI format');
  }
  
  const originalTracks = updateManager.getCurrentTracks();
  
  try {
    console.log('🚀 === ENHANCED INSTANT REMOVE ===');
    console.log('Track URI:', trackUri);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    // 🚀 INSTANT: Remove from UI immediately
    updateManager.optimisticallyRemoveTrack(trackId);
    
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }
    
    // 🔧 FIX: Enhanced remove with retry
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

    updateManager.confirmOperation(trackId, newSnapshotId);
    
    console.log('🎉 === ENHANCED INSTANT REMOVE COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to remove track from playlist:', error);
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

// 🔧 FIX: Enhanced playlist tracks fetch
export const getPlaylistTracks = async (playlistId: string): Promise<SpotifyApi.PlaylistTrackObject[]> => {
  try {
    console.log('📋 === ENHANCED PLAYLIST FETCH ===');
    console.log('Playlist ID:', playlistId);
    
    const response = await makeSpotifyApiCall(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri),added_at,added_by)`
    );
    
    const data = await response.json();
    const snapshotId = data.snapshot_id;
    const tracks = data.tracks.items || [];
    
    // 🔧 FIX: Validate tracks
    const validTracks = tracks.filter((item: any) => item && item.track && item.track.id);
    
    console.log(`✅ Fetched ${validTracks.length} valid tracks from playlist (newest first)`);
    console.log('Snapshot ID:', snapshotId);
    
    const updateManager = SnapshotOptimisticManager.getInstance();
    updateManager.setTracks(validTracks, playlistId, snapshotId);
    
    return validTracks;
  } catch (error) {
    console.error('Failed to get playlist tracks:', error);
    throw error;
  }
};

// 🔧 FIX: Enhanced subscription
export const subscribeToPlaylistUpdates = (
  playlistId: string,
  callback: (tracks: SpotifyApi.PlaylistTrackObject[]) => void
): (() => void) => {
  console.log('🚀 === ENHANCED SUBSCRIPTION ===');
  console.log('Playlist ID:', playlistId);
  
  const updateManager = SnapshotOptimisticManager.getInstance();
  
  // Load initial tracks
  getPlaylistTracks(playlistId).then(tracks => {
    console.log('✅ Initial tracks loaded with enhanced validation');
  }).catch(error => {
    console.error('Failed to load initial tracks:', error);
  });
  
  const unsubscribe = updateManager.subscribe(callback);
  
  console.log('✅ Enhanced subscription active');
  
  return () => {
    console.log('🧹 Cleaning up enhanced subscription');
    unsubscribe();
  };
};

// 🔧 FIX: Enhanced bulk remove
export const bulkRemoveTracksFromPlaylist = async (trackUris: string[]): Promise<void> => {
  const updateManager = SnapshotOptimisticManager.getInstance();
  
  // 🔧 FIX: Validate URIs
  const validTrackUris = trackUris.filter(uri => uri && typeof uri === 'string' && uri.includes('spotify:track:'));
  const trackIds = validTrackUris.map(uri => uri.split(':').pop() || '').filter(id => id);
  
  if (trackIds.length === 0) {
    throw new Error('No valid track URIs provided');
  }
  
  const originalTracks = updateManager.getCurrentTracks();
  
  try {
    console.log(`🚀 === ENHANCED BULK REMOVE ===`);
    console.log(`Valid Track URIs: ${validTrackUris.length}`);
    console.log('Current Snapshot:', updateManager.getCurrentSnapshotId());
    
    // 🚀 INSTANT: Remove all tracks from UI immediately
    updateManager.optimisticallyBulkRemove(trackIds);
    
    const selectedPlaylist = await getSelectedPlaylist();
    if (!selectedPlaylist) {
      throw new Error('No playlist selected');
    }
    
    // 🔧 FIX: Enhanced batch processing
    const batchSize = 100;
    let finalSnapshotId: string | null = null;
    
    for (let i = 0; i < validTrackUris.length; i += batchSize) {
      const batch = validTrackUris.slice(i, i + batchSize);
      
      const response = await makeSpotifyApiCall(`https://api.spotify.com/v1/playlists/${selectedPlaylist.playlistId}/tracks`, {
        method: 'DELETE',
        body: JSON.stringify({
          tracks: batch.map(uri => ({ uri }))
        })
      });
      
      const result = await response.json();
      finalSnapshotId = result.snapshot_id;
      
      // Small delay between batches to avoid rate limiting
      if (i + batchSize < validTrackUris.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log('✅ Enhanced bulk remove completed');
    console.log('Final Snapshot ID:', finalSnapshotId);

    // Confirm all operations
    trackIds.forEach(id => updateManager.confirmOperation(id, finalSnapshotId || undefined));
    
    console.log('🎉 === ENHANCED BULK REMOVE COMPLETED ===');
    
  } catch (error) {
    console.error('Failed to bulk remove tracks:', error);
    
    // Revert all operations
    trackIds.forEach(id => updateManager.revertOperation(id, originalTracks));
    
    throw error;
  }
};

// Export enhanced helper functions
export const getCurrentSnapshotId = (): string | null => {
  return SnapshotOptimisticManager.getInstance().getCurrentSnapshotId();
};

export const getPendingOperationsCount = (): number => {
  return SnapshotOptimisticManager.getInstance().getPendingOperationsCount();
};
