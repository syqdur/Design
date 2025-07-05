import React, { useState, useRef, useCallback } from 'react';
import { Video, Square, RotateCcw, Check, X, RotateCw } from 'lucide-react';

interface VideoRecorderProps {
  onVideoRecorded: (videoBlob: Blob) => void;
  onClose: () => void;
  isDarkMode: boolean;
  maxDuration?: number; // in seconds
}

export const VideoRecorder: React.FC<VideoRecorderProps> = ({
  onVideoRecorded,
  onClose,
  isDarkMode,
  maxDuration = 60 // Default 60 seconds, 10 for stories
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startCamera = useCallback(async (requestedFacingMode?: 'user' | 'environment') => {
    try {
      // Stop existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const currentFacingMode = requestedFacingMode || facingMode;
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: currentFacingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        },
        audio: true
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasPermission(true);
      setFacingMode(currentFacingMode);
    } catch (error) {
      console.error('Error accessing camera:', error);
      
      // If back camera fails, try front camera as fallback
      if (requestedFacingMode === 'environment') {
        console.log('Back camera failed, trying front camera...');
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: 'user',
              width: { ideal: 1080 },
              height: { ideal: 1920 }
            },
            audio: true
          });
          
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
          setHasPermission(true);
          setFacingMode('user');
        } catch (fallbackError) {
          console.error('Both cameras failed:', fallbackError);
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
    }
  }, [facingMode]);

  const switchCamera = useCallback(async () => {
    if (isRecording) return; // Don't allow switching during recording
    
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    await startCamera(newFacingMode);
  }, [facingMode, isRecording, startCamera]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(blob);
      setRecordedVideo(videoUrl);
      stopCamera();
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);
    
    // Start timer
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 1;
        
        // Auto-stop when max duration reached
        if (newTime >= maxDuration) {
          stopRecording();
          return maxDuration;
        }
        
        return newTime;
      });
    }, 1000);
  }, [stopCamera, maxDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleRetake = useCallback(() => {
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
      setRecordedVideo(null);
    }
    setRecordingTime(0);
    startCamera();
  }, [recordedVideo, startCamera]);

  const handleConfirm = useCallback(() => {
    if (recordedVideo && chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      onVideoRecorded(blob);
    }
  }, [recordedVideo, onVideoRecorded]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize camera on mount
  React.useEffect(() => {
    startCamera('environment');
    return () => {
      stopCamera();
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recordedVideo) {
        URL.revokeObjectURL(recordedVideo);
      }
    };
  }, [stopCamera, recordedVideo]);

  if (hasPermission === false) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center p-4 z-50">
        <div className={`rounded-2xl p-8 max-w-sm w-full text-center transition-colors duration-300 ${
          isDarkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className="text-6xl mb-4">📹</div>
          <h3 className={`text-xl font-semibold mb-4 transition-colors duration-300 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Kamera-Zugriff erforderlich
          </h3>
          <p className={`text-sm mb-6 transition-colors duration-300 ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Bitte erlaube den Zugriff auf deine Kamera, um Videos aufzunehmen.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white py-3 px-4 rounded-xl transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-red-600 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-mono">
                {formatTime(recordingTime)}
              </span>
            </div>
            {maxDuration <= 10 && (
              <div className="text-white text-sm bg-black/50 px-2 py-1 rounded">
                Story: max {maxDuration}s
              </div>
            )}
          </div>
        )}
        
        {/* Camera Switch Button */}
        {!recordedVideo && (
          <button
            onClick={switchCamera}
            disabled={isRecording}
            className={`p-2 rounded-full transition-colors ${
              isRecording 
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                : 'bg-black/30 text-white hover:bg-black/50'
            }`}
            title={`Zur ${facingMode === 'user' ? 'Rück' : 'Front'}kamera wechseln`}
          >
            <RotateCw className="w-6 h-6" />
          </button>
        )}
        
        {recordedVideo && <div></div>}
      </div>

      {/* Video Area */}
      <div className="flex-1 relative">
        {recordedVideo ? (
          <video
            src={recordedVideo}
            controls
            className="w-full h-full object-cover"
            autoPlay
            muted
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Camera indicator */}
        {!recordedVideo && hasPermission && (
          <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
            <span className="text-white text-sm">
              {facingMode === 'user' ? '🤳 Frontkamera' : '📷 Rückkamera'}
            </span>
          </div>
        )}

        {/* Recording progress for stories */}
        {isRecording && maxDuration <= 10 && (
          <div className="absolute bottom-20 left-4 right-4">
            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(recordingTime / maxDuration) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50">
        {recordedVideo ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleRetake}
              className="p-4 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors"
              title="Erneut aufnehmen"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
            <button
              onClick={handleConfirm}
              className="p-4 rounded-full bg-green-600 hover:bg-green-700 text-white transition-colors"
              title="Video verwenden"
            >
              <Check className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`p-6 rounded-full transition-all duration-200 ${
                isRecording
                  ? 'bg-red-600 hover:bg-red-700 scale-110'
                  : 'bg-white hover:bg-gray-100'
              }`}
              title={isRecording ? 'Aufnahme stoppen' : 'Aufnahme starten'}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Video className="w-8 h-8 text-red-600" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};