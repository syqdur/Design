import React, { useState, useEffect, useRef } from 'react';
import { Heart, Camera, Calendar, MapPin, ArrowLeft, Share2, Eye, Image, Video, MessageSquare, Music, VolumeX, Play, Pause, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { MediaItem } from '../types';
import { loadGallery } from '../services/firebaseService';
import { ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

interface PublicRecapPageProps {
  isDarkMode: boolean;
}

interface Moment {
  id: string;
  title: string;
  description: string;
  mediaItems: MediaItem[];
  category: 'ceremony' | 'reception' | 'party' | 'special' | 'custom';
  timestamp: string;
  location?: string;
  tags: string[];
}

export const PublicRecapPage: React.FC<PublicRecapPageProps> = ({ isDarkMode }) => {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [moments, setMoments] = useState<Moment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMoment, setSelectedMoment] = useState<Moment | null>(null);
  const [guestName, setGuestName] = useState<string>('');
  const [guestId, setGuestId] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAnimationPlaying, setIsAnimationPlaying] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioLoading, setAudioLoading] = useState(true);
  const [audioError, setAudioError] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const slideInterval = useRef<NodeJS.Timeout | null>(null);

  // Parse URL parameters to get guest name and ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('for');
    const id = urlParams.get('id');
    
    if (name) {
      setGuestName(decodeURIComponent(name));
    }
    if (id) {
      setGuestId(id);
    }
  }, []);

  // Load audio file using the same method as media items
  useEffect(() => {
    const loadAudio = async () => {
      setAudioLoading(true);
      setAudioError('');
      
      try {
        console.log('Loading audio file iris.mp3 using Firebase service...');
        
        // Use the same approach as the media loading in firebaseService
        const audioStorageRef = ref(storage, 'uploads/iris.mp3');
        const url = await getDownloadURL(audioStorageRef);
        setAudioUrl(url);
        setAudioLoading(false);
        console.log('Audio URL loaded successfully:', url);
      } catch (error) {
        console.error('Error loading audio from uploads/:', error);
        
        // Try alternative paths with better error handling
        const alternativePaths = ['iris.mp3', 'audio/iris.mp3', 'music/iris.mp3', 'sounds/iris.mp3'];
        
        for (const path of alternativePaths) {
          try {
            console.log(`Trying alternative path: ${path}`);
            const audioStorageRef = ref(storage, path);
            const url = await getDownloadURL(audioStorageRef);
            setAudioUrl(url);
            setAudioLoading(false);
            console.log(`Audio URL loaded from ${path}:`, url);
            return;
          } catch (fallbackError: any) {
            console.error(`Failed to load from ${path}:`, fallbackError?.code || fallbackError);
          }
        }
        
        // Try to find the file by checking media items (in case it was uploaded as a media file)
        try {
          console.log('Checking if iris.mp3 exists in media collection...');
          // This will be handled by the media loading effect
          setAudioError('Please ensure iris.mp3 is uploaded to Firebase Storage in the uploads folder');
          setAudioLoading(false);
        } catch (finalError) {
          setAudioError('Unable to load audio file. Please check Firebase Storage permissions and file location.');
          setAudioLoading(false);
          console.error('Final audio loading attempt failed:', finalError);
        }
      }
    };

    loadAudio();
  }, []);

  // Load media items
  useEffect(() => {
    const unsubscribe = loadGallery((items) => {
      // Filter out unavailable items for public view
      const availableItems = items.filter(item => !item.isUnavailable && item.url);
      setMediaItems(availableItems);
      
      // Create personalized moments based on guest
      const createPersonalizedMoments = (items: MediaItem[]): Moment[] => {
        const imageItems = items.filter(item => item.type === 'image');
        const videoItems = items.filter(item => item.type === 'video');
        const noteItems = items.filter(item => item.type === 'note');
        
        const moments: Moment[] = [
          {
            id: '1',
            title: '💒 Die Zeremonie',
            description: 'Der magische Moment unseres Ja-Worts - die schönsten Bilder von der Trauung.',
            mediaItems: imageItems.slice(0, 12),
            category: 'ceremony' as const,
            timestamp: '2025-07-12T14:00:00Z',
            location: 'Kirche',
            tags: ['Zeremonie', 'Ja-Wort', 'Kirche', 'Emotionen']
          },
          {
            id: '2',
            title: '🎉 Die Feier',
            description: 'Ausgelassene Stimmung und unvergessliche Momente mit Familie und Freunden.',
            mediaItems: [...videoItems, ...imageItems.slice(12, 20)],
            category: 'reception' as const,
            timestamp: '2025-07-12T18:00:00Z',
            location: 'Festsaal',
            tags: ['Feier', 'Tanz', 'Familie', 'Freunde']
          },
          {
            id: '3',
            title: '💌 Eure Nachrichten',
            description: 'Die wunderschönen Nachrichten und Wünsche von unseren Gästen.',
            mediaItems: noteItems,
            category: 'special' as const,
            timestamp: '2025-07-12T20:00:00Z',
            tags: ['Nachrichten', 'Wünsche', 'Liebe']
          },
          {
            id: '4',
            title: '📸 Alle Erinnerungen',
            description: `Eine Sammlung aller wunderschönen Momente von unserem besonderen Tag${guestName ? ` - speziell für ${guestName}` : ''}.`,
            mediaItems: items.slice(0, 30),
            category: 'custom' as const,
            timestamp: '2025-07-12T22:00:00Z',
            tags: ['Alle', 'Sammlung', 'Erinnerungen']
          }
        ];
        
        return moments.filter(moment => moment.mediaItems.length > 0);
      };

      setMoments(createPersonalizedMoments(availableItems));
      setIsLoading(false);
    });

    return unsubscribe;
  }, [guestName]);

  // Handle slideshow for animation
  useEffect(() => {
    if (isAnimationPlaying && autoPlay) {
      // Start music if audio URL is loaded
      if (audioRef.current && !isMuted && audioUrl) {
        audioRef.current.play().catch(err => console.log("Audio autoplay blocked:", err));
      }
      
      // Start slideshow with smooth transitions
      slideInterval.current = setInterval(() => {
        setIsTransitioning(true);
        setSlideDirection('next');
        
        setTimeout(() => {
          setCurrentSlide(prev => {
            const allMediaItems = moments.flatMap(m => m.mediaItems.filter(item => item.url));
            return prev < allMediaItems.length - 1 ? prev + 1 : 0;
          });
          
          setTimeout(() => {
            setIsTransitioning(false);
          }, 50);
        }, 300);
      }, 5000); // Change slide every 5 seconds for smoother experience
    } else {
      // Clear interval when animation stops
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
        slideInterval.current = null;
      }
    }
    
    return () => {
      if (slideInterval.current) {
        clearInterval(slideInterval.current);
      }
    };
  }, [isAnimationPlaying, autoPlay, moments, isMuted, audioUrl]);

  // Toggle music
  const toggleMusic = () => {
    setIsMuted(!isMuted);
    if (audioRef.current && audioUrl) {
      if (isMuted) {
        audioRef.current.play().catch(err => console.log("Couldn't play audio:", err));
      } else {
        audioRef.current.pause();
      }
    }
  };

  // Start animated slideshow
  const startAnimation = () => {
    setIsAnimationPlaying(true);
    setShowWelcome(false);
    setCurrentSlide(0);
  };

  // Stop animated slideshow
  const stopAnimation = () => {
    setIsAnimationPlaying(false);
    setAutoPlay(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  // Toggle autoplay
  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'ceremony': return <Heart className="w-5 h-5" />;
      case 'reception': return <Camera className="w-5 h-5" />;
      case 'party': return <Video className="w-5 h-5" />;
      case 'special': return <MessageSquare className="w-5 h-5" />;
      default: return <Camera className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ceremony': return 'bg-pink-500';
      case 'reception': return 'bg-blue-500';
      case 'party': return 'bg-purple-500';
      case 'special': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Kristin & Maurizio - Hochzeits-Erinnerungen',
        text: `${guestName ? `${guestName}, s` : 'S'}chaut euch unsere wunderschönen Hochzeits-Erinnerungen an!`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link wurde in die Zwischenablage kopiert!');
    }
  };

  const nextSlide = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      const allMediaItems = moments.flatMap(m => m.mediaItems.filter(item => item.url));
      setCurrentSlide(prev => (prev < allMediaItems.length - 1 ? prev + 1 : 0));
      setIsTransitioning(false);
    }, 500);
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      const allMediaItems = moments.flatMap(m => m.mediaItems.filter(item => item.url));
      setCurrentSlide(prev => (prev > 0 ? prev - 1 : allMediaItems.length - 1));
      setIsTransitioning(false);
    }, 500);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center animate-fadeIn">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full overflow-hidden border-4 border-pink-300 animate-pulse-slow">
            <img 
              src="https://i.ibb.co/PvXjwss4/profil.jpg" 
              alt="Kristin & Maurizio"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
          <p className={`text-lg transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Lade eure Hochzeits-Erinnerungen...
          </p>
          <p className={`text-sm mt-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {guestName ? `Speziell für ${guestName} zusammengestellt` : 'Mit Liebe zusammengestellt'}
          </p>
        </div>
      </div>
    );
  }

  // Animated Slideshow View
  if (isAnimationPlaying) {
    const allMediaItems = moments.flatMap(m => m.mediaItems.filter(item => item.url));
    const currentMedia = allMediaItems[currentSlide];
    
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Background music */}
        {audioUrl && (
          <audio 
            ref={audioRef} 
            loop 
            muted={isMuted}
            preload="auto"
            src={audioUrl}
            onLoadStart={() => console.log('Audio loading started')}
            onCanPlay={() => console.log('Audio can play')}
            onError={(e) => console.error('Audio error:', e)}
          />
        )}
        
        {/* Enhanced Controls */}
        <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
          <button
            onClick={toggleAutoPlay}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all duration-300 border border-white/20 shadow-lg hover:scale-110"
            title={autoPlay ? "Automatik stoppen" : "Automatik starten"}
          >
            {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleMusic}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all duration-300 border border-white/20 shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            title={audioLoading ? "Musik wird geladen..." : audioError ? "Musik nicht verfügbar" : (isMuted ? "Musik einschalten" : "Musik ausschalten")}
            disabled={audioLoading || !!audioError}
          >
            {audioLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : audioError ? (
              <VolumeX className="w-5 h-5 opacity-50" />
            ) : isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Music className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={stopAnimation}
            className="p-3 rounded-full bg-red-500/60 backdrop-blur-md text-white hover:bg-red-500/80 transition-all duration-300 border border-white/20 shadow-lg hover:scale-110"
            title="Slideshow beenden"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        
        {/* Enhanced Navigation */}
        <button
          onClick={prevSlide}
          disabled={isTransitioning}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 p-4 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all duration-300 z-10 border border-white/20 shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Vorheriges Bild"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <button
          onClick={nextSlide}
          disabled={isTransitioning}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 p-4 rounded-full bg-black/40 backdrop-blur-md text-white hover:bg-black/60 transition-all duration-300 z-10 border border-white/20 shadow-lg hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          title="Nächstes Bild"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-black/30 z-10">
          <div 
            className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-700 ease-out"
            style={{ width: `${((currentSlide + 1) / allMediaItems.length) * 100}%` }}
          />
        </div>
        
        {/* Slide indicators */}
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
          {allMediaItems.map((_, index) => (
            <button
              key={index}
              onClick={() => {
                if (!isTransitioning) {
                  setIsTransitioning(true);
                  setTimeout(() => {
                    setCurrentSlide(index);
                    setIsTransitioning(false);
                  }, 500);
                }
              }}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide 
                  ? 'bg-white scale-125' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
        
        {/* Current Media with smooth fade transitions */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
          <div 
            className={`transition-opacity duration-1000 ease-in-out ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {currentMedia?.type === 'image' && currentMedia.url ? (
              <div className="relative">
                <img
                  src={currentMedia.url}
                  alt={currentMedia.name}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                  style={{ maxHeight: '85vh', maxWidth: '90vw' }}
                />
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 rounded-lg" />
              </div>
            ) : currentMedia?.type === 'video' && currentMedia.url ? (
              <div className="relative">
                <video
                  src={currentMedia.url}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                  autoPlay
                  muted
                  loop
                  style={{ maxHeight: '85vh', maxWidth: '90vw' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/20 rounded-lg" />
              </div>
            ) : currentMedia?.type === 'note' ? (
              <div className="max-w-2xl w-full p-8 bg-gradient-to-br from-pink-900/40 to-purple-900/40 backdrop-blur-xl rounded-3xl text-white mx-4 shadow-2xl border border-white/10">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-pink-400 to-purple-400 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-semibold mb-2 bg-gradient-to-r from-pink-300 to-purple-300 bg-clip-text text-transparent">
                    Nachricht von {currentMedia.uploadedBy}
                  </h3>
                  <div className="w-24 h-0.5 bg-gradient-to-r from-pink-300 to-purple-300 mx-auto"></div>
                </div>
                <p className="text-xl leading-relaxed text-center font-light mb-6 text-gray-100">
                  "{currentMedia.noteText}"
                </p>
                <div className="text-center">
                  <p className="text-sm opacity-75 text-gray-300">
                    {new Date(currentMedia.uploadedAt).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-white text-center">
                <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full flex items-center justify-center">
                  <Camera className="w-10 h-10 opacity-50" />
                </div>
                <p className="text-lg text-gray-300">Keine Medien verfügbar</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Caption with enhanced styling */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 max-w-4xl w-full px-4">
          <div className={`bg-black/60 backdrop-blur-xl rounded-2xl p-6 text-white text-center border border-white/10 shadow-2xl transition-opacity duration-1000 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}>
            <h3 className="text-3xl font-bold mb-3 bg-gradient-to-r from-pink-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              💕 Kristin & Maurizio
            </h3>
            <p className="text-lg mb-2 text-gray-200">12. Juli 2025</p>
            {guestName && (
              <p className="text-pink-300 mb-3 text-lg font-medium">Speziell für {guestName}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm opacity-80">
              <span>
                {currentMedia?.type === 'note' 
                  ? `Nachricht ${currentSlide + 1} von ${allMediaItems.filter(item => item.type === 'note').length}`
                  : `${currentMedia?.type === 'video' ? 'Video' : 'Bild'} ${currentSlide + 1} von ${allMediaItems.length}`}
              </span>
              {currentMedia && (
                <span className="text-gray-400">•</span>
              )}
              <span className="text-gray-300">
                {currentMedia?.uploadedBy && `von ${currentMedia.uploadedBy}`}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`border-b transition-colors duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-pink-300 animate-pulse-slow">
                <img 
                  src="https://i.ibb.co/PvXjwss4/profil.jpg" 
                  alt="Kristin & Maurizio"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h1 className={`text-3xl font-bold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💕 Kristin & Maurizio
                </h1>
                <p className={`text-lg transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  12. Juli 2025 • Unsere Hochzeits-Erinnerungen
                </p>
                {guestName && (
                  <p className={`text-sm transition-colors duration-300 ${
                    isDarkMode ? 'text-pink-400' : 'text-pink-600'
                  }`}>
                    Speziell für {guestName} ✨
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={startAnimation}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg' 
                    : 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg'
                }`}
              >
                <Play className="w-5 h-5" />
                Slideshow starten
              </button>
              <button
                onClick={handleShare}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                }`}
              >
                <Share2 className="w-4 h-4" />
                Teilen
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Message */}
        {showWelcome && (
          <div className={`text-center mb-12 p-8 rounded-2xl animate-slideUp transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-pink-900/30 to-purple-900/30 border border-pink-700/30' 
              : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200'
          }`}>
            <div className="mb-6">
              <h2 className={`text-4xl font-bold mb-4 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {guestName ? `Hallo ${guestName}! 👋` : 'Vielen Dank für eure Teilnahme! 💕'}
              </h2>
              <p className={`text-xl mb-6 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {guestName 
                  ? `Wir freuen uns, dass du unsere Hochzeits-Erinnerungen anschaust. Diese Sammlung wurde speziell für dich zusammengestellt mit den schönsten Momenten, die wir gemeinsam erlebt haben.`
                  : 'Hier sind die schönsten Momente unserer Hochzeit, die wir gemeinsam mit euch erlebt haben.'}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className={`px-6 py-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-pink-600 text-white' : 'bg-pink-100 text-pink-800'
              }`}>
                📸 {mediaItems.filter(item => item.type === 'image').length} Fotos
              </div>
              <div className={`px-6 py-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
              }`}>
                🎥 {mediaItems.filter(item => item.type === 'video').length} Videos
              </div>
              <div className={`px-6 py-3 rounded-full transition-colors duration-300 ${
                isDarkMode ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-800'
              }`}>
                💌 {mediaItems.filter(item => item.type === 'note').length} Nachrichten
              </div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={startAnimation}
                className={`flex items-center gap-3 px-8 py-4 rounded-xl mx-auto transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-pink-600 hover:bg-pink-700 text-white shadow-lg' 
                    : 'bg-pink-500 hover:bg-pink-600 text-white shadow-lg'
                }`}
              >
                <Play className="w-6 h-6" />
                <span className="text-lg font-semibold">Slideshow mit Musik starten</span>
              </button>
              
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-500' : 'text-gray-500'
              }`}>
                🎵 Mit romantischer Hintergrundmusik • ⏯️ Steuerbar • 📱 Optimiert für alle Geräte
              </p>
            </div>
          </div>
        )}

        {/* Moments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {moments.map((moment, index) => (
            <div
              key={moment.id}
              className={`rounded-2xl border transition-all duration-300 hover:scale-105 cursor-pointer animate-slideUp ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 shadow-xl' 
                  : 'bg-white border-gray-200 hover:bg-gray-50 shadow-lg hover:shadow-xl'
              }`}
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => setSelectedMoment(moment)}
            >
              {/* Moment Header */}
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-full text-white ${getCategoryColor(moment.category)}`}>
                    {getCategoryIcon(moment.category)}
                  </div>
                  <div>
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {moment.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className={`w-3 h-3 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {formatDate(moment.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>

                <p className={`text-sm mb-4 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {moment.description}
                </p>

                {/* Media Preview */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {moment.mediaItems.slice(0, 3).map((media, mediaIndex) => (
                    <div key={mediaIndex} className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                      {media.type === 'image' && media.url ? (
                        <img
                          src={media.url}
                          alt={media.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        />
                      ) : media.type === 'video' && media.url ? (
                        <div className="relative w-full h-full">
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <Play className="w-6 h-6 text-white" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {media.type === 'note' ? (
                            <MessageSquare className="w-6 h-6 text-gray-400" />
                          ) : (
                            <Camera className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {moment.tags.slice(0, 3).map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={`px-3 py-1 rounded-full text-xs transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                  {moment.tags.length > 3 && (
                    <span className={`px-3 py-1 rounded-full text-xs transition-colors duration-300 ${
                      isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                    }`}>
                      +{moment.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* Moment Footer */}
              <div className={`px-6 py-4 border-t flex items-center justify-between transition-colors duration-300 ${
                isDarkMode ? 'border-gray-700' : 'border-gray-200'
              }`}>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Eye className={`w-4 h-4 transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`} />
                    <span className={`transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {moment.mediaItems.length} Medien
                    </span>
                  </div>
                  {moment.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className={`w-4 h-4 transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <span className={`transition-colors duration-300 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        {moment.location}
                      </span>
                    </div>
                  )}
                </div>
                <ArrowLeft className={`w-4 h-4 rotate-180 transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`} />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center mt-16 py-8">
          <div className={`max-w-2xl mx-auto p-8 rounded-2xl transition-colors duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-pink-900/20 to-purple-900/20 border border-pink-700/30' 
              : 'bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-200'
          }`}>
            <h3 className={`text-2xl font-bold mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Vielen Dank! 💕
            </h3>
            <p className={`text-lg mb-4 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {guestName 
                ? `Liebe/r ${guestName}, vielen Dank, dass du unseren besonderen Tag mit uns geteilt hast!`
                : 'Vielen Dank, dass ihr unseren besonderen Tag mit uns geteilt habt!'}
            </p>
            <p className={`text-sm transition-colors duration-300 ${
              isDarkMode ? 'text-gray-500' : 'text-gray-500'
            }`}>
              Mit Liebe erstellt von Kristin & Maurizio ✨
            </p>
          </div>
        </div>
      </div>

      {/* Moment Detail Modal */}
      {selectedMoment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className={`rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-6 border-b transition-colors duration-300 ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {selectedMoment.title}
              </h3>
              <button
                onClick={() => setSelectedMoment(null)}
                className={`p-2 rounded-full transition-colors duration-300 ${
                  isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              <p className={`text-base mb-6 transition-colors duration-300 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {selectedMoment.description}
              </p>

              {/* Media Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {selectedMoment.mediaItems.map((media, index) => (
                  <div key={index} className="aspect-square rounded-lg overflow-hidden bg-gray-200 group">
                    {media.type === 'image' && media.url ? (
                      <img
                        src={media.url}
                        alt={media.name}
                        className="w-full h-full object-cover cursor-pointer transition-transform duration-300 group-hover:scale-110"
                        onClick={() => window.open(media.url, '_blank')}
                      />
                    ) : media.type === 'video' && media.url ? (
                      <video
                        src={media.url}
                        className="w-full h-full object-cover cursor-pointer"
                        controls
                        preload="metadata"
                      />
                    ) : media.type === 'note' ? (
                      <div className={`w-full h-full flex items-center justify-center p-4 transition-colors duration-300 ${
                        isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                      }`}>
                        <div className="text-center">
                          <MessageSquare className="w-8 h-8 mx-auto mb-2 text-pink-500" />
                          <p className={`text-xs transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            "{media.noteText?.substring(0, 50)}..."
                          </p>
                          <p className={`text-xs mt-1 transition-colors duration-300 ${
                            isDarkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}>
                            von {media.uploadedBy}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
