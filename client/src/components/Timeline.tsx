import React, { useState, useEffect, useRef } from 'react';
import { Heart, Calendar, MapPin, Camera, Plus, Edit3, Trash2, Save, X, Image, Video, Upload, Play } from 'lucide-react';
import { VideoThumbnail } from './VideoThumbnail';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../config/firebase';

interface TimelineEvent {
  id: string;
  title: string;
  customEventName?: string; // For custom event types
  date: string;
  description: string;
  location?: string;
  type: 'first_date' | 'first_kiss' | 'first_vacation' | 'engagement' | 'moving_together' | 'anniversary' | 'custom' | 'other';
  createdBy: string;
  createdAt: string;
  mediaUrls?: string[]; // Array of media URLs
  mediaTypes?: string[]; // Array of media types ('image' or 'video')
  mediaFileNames?: string[]; // For deletion from storage
}

interface TimelineProps {
  isDarkMode: boolean;
  userName: string;
  isAdmin: boolean;
}

const eventTypes = [
  { value: 'first_date', label: '💕 Erstes Date', icon: '💕', color: 'pink' },
  { value: 'first_kiss', label: '💋 Erster Kuss', icon: '💋', color: 'red' },
  { value: 'first_vacation', label: '✈️ Erster Urlaub', icon: '✈️', color: 'blue' },
  { value: 'moving_together', label: '🏠 Zusammengezogen', icon: '🏠', color: 'green' },
  { value: 'engagement', label: '💍 Verlobung', icon: '💍', color: 'yellow' },
  { value: 'anniversary', label: '🎉 Jahrestag', icon: '🎉', color: 'purple' },
  { value: 'custom', label: '✨ Eigenes Event', icon: '✨', color: 'indigo' },
  { value: 'other', label: '❤️ Sonstiges', icon: '❤️', color: 'gray' }
];

