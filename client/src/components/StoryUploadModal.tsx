import React, { useState, useRef } from 'react';
import { X, Camera, Image, Video, AlertCircle, CheckCircle, Clock } from 'lucide-react';


interface StoryUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  isDarkMode: boolean;
}

export const StoryUploadModal: React.FC<StoryUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isDarkMode
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetStates = () => {
    setUploadError(null);
    setUploadSuccess(null);
    setUploadProgress(null);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetStates();

    // Comprehensive file validation and logging
    const fileSizeKB = (file.size / 1024).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    console.log(`📤 === STORY FILE SELECTION ===`);
    console.log(`📁 Name: ${file.name}`);
    console.log(`📊 Size: ${file.size} bytes`);
    console.log(`📊 Size: ${fileSizeKB} KB`);
    console.log(`📊 Size: ${fileSizeMB} MB`);
    console.log(`📁 Type: ${file.type}`);
    console.log(`📅 Last Modified: ${new Date(file.lastModified).toISOString()}`);

    // Validate file type with detailed feedback
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      const errorMsg = `Ungültiger Dateityp: ${file.type}`;
      console.error(`❌ ${errorMsg}`);
      setUploadError(`${errorMsg}\n\nErlaubte Formate:\n• Bilder: JPG, PNG, GIF, WebP\n• Videos: MP4, WebM, MOV, AVI`);
      return;
    }

    // Validate file size with detailed feedback
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      const errorMsg = `Datei zu groß: ${fileSizeMB}MB (max. 100MB)`;
      console.error(`❌ ${errorMsg}`);
      setUploadError(`${errorMsg}\n\n💡 Tipps zur Verkleinerung:\n• Komprimiere das Bild/Video\n• Wähle eine niedrigere Auflösung\n• Verwende ein anderes Format`);
      return;
    }

    // Show warning for large files (>20MB)
    if (file.size > 20 * 1024 * 1024) {
      const proceed = window.confirm(
        `📁 Große Datei erkannt (${fileSizeMB}MB)\n\n⏳ Upload kann länger dauern.\n📶 Stelle sicher, dass deine Internetverbindung stabil ist.\n\n✅ Trotzdem hochladen?`
      );
      if (!proceed) {
        console.log(`⏹️ User canceled large file upload`);
        return;
      }
    }

    // Start upload process
    setIsUploading(true);
    setUploadProgress('📤 Bereite Upload vor...');
    console.log(`🚀 Starting story upload process...`);
    
    try {
      setUploadProgress('☁️ Lade zu Firebase hoch...');
      await onUpload(file);
      
      console.log(`✅ Story upload completed successfully!`);
      setUploadSuccess('Story erfolgreich hochgeladen! 🎉');
      setUploadProgress('✅ Upload abgeschlossen!');
      
      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error: any) {
      console.error('❌ Story upload error:', error);
      
      let errorMessage = 'Unbekannter Fehler beim Hochladen der Story.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      // Enhanced error categorization
      if (errorMessage.includes('storage/unauthorized') || errorMessage.includes('permission')) {
        setUploadError('🔒 Keine Berechtigung zum Hochladen\n\n💡 Lösungen:\n• Lade die Seite neu (Strg+F5)\n• Prüfe deine Internetverbindung\n• Versuche es in wenigen Minuten erneut');
      } else if (errorMessage.includes('storage/quota-exceeded') || errorMessage.includes('Speicherplatz')) {
        setUploadError('💾 Speicherplatz voll\n\n📞 Bitte kontaktiere Kristin oder Maurizio\n\n💡 Der Server-Speicher ist ausgeschöpft');
      } else if (errorMessage.includes('storage/canceled') || errorMessage.includes('abgebrochen')) {
        setUploadError('⏹️ Upload wurde abgebrochen\n\n🔄 Versuche es erneut\n\n💡 Stelle sicher, dass deine Internetverbindung stabil ist');
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Netzwerk')) {
        setUploadError('📶 Netzwerkfehler\n\n💡 Lösungen:\n• Prüfe deine Internetverbindung\n• Versuche es in wenigen Sekunden erneut\n• Wechsle zu einem anderen Netzwerk');
      } else if (errorMessage.includes('Firebase') || errorMessage.includes('Server')) {
        setUploadError('☁️ Server-Fehler\n\n⏳ Versuche es in wenigen Sekunden erneut\n\n💡 Der Firebase-Server ist möglicherweise überlastet');
      } else if (errorMessage.includes('zu groß') || errorMessage.includes('size')) {
        setUploadError(`📁 ${errorMessage}\n\n💡 Tipps:\n• Komprimiere die Datei\n• Verwende eine niedrigere Auflösung\n• Teile große Videos in kleinere Teile`);
      } else {
        setUploadError(`❌ ${errorMessage}\n\n🔧 Allgemeine Lösungen:\n• Lade die Seite neu\n• Versuche einen anderen Browser\n• Prüfe deine Internetverbindung`);
      }
      
      setUploadProgress(null);
      
    } finally {
      setIsUploading(false);
    }
  };



  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className={`rounded-2xl p-6 max-w-sm w-full transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="flex items-center justify-between mb-6">
            <h3 className={`text-lg font-semibold transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ⚡ Story hinzufügen
            </h3>
            <button
              onClick={onClose}
              disabled={isUploading}
              className={`p-2 rounded-full transition-colors duration-300 ${
                isUploading
                  ? 'cursor-not-allowed opacity-50'
                  : isDarkMode 
                    ? 'hover:bg-gray-700 text-gray-400' 
                    : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Info Box */}
          <div className={`mb-6 p-4 rounded-xl transition-colors duration-300 ${
            isDarkMode ? 'bg-blue-900/20 border border-blue-700/30' : 'bg-blue-50 border border-blue-200'
          }`}>
            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-blue-300' : 'text-blue-800'
            }`}>
              ⚡ Stories verschwinden nach 24h
            </h4>
            <p className={`text-sm mb-3 transition-colors duration-300 ${
              isDarkMode ? 'text-blue-200' : 'text-blue-700'
            }`}>
              Perfekt für spontane Momente während der Hochzeit!
            </p>
            <div className={`text-xs space-y-1 transition-colors duration-300 ${
              isDarkMode ? 'text-blue-300' : 'text-blue-600'
            }`}>
              <div className="flex items-center gap-2">
                <span>📁</span>
                <span>Max. Dateigröße: 100MB</span>
              </div>
              <div className="flex items-center gap-2">
                <span>🎥</span>
                <span>Live-Aufnahme: max. 10 Sekunden</span>
              </div>
              <div className="flex items-center gap-2">
                <span>📱</span>
                <span>Unterstützt: JPG, PNG, MP4, WebM</span>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {uploadSuccess && (
            <div className={`mb-4 p-3 rounded-xl border transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-green-900/20 border-green-700/30 text-green-300' 
                : 'bg-green-50 border-green-200 text-green-700'
            }`}>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <div className="text-sm font-semibold">{uploadSuccess}</div>
              </div>
            </div>
          )}

          {/* Progress Message */}
          {uploadProgress && (
            <div className={`mb-4 p-3 rounded-xl border transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-blue-900/20 border-blue-700/30 text-blue-300' 
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <div className="text-sm font-semibold">{uploadProgress}</div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {uploadError && (
            <div className={`mb-4 p-3 rounded-xl border transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-700/30 text-red-300' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <div className="font-semibold mb-1">Upload-Fehler:</div>
                  <div className="whitespace-pre-line">{uploadError}</div>
                </div>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={isUploading}
          />

          <div className="space-y-3">
            {/* Gallery Upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 ${
                isUploading
                  ? isDarkMode
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-blue-600' : 'bg-blue-500'
              }`}>
                <Image className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h4 className={`font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📸 Foto oder Video
                </h4>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Aus der Galerie auswählen (max. 100MB)
                </p>
              </div>
            </button>

            {/* Live Camera Recording */}
            <label
              className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-300 cursor-pointer ${
                isUploading
                  ? 'opacity-50 cursor-not-allowed'
                  : isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600' 
                    : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <input
                type="file"
                accept="video/*"
                capture="environment"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-red-600' : 'bg-red-500'
              }`}>
                <Video className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <h4 className={`font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎥 Live aufnehmen
                </h4>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Mit der Gerätekamera aufnehmen
                </p>
              </div>
            </label>
          </div>

          {/* Upload Status */}
          {isUploading && (
            <div className="mt-4 text-center">
              <div className="w-8 h-8 mx-auto border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Story wird hochgeladen...
              </p>
              <p className={`text-xs mt-1 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                Bei großen Dateien kann dies länger dauern
              </p>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isUploading}
            className={`w-full mt-4 py-3 px-4 rounded-xl transition-colors duration-300 ${
              isUploading
                ? 'cursor-not-allowed opacity-50'
                : ''
            } ${
              isDarkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
            }`}
          >
            {isUploading ? 'Upload läuft...' : 'Schließen'}
          </button>
        </div>
      </div>


    </>
  );
};