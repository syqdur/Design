import React, { useEffect, useState } from 'react';
import { Music, CheckCircle, AlertCircle, Loader, RefreshCw } from 'lucide-react';
import { exchangeCodeForTokens } from '../services/spotifyService';
import { SpotifyErrorHandler } from '../services/spotifyErrorHandler';

interface SpotifyCallbackProps {
  isDarkMode: boolean;
}

export const SpotifyCallback: React.FC<SpotifyCallbackProps> = ({ isDarkMode }) => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Spotify authentication...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      setStatus('processing');
      setMessage('Processing Spotify authentication...');
      setError(null);
      
      // Get code and state from URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const state = urlParams.get('state');
      const oauthError = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      console.log('🔐 Spotify Callback Parameters:', {
        code: code ? 'Present' : 'Missing',
        state: state ? 'Present' : 'Missing',
        error: oauthError,
        errorDescription
      });
      
      // Handle OAuth errors from Spotify
      if (oauthError) {
        const spotifyError = SpotifyErrorHandler.handleOAuthError(
          new Error(`OAuth Error: ${oauthError}`),
          urlParams
        );
        
        setStatus('error');
        setMessage(spotifyError.userMessage);
        setError(spotifyError.message);
        setDebugInfo({
          code: spotifyError.code,
          oauthError,
          errorDescription,
          action: spotifyError.action
        });
        
        // Auto-redirect after OAuth errors
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
        return;
      }
      
      // Validate required parameters
      if (!code || !state) {
        const spotifyError = SpotifyErrorHandler.handleOAuthError(
          new Error('Missing required OAuth parameters'),
          urlParams
        );
        
        setStatus('error');
        setMessage(spotifyError.userMessage);
        setError('Invalid callback parameters: missing code or state');
        setDebugInfo({
          code: spotifyError.code,
          hasCode: !!code,
          hasState: !!state
        });
        
        setTimeout(() => {
          window.location.href = '/';
        }, 5000);
        return;
      }
      
      setMessage('Exchanging authorization code for tokens...');
      
      // Exchange code for tokens
      await exchangeCodeForTokens(code, state);
      
      setStatus('success');
      setMessage('Spotify connected successfully! Redirecting...');
      
      // Redirect after success
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error: any) {
      console.error('Spotify callback error:', error);
      
      setStatus('error');
      
      // Handle structured Spotify errors
      if (error.code && error.userMessage) {
        setMessage(error.userMessage);
        setError(error.message);
        setDebugInfo({
          code: error.code,
          action: error.action,
          retryable: error.retryable,
          debugInfo: error.debugInfo
        });
      } else {
        // Handle generic errors
        const spotifyError = SpotifyErrorHandler.handleSpotifyError(error, {
          operation: 'oauth_callback',
          urlParams: new URLSearchParams(window.location.search)
        });
        
        setMessage(spotifyError.userMessage);
        setError(spotifyError.message);
        setDebugInfo({
          code: spotifyError.code,
          action: spotifyError.action,
          retryable: spotifyError.retryable
        });
      }
      
      // Auto-redirect after error
      setTimeout(() => {
        window.location.href = '/';
      }, 8000);
    }
  };

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleCallback();
  };

  const handleManualRedirect = () => {
    window.location.href = '/';
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className={`max-w-lg w-full text-center p-8 rounded-2xl transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-lg'
      }`}>
        {/* Spotify Logo */}
        <div className="mb-6">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center transition-colors duration-300 ${
            isDarkMode ? 'bg-green-600' : 'bg-green-500'
          }`}>
            <Music className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* Status Icon */}
        <div className="mb-4 flex justify-center">
          {status === 'processing' && <Loader className="w-8 h-8 animate-spin text-blue-500" />}
          {status === 'success' && <CheckCircle className="w-8 h-8 text-green-500" />}
          {status === 'error' && <AlertCircle className="w-8 h-8 text-red-500" />}
        </div>

        {/* Status Message */}
        <h2 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Spotify Integration
        </h2>

        <p className={`text-base mb-6 transition-colors duration-300 ${
          status === 'processing' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') :
          status === 'success' ? (isDarkMode ? 'text-green-400' : 'text-green-600') :
          (isDarkMode ? 'text-red-400' : 'text-red-600')
        }`}>
          {message}
        </p>

        {/* Error Details */}
        {status === 'error' && error && (
          <div className={`mb-6 p-4 rounded-xl text-left transition-colors duration-300 ${
            isDarkMode ? 'bg-red-900/20 border border-red-700/30' : 'bg-red-50 border border-red-200'
          }`}>
            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-red-300' : 'text-red-800'
            }`}>
              Error details:
            </h4>
            <p className={`text-sm mb-3 transition-colors duration-300 ${
              isDarkMode ? 'text-red-200' : 'text-red-700'
            }`}>
              {error}
            </p>
            
            {/* Debug Information */}
            {debugInfo && (
              <div className={`mt-3 p-3 rounded-lg transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
              }`}>
                <h5 className={`text-xs font-semibold mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Debug Information:
                </h5>
                <div className={`text-xs space-y-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <div>Error Code: {debugInfo.code}</div>
                  {debugInfo.action && <div>Suggested Action: {debugInfo.action}</div>}
                  {debugInfo.retryable !== undefined && (
                    <div>Retryable: {debugInfo.retryable ? 'Yes' : 'No'}</div>
                  )}
                  {retryCount > 0 && <div>Retry Attempts: {retryCount}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 justify-center">
          {status === 'error' && debugInfo?.retryable && retryCount < 3 && (
            <button
              onClick={handleRetry}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              Retry ({3 - retryCount} left)
            </button>
          )}
          
          <button
            onClick={handleManualRedirect}
            className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            Return to App
          </button>
        </div>

        {/* Progress Indicator */}
        {status === 'processing' && (
          <div className={`mt-6 w-full h-2 rounded-full overflow-hidden transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div className="w-full h-full bg-gradient-to-r from-green-500 to-blue-500 animate-pulse"></div>
          </div>
        )}

        {/* Auto-redirect countdown */}
        {status !== 'processing' && (
          <div className={`mt-4 text-xs transition-colors duration-300 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Redirecting automatically in a few seconds...
          </div>
        )}
      </div>
    </div>
  );
};