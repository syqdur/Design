import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, MoreHorizontal, Trash2, Edit3, AlertTriangle, MapPin, Download } from 'lucide-react';
import { MediaItem, Comment, Like, LocationTag } from '../types';
import { MediaTagging } from './MediaTagging';
import { VideoThumbnail } from './VideoThumbnail';
import { getLocationTags, removeLocationTag } from '../services/firebaseService';

interface InstagramPostProps {
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
  onClick: () => void;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
  getUserDeviceId?: () => string;
}

export const InstagramPost: React.FC<InstagramPostProps> = ({
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
  onClick,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName,
  getUserDeviceId
}) => {
  const [commentText, setCommentText] = useState('');
  const [showAllComments, setShowAllComments] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteText, setEditNoteText] = useState(item.noteText || '');

  const [locationTags, setLocationTags] = useState<LocationTag[]>([]);
  const [showHeartOverlay, setShowHeartOverlay] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  


  const loadLocationTags = async () => {
    try {
      const locationTagsData = await getLocationTags(item.id);
      setLocationTags(locationTagsData);
    } catch (error) {
      console.error('Error loading location tags:', error);
    }
  };

  useEffect(() => {
    loadLocationTags();
  }, [item.id]);

  const isLiked = likes.some(like => like.userName === userName);
  const likeCount = likes.length;

  // Check if current user can delete this post
  const canDeletePost = isAdmin || item.uploadedBy === userName;
  
  // Check if current user can edit this note
  const canEditNote = item.type === 'note' && item.uploadedBy === userName;

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
      const confirmed = window.confirm('Beitrag wirklich löschen?');
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

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    console.error(`❌ Image failed to load: ${item.url}`);
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
    event.stopPropagation(); // Prevent triggering the media click
    
    // Permission check: Only admins or media uploader can remove location tags
    const canRemove = isAdmin || item.uploadedBy === userName;
    
    if (!canRemove) {
      alert('Sie können nur Ihre eigenen Standort-Tags entfernen.');
      return;
    }
    
    if (confirm(`Standort-Tag "${locationTag.name}" entfernen?`)) {
      try {
        await removeLocationTag(locationTag.id);
        await loadLocationTags(); // Reload location tags
      } catch (error) {
        console.error('Error removing location tag:', error);
        alert('Fehler beim Entfernen des Standort-Tags. Bitte versuchen Sie es erneut.');
      }
    }
  };

  const handleDownload = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isDownloading || !item.url || item.isUnavailable) return;
    
    setIsDownloading(true);
    
    try {
      // Create filename with timestamp and user
      const timestamp = new Date().toISOString().slice(0, 10);
      const fileExtension = item.type === 'video' ? 'mp4' : 'jpg';
      const username = item.uploadedBy.replace(/[^a-zA-Z0-9]/g, '');
      const filename = `hochzeit_${username}_${timestamp}.${fileExtension}`;
      
      // For Firebase URLs, we can try direct download or use a different approach
      if (item.url.includes('firebase') || item.url.includes('googleapis')) {
        // Create a link that opens the image in a new tab for download
        const link = document.createElement('a');
        link.href = item.url;
        link.target = '_blank';
        link.download = filename;
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // For other URLs, try the fetch approach
        const response = await fetch(item.url, {
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open image in new tab
      try {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      } catch (fallbackError) {
        alert('Download nicht möglich. Bitte versuchen Sie es über den Browser (Rechtsklick → Bild speichern).');
      }
    } finally {
      setIsDownloading(false);
    }
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

  const getDisplayName = (username: string) => {
    return getUserDisplayName?.(username, item.deviceId) || username;
  };

  return (
    <div className={`mb-6 mx-0 sm:mx-4 rounded-none sm:rounded-3xl border-y sm:border transition-all duration-500 relative overflow-hidden backdrop-blur-xl ${
      isDarkMode 
        ? 'bg-gray-800/40 border-gray-700/30 shadow-2xl shadow-pink-500/10' 
        : 'bg-white/80 border-gray-200/40 shadow-2xl shadow-pink-500/10'
    }`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5">
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full blur-xl ${
          isDarkMode ? 'bg-pink-500' : 'bg-pink-300'
        }`} style={{ transform: 'translate(30%, -30%)' }}></div>
        <div className={`absolute bottom-0 left-0 w-16 h-16 rounded-full blur-xl ${
          isDarkMode ? 'bg-pink-500' : 'bg-pink-500'
        }`} style={{ transform: 'translate(-30%, 30%)' }}></div>
      </div>
      
      <div className="relative z-10">
        {/* Post Header */}
        <div className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full p-0.5 bg-gradient-to-r ${
              isDarkMode 
                ? 'from-pink-500 via-pink-500 to-indigo-500' 
                : 'from-pink-400 via-pink-500 to-indigo-400'
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
                title="Beitrag löschen"
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

        {/* Media Content */}
        <div className="relative mx-0 sm:mx-6 mb-4 rounded-none sm:rounded-2xl overflow-hidden group">
          {item.type === 'video' ? (
            <VideoThumbnail
              src={item.url}
              className="w-full aspect-square"
              onClick={onClick}
              showPlayButton={true}
              autoplayOnClick={true}
            />
          ) : (
          <div className="relative w-full aspect-square">
            {imageLoading && !item.isUnavailable && (
              <div className={`absolute inset-0 flex items-center justify-center transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            
            {/* 🔧 FIX: Show unavailable state for items that couldn't be loaded */}
            {(imageError || item.isUnavailable || !item.url) ? (
              <div className={`absolute inset-0 flex flex-col items-center justify-center transition-colors duration-300 ${
                isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
              }`}>
                <AlertTriangle className="w-12 h-12 mb-4 text-orange-500" />
                <div className="text-lg font-semibold mb-2">Datei nicht verfügbar</div>
                <p className="text-sm text-center px-4 mb-2">
                  {item.isUnavailable 
                    ? 'Diese Datei konnte nicht geladen werden'
                    : 'Bild konnte nicht geladen werden'
                  }
                </p>
                <p className="text-xs text-center px-4 opacity-75">
                  Von {item.uploadedBy} • {formatDate(item.uploadedAt)}
                </p>
                <div className={`mt-4 px-3 py-1 rounded-full text-xs transition-colors duration-300 ${
                  isDarkMode ? 'bg-orange-600 text-white' : 'bg-orange-100 text-orange-800'
                }`}>
                  {item.type === 'video' ? '🎥 Video' : '📷 Bild'}
                </div>
              </div>
            ) : (
              <img
                src={item.url}
                alt="Hochzeitsfoto"
                className={`w-full h-full object-cover cursor-pointer transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onClick={onClick}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            )}
          </div>
          )}
          


          {/* Like Button Overlay - positioned over media */}
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
          
          {/* Download Button Overlay - positioned bottom-left */}
          <div className="absolute bottom-4 left-4 flex flex-col items-start gap-2 opacity-90 group-hover:opacity-100 transition-opacity duration-300">
            {/* Download Button */}
            <button 
              onClick={handleDownload}
              disabled={isDownloading || !item.url || item.isUnavailable}
              className={`transition-all duration-300 transform hover:scale-110 bg-black/50 backdrop-blur-sm rounded-full p-2 ${
                isDownloading || !item.url || item.isUnavailable
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-white hover:text-blue-400 cursor-pointer'
              }`}
              title={isDownloading ? 'Download läuft...' : 'Foto/Video speichern'}
            >
              <Download className={`w-6 h-6 ${isDownloading ? 'animate-pulse' : ''}`} />
            </button>
            
            {/* Location Tags - positioned below download button */}
            {locationTags.length > 0 && (
              <div className="flex flex-wrap gap-1 max-w-[200px]">
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
          </div>
        </div>

        {/* Media Tags - positioned below media */}
        <div className={`px-4 border-b transition-colors duration-300 ${
          isDarkMode ? 'border-gray-700/50' : 'border-gray-200/50'
        }`}>
          <MediaTagging
            mediaId={item.id}
            currentUser={userName}
            currentDeviceId={getUserDeviceId ? getUserDeviceId() : ''}
            isAdmin={isAdmin}
            isDarkMode={isDarkMode}
            onTagsUpdated={() => {
              // Reload location tags when they are updated
              loadLocationTags();
            }}
            getUserDisplayName={getUserDisplayName || ((name) => name)}
            mediaUploader={item.uploadedBy}
            mediaType={item.type}
            mediaUrl={item.url}
          />
        </div>

        {/* Content Section */}
        <div className="px-6 pb-6">
          {/* Note Edit Mode */}
          {isEditingNote && item.type === 'note' && (
            <div className={`mb-4 p-5 rounded-2xl transition-colors duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-700/30 border border-gray-600/50' : 'bg-blue-50/80 border border-blue-200/50'
            }`}>
            <h4 className={`font-semibold mb-2 transition-colors duration-300 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Notiz bearbeiten:
            </h4>
            <textarea
              value={editNoteText}
              onChange={(e) => setEditNoteText(e.target.value)}
              className={`w-full p-3 rounded-lg border resize-none transition-colors duration-300 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              rows={3}
              maxLength={500}
              placeholder="Deine Notiz..."
            />
            <div className={`text-xs mt-1 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {editNoteText.length}/500
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleCancelEdit}
                className={`px-3 py-1 rounded text-sm transition-colors duration-300 ${
                  isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
                }`}
              >
                Abbrechen
              </button>
              <button
                onClick={handleEditNote}
                disabled={!editNoteText.trim() || editNoteText === item.noteText}
                className="px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                Speichern
              </button>
              </div>
            </div>
          )}
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
                src={getAvatarUrl(userName, getUserDeviceId?.())}
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
