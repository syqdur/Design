/**
 * Comprehensive Spotify API Error Handling Service
 * Handles all common Spotify integration issues with detailed error reporting
 */

export interface SpotifyError {
  code: string;
  message: string;
  userMessage: string;
  debugInfo?: any;
  retryable: boolean;
  action?: 'refresh_token' | 'reauthorize' | 'check_config' | 'retry_later';
}

export class SpotifyErrorHandler {
  
  /**
   * 1. INVALID OR EXPIRED ACCESS TOKENS
   * Common symptoms: 401 Unauthorized, "The access token expired"
   */
  static handleTokenError(error: any): SpotifyError {
    console.error('🔑 Token Error:', error);
    
    // Check for specific token error patterns
    if (error.statusCode === 401 || error.status === 401) {
      if (error.body?.error?.message?.includes('token expired') || 
          error.message?.includes('token expired')) {
        return {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
          userMessage: 'Spotify-Verbindung abgelaufen. Wird automatisch erneuert...',
          retryable: true,
          action: 'refresh_token'
        };
      }
      
      if (error.body?.error?.message?.includes('Invalid access token') ||
          error.message?.includes('Invalid access token')) {
        return {
          code: 'TOKEN_INVALID',
          message: 'Access token is invalid',
          userMessage: 'Spotify-Verbindung ungültig. Bitte erneut verbinden.',
          retryable: false,
          action: 'reauthorize'
        };
      }
    }
    
    return {
      code: 'TOKEN_UNKNOWN',
      message: 'Unknown token error',
      userMessage: 'Spotify-Authentifizierung fehlgeschlagen. Bitte erneut versuchen.',
      retryable: true,
      action: 'reauthorize'
    };
  }

  /**
   * 2. OAUTH AUTHENTICATION FLOW ERRORS
   * Common symptoms: Invalid state, CSRF errors, callback failures
   */
  static handleOAuthError(error: any, urlParams?: URLSearchParams): SpotifyError {
    console.error('🔐 OAuth Error:', error);
    
    // Check URL parameters for OAuth errors
    if (urlParams) {
      const oauthError = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      if (oauthError === 'access_denied') {
        return {
          code: 'OAUTH_ACCESS_DENIED',
          message: 'User denied access',
          userMessage: 'Spotify-Zugriff wurde verweigert. Bitte erlaube den Zugriff für die Musikwunsch-Funktion.',
          retryable: true,
          action: 'reauthorize'
        };
      }
      
      if (oauthError === 'invalid_client') {
        return {
          code: 'OAUTH_INVALID_CLIENT',
          message: 'Invalid client credentials',
          userMessage: 'Spotify-Konfigurationsfehler. Bitte kontaktiere den Administrator.',
          retryable: false,
          action: 'check_config'
        };
      }
      
      if (oauthError === 'invalid_request') {
        return {
          code: 'OAUTH_INVALID_REQUEST',
          message: `Invalid OAuth request: ${errorDescription}`,
          userMessage: 'Ungültige Spotify-Anfrage. Bitte versuche es erneut.',
          retryable: true,
          action: 'reauthorize'
        };
      }
    }
    
    // State mismatch (CSRF protection)
    if (error.message?.includes('State mismatch')) {
      return {
        code: 'OAUTH_STATE_MISMATCH',
        message: 'OAuth state parameter mismatch',
        userMessage: 'Sicherheitsfehler bei der Spotify-Anmeldung. Bitte versuche es erneut.',
        retryable: true,
        action: 'reauthorize'
      };
    }
    
    return {
      code: 'OAUTH_UNKNOWN',
      message: 'Unknown OAuth error',
      userMessage: 'Spotify-Anmeldung fehlgeschlagen. Bitte versuche es erneut.',
      retryable: true,
      action: 'reauthorize'
    };
  }

  /**
   * 3. REFRESH TOKEN PROBLEMS
   * Common symptoms: Invalid refresh token, refresh failures
   */
  static handleRefreshTokenError(error: any): SpotifyError {
    console.error('🔄 Refresh Token Error:', error);
    
    if (error.statusCode === 400 || error.status === 400) {
      if (error.body?.error === 'invalid_grant') {
        return {
          code: 'REFRESH_TOKEN_INVALID',
          message: 'Refresh token is invalid or expired',
          userMessage: 'Spotify-Sitzung abgelaufen. Bitte erneut anmelden.',
          retryable: false,
          action: 'reauthorize'
        };
      }
    }
    
    return {
      code: 'REFRESH_TOKEN_FAILED',
      message: 'Failed to refresh access token',
      userMessage: 'Spotify-Token konnte nicht erneuert werden. Bitte erneut anmelden.',
      retryable: false,
      action: 'reauthorize'
    };
  }