export const Timeline: React.FC<TimelineProps> = ({ isDarkMode, userName, isAdmin }) => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    customEventName: '',
    date: '',
    description: '',
    location: '',
    type: 'other' as TimelineEvent['type']
  });
  const [modalMedia, setModalMedia] = useState<{
    url: string;
    type: 'image' | 'video';
    title: string;
  } | null>(null);

  // Load timeline events with comprehensive error handling
  useEffect(() => {
    console.log('🔄 Loading timeline events...');
    
    let unsubscribe: (() => void) | null = null;
    
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Test Firebase connection first
        console.log('🔗 Testing Firebase connection...');
        
        // Create query with error handling
        const q = query(collection(db, 'timeline'), orderBy('date', 'asc'));
        
        unsubscribe = onSnapshot(q, 
          (snapshot) => {
            console.log(`📋 Timeline events loaded: ${snapshot.docs.length}`);
            
            const timelineEvents: TimelineEvent[] = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            } as TimelineEvent));
            
            setEvents(timelineEvents);
            setIsLoading(false);
            setError(null);
          },
          (error) => {
            console.error('❌ Timeline listener error:', error);
            setError(`Fehler beim Laden der Timeline: ${error.message}`);
            setIsLoading(false);
            
            // Fallback: Set empty events to prevent blank page
            setEvents([]);
          }
        );
        
      } catch (error: any) {
        console.error('❌ Timeline setup error:', error);
        setError(`Timeline konnte nicht geladen werden: ${error.message}`);
        setIsLoading(false);
        
        // Fallback: Set empty events to prevent blank page
        setEvents([]);
      }
    };
    
    loadEvents();
    
    return () => {
      if (unsubscribe) {
        console.log('🧹 Cleaning up timeline listener');
        unsubscribe();
      }
    };
  }, []);

  const resetForm = () => {
    setFormData({
      title: '',
      customEventName: '',
      date: '',
      description: '',
      location: '',
      type: 'other'
    });
    setSelectedFiles([]);
    setShowAddForm(false);
    setEditingEvent(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
      const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB limit
      
      if (!isValidType) {
        alert(`${file.name} ist kein gültiger Dateityp. Nur Bilder und Videos sind erlaubt.`);
        return false;
      }
      
      if (!isValidSize) {
        alert(`${file.name} ist zu groß. Maximale Dateigröße: 100MB.`);
        return false;
      }
      
      return true;
    });
    
    setSelectedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<{ urls: string[], types: string[], fileNames: string[] }> => {
    const urls: string[] = [];
    const types: string[] = [];
    const fileNames: string[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileName = `TIMELINE_${Date.now()}-${i}-${file.name}`;
      const storageRef = ref(storage, `uploads/${fileName}`);
      
      try {
        console.log(`📤 Uploading timeline file: ${fileName}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        
        urls.push(url);
        types.push(file.type.startsWith('video/') ? 'video' : 'image');
        fileNames.push(fileName);
        
        setUploadProgress(((i + 1) / files.length) * 100);
        console.log(`✅ Timeline file uploaded successfully: ${fileName}`);
      } catch (error) {
        console.error(`❌ Error uploading ${file.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        throw new Error(`Fehler beim Hochladen von ${file.name}: ${errorMessage}`);
      }
    }
    
    return { urls, types, fileNames };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.date) {
      setError('Bitte fülle mindestens Titel und Datum aus.');
      return;
    }

    if (formData.type === 'custom' && !formData.customEventName.trim()) {
      setError('Bitte gib einen Namen für dein eigenes Event ein.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      console.log('💾 === SAVING TIMELINE EVENT ===');
      console.log('Event data:', formData);
      console.log('Selected files:', selectedFiles.length);
      
      let mediaData = {};
      
      // Upload new files if any
      if (selectedFiles.length > 0) {
        console.log('📤 Uploading timeline media files...');
        const { urls, types, fileNames } = await uploadFiles(selectedFiles);
        mediaData = {
          mediaUrls: urls,
          mediaTypes: types,
          mediaFileNames: fileNames
        };
        console.log('✅ Media files uploaded successfully');
      }

      const eventData = {
        title: formData.title.trim(),
        ...(formData.type === 'custom' && { customEventName: formData.customEventName.trim() }),
        date: formData.date,
        description: formData.description.trim(),
        location: formData.location.trim(),
        type: formData.type,
        ...mediaData
      };

      if (editingEvent) {
        // Update existing event
        console.log('📝 Updating existing timeline event...');
        await updateDoc(doc(db, 'timeline', editingEvent.id), eventData);
        console.log('✅ Timeline event updated successfully');
      } else {
        // Add new event
        console.log('➕ Adding new timeline event...');
        await addDoc(collection(db, 'timeline'), {
          ...eventData,
          createdBy: userName,
          createdAt: new Date().toISOString()
        });
        console.log('✅ Timeline event added successfully');
      }
      
      resetForm();
    } catch (error: any) {
      console.error('❌ Error saving timeline event:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Fehler beim Speichern des Events. Bitte versuche es erneut.';
      
      if (error.message?.includes('storage/unauthorized') || error.message?.includes('permission')) {
        errorMessage = 'Keine Berechtigung zum Hochladen. Lade die Seite neu und versuche es erneut.';
      } else if (error.message?.includes('storage/quota-exceeded')) {
        errorMessage = 'Speicherplatz voll. Bitte kontaktiere Kristin oder Maurizio.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Netzwerkfehler. Prüfe deine Internetverbindung und versuche es erneut.';
      } else if (error.message) {
        errorMessage = `Fehler: ${error.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (event: TimelineEvent) => {
    setFormData({
      title: event.title,
      customEventName: event.customEventName || '',
      date: event.date,
      description: event.description,
      location: event.location || '',
      type: event.type
    });
    setEditingEvent(event);
    setShowAddForm(true);
    setError(null);
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (!window.confirm(`Event "${event.title}" wirklich löschen?`)) {
      return;
    }

    try {
      console.log('🗑️ === DELETING TIMELINE EVENT ===');
      console.log('Event:', event.title);
      console.log('Media files:', event.mediaFileNames?.length || 0);
      
      // Delete media files from storage
      if (event.mediaFileNames && event.mediaFileNames.length > 0) {
        console.log('🗑️ Deleting media files from storage...');
        const deletePromises = event.mediaFileNames.map(fileName => {
          const storageRef = ref(storage, `uploads/${fileName}`);
          return deleteObject(storageRef).catch(error => {
            console.warn(`⚠️ Could not delete file ${fileName}:`, error);
          });
        });
        await Promise.all(deletePromises);
        console.log('✅ Media files deleted from storage');
      }

      // Delete event from Firestore
      console.log('🗑️ Deleting event from Firestore...');
      await deleteDoc(doc(db, 'timeline', event.id));
      console.log('✅ Timeline event deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting timeline event:', error);
      setError(`Fehler beim Löschen des Events: ${error.message}`);
    }
  };

  const getEventTypeInfo = (type: string, customEventName?: string) => {
    if (type === 'custom' && customEventName) {
      return {
        value: 'custom',
        label: `✨ ${customEventName}`,
        icon: '✨',
        color: 'indigo'
      };
    }
    return eventTypes.find(t => t.value === type) || eventTypes[eventTypes.length - 1];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show error state instead of blank page
  if (error && !showAddForm) {
    return (
      <div className={`transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-pink-600' : 'bg-pink-500'
              }`}>
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💕 Unsere Geschichte
                </h2>
                <p className={`text-sm transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Die wichtigsten Momente unserer Beziehung mit Fotos & Videos
                </p>
              </div>
            </div>
            
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white' 
                    : 'bg-pink-500 hover:bg-pink-600 text-white'
                }`}
              >
                <Plus className="w-5 h-5" />
                Event hinzufügen
              </button>
            )}
          </div>
        </div>
        
        {/* Error Display */}
        <div className="p-6">
          <div className={`p-6 rounded-xl border text-center transition-colors duration-300 ${
            isDarkMode ? 'bg-red-900/20 border-red-700/30' : 'bg-red-50 border-red-200'
          }`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center">
              <Heart className={`w-6 h-6 transition-colors duration-300 ${
                isDarkMode ? 'text-red-400' : 'text-red-500'
              }`} />
            </div>
            <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-red-300' : 'text-red-700'
            }`}>
              Fehler beim Laden der Timeline
            </h3>
            <p className={`mb-6 transition-colors duration-300 ${
              isDarkMode ? 'text-red-200' : 'text-red-600'
            }`}>
              {error}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Seite neu laden
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className={`px-4 py-2 rounded-lg transition-colors duration-300 ${
                    isDarkMode ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'bg-pink-500 hover:bg-pink-600 text-white'
                  }`}
                >
                  Event hinzufügen
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-6 transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-500 ${
      isDarkMode 
        ? 'bg-gradient-to-br from-gray-900 via-purple-900/10 to-pink-900/10' 
        : 'bg-gradient-to-br from-gray-50 via-pink-50/30 to-purple-50/20'
    }`}>
      {/* Modal für Medienanzeige */}
      {modalMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setModalMedia(null)}
        >
          <div
            className={`relative max-w-3xl w-full max-h-[90vh] rounded-3xl backdrop-blur-xl border flex flex-col items-center justify-center p-6 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gray-900/90 border-gray-700/30 shadow-2xl shadow-purple-500/10' 
                : 'bg-white/90 border-gray-200/30 shadow-2xl shadow-pink-500/10'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <button
              className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-white/10 hover:bg-white/20 text-white' 
                  : 'bg-white/80 hover:bg-white/90 text-gray-700'
              }`}
              onClick={() => setModalMedia(null)}
              aria-label="Schließen"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full flex flex-col items-center justify-center">
             {modalMedia.type === 'image' ? (
  <img
    src={modalMedia.url}
    alt={modalMedia.title}
    className="max-h-[70vh] max-w-full rounded-lg object-contain border border-gray-200"
  />
) : (
  <video
    src={modalMedia.url}
    controls
    autoPlay
    className="max-h-[70vh] max-w-full rounded-lg object-contain border border-gray-200"
  />
)}
              <div className={`mt-3 text-center text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {modalMedia.title}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className={`mx-4 sm:mx-6 mt-4 sm:mt-6 mb-6 p-4 sm:p-6 backdrop-blur-xl border transition-all duration-300 rounded-2xl sm:rounded-3xl ${
        isDarkMode 
          ? 'bg-white/5 border-white/10 shadow-xl shadow-black/20' 
          : 'bg-white/70 border-white/40 shadow-xl shadow-pink-100/50'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg shadow-pink-500/25' 
                : 'bg-gradient-to-br from-pink-400 to-purple-500 shadow-lg shadow-pink-400/25'
            }`}>
              <Heart className="w-6 h-6 sm:w-7 sm:h-7 text-white animate-pulse" style={{
                animation: 'heartbeat 3s ease-in-out infinite'
              }} />
            </div>
            <div>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl font-bold mb-1 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                💕 Unsere Geschichte
              </h2>
              <p className={`text-sm sm:text-base transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                <span className="hidden sm:inline">Die wichtigsten Momente unserer Beziehung</span>
                <span className="sm:hidden">Die wichtigsten Momente</span>
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowAddForm(true)}
              className={`flex items-center justify-center sm:justify-start gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-pink-500/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-600 text-white border border-white/20 shadow-lg shadow-pink-500/25' 
                  : 'bg-gradient-to-r from-pink-400/80 to-purple-500/80 hover:from-pink-400 hover:to-purple-500 text-white border border-white/30 shadow-lg shadow-pink-400/25'
              }`}
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-sm sm:text-base">Event hinzufügen</span>
            </button>
          )}
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-40">
          <div className={`rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto backdrop-blur-xl border transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gray-900/90 border-gray-700/30 shadow-2xl shadow-purple-500/10' 
              : 'bg-white/90 border-gray-200/30 shadow-2xl shadow-pink-500/10'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {editingEvent ? 'Event bearbeiten' : 'Neues Event hinzufügen'}
              </h3>
              <button
                onClick={resetForm}
                disabled={isUploading}
                className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 ${
                  isUploading 
                    ? 'cursor-not-allowed opacity-50'
                    : isDarkMode 
                      ? 'hover:bg-white/10 text-gray-400 hover:text-white' 
                      : 'hover:bg-gray-100/80 text-gray-600 hover:text-gray-900'
                }`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className={`mb-4 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50/80 border-red-200/60 text-red-700'
              }`}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Event Type */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Event-Typ
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TimelineEvent['type'] })}
                  disabled={isUploading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/20 text-white' 
                      : 'bg-white/60 border-gray-200/40 text-gray-900'
                  }`}
                >
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Event Name */}
              {formData.type === 'custom' && (
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Event-Name *
                  </label>
                  <input
                    type="text"
                    value={formData.customEventName}
                    onChange={(e) => setFormData({ ...formData, customEventName: e.target.value })}
                    placeholder="z.B. Unser erster Hund, Hauseinweihung, ..."
                    disabled={isUploading}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                        : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                    }`}
                    required={formData.type === 'custom'}
                  />
                </div>
              )}

              {/* Title */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="z.B. Unser erstes Date"
                  disabled={isUploading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                      : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                  }`}
                  required
                />
              </div>

              {/* Date */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Datum *
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  disabled={isUploading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/20 text-white' 
                      : 'bg-white/60 border-gray-200/40 text-gray-900'
                  }`}
                  required
                />
              </div>

              {/* Location */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Ort
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="z.B. Restaurant Zur Sonne"
                  disabled={isUploading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none backdrop-blur-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                      : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Erzähle von diesem besonderen Moment..."
                  rows={3}
                  disabled={isUploading}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 outline-none resize-none backdrop-blur-sm transition-all duration-300 ${
                    isDarkMode 
                      ? 'bg-white/5 border-white/20 text-white placeholder-gray-400' 
                      : 'bg-white/60 border-gray-200/40 text-gray-900 placeholder-gray-500'
                  }`}
                />
              </div>

              {/* Media Upload */}
              <div>
                <label className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Fotos & Videos
                </label>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode
                        ? 'border-white/20 hover:border-white/30 hover:bg-white/5 text-gray-300'
                        : 'border-gray-300/60 hover:border-gray-400/60 hover:bg-white/30 text-gray-700'
                  }`}
                >
                  <Upload className="w-5 h-5" />
                  <span>Fotos & Videos hinzufügen</span>
                </button>
                
                <p className={`text-xs mt-1 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  Unterstützte Formate: JPG, PNG, GIF, MP4, WebM • Max. 100MB pro Datei
                </p>

                {/* Selected Files Preview */}
                {selectedFiles.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <h4 className={`text-sm font-medium transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Ausgewählte Dateien ({selectedFiles.length}):
                    </h4>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className={`flex items-center justify-between p-3 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                          isDarkMode ? 'bg-white/5 border-white/20' : 'bg-white/60 border-gray-200/40'
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            {file.type.startsWith('video/') ? (
                              <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            ) : (
                              <Image className="w-4 h-4 text-green-500 flex-shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={`text-sm truncate transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-300' : 'text-gray-700'
                              }`}>
                                {file.name}
                              </p>
                              <p className={`text-xs transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-500' : 'text-gray-500'
                              }`}>
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            disabled={isUploading}
                            className={`p-1 rounded transition-colors duration-300 ${
                              isUploading
                                ? 'cursor-not-allowed opacity-50'
                                : isDarkMode
                                  ? 'hover:bg-gray-600 text-red-400'
                                  : 'hover:bg-red-50 text-red-600'
                            }`}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className={`p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                  isDarkMode ? 'bg-white/5 border-white/20' : 'bg-white/60 border-gray-200/40'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className={`text-sm transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Event wird gespeichert...
                    </span>
                  </div>
                  {uploadProgress > 0 && (
                    <div className={`w-full h-2 rounded-full overflow-hidden backdrop-blur-sm transition-all duration-300 ${
                      isDarkMode ? 'bg-white/10' : 'bg-gray-300/60'
                    }`}>
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isUploading}
                  className={`flex-1 py-3 px-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50'
                      : isDarkMode 
                        ? 'bg-white/10 border-white/20 hover:bg-white/20 text-gray-200' 
                        : 'bg-white/60 border-gray-200/40 hover:bg-white/80 text-gray-700'
                  }`}
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50 bg-gray-400'
                      : 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-lg shadow-pink-500/25'
                  } text-white border border-white/20`}
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {editingEvent ? 'Speichern' : 'Hinzufügen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="px-4 sm:px-6 py-4 sm:py-6">
        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-white/5 border-white/20 shadow-xl shadow-purple-500/10' 
                : 'bg-white/60 border-gray-200/40 shadow-xl shadow-pink-500/10'
            }`}>
              <Heart className={`w-8 h-8 transition-colors duration-300 ${
                isDarkMode ? 'text-pink-400' : 'text-pink-500'
              }`} />
            </div>
            <h3 className={`text-2xl font-bold mb-3 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Noch keine Events
            </h3>
            <p className={`text-base mb-6 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>
              {isAdmin ? 'Füge das erste Event eurer Liebesgeschichte hinzu!' : 'Die Timeline wird bald mit besonderen Momenten gefüllt.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddForm(true)}
                className={`px-8 py-4 rounded-2xl backdrop-blur-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gradient-to-r from-pink-500/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-600 text-white border border-white/20 shadow-lg shadow-pink-500/25' 
                    : 'bg-gradient-to-r from-pink-400/80 to-purple-500/80 hover:from-pink-400 hover:to-purple-500 text-white border border-white/30 shadow-lg shadow-pink-400/25'
                }`}
              >
                Erstes Event hinzufügen
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Timeline Line */}
            <div className={`absolute left-6 sm:left-8 lg:left-10 top-0 bottom-0 w-0.5 sm:w-1 transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-b from-pink-500/30 via-purple-500/30 to-pink-500/30' 
                : 'bg-gradient-to-b from-pink-400/40 via-purple-400/40 to-pink-400/40'
            }`}></div>

            {/* Timeline Events */}
            <div className="space-y-8 sm:space-y-12">
              {events.map((event, index) => {
                const eventType = getEventTypeInfo(event.type, event.customEventName);
                const canEdit = isAdmin || event.createdBy === userName;

                return (
                  <div key={event.id} className="relative flex items-start gap-4 sm:gap-6 lg:gap-8">
                    {/* Timeline Dot */}
                    <div className={`relative z-10 w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-xl border-2 flex-shrink-0 ${
                      eventType.color === 'pink' ? 'bg-gradient-to-br from-pink-400 to-pink-600 border-pink-200/30 shadow-lg shadow-pink-500/25' :
                      eventType.color === 'red' ? 'bg-gradient-to-br from-red-400 to-red-600 border-red-200/30 shadow-lg shadow-red-500/25' :
                      eventType.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-blue-600 border-blue-200/30 shadow-lg shadow-blue-500/25' :
                      eventType.color === 'green' ? 'bg-gradient-to-br from-green-400 to-green-600 border-green-200/30 shadow-lg shadow-green-500/25' :
                      eventType.color === 'yellow' ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-200/30 shadow-lg shadow-yellow-500/25' :
                      eventType.color === 'purple' ? 'bg-gradient-to-br from-purple-400 to-purple-600 border-purple-200/30 shadow-lg shadow-purple-500/25' :
                      eventType.color === 'indigo' ? 'bg-gradient-to-br from-indigo-400 to-indigo-600 border-indigo-200/30 shadow-lg shadow-indigo-500/25' :
                      isDarkMode ? 'bg-gradient-to-br from-gray-600 to-gray-800 border-gray-400/30 shadow-lg shadow-gray-500/25' : 'bg-gradient-to-br from-gray-400 to-gray-600 border-gray-300/30 shadow-lg shadow-gray-400/25'
                    }`}>
                      <span className="text-lg sm:text-2xl lg:text-3xl leading-none w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center">
                        {eventType.icon}
                      </span>
                    </div>

                    {/* Event Content */}
                    <div className={`flex-1 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-3xl backdrop-blur-xl transition-all duration-300 border min-w-0 ${
                      isDarkMode 
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 shadow-xl shadow-black/20' 
                        : 'bg-white/70 border-white/40 hover:bg-white/90 shadow-xl shadow-pink-100/50'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-4 gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-lg sm:text-xl lg:text-2xl font-bold mb-2 transition-colors duration-300 ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {event.title}
                          </h3>
                          <div className="flex flex-col gap-2 text-sm sm:text-base">
                            <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm transition-colors duration-300 w-fit ${
                              isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-white/60 text-gray-700'
                            }`}>
                              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                              <span className="font-medium whitespace-nowrap">{formatDate(event.date)}</span>
                            </div>
                            {event.location && (
                              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full backdrop-blur-sm transition-colors duration-300 w-fit ${
                                isDarkMode ? 'bg-white/10 text-gray-300' : 'bg-white/60 text-gray-700'
                              }`}>
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                                <span className="font-medium break-words">{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleEdit(event)}
                              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                                isDarkMode 
                                  ? 'bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white' 
                                  : 'bg-white/60 hover:bg-white/90 text-gray-600 hover:text-gray-900'
                              }`}
                              title="Event bearbeiten"
                            >
                              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(event)}
                              className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                                isDarkMode 
                                  ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300' 
                                  : 'bg-red-50/80 hover:bg-red-100 text-red-600 hover:text-red-700'
                              }`}
                              title="Event löschen"
                            >
                              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {event.description && (
                        <p className={`text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 transition-colors duration-300 ${
                          isDarkMode ? 'text-gray-200' : 'text-gray-700'
                        }`}>
                          {event.description}
                        </p>
                      )}

                      {/* Media Gallery */}
                      {event.mediaUrls && event.mediaUrls.length > 0 && (
                        <div className="mb-4 sm:mb-6">
                          <div className={`grid gap-2 sm:gap-3 ${
                            event.mediaUrls.length === 1 ? 'grid-cols-1' :
                            event.mediaUrls.length === 2 ? 'grid-cols-2' :
                            'grid-cols-2 sm:grid-cols-3'
                          }`}>
                            {event.mediaUrls.map((url, mediaIndex) => {
                              const mediaType = (event.mediaTypes?.[mediaIndex] || 'image') as 'image' | 'video';
                              
                              return (
                                <div 
                                  key={mediaIndex} 
                                  className="relative aspect-square rounded-xl sm:rounded-2xl overflow-hidden group backdrop-blur-sm border border-white/20 cursor-pointer"
                                  onClick={() => setModalMedia({ url, type: mediaType as 'image' | 'video', title: event.title })}
                                >
                                  {mediaType === 'video' ? (
                                    <VideoThumbnail
                                      src={url}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                      showPlayButton={false}
                                    />
                                  ) : (
                                    <img
                                      src={url}
                                      alt={`${event.title} - Bild ${mediaIndex + 1}`}
                                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                    />
                                  )}
                                  
                                  {/* Video Play Button - Always visible for videos */}
                                  {mediaType === 'video' && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 sm:p-4 transition-all duration-300 group-hover:scale-110 group-hover:bg-black/80">
                                        <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white fill-white" />
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Media type indicator */}
                                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                                    <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 sm:p-2">
                                      {mediaType === 'video' ? (
                                        <Video className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                      ) : (
                                        <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          
                          {event.mediaUrls.length > 3 && (
                            <p className={`text-xs mt-2 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-500' : 'text-gray-500'
                            }`}>
                              {event.mediaUrls.length} Medien • Klicke zum Vergrößern
                            </p>
                          )}
                        </div>
                      )}

                      {/* Event metadata */}
                      <div className={`pt-3 border-t flex items-center justify-between text-xs transition-colors duration-300 ${
                        isDarkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-500'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span>{eventType.label}</span>
                          {event.mediaUrls && event.mediaUrls.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Camera className="w-4 h-4" />
                              {event.mediaUrls.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
