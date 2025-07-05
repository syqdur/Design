import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem, Comment, Like } from '../types';

interface MediaPopupProps {
  isOpen: boolean;
  item: MediaItem;
  onClose: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
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

export const MediaPopup: React.FC<MediaPopupProps> = ({
  isOpen,
  item,
  onClose,
  onNext,
  onPrev,
  hasNext = false,
  hasPrev = false,
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
  const [imageLoading, setImageLoading] = useState(true);

  const currentComments = comments.filter(c => c.mediaId === item?.id);
  const currentLikes = likes.filter(l => l.mediaId === item?.id);
  const isLiked = currentLikes.some(like => like.userName === userName);
  const likeCount = currentLikes.length;

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrev && hasPrev) {
        onPrev();
      } else if (e.key === 'ArrowRight' && onNext && hasNext) {
        onNext();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose, onNext, onPrev, hasNext, hasPrev]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim() && item) {
      onAddComment(item.id, commentText.trim());
      setCommentText('');
    }
  };

  const getAvatarUrl = (username: string, deviceId?: string) => {
    const customAvatar = getUserAvatar?.(username, deviceId);
    if (customAvatar) return customAvatar;
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundColor=transparent`;
  };

  if (!isOpen || !item) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Container */}
      <div className={`relative max-w-4xl max-h-[90vh] w-full mx-4 rounded-2xl overflow-hidden shadow-2xl ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}>
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            isDarkMode 
              ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white' 
              : 'bg-white/80 hover:bg-gray-100/80 text-gray-900'
          }`}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Navigation Buttons */}
        {hasPrev && onPrev && (
          <button
            onClick={onPrev}
            className={`absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white' 
                : 'bg-white/80 hover:bg-gray-100/80 text-gray-900'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {hasNext && onNext && (
          <button
            onClick={onNext}
            className={`absolute right-14 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isDarkMode 
                ? 'bg-gray-800/80 hover:bg-gray-700/80 text-white' 
                : 'bg-white/80 hover:bg-gray-100/80 text-gray-900'
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col md:flex-row max-h-[90vh]">
          {/* Media Section */}
          <div className="flex-1 flex items-center justify-center bg-black">
            {item.type === 'video' ? (
              <video
                src={item.url}
                controls
                autoPlay
                className="max-w-full max-h-[60vh] md:max-h-[90vh]"
                onLoadStart={() => setImageLoading(false)}
              />
            ) : (
              <img
                src={item.url}
                alt="Media"
                className={`max-w-full max-h-[60vh] md:max-h-[90vh] object-contain transition-opacity ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setImageLoading(false)}
              />
            )}
          </div>

          {/* Sidebar with interactions */}
          <div className={`w-full md:w-80 flex flex-col ${
            isDarkMode ? 'bg-gray-900' : 'bg-white'
          }`}>
            {/* Header */}
            <div className={`p-4 border-b ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden">
                  <img 
                    src={getAvatarUrl(item.uploadedBy)}
                    alt={item.uploadedBy}
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className={`font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {getUserDisplayName ? getUserDisplayName(item.uploadedBy) : item.uploadedBy}
                </span>
              </div>
              {item.noteText && (
                <p className={`mt-2 text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {item.noteText}
                </p>
              )}
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-60">
              {currentComments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                    <img 
                      src={getAvatarUrl(comment.userName, comment.deviceId)}
                      alt={comment.userName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <span className={`font-semibold text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {getUserDisplayName ? getUserDisplayName(comment.userName, comment.deviceId) : comment.userName}
                    </span>
                    <span className={`ml-2 text-sm ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {comment.text}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Actions and Comment Input */}
            <div className={`p-4 border-t ${
              isDarkMode ? 'border-gray-700' : 'border-gray-200'
            }`}>
              {/* Like and Comment buttons */}
              <div className="flex items-center gap-4 mb-3">
                <button 
                  onClick={() => onToggleLike(item.id)}
                  className={`transition-colors ${
                    isLiked ? 'text-red-500' : isDarkMode ? 'text-gray-300 hover:text-red-400' : 'text-gray-700 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
                </button>
                <MessageCircle className={`w-6 h-6 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`} />
              </div>

              {/* Like count */}
              {likeCount > 0 && (
                <p className={`text-sm font-semibold mb-3 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {likeCount} „Gefällt mir"-Angabe{likeCount > 1 ? 'n' : ''}
                </p>
              )}

              {/* Comment form */}
              <form onSubmit={handleSubmitComment} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full overflow-hidden">
                  <img 
                    src={getAvatarUrl(userName)}
                    alt={userName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Kommentieren..."
                  className={`flex-1 text-sm outline-none bg-transparent ${
                    isDarkMode ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'
                  }`}
                />
                {commentText.trim() && (
                  <button
                    type="submit"
                    className="text-blue-500 font-semibold text-sm"
                  >
                    Posten
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};