  /**
   * 4. API PERMISSION SCOPE ISSUES
   * Common symptoms: Insufficient scope, permission denied for specific actions
   */
  static handleScopeError(error: any, requiredScope?: string): SpotifyError {
    console.error('🔒 Scope Error:', error);
    
    if (error.statusCode === 403 || error.status === 403) {
      if (error.body?.error?.message?.includes('Insufficient client scope')) {
        return {
          code: 'INSUFFICIENT_SCOPE',
          message: `Insufficient scope. Required: ${requiredScope}`,
          userMessage: 'Unzureichende Spotify-Berechtigungen. Bitte erneut anmelden und alle Berechtigungen gewähren.',
          retryable: false,
          action: 'reauthorize',
          debugInfo: { requiredScope, currentError: error.body }
        };
      }
      
      if (error.body?.error?.message?.includes('User not registered in the Developer Dashboard')) {
        return {
          code: 'USER_NOT_REGISTERED',
          message: 'User not registered in Spotify Developer Dashboard',
          userMessage: 'Spotify-App ist im Entwicklungsmodus. Nur registrierte Benutzer können sich anmelden.',
          retryable: false,
          action: 'check_config'
        };
      }
    }
    
    return {
      code: 'SCOPE_UNKNOWN',
      message: 'Unknown scope/permission error',
      userMessage: 'Spotify-Berechtigungsfehler. Bitte erneut anmelden.',
      retryable: false,
      action: 'reauthorize'
    };
  }

  /**
   * 5. CLIENT ID/SECRET MISCONFIGURATIONS
   * Common symptoms: Invalid client, authentication failures
   */
  static handleConfigError(error: any): SpotifyError {
    console.error('⚙️ Config Error:', error);
    
    if (error.statusCode === 400 || error.status === 400) {
      if (error.body?.error === 'invalid_client') {
        return {
          code: 'INVALID_CLIENT_CREDENTIALS',
          message: 'Invalid client ID or secret',
          userMessage: 'Spotify-Konfigurationsfehler. Client ID oder Secret ungültig.',
          retryable: false,
          action: 'check_config',
          debugInfo: {
            clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID ? 'Set' : 'Missing',
            clientSecret: import.meta.env.VITE_SPOTIFY_CLIENT_SECRET ? 'Set' : 'Missing',
            redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'Default'
          }
        };
      }
    }
    
    // Check for missing environment variables
    if (!import.meta.env.VITE_SPOTIFY_CLIENT_ID) {
      return {
        code: 'MISSING_CLIENT_ID',
        message: 'Spotify Client ID not configured',
        userMessage: 'Spotify nicht konfiguriert. VITE_SPOTIFY_CLIENT_ID fehlt.',
        retryable: false,
        action: 'check_config'
      };
    }
    
    if (!import.meta.env.VITE_SPOTIFY_CLIENT_SECRET) {
      return {
        code: 'MISSING_CLIENT_SECRET',
        message: 'Spotify Client Secret not configured',
        userMessage: 'Spotify nicht konfiguriert. VITE_SPOTIFY_CLIENT_SECRET fehlt.',
        retryable: false,
        action: 'check_config'
      };
    }
    
    return {
      code: 'CONFIG_UNKNOWN',
      message: 'Unknown configuration error',
      userMessage: 'Spotify-Konfigurationsfehler. Bitte Administrator kontaktieren.',
      retryable: false,
      action: 'check_config'
    };
  }

  /**
   * 6. CORS AND REDIRECT URI ERRORS
   * Common symptoms: CORS blocked, invalid redirect URI
   */
  static handleCorsError(error: any): SpotifyError {
    console.error('🌐 CORS Error:', error);
    
    if (error.message?.includes('CORS') || 
        error.message?.includes('Cross-Origin') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      return {
        code: 'CORS_ERROR',
        message: 'CORS policy blocked the request',
        userMessage: 'Netzwerkfehler. Bitte lade die Seite neu und versuche es erneut.',
        retryable: true,
        action: 'retry_later'
      };
    }
    
    if (error.body?.error === 'invalid_request' && 
        error.body?.error_description?.includes('redirect_uri')) {
      return {
        code: 'INVALID_REDIRECT_URI',
        message: 'Invalid redirect URI in Spotify app settings',
        userMessage: 'Spotify-Konfigurationsfehler. Redirect URI stimmt nicht überein.',
        retryable: false,
        action: 'check_config',
        debugInfo: {
          currentUri: window.location.origin,
          configuredUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI
        }
      };
    }
    
    return {
      code: 'NETWORK_ERROR',
      message: 'Network or CORS error',
      userMessage: 'Netzwerkfehler. Bitte Internetverbindung prüfen.',
      retryable: true,
      action: 'retry_later'
    };
  }

