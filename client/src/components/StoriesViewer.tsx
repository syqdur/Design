import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Pause, Play, Trash2, Eye } from 'lucide-react';
import { Story } from '../services/liveService';

interface StoriesViewerProps {
  isOpen: boolean;
  stories: Story[];
  initialStoryIndex: number;
  currentUser: string;
  selectedUserName?: string; // Add selected user filter
  onClose: () => void;
  onStoryViewed: (storyId: string) => void;
  onDeleteStory: (storyId: string) => void;
  isAdmin: boolean;
  isDarkMode: boolean;
}

export const StoriesViewer: React.FC<StoriesViewerProps> = ({
  isOpen,
  stories,
  initialStoryIndex,
  currentUser,
  selectedUserName,
  onClose,
  onStoryViewed,
  onDeleteStory,
  isAdmin,
  isDarkMode
}) => {
  // Filter stories for selected user or show all if no user selected
  const filteredStories = selectedUserName 
    ? stories.filter(story => story.userName === selectedUserName)
    : stories;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [indexInitialized, setIndexInitialized] = useState(false);

  const currentStory = filteredStories[currentIndex];
  const STORY_DURATION = 5000; // 5 seconds per story
  
  // Check if current user can delete this story
  const canDeleteStory = isAdmin || (currentStory && currentStory.userName === currentUser);

  // Calculate the correct initial index for filtered stories when modal opens
  useEffect(() => {
    if (!isOpen || indexInitialized) return;
    
    if (!selectedUserName) {
      setCurrentIndex(initialStoryIndex);
      setIndexInitialized(true);
      return;
    }
    
    // Find the story at initialStoryIndex in the full stories array
    const targetStory = stories[initialStoryIndex];
    if (!targetStory) {
      setCurrentIndex(0);
      setIndexInitialized(true);
      return;
    }
    
    // Find its index in the filtered stories
    const filteredIndex = filteredStories.findIndex(story => story.id === targetStory.id);
    setCurrentIndex(filteredIndex >= 0 ? filteredIndex : 0);
    setIndexInitialized(true);
  }, [isOpen, initialStoryIndex, selectedUserName, stories, filteredStories, indexInitialized]);

  // Reset initialization when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIndexInitialized(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !currentStory) return;

    // Mark story as viewed
    onStoryViewed(currentStory.id);
    setIsLoading(true);
    setProgress(0);

    // Preload media
    if (currentStory.mediaType === 'image') {
      const img = new Image();
      img.onload = () => setIsLoading(false);
      img.onerror = () => setIsLoading(false);
      img.src = currentStory.mediaUrl;
    } else {
      // For videos, we'll set loading to false immediately
      // In a real app, you'd want to wait for video to be ready
      setIsLoading(false);
    }
  }, [currentIndex, currentStory, isOpen, onStoryViewed]);

  useEffect(() => {
    if (!isOpen || isPaused || isLoading || !currentStory) return;

    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += (100 / (STORY_DURATION / 100));
      
      if (progressValue >= 100) {
        // Move to next story or close
        if (currentIndex < filteredStories.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          onClose();
        }
        return;
      }
      
      setProgress(progressValue);
    }, 100);

    return () => clearInterval(interval);
  }, [isOpen, isPaused, isLoading, currentIndex, filteredStories.length, onClose, currentStory]);

  // 🎯 NEW: Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case ' ': // Spacebar
          e.preventDefault();
          togglePause();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentIndex, filteredStories.length]);

  const goToNext = () => {
    setProgress(0); // Reset progress immediately
    if (currentIndex < filteredStories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const goToPrevious = () => {
    setProgress(0); // Reset progress immediately
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const togglePause = () => {
    setIsPaused(prev => !prev);
  };

  const handleDeleteStory = () => {
    if (!currentStory || !canDeleteStory) return;

    const storyType = currentStory.mediaType === 'video' ? 'Video-Story' : 'Foto-Story';
    const confirmMessage = isAdmin 
      ? `${storyType} von ${currentStory.userName} wirklich löschen?`
      : `Deine ${storyType} wirklich löschen?`;

    if (window.confirm(confirmMessage)) {
      onDeleteStory(currentStory.id);
      
      // Move to next story or close if this was the last one
      if (filteredStories.length > 1) {
        if (currentIndex < filteredStories.length - 1) {
          // Stay at current index, next story will shift into this position
        } else {
          // Go to previous story if this was the last one
          setCurrentIndex(prev => prev - 1);
        }
      } else {
        // Close viewer if this was the only story
        onClose();
      }
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'vor wenigen Minuten';
    if (diffInHours < 24) return `vor ${diffInHours}h`;
    return `vor ${Math.floor(diffInHours / 24)}d`;
  };

  const getAvatarUrl = (username: string) => {
    const weddingAvatars = [
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729797/pexels-photo-1729797.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1070850/pexels-photo-1070850.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444424/pexels-photo-1444424.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1024967/pexels-photo-1024967.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1729799/pexels-photo-1729799.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
      'https://images.pexels.com/photos/1444443/pexels-photo-1444443.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    ];
    
    const hash = username.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return weddingAvatars[Math.abs(hash) % weddingAvatars.length];
  };

  if (!isOpen) return null;
  
  // If no stories are available for this user, close the modal
  if (filteredStories.length === 0) {
    onClose();
    return null;
  }
  
  // If currentStory is not available yet (loading), show loading state
  if (!currentStory) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="text-white">Loading story...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 flex gap-1 z-10">
        {filteredStories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-100 ease-linear"
              style={{ 
                width: index < currentIndex ? '100%' : 
                       index === currentIndex ? `${progress}%` : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden">
            <img 
              src={getAvatarUrl(currentStory.userName)}
              alt={currentStory.userName}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <span className="text-white font-semibold text-sm">
              {/* 🎯 NEW: Clear user display */}
              {currentStory.userName}
              {currentStory.userName === currentUser && (
                <span className="ml-2 text-xs px-2 py-0.5 bg-blue-600 text-white rounded-full">
                  Du
                </span>
              )}
            </span>
            <div className="text-white/70 text-xs">
              {formatTimeAgo(currentStory.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canDeleteStory && (
            <button
              onClick={handleDeleteStory}
              className="p-2 rounded-full bg-red-600/80 text-white hover:bg-red-600 transition-colors"
              title="Story löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={togglePause}
            className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Story Content */}
      <div className="relative w-full h-full flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {currentStory.mediaType === 'image' ? (
          <img
            src={currentStory.mediaUrl}
            alt="Story"
            className="max-w-full max-h-full object-contain"
            style={{ opacity: isLoading ? 0 : 1 }}
          />
        ) : (
          <video
            src={currentStory.mediaUrl}
            className="max-w-full max-h-full object-contain"
            autoPlay
            muted
            playsInline
            style={{ opacity: isLoading ? 0 : 1 }}
          />
        )}

        {/* 🎯 NEW: Enhanced Navigation Areas */}
        <button
          onClick={goToPrevious}
          className="absolute left-0 top-0 w-1/3 h-full flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity group"
          disabled={currentIndex === 0}
        >
          {currentIndex > 0 && (
            <div className="bg-black/50 rounded-full p-2 group-hover:bg-black/70 transition-colors">
              <ChevronLeft className="w-6 h-6 text-white" />
            </div>
          )}
        </button>

        <button
          onClick={goToNext}
          className="absolute right-0 top-0 w-1/3 h-full flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity group"
        >
          <div className="bg-black/50 rounded-full p-2 group-hover:bg-black/70 transition-colors">
            <ChevronRight className="w-6 h-6 text-white" />
          </div>
        </button>

        {/* Tap to pause/play (center area) */}
        <button
          onClick={togglePause}
          className="absolute inset-0 w-1/3 h-full left-1/3"
          style={{ background: 'transparent' }}
        />
      </div>

      {/* Story info */}
      <div className="absolute bottom-4 left-4 right-4 z-10">
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-3">
          <div className="flex items-center justify-between text-white text-sm">
            <span>
              {currentIndex + 1} von {filteredStories.length}
            </span>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span>
                {currentStory.views.length} Aufrufe
              </span>
            </div>
          </div>
          
          {/* 🎯 NEW: Keyboard shortcuts hint */}
          <div className="text-white/60 text-xs mt-2 text-center">
            ← → Navigieren • Leertaste Pause • Esc Schließen
          </div>
        </div>
      </div>
    </div>
  );
};