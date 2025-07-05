import React, { useRef, useEffect, useState } from 'react';
import { Play } from 'lucide-react';

interface VideoThumbnailProps {
  src: string;
  className?: string;
  onClick?: () => void;
  showPlayButton?: boolean;
  autoplayOnClick?: boolean;
}

export const VideoThumbnail: React.FC<VideoThumbnailProps> = ({
  src,
  className = '',
  onClick,
  showPlayButton = true,
  autoplayOnClick = false
}) => {
  const [thumbnailGenerated, setThumbnailGenerated] = useState(false);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      console.log('Video loaded, seeking to first frame for thumbnail');
      // Seek to 0.1 seconds to ensure a frame is displayed
      video.currentTime = 0.1;
    };

    const handleSeeked = () => {
      console.log('Video seeked, thumbnail now visible');
      setThumbnailGenerated(true);
    };

    const handleCanPlay = () => {
      console.log('Video can play, thumbnail should be ready');
      setThumbnailGenerated(true);
    };

    const handleError = (e: any) => {
      console.error('Video thumbnail error:', e);
      setError(true);
    };

    // Multiple event listeners for better mobile compatibility
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    // Force load
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [src]);

  if (error) {
    return (
      <div className={`relative w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center ${className}`} onClick={onClick}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Play className="w-6 h-6" />
          </div>
          <div className="text-xs">Video</div>
        </div>
      </div>
    );
  }

  const handleClick = () => {
    if (autoplayOnClick && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.currentTime = 0; // Reset to beginning
        videoRef.current.play();
        setIsPlaying(true);
      }
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`} onClick={handleClick}>
      {/* Direct video element that shows first frame */}
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-cover"
        muted
        playsInline
        preload="metadata"
        controls={autoplayOnClick && isPlaying}
        poster=""
        style={{ 
          backgroundColor: 'transparent',
          visibility: thumbnailGenerated ? 'visible' : 'hidden'
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
      
      {/* Play button overlay - hide when playing */}
      {showPlayButton && thumbnailGenerated && !isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 bg-black/60 rounded-full flex items-center justify-center backdrop-blur-sm">
            <Play className="w-6 h-6 text-white ml-1" />
          </div>
        </div>
      )}
      
      {/* Loading state - only show while loading */}
      {!thumbnailGenerated && !error && (
        <div className="absolute inset-0 bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
          <div className="text-center text-gray-400 dark:text-gray-500">
            <div className="w-8 h-8 mx-auto mb-1 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center animate-pulse">
              <Play className="w-4 h-4" />
            </div>
            <div className="text-xs">Loading...</div>
          </div>
        </div>
      )}
    </div>
  );
};