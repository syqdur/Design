import React, { useState } from 'react';
import { Grid, List, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { MediaItem, Comment, Like } from '../types';
import { InstagramPost } from './InstagramPost';
import { NotePost } from './NotePost';
import { VideoThumbnail } from './VideoThumbnail';
import { MediaPopup } from './MediaPopup';

interface InstagramGalleryProps {
  items: MediaItem[];
  onItemClick: (index: number) => void;
  onDelete?: (item: MediaItem) => void;
  onEditNote?: (item: MediaItem, newText: string) => void;
  isAdmin: boolean;
  comments: Comment[];
  likes: Like[];
  onAddComment: (mediaId: string, text: string) => void;
  onDeleteComment: (commentId: string) => void;
  onToggleLike: (mediaId: string) => void;
  userName: string;
  isDarkMode: boolean;
  getUserAvatar?: (userName: string, deviceId?: string) => string | null;
  getUserDisplayName?: (userName: string, deviceId?: string) => string;
  deviceId: string;
}

export const InstagramGallery: React.FC<InstagramGalleryProps> = ({
  items,
  onItemClick,
  onDelete,
  onEditNote,
  isAdmin,
  comments,
  likes,
  onAddComment,
  onDeleteComment,
  onToggleLike,
  userName,
  isDarkMode,
  getUserAvatar,
  getUserDisplayName,
  deviceId
}) => {
  const [viewMode, setViewMode] = useState<'feed' | 'grid'>('feed');
  const [notesSliderIndex, setNotesSliderIndex] = useState(0);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [downloadingItems, setDownloadingItems] = useState<Set<string>>(new Set());

  const noteItems = items.filter(item => item.type === 'note');
  const mediaItems = items.filter(item => item.type !== 'note');

  const getAvatarUrl = (name: string) => {
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=transparent`;
  };

  const nextNote = () => {
    setNotesSliderIndex((prev) => (prev + 1) % noteItems.length);
  };

  const prevNote = () => {
    setNotesSliderIndex((prev) => (prev - 1 + noteItems.length) % noteItems.length);
  };

  const goToNote = (index: number) => {
    setNotesSliderIndex(index);
  };

  const handleMediaClick = (index: number) => {
    setSelectedItemIndex(index);
    setIsPopupOpen(true);
  };

  const handlePopupClose = () => {
    setIsPopupOpen(false);
  };

  const handleDownload = async (item: MediaItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (downloadingItems.has(item.id) || !item.url || item.isUnavailable) return;
    
    setDownloadingItems(prev => new Set(prev).add(item.id));
    
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
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const handlePopupNext = () => {
    setSelectedItemIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const handlePopupPrev = () => {
    setSelectedItemIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  return (
    <div>
      {/* Compact View Toggle */}
      <div className="flex justify-end mb-2 px-4">
        <div className={`flex p-1 rounded-full ${
          isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'
        }`}>
          <button
            onClick={() => setViewMode('feed')}
            className={`p-2 rounded-full transition-all duration-200 ${
              viewMode === 'feed'
                ? isDarkMode
                  ? 'bg-pink-600 text-white'
                  : 'bg-pink-500 text-white'
              : isDarkMode
                ? 'text-gray-400 hover:text-gray-200'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-full transition-all duration-200 ${
              viewMode === 'grid'
                ? isDarkMode
                  ? 'bg-pink-600 text-white'
                  : 'bg-pink-500 text-white'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'feed' ? (
        // Feed View
        <div className="space-y-0">
          {items.map((item, index) => (
            item.type === 'note' ? (
              <NotePost
                key={item.id}
                item={item}
                comments={comments.filter(c => c.mediaId === item.id)}
                likes={likes.filter(l => l.mediaId === item.id)}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onToggleLike={onToggleLike}
                onDelete={onDelete}
                onEditNote={onEditNote}
                showDeleteButton={isAdmin}
                userName={userName}
                isAdmin={isAdmin}
                isDarkMode={isDarkMode}
                getUserAvatar={getUserAvatar}
                getUserDisplayName={getUserDisplayName}
              />
            ) : (
              <InstagramPost
                key={item.id}
                item={item}
                comments={comments.filter(c => c.mediaId === item.id)}
                likes={likes.filter(l => l.mediaId === item.id)}
                onAddComment={onAddComment}
                onDeleteComment={onDeleteComment}
                onToggleLike={onToggleLike}
                onDelete={onDelete}
                onEditNote={onEditNote}
                showDeleteButton={isAdmin}
                userName={userName}
                isAdmin={isAdmin}
                onClick={() => handleMediaClick(mediaItems.findIndex(mediaItem => mediaItem.id === item.id))}
                isDarkMode={isDarkMode}
                getUserAvatar={getUserAvatar}
                getUserDisplayName={getUserDisplayName}
                getUserDeviceId={() => deviceId}
              />
            )
          ))}
        </div>
      ) : (
        // Grid View
        <div className="px-0 py-1 sm:p-1">
          {/* Notes Slider */}
          {noteItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3 px-3">
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  💌 Notizen ({noteItems.length})
                </h3>
                
                {/* Slider Navigation */}
                {noteItems.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={prevNote}
                      className={`p-2 sm:p-3 rounded-full transition-colors duration-300 touch-manipulation ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    {/* Dots Indicator */}
                    <div className="flex gap-1">
                      {noteItems.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => goToNote(index)}
                          className={`w-3 h-3 sm:w-2 sm:h-2 rounded-full transition-all duration-300 touch-manipulation ${
                            index === notesSliderIndex
                              ? 'bg-pink-500 w-6 sm:w-4'
                              : isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          style={{ minWidth: '24px', minHeight: '24px' }}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={nextNote}
                      className={`p-2 sm:p-3 rounded-full transition-colors duration-300 touch-manipulation ${
                        isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                      }`}
                      style={{ minWidth: '44px', minHeight: '44px' }}
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                )}
              </div>
              
              {/* Slider Container */}
              <div className="relative overflow-hidden rounded-xl">
                <div 
                  className="flex transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${notesSliderIndex * 100}%)` }}
                >
                  {noteItems.map((item) => {
                    const itemLikes = likes.filter(l => l.mediaId === item.id);
                    const itemComments = comments.filter(c => c.mediaId === item.id);
                    const isLiked = itemLikes.some(like => like.userName === userName);
                    const canDelete = isAdmin || item.uploadedBy === userName;
                    const canEdit = item.uploadedBy === userName;
                
                    return (
                      <div
                        key={item.id}
                        className="w-full flex-shrink-0 px-3"
                      >
                        <div className={`p-6 rounded-xl border transition-all duration-300 ${
                          isDarkMode 
                            ? 'bg-gray-800/50 border-gray-700' 
                            : 'bg-white border-gray-200 shadow-sm'
                        }`}>
                          {/* Note Header */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center relative">
                                {/* Animated Envelope with Heart */}
                                <div className="relative">
                                  {/* Envelope using SVG for clean rendering */}
                                  <svg 
                                    width="24" 
                                    height="18" 
                                    viewBox="0 0 24 18" 
                                    className={`transition-colors duration-300 ${
                                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                    }`}
                                    style={{
                                      animation: 'gentle-bounce 3s ease-in-out infinite'
                                    }}
                                  >
                                    {/* Envelope body */}
                                    <rect 
                                      x="2" 
                                      y="4" 
                                      width="20" 
                                      height="12" 
                                      rx="1" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="1.5"
                                    />
                                    {/* Envelope flap */}
                                    <path 
                                      d="M2 5L12 11L22 5" 
                                      fill="none" 
                                      stroke="currentColor" 
                                      strokeWidth="1.5" 
                                      strokeLinecap="round" 
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                  
                                  {/* Floating Heart */}
                                  <div 
                                    className="absolute text-red-500 text-sm"
                                    style={{
                                      animation: 'heart-float 2s ease-in-out infinite',
                                      top: '-6px',
                                      right: '-6px'
                                    }}
                                  >
                                    ❤️
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div>
                                  <span className={`font-semibold transition-colors duration-300 ${
                                    isDarkMode ? 'text-white' : 'text-gray-900'
                                  }`}>
                                    {getUserDisplayName ? getUserDisplayName(item.uploadedBy, item.deviceId) : item.uploadedBy}
                                    {item.uploadedBy === userName && (
                                      <span className={`ml-2 text-xs px-2 py-0.5 rounded-full transition-colors duration-300 ${
                                        isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        Du
                                      </span>
                                    )}
                                  </span>
                                  <p className={`text-sm transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                  }`}>
                                    {new Date(item.uploadedAt).toLocaleDateString('de-DE', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Note Content */}
                          <div className={`mb-4 p-4 rounded-lg transition-colors duration-300 ${
                            isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                          }`}>
                            <p className={`text-base leading-relaxed transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-200' : 'text-gray-800'
                            }`}>
                              {item.noteText || item.note}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => onToggleLike(item.id)}
                                className={`flex items-center gap-1 text-sm transition-colors duration-300 ${
                                  isLiked 
                                    ? 'text-red-500 hover:text-red-600' 
                                    : isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                                }`}
                              >
                                <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                                <span>{itemLikes.length}</span>
                              </button>
                              <span className={`text-sm transition-colors duration-300 ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                💬 {itemComments.length}
                              </span>
                            </div>
                            {(canDelete || canEdit) && (
                              <div className="flex gap-2">
                                {canEdit && onEditNote && (
                                  <button
                                    onClick={() => {
                                      const newText = prompt('Notiz bearbeiten:', item.noteText || item.note || '');
                                      if (newText !== null) {
                                        onEditNote(item, newText);
                                      }
                                    }}
                                    className={`text-sm px-3 py-1 rounded-full transition-colors duration-300 ${
                                      isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-800'
                                    }`}
                                  >
                                    Bearbeiten
                                  </button>
                                )}
                                {canDelete && onDelete && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        const confirmed = window.confirm('Beitrag wirklich löschen?');
                                        if (confirmed) {
                                          onDelete(item);
                                        }
                                      } catch (error) {
                                        console.error('Delete confirmation failed:', error);
                                        onDelete(item);
                                      }
                                    }}
                                    onTouchEnd={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      try {
                                        const confirmed = window.confirm('Beitrag wirklich löschen?');
                                        if (confirmed) {
                                          onDelete(item);
                                        }
                                      } catch (error) {
                                        console.error('Delete confirmation failed:', error);
                                        onDelete(item);
                                      }
                                    }}
                                    onTouchStart={(e) => e.preventDefault()}
                                    className={`text-sm px-4 py-2 rounded-full transition-colors duration-300 touch-manipulation ${
                                      isDarkMode ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white' : 'bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-800'
                                    }`}
                                    style={{ 
                                      minWidth: '48px', 
                                      minHeight: '44px',
                                      WebkitTapHighlightColor: 'transparent',
                                      WebkitTouchCallout: 'none',
                                      WebkitUserSelect: 'none',
                                      touchAction: 'manipulation'
                                    }}
                                  >
                                    Löschen
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Swipe Hint */}
              {noteItems.length > 1 && (
                <div className={`text-center mt-2 text-xs transition-colors duration-300 ${
                  isDarkMode ? 'text-gray-500' : 'text-gray-400'
                }`}>
                  ← Wische oder nutze die Pfeile zum Navigieren →
                </div>
              )}
            </div>
          )}

          {/* Pinterest-Style Masonry Grid */}
          {mediaItems.length > 0 && (
            <div>
              <h3 className={`text-lg font-semibold mb-3 px-3 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                📸 Medien ({mediaItems.length})
              </h3>
              <div className="px-3">
                <div 
                  className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
                  style={{ columnFill: 'balance' }}
                >
                  {mediaItems.map((item, mediaIndex) => {
                    const itemLikes = likes.filter(l => l.mediaId === item.id);
                    const itemComments = comments.filter(c => c.mediaId === item.id);
                    
                    return (
                      <div
                        key={item.id}
                        className={`relative break-inside-avoid mb-3 rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:scale-[1.02] shadow-lg backdrop-blur-sm border ${
                          isDarkMode 
                            ? 'bg-black/40 border-white/10 shadow-black/40 hover:shadow-black/60' 
                            : 'bg-white/60 border-white/30 shadow-gray-500/20 hover:shadow-gray-500/40'
                        }`}
                        onClick={(e) => {
                          e.preventDefault();
                          const mediaIndex = mediaItems.findIndex(mediaItem => mediaItem.id === item.id);
                          handleMediaClick(mediaIndex);
                        }}
                      >
                        {/* Media Content */}
                        <div className="relative w-full">
                          {item.type === 'video' ? (
                            <VideoThumbnail
                              src={item.url}
                              className="w-full h-auto"
                              showPlayButton={true}
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={item.noteText || item.note || 'Uploaded media'}
                              className="w-full h-auto object-cover"
                              loading="lazy"
                            />
                          )}
                          
                          {/* Overlay on hover */}
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <div className="text-white text-sm font-medium bg-black/50 backdrop-blur-sm rounded-full px-3 py-1">
                              {item.type === 'video' ? '▶️ Video ansehen' : '🖼️ Foto ansehen'}
                            </div>
                          </div>
                          
                          {/* Download Button Overlay - positioned bottom-left */}
                          <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <button 
                              onClick={(e) => handleDownload(item, e)}
                              disabled={downloadingItems.has(item.id) || !item.url || item.isUnavailable}
                              className={`transition-all duration-300 transform hover:scale-110 bg-black/50 backdrop-blur-sm rounded-full p-1.5 ${
                                downloadingItems.has(item.id) || !item.url || item.isUnavailable
                                  ? 'text-gray-400 cursor-not-allowed' 
                                  : 'text-white hover:text-blue-400 cursor-pointer'
                              }`}
                              title={downloadingItems.has(item.id) ? 'Download läuft...' : 'Foto/Video speichern'}
                            >
                              <Download className={`w-4 h-4 ${downloadingItems.has(item.id) ? 'animate-pulse' : ''}`} />
                            </button>
                          </div>
                        </div>
                        
                        {/* Content Preview */}
                        <div className="p-3">
                          <div className="flex items-start gap-2">
                            {/* Profile Picture */}
                            <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                              <img 
                                src={getUserAvatar?.(item.uploadedBy, item.deviceId) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(item.uploadedBy)}&backgroundColor=transparent`}
                                alt={item.uploadedBy}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            
                            {/* User Info and Stats */}
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium text-xs transition-colors duration-300 ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {getUserDisplayName?.(item.uploadedBy, item.deviceId) || item.uploadedBy}
                              </div>
                              
                              {/* Stats */}
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-red-500 text-xs">❤️</span>
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {itemLikes.length}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-500 text-xs">💬</span>
                                  <span className={`text-xs transition-colors duration-300 ${
                                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                  }`}>
                                    {itemComments.length}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Caption Preview */}
                          {item.caption && (
                            <div className={`mt-2 text-xs line-clamp-2 transition-colors duration-300 ${
                              isDarkMode ? 'text-gray-300' : 'text-gray-700'
                            }`}>
                              {item.caption}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Empty State */}
          {items.length === 0 && (
            <div className={`text-center py-12 transition-colors duration-300 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              <div className="text-6xl mb-4">📸</div>
              <h3 className={`text-xl font-semibold mb-2 transition-colors duration-300 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Noch keine Beiträge
              </h3>
              <p className={`transition-colors duration-300 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Lade das erste Foto hoch oder hinterlasse eine Notiz!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Media Popup */}
      {isPopupOpen && mediaItems[selectedItemIndex] && (
        <MediaPopup
          isOpen={isPopupOpen}
          item={mediaItems[selectedItemIndex]}
          onClose={handlePopupClose}
          onNext={selectedItemIndex < mediaItems.length - 1 ? handlePopupNext : undefined}
          onPrev={selectedItemIndex > 0 ? handlePopupPrev : undefined}
          hasNext={selectedItemIndex < mediaItems.length - 1}
          hasPrev={selectedItemIndex > 0}
          comments={comments}
          likes={likes}
          onAddComment={onAddComment}
          onDeleteComment={onDeleteComment}
          onToggleLike={onToggleLike}
          userName={userName}
          isAdmin={isAdmin}
          isDarkMode={isDarkMode}
          getUserAvatar={getUserAvatar}
          getUserDisplayName={getUserDisplayName}
        />
      )}
    </div>
  );
};
