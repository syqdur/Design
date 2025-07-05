import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { MediaItem, Comment, Like } from '../types';

interface MediaModalProps {
  isOpen: boolean;
  items: MediaItem[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  comments: Comment[];
  likes: Like[];
  onAddComment: (mediaId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: (mediaId: string) => void;
  userName: string;
  isAdmin: boolean;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
}

export const MediaModal: React.FC<MediaModalProps> = ({
  isOpen,
  items,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  comments,
  likes,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  userName,
  isAdmin,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName
}) => {
  const [commentText, setCommentText] = useState('');
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const currentItem = items[currentIndex];
  const currentComments = comments.filter(c => c.mediaId === currentItem?.id);
  const currentLikes = likes.filter(l => l.mediaId === currentItem?.id);
  const isLiked = currentLikes.some(like => like.userName === userName);
  const likeCount = currentLikes.length;

  // Reset loading states when item changes
  useEffect(() => {
    if (currentItem) {
      setImageError(false);
      setImageLoading(true);
    }
  }, [currentItem?.id]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          onPrev();
          break;
        case 'ArrowRight':
          onNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onNext, onPrev]);

  if (!isOpen || !currentItem) return null;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(currentItem.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error(`❌ Modal image failed to load: ${currentItem.url}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'vor wenigen Minuten';
    if (diffInHours < 24) return `vor ${diffInHours}h`;
    if (diffInHours < 168) return `vor ${Math.floor(diffInHours / 24)}d`;
    return date.toLocaleDateString('de-DE');
  };

  // Generate beautiful wedding-themed avatar based on username
  const getAvatarUrl = (username: string, targetDeviceId?: string) => {
    // First try to get user's custom profile picture
    const customAvatar = getUserAvatar?.(username, targetDeviceId);
    if (customAvatar) return customAvatar;
    
    // Fallback to generated avatars
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

  const getDisplayName = (username: string, targetDeviceId?: string) => {
    return getUserDisplayName?.(username, targetDeviceId) || username;
  };

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-40 flex items-center justify-center"
      onClick={(e) => {
        // Close modal when clicking outside the content
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Close button for mobile visibility */}
      <button 
        onClick={onClose}
        className="fixed top-16 right-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/90 text-black shadow-2xl border-2 border-gray-300 touch-manipulation active:scale-95 z-[9999]"
        style={{ 
          position: 'fixed',
          top: '64px',
          right: '16px',
          width: '48px',
          height: '48px',
          zIndex: 99999,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          color: 'black'
        }}
      >
        <X className="w-6 h-6 stroke-2" />
      </button>

      {/* Navigation buttons */}
      {items.length > 1 && (
        <>
          <button
            onClick={onPrev}
            className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-300 touch-manipulation"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
          <button
            onClick={onNext}
            className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-20 p-2 sm:p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-all duration-300 touch-manipulation"
            style={{ minWidth: '48px', minHeight: '48px' }}
          >
            <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </>
      )}

      {/* Main content area */}
      <div className="w-full h-full flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto">
        {/* Media container */}
        <div className="flex-1 lg:w-2/3 h-full flex items-center justify-center p-2 sm:p-4">
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            {currentItem.type === 'video' ? (
              <video
                src={currentItem.url}
                controls
                autoPlay
                className="max-w-full max-h-full rounded-lg shadow-2xl"
                preload="metadata"
                onLoadStart={() => setImageLoading(true)}
                onLoadedData={() => setImageLoading(false)}
                onError={() => {
                  setImageLoading(false);
                  setImageError(true);
                }}
              />
            ) : currentItem.type === 'note' ? (
              <div className={`w-full h-full flex flex-col items-center justify-center p-8 transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-purple-900/50 to-pink-900/50' 
                  : 'bg-gradient-to-br from-purple-100 to-pink-100'
              }`}>
                <div className={`max-w-sm w-full p-6 rounded-2xl transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-800/80 border border-purple-700/30' : 'bg-white/90 border border-purple-200/50'
                }`}>
                  <div className="text-center mb-6">
                    <div className="text-4xl mb-2">💌</div>
                    <h3 className={`text-xl font-semibold transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Notiz
                    </h3>
                  </div>
                  <div className={`p-4 rounded-xl transition-colors duration-300 ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}>
                    <p className={`text-base leading-relaxed transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-800'
                    }`}>
                      "{currentItem.noteText}"
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-full flex items-center justify-center">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {imageError ? (
                  <div className="flex flex-col items-center justify-center text-white p-8">
                    <div className="text-6xl mb-4">📷</div>
                    <p className="text-lg text-center mb-2">
                      Bild nicht verfügbar
                    </p>
                    <p className="text-sm text-center opacity-75 mb-4">
                      Von {getUserDisplayName ? getUserDisplayName(currentItem.uploadedBy, currentItem.deviceId) : currentItem.uploadedBy}
                    </p>
                    <button
                      onClick={() => {
                        setImageError(false);
                        setImageLoading(true);
                        // Force reload
                        const img = new Image();
                        img.onload = handleImageLoad;
                        img.onerror = handleImageError;
                        img.src = currentItem.url;
                      }}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors"
                    >
                      Erneut versuchen
                    </button>
                  </div>
                ) : (
                  <img
                    src={currentItem.url}
                    alt="Hochzeitsfoto"
                    className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${
                      imageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Info panel - bottom overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
        <div className="max-w-2xl mx-auto">
          {/* User info */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              <img 
                src={getAvatarUrl(currentItem.uploadedBy, currentItem.deviceId)}
                alt={currentItem.uploadedBy}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-semibold text-white">
                {getUserDisplayName ? getUserDisplayName(currentItem.uploadedBy, currentItem.deviceId) : currentItem.uploadedBy}
              </span>
              <div className="text-sm text-gray-300">
                {formatDate(currentItem.uploadedAt)}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6 mb-4">
            <button 
              onClick={() => onToggleLike(currentItem.id)}
              className={`transition-all duration-300 transform hover:scale-110 ${
                isLiked ? 'text-red-500' : 'text-white hover:text-red-400'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="text-sm text-gray-300">
              {likeCount > 0 ? `${likeCount} Likes` : ''}
            </span>
          </div>

          {/* Note text for note items */}
          {currentItem.type === 'note' && currentItem.noteText && (
            <div className="mb-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm">
              <p className="text-white leading-relaxed">
                "{currentItem.noteText}"
              </p>
            </div>
          )}

          {/* Comments preview */}
          {currentComments.length > 0 && (
            <div className="space-y-3 mb-4 max-h-32 overflow-y-auto">
              {currentComments.slice(-3).map((comment) => {
                const commentAvatarUrl = getUserAvatar 
                  ? getUserAvatar(comment.userName, comment.deviceId) 
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(comment.userName)}&backgroundColor=transparent`;
                
                return (
                  <div key={comment.id} className="text-sm flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                      <img 
                        src={commentAvatarUrl}
                        alt={comment.userName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-white mr-2">
                        {getUserDisplayName ? getUserDisplayName(comment.userName, comment.deviceId) : comment.userName}
                      </span>
                      <span className="text-gray-300">
                        {comment.text}
                      </span>
                    </div>
                  </div>
                );
              })}
              {currentComments.length > 3 && (
                <div className="text-xs text-gray-400 ml-8">
                  +{currentComments.length - 3} weitere Kommentare
                </div>
              )}
            </div>
          )}

          {/* Add comment */}
          <form onSubmit={handleSubmitComment} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img 
                src={getAvatarUrl(userName, undefined)}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Kommentieren..."
              className="flex-1 bg-white/10 text-white placeholder-gray-400 px-3 py-2 rounded-lg border border-white/20 outline-none focus:border-white/40 transition-colors"
            />
            {commentText.trim() && (
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Senden
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};