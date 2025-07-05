import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, MessageSquare, Edit3, MapPin } from 'lucide-react';
import { MediaItem, Comment, Like, LocationTag } from '../types';
import { getLocationTags, removeLocationTag } from '../services/firebaseService';

interface NotePostProps {
  item: MediaItem;
  comments: Comment[];
  likes: Like[];
  onAddComment: (mediaId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: (mediaId: string) => void;
  onDelete?: (item: MediaItem) => void;
  onEditNote?: (item: MediaItem, newText: string) => void;
  showDeleteButton: boolean;
  userName: string;
  isAdmin: boolean;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
}

export const NotePost: React.FC<NotePostProps> = ({
  item,
  comments,
  likes,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  onDelete,
  onEditNote,
  showDeleteButton,
  userName,
  isAdmin,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName
}) => {
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteText, setEditNoteText] = useState(item.noteText || '');
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);

  useEffect(() => {
    const loadLocationTags = async () => {
      try {
        const locationTagsData = await getLocationTags(item.id);
        setLocationTags(locationTagsData);
      } catch (error) {
        console.error('Error loading location tags:', error);
      }
    };
    loadLocationTags();
  }, [item.id]);

  const isLiked = likes.some(like => like.userName === userName);
  const likeCount = likes.length;

  // Check if current user can delete this post
  const canDeletePost = isAdmin || item.uploadedBy === userName;
  
  // Check if current user can edit this note
  const canEditNote = item.uploadedBy === userName;

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onAddComment(item.id, commentText.trim());
      setCommentText('');
    }
  };

  const handleLikeClick = () => {
    onToggleLike(item.id);
    if (!isLiked) {
      // Show heart overlay animation when liking
      setShowHeartOverlay(true);
      setTimeout(() => setShowHeartOverlay(false), 1000);
    }
  };

  const handleDelete = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const confirmed = window.confirm('Notiz wirklich löschen?');
      if (confirmed && onDelete) {
        onDelete(item);
      }
    } catch (error) {
      console.error('Delete confirmation failed:', error);
      // Fallback for browsers without confirm support
      if (onDelete) {
        onDelete(item);
      }
    }
  };

  const handleDeleteTouch = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleDelete(e);
  };

  const handleDeleteComment = (commentId: string, comment: Comment) => {
    // User can delete their own comments or admin can delete any
    const canDeleteComment = isAdmin || comment.userName === userName;
    
    if (canDeleteComment && window.confirm('Kommentar wirklich löschen?')) {
      onDeleteComment(commentId);
    }
  };

  const handleEditNote = () => {
    if (onEditNote && editNoteText.trim() && editNoteText !== item.noteText) {
      onEditNote(item, editNoteText.trim());
    }
    setIsEditingNote(false);
  };

  const handleCancelEdit = () => {
    setEditNoteText(item.noteText || '');
    setIsEditingNote(false);
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

  const displayComments = showAllComments ? comments : comments.slice(0, 2);

  // Handle location tag removal for admins
  const handleRemoveLocationTag = async (locationTag: LocationTag, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering any parent click handlers
    
    // Permission check: Only admins or note creator can remove location tags
    const canRemove = isAdmin || item.uploadedBy === userName;
    
    if (!canRemove) {
      alert('Sie können nur Ihre eigenen Standort-Tags entfernen.');
      return;
    }
    
    if (confirm(`Standort-Tag "${locationTag.name}" entfernen?`)) {
      try {
        await removeLocationTag(locationTag.id);
        // Reload location tags
        const locationTagsData = await getLocationTags(item.id);
        setLocationTags(locationTagsData);
      } catch (error) {
        console.error('Error removing location tag:', error);
        alert('Fehler beim Entfernen des Standort-Tags. Bitte versuchen Sie es erneut.');
      }
    }
  };

  // Generate beautiful wedding-themed avatar based on username
  const getAvatarUrl = (username: string, deviceId?: string) => {
    // Try to get custom avatar first
    const customAvatar = getUserAvatar?.(username, deviceId);
    if (customAvatar) return customAvatar;
    
    // Fallback to wedding-themed avatars
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

  return (
    <div className={`mb-6 mx-4 rounded-3xl border transition-all duration-500 relative overflow-hidden backdrop-blur-xl ${
      isDarkMode 
        ? 'bg-gray-800/40 border-gray-700/30 shadow-2xl shadow-pink-500/10' 
        : 'bg-white/80 border-gray-200/40 shadow-2xl shadow-pink-500/10'
    }`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl ${
          isDarkMode ? 'bg-pink-500' : 'bg-pink-500'
        }`} style={{ transform: 'translate(30%, -30%)' }}></div>
        <div className={`absolute bottom-0 left-0 w-16 h-16 rounded-full blur-xl ${
          isDarkMode ? 'bg-pink-500' : 'bg-pink-300'
        }`} style={{ transform: 'translate(-30%, 30%)' }}></div>
      </div>
      
      <div className="relative z-10">
        {/* Post Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full p-0.5 bg-gradient-to-r ${
              isDarkMode 
                ? 'from-pink-500 via-pink-500 to-rose-500' 
                : 'from-pink-500 via-pink-400 to-rose-400'
            }`}>
              <div className="w-full h-full rounded-full overflow-hidden">
                <img 
                  src={getAvatarUrl(item.uploadedBy, item.deviceId)}
                  alt={item.uploadedBy}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <span className={`font-semibold text-base transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {getUserDisplayName ? getUserDisplayName(item.uploadedBy, item.deviceId) : item.uploadedBy}
                {item.uploadedBy === userName && (
                  <span className={`ml-2 text-xs px-3 py-1 rounded-full transition-colors duration-300 ${
                    isDarkMode ? 'bg-blue-600/80 text-white' : 'bg-blue-100/80 text-blue-800'
                  }`}>
                    Du
                  </span>
                )}
              </span>
              <div className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                {formatDate(item.uploadedAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {canEditNote && (
              <button
                onClick={() => setIsEditingNote(true)}
                className={`p-2 rounded-full transition-all duration-300 transform hover:scale-110 ${
                  isDarkMode ? 'text-blue-400 hover:bg-blue-900/30' : 'text-blue-500 hover:bg-blue-50/80'
                }`}
                title="Notiz bearbeiten"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            )}
            {canDeletePost && (
              <button
                onClick={handleDelete}
                onTouchEnd={handleDeleteTouch}
                onTouchStart={(e) => e.preventDefault()}
                className={`p-3 rounded-full transition-all duration-300 transform active:scale-95 touch-manipulation ${
                  isDarkMode ? 'text-red-400 hover:bg-red-900/30 active:bg-red-900/50' : 'text-red-500 hover:bg-red-50/80 active:bg-red-100'
                }`}
                title="Notiz löschen"
                style={{ 
                  minWidth: '48px', 
                  minHeight: '48px',
                  WebkitTapHighlightColor: 'transparent',
                  WebkitTouchCallout: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <MoreHorizontal className={`w-6 h-6 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`} />
          </div>
        </div>

        {/* Note Content */}
        {isEditingNote ? (
          <div className={`mx-6 mb-4 p-6 rounded-2xl transition-colors duration-300 backdrop-blur-sm ${
            isDarkMode 
              ? 'bg-blue-900/30 border border-blue-700/30' 
              : 'bg-blue-50/80 border border-blue-200/50'
          }`}>
            <h4 className={`font-semibold mb-3 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              💌 Notiz bearbeiten:
            </h4>
          <textarea
            value={editNoteText}
            onChange={(e) => setEditNoteText(e.target.value)}
            className={`w-full p-4 rounded-xl border resize-none transition-colors duration-300 ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            rows={4}
            maxLength={500}
            placeholder="Deine Notiz für das Brautpaar..."
          />
          <div className={`text-xs mt-2 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            {editNoteText.length}/500
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancelEdit}
              className={`px-4 py-2 rounded-lg text-sm transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              }`}
            >
              Abbrechen
            </button>
            <button
              onClick={handleEditNote}
              disabled={!editNoteText.trim() || editNoteText === item.noteText}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              Speichern
            </button>
            </div>
          </div>
        ) : (
          <div className={`mx-6 mb-4 p-6 rounded-2xl transition-colors duration-300 backdrop-blur-sm relative group ${
            isDarkMode 
              ? 'bg-gradient-to-br from-pink-500/30 to-pink-900/30 border border-pink-500/30' 
              : 'bg-gradient-to-br from-purple-50/80 to-pink-50/80 border border-pink-500/50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-full transition-colors duration-300 ${
              isDarkMode ? 'bg-pink-500/50' : 'bg-white/80'
            }`}>
              <MessageSquare className={`w-6 h-6 transition-colors duration-300 ${
                isDarkMode ? 'text-pink-500' : 'text-pink-500'
              }`} />
            </div>
            <div>
              <h3 className={`font-semibold text-lg transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                💌 Notiz
              </h3>
              <p className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Eine Nachricht für das Brautpaar
              </p>
            </div>
          </div>
          
          <div className={`p-4 rounded-xl transition-colors duration-300 ${
            isDarkMode ? 'bg-gray-800/50' : 'bg-white/60'
          }`}>
            <p className={`text-base leading-relaxed transition-colors duration-300 ${
              isDarkMode ? 'text-gray-200' : 'text-gray-800'
            }`}>
              "{item.noteText}"
            </p>
          </div>
          
          {/* Location Tags Overlay - positioned bottom-left */}
          {locationTags.length > 0 && (
            <div className="absolute bottom-4 left-4 flex flex-wrap gap-1 max-w-[60%] opacity-90 group-hover:opacity-100 transition-opacity duration-300">
              {locationTags.map((locationTag) => {
                const canRemove = isAdmin || item.uploadedBy === userName;
                return (
                  <div
                    key={locationTag.id}
                    onClick={canRemove ? (e) => handleRemoveLocationTag(locationTag, e) : undefined}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-black/50 backdrop-blur-sm text-white border border-white/20 ${
                      canRemove ? 'cursor-pointer hover:bg-red-500/50 hover:border-red-400/50 transition-colors duration-200' : ''
                    }`}
                    title={canRemove ? 'Klicken zum Entfernen' : locationTag.name}
                  >
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-24">{locationTag.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Like Button Overlay - positioned over note content */}
          <div className="absolute bottom-4 right-4 flex flex-col items-center opacity-90 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={handleLikeClick}
              className={`transition-all duration-300 transform hover:scale-110 mb-1 relative bg-black/50 backdrop-blur-sm rounded-full p-2 ${
                isLiked ? 'text-red-500' : 'text-white hover:text-red-400'
              }`}
            >
              <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
              
              {/* Heart Overlay Animation */}
              {showHeartOverlay && (
                <div 
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    animation: 'heart-float 1s ease-out forwards'
                  }}
                >
                  <div className="text-red-500 text-xl">❤️</div>
                </div>
              )}
            </button>
            {likeCount > 0 && (
              <span className="text-white text-xs font-semibold bg-black/50 backdrop-blur-sm rounded-full px-2 py-1">
                {likeCount}
              </span>
            )}
          </div>
          </div>
        )}

        {/* Content Section */}
        <div className="px-6 pb-6">
          {/* Comments */}
          <div className="space-y-2">
          {displayComments.map((comment) => {
            const canDeleteThisComment = isAdmin || comment.userName === userName;
            const customAvatar = getUserAvatar?.(comment.userName, comment.deviceId);
            const commentAvatarUrl = customAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(comment.userName)}&backgroundColor=transparent`;
            
            return (
              <div key={comment.id} className="text-sm flex items-start gap-3 group">
                {/* Profile Picture */}
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 mt-0.5">
                  <img 
                    src={commentAvatarUrl}
                    alt={comment.userName}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div>
                    <span className={`font-semibold mr-2 transition-colors duration-300 ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {getUserDisplayName ? getUserDisplayName(comment.userName, comment.deviceId) : comment.userName}
                      {comment.userName === userName && (
                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded transition-colors duration-300 ${
                          isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                        }`}>
                          Du
                        </span>
                      )}
                    </span>
                    <span className={`transition-colors duration-300 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {comment.text}
                    </span>
                  </div>
                </div>
                
                {canDeleteThisComment && (
                  <button
                    onClick={() => handleDeleteComment(comment.id, comment)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all flex-shrink-0"
                    title="Kommentar löschen"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}
          
          {comments.length > 2 && !showAllComments && (
            <button
              onClick={() => setShowAllComments(true)}
              className={`text-sm transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Alle {comments.length} Kommentare ansehen
            </button>
          )}
          </div>

          {/* Add Comment */}
          <form onSubmit={handleSubmitComment} className="mt-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full overflow-hidden">
                <img 
                  src={getUserAvatar?.(userName) ?? getAvatarUrl(userName)}
                  alt={userName}
                  className="w-full h-full object-cover"
                />
              </div>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Kommentieren..."
                className={`flex-1 text-sm outline-none bg-transparent transition-colors duration-300 ${
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
            </div>
          </form>


        </div>
      </div>
    </div>
  );
};