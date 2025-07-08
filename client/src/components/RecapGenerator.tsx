import React, { useState, useEffect } from 'react';
import { X, Video, Download, Play, Pause, Settings, RefreshCw } from 'lucide-react';
import { ShotstackService } from '../services/shotstackService';
import { MediaItem } from '../types';

interface RecapGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  mediaItems: MediaItem[];
  isDarkMode: boolean;
}

interface RecapSettings {
  title: string;
  duration: number;
  resolution: 'preview' | 'mobile' | 'sd' | 'hd' | 'fhd';
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:5';
  includeVideos: boolean;
  includeImages: boolean;
}

export const RecapGenerator: React.FC<RecapGeneratorProps> = ({
  isOpen,
  onClose,
  mediaItems,
  isDarkMode
}) => {
  const [apiKey, setApiKey] = useState('');
  const [settings, setSettings] = useState<RecapSettings>({
    title: 'Unsere Hochzeit',
    duration: 30,
    resolution: 'hd',
    aspectRatio: '16:9',
    includeVideos: true,
    includeImages: true
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [renderId, setRenderId] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);

  // Filter media items based on settings
  const filteredMedia = mediaItems.filter(item => {
    if (item.type === 'video' && settings.includeVideos) return true;
    if (item.type === 'image' && settings.includeImages) return true;
    return false;
  });

  const handleGenerateRecap = async () => {
    if (!apiKey.trim()) {
      setError('Bitte gib deinen Shotstack API-Schlüssel ein');
      return;
    }

    if (filteredMedia.length === 0) {
      setError('Keine Mediendateien für das Recap verfügbar');
      return;
    }

    try {
      setIsGenerating(true);
      setProgress(0);
      setStatus('Bereite Recap-Erstellung vor...');
      setError('');
      setVideoUrl('');

      // Initialize Shotstack service
      const shotstack = new ShotstackService(apiKey, 'stage');

      // Convert media items to Shotstack format
      const mediaFiles = await shotstack.getMediaFilesFromFirebase(filteredMedia);

      setStatus('Sende Anfrage an Shotstack...');
      setProgress(10);

      // Create recap video
      const result = await shotstack.createRecapVideo(mediaFiles, {
        title: settings.title,
        totalDuration: settings.duration,
        resolution: settings.resolution,
        aspectRatio: settings.aspectRatio
      });

      if (!result.success) {
        setError(result.error || 'Fehler beim Erstellen des Recaps');
        return;
      }

      setRenderId(result.renderId || '');
      setStatus('Recap wird erstellt...');
      setProgress(20);

      // Wait for render completion
      const videoUrl = await shotstack.waitForRender(result.renderId!, (progress) => {
        setProgress(20 + (progress * 0.8)); // Scale progress to 20-100%
        setStatus(`Erstelle Recap... ${Math.round(progress)}%`);
      });

      setVideoUrl(videoUrl || '');
      setStatus('Recap erfolgreich erstellt!');
      setProgress(100);

    } catch (error: any) {
      console.error('❌ Recap generation failed:', error);
      setError(error.message || 'Fehler beim Erstellen des Recaps');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (videoUrl) {
      const link = document.createElement('a');
      link.href = videoUrl;
      link.download = `${settings.title.replace(/\s+/g, '_')}_recap.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const resetForm = () => {
    setProgress(0);
    setStatus('');
    setRenderId('');
    setVideoUrl('');
    setError('');
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-gray-900 border-gray-700' 
          : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
              <Video className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Hochzeits-Recap erstellen
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Automatisches Video aus deinen Fotos und Videos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${
              isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* API Key Input */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Shotstack API-Schlüssel
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Dein Shotstack API-Schlüssel"
              className={`w-full p-3 rounded-xl border transition-colors ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              Hol dir einen kostenlosen API-Schlüssel von{' '}
              <a href="https://shotstack.io" target="_blank" rel="noopener noreferrer" className="text-purple-500 hover:underline">
                shotstack.io
              </a>
            </p>
          </div>

          {/* Media Count */}
          <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Verfügbare Medien
              </span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-2 flex items-center gap-4">
              <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {filteredMedia.length} Dateien ausgewählt
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredMedia.filter(item => item.type === 'image').length} Bilder
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
              }`}>
                {filteredMedia.filter(item => item.type === 'video').length} Videos
              </span>
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-lg font-medium mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Recap-Einstellungen
              </h3>
              
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Titel
                  </label>
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => setSettings({...settings, title: e.target.value})}
                    className={`w-full p-3 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Dauer: {settings.duration} Sekunden
                  </label>
                  <input
                    type="range"
                    min="15"
                    max="120"
                    value={settings.duration}
                    onChange={(e) => setSettings({...settings, duration: parseInt(e.target.value)})}
                    className="w-full"
                  />
                </div>

                {/* Resolution */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Auflösung
                  </label>
                  <select
                    value={settings.resolution}
                    onChange={(e) => setSettings({...settings, resolution: e.target.value as any})}
                    className={`w-full p-3 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="preview">Vorschau (360p)</option>
                    <option value="mobile">Mobile (540p)</option>
                    <option value="sd">SD (720p)</option>
                    <option value="hd">HD (1080p)</option>
                    <option value="fhd">Full HD (1440p)</option>
                  </select>
                </div>

                {/* Aspect Ratio */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Seitenverhältnis
                  </label>
                  <select
                    value={settings.aspectRatio}
                    onChange={(e) => setSettings({...settings, aspectRatio: e.target.value as any})}
                    className={`w-full p-3 rounded-xl border transition-colors ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="16:9">16:9 (Breitbild)</option>
                    <option value="9:16">9:16 (Hochformat)</option>
                    <option value="1:1">1:1 (Quadrat)</option>
                    <option value="4:5">4:5 (Instagram)</option>
                  </select>
                </div>

                {/* Media Type Selection */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Medientypen
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.includeVideos}
                        onChange={(e) => setSettings({...settings, includeVideos: e.target.checked})}
                        className="rounded"
                      />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Videos
                      </span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.includeImages}
                        onChange={(e) => setSettings({...settings, includeImages: e.target.checked})}
                        className="rounded"
                      />
                      <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Bilder
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {isGenerating && (
            <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-500" />
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {status}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className={`text-xs mt-2 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                {progress}% abgeschlossen
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Video Result */}
          {videoUrl && (
            <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                  <Play className="w-4 h-4 text-white" />
                </div>
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Recap erfolgreich erstellt!
                </span>
              </div>
              
              <video
                controls
                className="w-full rounded-xl mb-3"
                poster=""
              >
                <source src={videoUrl} type="video/mp4" />
                Dein Browser unterstützt das Video-Tag nicht.
              </video>
              
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
                <button
                  onClick={resetForm}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" />
                  Neues Recap
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Schließen
          </button>
          
          <button
            onClick={isGenerating ? undefined : handleGenerateRecap}
            disabled={isGenerating || !apiKey.trim() || filteredMedia.length === 0}
            className={`px-6 py-2 rounded-xl font-medium transition-colors ${
              isGenerating || !apiKey.trim() || filteredMedia.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white'
            }`}
          >
            {isGenerating ? 'Wird erstellt...' : 'Recap erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
};