import { collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SpotifyCredentials, SelectedPlaylist, SpotifyTrack } from '../types';
import { generateCodeVerifier, generateCodeChallenge } from '../utils/pkce';
import { spotifyCache } from './spotifyCache';

// 🔧 CIRCUIT BREAKER: Spotify rate limit protection with exponential backoff
class SpotifyCircuitBreaker {
  private static instance: SpotifyCircuitBreaker;
  private requestTimes: number[] = [];
  private readonly maxRequestsPer30Seconds = 50; // Very conservative limit
  private consecutiveFailures = 0;
  private lastFailureTime = 0;
  private circuitOpen = false;
  private readonly failureThreshold = 3;
  private readonly openCircuitDuration = 300000; // 5 minutes
  
  static getInstance(): SpotifyCircuitBreaker {
    if (!SpotifyCircuitBreaker.instance) {
      SpotifyCircuitBreaker.instance = new SpotifyCircuitBreaker();
    }
    return SpotifyCircuitBreaker.instance;
  }
  
  isCircuitOpen(): boolean {
    if (this.circuitOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.openCircuitDuration) {
        console.log('🔄 Circuit breaker: Attempting to close circuit after cooldown');
        this.circuitOpen = false;
        this.consecutiveFailures = 0;
      }
    }
    return this.circuitOpen;
  }
  
  recordSuccess(): void {
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
  }
  
  resetCircuitBreaker(): void {
    console.log('🔄 Manual circuit breaker reset - clearing all failures');
    this.consecutiveFailures = 0;
    this.circuitOpen = false;
    this.lastFailureTime = 0;
    this.requestTimes = [];
  }
  
  recordFailure(): void {
    this.consecutiveFailures++;
    this.lastFailureTime = Date.now();
    
    if (this.consecutiveFailures >= this.failureThreshold) {
      this.circuitOpen = true;
      console.log(`🚫 Circuit breaker OPEN: Too many failures (${this.consecutiveFailures}). Waiting 5 minutes.`);
    }
  }
  
  async waitIfNeeded(): Promise<void> {
    if (this.isCircuitOpen()) {
      const waitTime = this.openCircuitDuration - (Date.now() - this.lastFailureTime);
      throw new Error(`Circuit breaker open. Spotify API temporarily disabled. Wait ${Math.ceil(waitTime/60000)} minutes.`);
    }
    
    const now = Date.now();
    const thirtySecondsAgo = now - 30000;
    
    // Remove requests older than 30 seconds
    this.requestTimes = this.requestTimes.filter(time => time > thirtySecondsAgo);
    
    // If we're at the limit, wait until we can make another request
    if (this.requestTimes.length >= this.maxRequestsPer30Seconds) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = (oldestRequest + 30000) - now + 5000; // Add 5 second buffer
      
      if (waitTime > 0) {
        console.log(`⏳ Conservative rate limiting: waiting ${waitTime}ms before next Spotify API call`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Record this request
    this.requestTimes.push(Date.now());
  }
  
  getRequestsInLast30Seconds(): number {
    const thirtySecondsAgo = Date.now() - 30000;
    this.requestTimes = this.requestTimes.filter(time => time > thirtySecondsAgo);
    return this.requestTimes.length;
  }
}

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

  // 🔧 DISABLED: Polling disabled to prevent rate limiting
  private startSmartPolling(): void {
    console.log('⚠️ Smart polling disabled to prevent Spotify rate limiting');
    
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    
    // Only sync manually when needed to avoid 429 errors
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
      
      const response = await makeSpotifyApiCall(
        `https://api.spotify.com/v1/playlists/${this.playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri),added_at,added_by)`
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
  private baseDelay = 5000; // Increased to 5 seconds as per Spotify guidelines

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

// 🔧 FIX: Enhanced API call with circuit breaker and retry
const makeSpotifyApiCall = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const circuitBreaker = SpotifyCircuitBreaker.getInstance();
  
  // Check circuit breaker and wait for rate limiting
  await circuitBreaker.waitIfNeeded();
  
  return await retryManager.executeWithRetry(async () => {
    const credentials = await getValidCredentials();
    
    if (!credentials) {
      throw new Error('Not connected to Spotify');
    }
    
    const requestsInWindow = circuitBreaker.getRequestsInLast30Seconds();
    console.log(`🔄 Executing Spotify API Call: ${url} (${requestsInWindow}/50 requests in 30s window)`);
    
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
      
      // Record failure in circuit breaker for rate limiting
      if (response.status === 429) {
        circuitBreaker.recordFailure();
      }
      
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
    
    // Record success in circuit breaker
    circuitBreaker.recordSuccess();
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
    
    return data.tracks.items.map((track: any) => ({
      id: track.id,
      name: track.name,
      artists: track.artists.map((artist: any) => ({ name: artist.name })),
      album: {
        name: track.album.name,
        images: track.album.images
      },
      uri: track.uri
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

// 🔧 FIX: Enhanced playlist tracks fetch with caching
export const getPlaylistTracks = async (playlistId: string): Promise<any[]> => {
  try {
    const cacheKey = `playlist_${playlistId}`;
    
    // Check cache first
    const cachedTracks = spotifyCache.get(cacheKey);
    if (cachedTracks) {
      console.log(`📋 Using cached playlist data for ${playlistId} (${cachedTracks.length} tracks)`);
      return cachedTracks;
    }
    
    console.log('📋 === FETCHING PLAYLIST FROM SPOTIFY ===');
    console.log('Playlist ID:', playlistId);
    
    const response = await makeSpotifyApiCall(
      `https://api.spotify.com/v1/playlists/${playlistId}?fields=snapshot_id,tracks.items(track(id,name,artists,album,duration_ms,external_urls,uri),added_at,added_by)`
    );
    
    const data = await response.json();
    const snapshotId = data.snapshot_id;
    const tracks = data.tracks.items || [];
    
    // 🔧 FIX: Validate tracks
    const validTracks = tracks.filter((item: any) => item && item.track && item.track.id);
    
    console.log(`✅ Fetched ${validTracks.length} valid tracks from playlist`);
    console.log('Snapshot ID:', snapshotId);
    
    // Cache for 2 minutes to reduce API calls
    spotifyCache.set(cacheKey, validTracks, 120000);
    
    const updateManager = SnapshotOptimisticManager.getInstance();
    updateManager.setTracks(validTracks, playlistId, snapshotId);
    
    return validTracks;
  } catch (error: any) {
    console.error('Failed to get playlist tracks:', error);
    
    // If rate limited, return cached data if available
    if (error.status === 429) {
      const cacheKey = `playlist_${playlistId}`;
      const staleCache = spotifyCache.get(cacheKey);
      if (staleCache) {
        console.log('⚡ Rate limited - returning stale cache data');
        return staleCache;
      }
    }
    
    throw error;
  }
};

// 🔧 FIX: Simplified subscription to prevent rate limiting
export const subscribeToPlaylistUpdates = (
  playlistId: string,
  callback: (tracks: any[]) => void
): (() => void) => {
  console.log('🚀 === SIMPLIFIED SUBSCRIPTION ===');
  console.log('Playlist ID:', playlistId);
  
  const updateManager = SnapshotOptimisticManager.getInstance();
  
  // Only load tracks if not already cached
  const cacheKey = `playlist_${playlistId}`;
  const cachedTracks = spotifyCache.get(cacheKey);
  if (cachedTracks) {
    console.log('✅ Using existing cached tracks, no API call needed');
    callback(cachedTracks);
  } else {
    // Load initial tracks with rate limiting protection
    getPlaylistTracks(playlistId).then(tracks => {
      console.log('✅ Initial tracks loaded');
      callback(tracks);
    }).catch(error => {
      console.error('Failed to load initial tracks:', error);
      // Return empty array on error to prevent infinite loading
      callback([]);
    });
  }
  
  const unsubscribe = updateManager.subscribe(callback);
  
  console.log('✅ Simplified subscription active');
  
  return () => {
    console.log('🧹 Cleaning up subscription');
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

// Export circuit breaker reset function
export const resetSpotifyCircuitBreaker = (): void => {
  console.log('🔄 Complete Spotify Reset - Clearing ALL state');
  SpotifyCircuitBreaker.getInstance().resetCircuitBreaker();
  
  // Clear all Spotify-related localStorage
  if (typeof window !== 'undefined') {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_token_expires_at');
    localStorage.removeItem(PKCE_CODE_VERIFIER_KEY);
    localStorage.removeItem(PKCE_STATE_KEY);
    localStorage.removeItem('selectedPlaylist');
    console.log('🧹 Cleared all Spotify localStorage data');
  }
  
  // Reset global state
  if (typeof window !== 'undefined') {
    window.location.reload();
  }
};