  /**
   * 7. RATE LIMITING PROBLEMS
   * Common symptoms: 429 Too Many Requests, rate limit exceeded
   */
  static handleRateLimitError(error: any): SpotifyError {
    console.error('⏱️ Rate Limit Error:', error);
    
    if (error.statusCode === 429 || error.status === 429) {
      const retryAfter = error.headers?.['retry-after'] || error.body?.retry_after || 60;
      
      return {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Retry after ${retryAfter} seconds`,
        userMessage: `Zu viele Anfragen. Bitte warte ${retryAfter} Sekunden und versuche es erneut.`,
        retryable: true,
        action: 'retry_later',
        debugInfo: { retryAfter }
      };
    }
    
    return {
      code: 'RATE_LIMIT_UNKNOWN',
      message: 'Unknown rate limiting error',
      userMessage: 'Server überlastet. Bitte versuche es später erneut.',
      retryable: true,
      action: 'retry_later'
    };
  }

  /**
   * MAIN ERROR HANDLER - Routes errors to specific handlers
   */
  static handleSpotifyError(error: any, context?: {
    operation?: string;
    urlParams?: URLSearchParams;
    requiredScope?: string;
  }): SpotifyError {
    console.error('🎵 Spotify Error Handler:', { error, context });
    
    // Check for specific error types
    if (error.statusCode === 401 || error.status === 401) {
      return this.handleTokenError(error);
    }
    
    if (error.statusCode === 403 || error.status === 403) {
      return this.handleScopeError(error, context?.requiredScope);
    }
    
    if (error.statusCode === 429 || error.status === 429) {
      return this.handleRateLimitError(error);
    }
    
    if (error.statusCode === 400 || error.status === 400) {
      if (context?.operation === 'refresh_token') {
        return this.handleRefreshTokenError(error);
      }
      return this.handleConfigError(error);
    }
    
    if (context?.operation === 'oauth_callback') {
      return this.handleOAuthError(error, context.urlParams);
    }
    
    if (error.message?.includes('CORS') || error.message?.includes('fetch')) {
      return this.handleCorsError(error);
    }
    
    // Generic error
    return {
      code: 'SPOTIFY_UNKNOWN_ERROR',
      message: error.message || 'Unknown Spotify error',
      userMessage: 'Spotify-Fehler aufgetreten. Bitte versuche es erneut.',
      retryable: true,
      action: 'retry_later',
      debugInfo: error
    };
  }

  /**
   * ERROR RECOVERY ACTIONS
   */
  static async executeRecoveryAction(
    spotifyError: SpotifyError, 
    spotifyService: any
  ): Promise<boolean> {
    console.log(`🔧 Executing recovery action: ${spotifyError.action}`);
    
    try {
      switch (spotifyError.action) {
        case 'refresh_token':
          const credentials = await spotifyService.getValidCredentials();
          if (credentials) {
            await spotifyService.refreshAccessToken(credentials);
            return true;
          }
          return false;
          
        case 'reauthorize':
          const authUrl = await spotifyService.getAuthorizationUrl();
          window.location.href = authUrl;
          return true;
          
        case 'check_config':
          console.error('Configuration check required:', spotifyError.debugInfo);
          return false;
          
        case 'retry_later':
          const retryAfter = spotifyError.debugInfo?.retryAfter || 5;
          await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
          return true;
          
        default:
          return false;
      }
    } catch (recoveryError) {
      console.error('Recovery action failed:', recoveryError);
      return false;
    }
  }
}

/**
 * DEBUGGING UTILITIES
 */
export class SpotifyDebugger {
  
  static logEnvironmentConfig(): void {
    console.log('🔍 Spotify Environment Configuration:');
    console.log('Client ID:', import.meta.env.VITE_SPOTIFY_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('Client Secret:', import.meta.env.VITE_SPOTIFY_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('Redirect URI:', import.meta.env.VITE_SPOTIFY_REDIRECT_URI || '⚠️ Using default');
    console.log('Current Origin:', window.location.origin);
  }
  
  static async testSpotifyConnection(): Promise<void> {
    console.log('🧪 Testing Spotify API Connection...');
    
    try {
      const response = await fetch('https://api.spotify.com/v1/', {
        method: 'GET'
      });
      
      if (response.status === 401) {
        console.log('✅ Spotify API reachable (401 expected without auth)');
      } else {
        console.log('⚠️ Unexpected response:', response.status);
      }
    } catch (error) {
      console.error('❌ Spotify API unreachable:', error);
    }
  }
  
  static validateRedirectUri(): boolean {
    const configuredUri = import.meta.env.VITE_SPOTIFY_REDIRECT_URI;
    const currentOrigin = window.location.origin;
    
    if (!configuredUri) {
      console.warn('⚠️ No redirect URI configured, using current origin');
      return true;
    }
    
    if (!configuredUri.startsWith(currentOrigin)) {
      console.error('❌ Redirect URI mismatch:');
      console.error('Configured:', configuredUri);
      console.error('Current:', currentOrigin);
      return false;
    }
    
    console.log('✅ Redirect URI validation passed');
    return true;
  }
}

/**
 * RETRY MECHANISM WITH EXPONENTIAL BACKOFF
 */
export class SpotifyRetryHandler {
  
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        const spotifyError = SpotifyErrorHandler.handleSpotifyError(error);
        
        if (!spotifyError.retryable || attempt === maxRetries) {
          throw spotifyError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`🔄 Retry attempt ${attempt + 1}/${maxRetries} in ${delay}ms`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}